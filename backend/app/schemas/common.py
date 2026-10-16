"""Common Pydantic models for errors and status envelopes."""
from typing import Any, Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """Structured error object format."""
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error explanation")
    details: Optional[Any] = Field(None, description="Optional diagnostic details or validation errors")


class ErrorResponse(BaseModel):
    """Standardized top-level API error envelope."""
    error: ErrorDetail
