"""Health check diagnostic endpoint."""
from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System Health & Diagnostic Status",
    description="Returns the operational status, environment, version, and active AI provider.",
)
async def health_check() -> HealthResponse:
    """Verifies service readiness, environment settings, and configuration state."""
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        ai_provider=settings.AI_PROVIDER,
        timestamp=datetime.now(timezone.utc),
        database="configured" if settings.DATABASE_URL else "unconfigured",
    )
