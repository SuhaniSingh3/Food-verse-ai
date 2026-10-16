"""Image validation, sanitization, and EXIF stripping utilities."""
import io
from dataclasses import dataclass
from typing import Tuple
from PIL import Image, UnidentifiedImageError
from app.core.config import settings
from app.core.errors import MediaValidationError, PayloadSizeError
from app.core.logging import logger


@dataclass
class SanitizedImageResult:
    """Encapsulates the verified, sanitized image output."""
    raw_bytes: bytes
    format: str
    mime_type: str
    width: int
    height: int


class ImageGuard:
    """Security guard verifying MIME, size, header integrity, and stripping EXIF."""

    @classmethod
    def validate_and_sanitize(
        cls,
        file_bytes: bytes,
        declared_mime_type: str,
        filename: str = "upload"
    ) -> SanitizedImageResult:
        """Thoroughly inspect and sanitize an incoming image binary.

        1. Validates declared MIME type.
        2. Validates raw byte length against MAX_UPLOAD_SIZE_MB.
        3. Verifies internal image format headers via Pillow.
        4. Re-encodes to strip EXIF/biometric metadata.
        5. Clamps dimensions to MAX_IMAGE_DIMENSION_PX.
        """
        # 1. Size ceiling check
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        actual_size = len(file_bytes)
        if actual_size > max_bytes:
            raise PayloadSizeError(
                message=f"File exceeds maximum allowable size of {settings.MAX_UPLOAD_SIZE_MB}MB "
                        f"(received: {actual_size / (1024 * 1024):.2f}MB).",
                details={"max_bytes": max_bytes, "received_bytes": actual_size}
            )

        if actual_size == 0:
            raise MediaValidationError(message="Uploaded file is empty (0 bytes).")

        # 2. Declared MIME validation
        clean_mime = declared_mime_type.lower().strip()
        if clean_mime not in settings.ALLOWED_IMAGE_MIME_TYPES:
            raise MediaValidationError(
                message=f"Unsupported image MIME type '{declared_mime_type}'. "
                        f"Allowed types: {', '.join(settings.ALLOWED_IMAGE_MIME_TYPES)}.",
                details={"allowed_types": settings.ALLOWED_IMAGE_MIME_TYPES, "received_type": declared_mime_type}
            )

        # 3. Binary header inspection & verification
        try:
            buffer = io.BytesIO(file_bytes)
            with Image.open(buffer) as img_verify:
                img_format = img_verify.format
                img_verify.verify()
        except (UnidentifiedImageError, OSError, SyntaxError) as err:
            logger.warning(f"Image integrity verification failed for '{filename}': {err}")
            raise MediaValidationError(
                message="File content could not be verified as a valid image. The file may be corrupt or mislabeled.",
                details={"error": str(err)}
            )

        # 4. EXIF Stripping & Re-encoding
        # Re-open fresh stream (since verify() invalidates the original buffer)
        try:
            buffer.seek(0)
            with Image.open(buffer) as img_load:
                # Convert color modes safely
                if img_load.mode in ("RGBA", "LA") or (img_load.mode == "P" and "transparency" in img_load.info):
                    sanitized_img = img_load.convert("RGBA")
                    target_format = "PNG" if img_format != "WEBP" else "WEBP"
                else:
                    sanitized_img = img_load.convert("RGB")
                    target_format = "JPEG" if img_format not in ("PNG", "WEBP") else img_format

                width, height = sanitized_img.size

                # 5. Dimension clamp
                max_dim = settings.MAX_IMAGE_DIMENSION_PX
                if width > max_dim or height > max_dim:
                    sanitized_img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                    width, height = sanitized_img.size
                    logger.debug(f"Resized image '{filename}' to max boundary: {width}x{height}")

                # Save into fresh buffer without original info dict (stripping all EXIF)
                out_buffer = io.BytesIO()
                save_kwargs = {}
                if target_format == "JPEG":
                    save_kwargs["quality"] = 90
                sanitized_img.save(out_buffer, format=target_format, **save_kwargs)
                sanitized_bytes = out_buffer.getvalue()

                out_mime = f"image/{target_format.lower()}"
                if target_format == "JPEG":
                    out_mime = "image/jpeg"

                return SanitizedImageResult(
                    raw_bytes=sanitized_bytes,
                    format=target_format,
                    mime_type=out_mime,
                    width=width,
                    height=height,
                )
        except Exception as err:
            logger.error(f"Failed to sanitize and re-encode image '{filename}': {err}", exc_info=True)
            raise MediaValidationError(
                message="Image processing encountered an unexpected error during sanitization.",
                details={"error": str(err)}
            )
