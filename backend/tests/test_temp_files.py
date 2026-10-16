"""Unit tests for safe temporary file generation and cleanup."""
import os
import pytest
from app.utils.temp_files import (
    cleanup_temp_file,
    generate_safe_temp_filepath,
    safe_temp_file_context,
)


def test_generate_safe_temp_filepath():
    """Verify generated temporary filepath contains safe characters and proper suffix."""
    path = generate_safe_temp_filepath(".jpg")
    assert path.endswith(".jpg")
    assert "foodverse_" in os.path.basename(path)
    # Ensure no path traversal
    assert ".." not in path


def test_safe_temp_file_context_lifecycle():
    """Verify context manager guarantees file deletion after block execution."""
    created_path = None
    with safe_temp_file_context(".png") as temp_path:
        created_path = temp_path
        # Create the file on disk
        with open(temp_path, "wb") as f:
            f.write(b"test_temp_content")
        assert os.path.exists(temp_path)

    # Upon exit, file must be cleanly unlinked
    assert not os.path.exists(created_path)


def test_safe_temp_file_context_cleans_up_on_exception():
    """Verify context manager removes temporary file even if an unhandled exception is raised."""
    created_path = None
    with pytest.raises(RuntimeError):
        with safe_temp_file_context(".tmp") as temp_path:
            created_path = temp_path
            with open(temp_path, "wb") as f:
                f.write(b"data_before_failure")
            assert os.path.exists(temp_path)
            raise RuntimeError("Simulated processing failure")

    assert not os.path.exists(created_path)
