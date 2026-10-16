"""Health check response schema."""
from datetime import datetime
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Schema returned by the health check diagnostic endpoint."""
    status: str = Field(..., example="healthy")
    service: str = Field(..., example="Food Verse AI API")
    version: str = Field(..., example="1.0.0")
    environment: str = Field(..., example="development")
    ai_provider: str = Field(..., example="mock")
    timestamp: datetime = Field(..., description="UTC ISO timestamp of verification")
    database: str = Field(..., example="configured")
