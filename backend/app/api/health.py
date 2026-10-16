"""Health check endpoint for Food Verse AI backend."""
from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Service Health & Diagnostic Status")
async def health_check():
    """Returns the operational status, environment, and configuration metadata."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "ai_provider": settings.AI_PROVIDER,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "configured",
    }
