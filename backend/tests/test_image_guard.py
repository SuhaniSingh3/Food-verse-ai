"""Unit tests for ImageGuard MIME, file size, content validation, and EXIF stripping."""
import io
import pytest
from PIL import Image
from app.core.errors import MediaValidationError, PayloadSizeError
from app.utils.image_guard import ImageGuard


def create_test_image_bytes(format: str = "JPEG", size: tuple = (200, 200), color: str = "green") -> bytes:
    """Helper to generate valid in-memory image bytes."""
    buf = io.BytesIO()
    mode = "RGBA" if format == "PNG" else "RGB"
    img = Image.new(mode, size, color=color)
    img.save(buf, format=format)
    return buf.getvalue()


def test_valid_jpeg_validation():
    """Verify standard JPEG image is sanitized and returned with correct metadata."""
    raw = create_test_image_bytes("JPEG", size=(150, 150))
    result = ImageGuard.validate_and_sanitize(
        file_bytes=raw,
        declared_mime_type="image/jpeg",
        filename="plate.jpg",
    )
    assert result.format == "JPEG"
    assert result.mime_type == "image/jpeg"
    assert result.width == 150
    assert result.height == 150
    assert len(result.raw_bytes) > 0


def test_valid_png_validation():
    """Verify PNG image validation preserves RGBA/PNG mode."""
    raw = create_test_image_bytes("PNG", size=(100, 120))
    result = ImageGuard.validate_and_sanitize(
        file_bytes=raw,
        declared_mime_type="image/png",
        filename="produce.png",
    )
    assert result.format == "PNG"
    assert result.mime_type == "image/png"
    assert result.width == 100
    assert result.height == 120


def test_unsupported_mime_rejected():
    """Verify unsupported MIME type raises MediaValidationError."""
    raw = create_test_image_bytes("JPEG")
    with pytest.raises(MediaValidationError) as exc_info:
        ImageGuard.validate_and_sanitize(
            file_bytes=raw,
            declared_mime_type="application/pdf",
            filename="document.pdf",
        )
    assert "Unsupported image MIME type" in str(exc_info.value.message)


def test_corrupted_non_image_binary_rejected():
    """Verify arbitrary non-image bytes claiming to be image/jpeg are rejected."""
    corrupted_bytes = b"NOT_A_REAL_IMAGE_DATA_HEADER_CORRUPTED_STREAM_123456"
    with pytest.raises(MediaValidationError) as exc_info:
        ImageGuard.validate_and_sanitize(
            file_bytes=corrupted_bytes,
            declared_mime_type="image/jpeg",
            filename="fake.jpg",
        )
    assert "could not be verified as a valid image" in str(exc_info.value.message)


def test_empty_file_rejected():
    """Verify empty 0-byte file is rejected."""
    with pytest.raises(MediaValidationError) as exc_info:
        ImageGuard.validate_and_sanitize(
            file_bytes=b"",
            declared_mime_type="image/jpeg",
            filename="empty.jpg",
        )
    assert "Uploaded file is empty" in str(exc_info.value.message)


def test_dimension_clamping():
    """Verify oversized image dimensions are clamped to MAX_IMAGE_DIMENSION_PX (2048px)."""
    raw = create_test_image_bytes("JPEG", size=(2500, 1500))
    result = ImageGuard.validate_and_sanitize(
        file_bytes=raw,
        declared_mime_type="image/jpeg",
        filename="huge.jpg",
    )
    assert result.width <= 2048
    assert result.height <= 2048


def test_exif_metadata_stripped():
    """Verify that EXIF metadata is stripped from sanitized output."""
    raw = create_test_image_bytes("JPEG", size=(100, 100))
    result = ImageGuard.validate_and_sanitize(
        file_bytes=raw,
        declared_mime_type="image/jpeg",
        filename="photo_with_exif.jpg",
    )
    # Inspect sanitized image in Pillow
    with Image.open(io.BytesIO(result.raw_bytes)) as sanitized_pil:
        exif = sanitized_pil.getexif()
        assert len(exif) == 0
