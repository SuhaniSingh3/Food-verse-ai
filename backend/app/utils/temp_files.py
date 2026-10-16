"""Safe temporary file management with guaranteed cleanup."""
import os
import uuid
from contextlib import contextmanager
from typing import Generator, Optional
from app.core.config import settings
from app.core.logging import logger


def generate_safe_temp_filepath(suffix: str = ".tmp") -> str:
    """Generate an unguessable, safe temporary file path without path traversal vectors."""
    clean_suffix = suffix if suffix.startswith(".") else f".{suffix}"
    # Whitelist safe extensions
    clean_suffix = "".join(c for c in clean_suffix if c.isalnum() or c == ".")
    filename = f"foodverse_{uuid.uuid4().hex}{clean_suffix}"
    return os.path.join(settings.safe_temp_dir, filename)


def cleanup_temp_file(filepath: Optional[str] = None) -> None:
    """Safely unlink a temporary file if it exists."""
    if not filepath:
        return
    try:
        if os.path.isfile(filepath):
            os.remove(filepath)
            logger.debug(f"Removed temporary file: {filepath}")
    except OSError as err:
        logger.warning(f"Failed to remove temporary file {filepath}: {err}")


@contextmanager
def safe_temp_file_context(suffix: str = ".tmp") -> Generator[str, None, None]:
    """Context manager guaranteeing temporary file removal upon block completion."""
    path = generate_safe_temp_filepath(suffix=suffix)
    try:
        yield path
    finally:
        cleanup_temp_file(path)
