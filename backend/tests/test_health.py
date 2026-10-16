"""Unit and integration test for /api/health endpoint."""
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app
from app.core.config import settings


@pytest.mark.asyncio
async def test_health_check_returns_ok():
    """Verify that /api/health returns 200, healthy status, and expected metadata."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == settings.PROJECT_NAME
        assert data["version"] == settings.VERSION
        assert data["environment"] == settings.ENVIRONMENT
        assert "timestamp" in data
        assert data["ai_provider"] == settings.AI_PROVIDER


@pytest.mark.asyncio
async def test_root_endpoint():
    """Verify root / returns 200 and points to health check and docs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "health_check" in data
