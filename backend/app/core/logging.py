"""Secure logging configuration with sensitive data sanitization and secret masking."""
import logging
import re
from typing import Any
from app.core.config import settings

# Sensitive pattern regexes for masking
SENSITIVE_PATTERNS = [
    (re.compile(r'(AIzaSy[a-zA-Z0-9_-]{20,50})', re.IGNORECASE), r'[MASKED_GOOGLE_KEY]'),
    (re.compile(r'(Bearer\s+)([a-zA-Z0-9._-]{10,})', re.IGNORECASE), r'\1[MASKED_TOKEN]'),
    (re.compile(r'((?:api[-_]?key|secret|password|access[-_]?token)\s*[=:]\s*["\']?)([^"\'\s&]+)(["\']?)', re.IGNORECASE), r'\1[MASKED_SECRET]\3'),
]


def sanitize_log_message(message: str) -> str:
    """Mask credentials, tokens, and secrets in a text string."""
    sanitized = message
    for pattern, replacement in SENSITIVE_PATTERNS:
        sanitized = pattern.sub(replacement, sanitized)
    return sanitized


class SensitiveDataFilter(logging.Filter):
    """Logging filter that scrubs API keys, passwords, and tokens before output."""

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = sanitize_log_message(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: sanitize_log_message(str(v)) for k, v in record.args.items()}
            elif isinstance(record.args, tuple):
                record.args = tuple(sanitize_log_message(str(arg)) if isinstance(arg, str) else arg for arg in record.args)
        return True


def setup_logging() -> logging.Logger:
    """Configure application logging with secret scrubbing."""
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - [%(levelname)s] - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    handler = logging.StreamHandler()
    handler.setLevel(log_level)
    handler.setFormatter(formatter)
    handler.addFilter(SensitiveDataFilter())

    logger = logging.getLogger("food_verse")
    logger.setLevel(log_level)
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.propagate = False

    return logger


logger = setup_logging()
