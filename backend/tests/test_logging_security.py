"""Unit tests verifying sensitive data masking and secret protection in logging."""
import logging
from app.core.logging import SensitiveDataFilter, sanitize_log_message


def test_sanitize_google_api_key():
    """Verify that Google Cloud API keys (AIzaSy...) are scrubbed."""
    raw_message = "Connecting to Gemini model with key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6"
    sanitized = sanitize_log_message(raw_message)
    assert "AIzaSy" not in sanitized
    assert "[MASKED_GOOGLE_KEY]" in sanitized


def test_sanitize_bearer_token():
    """Verify that Authorization Bearer tokens are scrubbed."""
    raw_message = "Header Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz"
    sanitized = sanitize_log_message(raw_message)
    assert "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz" not in sanitized
    assert "[MASKED_TOKEN]" in sanitized


def test_sanitize_secret_and_password_assignments():
    """Verify that password and secret assignments are scrubbed."""
    raw_message = 'Database connection failed: password="super_secret_db_password_123" api_key="secret_token"'
    sanitized = sanitize_log_message(raw_message)
    assert "super_secret_db_password_123" not in sanitized
    assert "secret_token" not in sanitized
    assert "[MASKED_SECRET]" in sanitized


def test_sensitive_data_filter_record_scrubbing():
    """Verify that SensitiveDataFilter intercepts and modifies logging records."""
    log_filter = SensitiveDataFilter()
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="API call failed with key AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6",
        args=(),
        exc_info=None,
    )
    result = log_filter.filter(record)
    assert result is True
    assert "AIzaSy" not in record.msg
    assert "[MASKED_GOOGLE_KEY]" in record.msg
