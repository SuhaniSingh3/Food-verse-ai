"""Unit and integration tests for health check and root endpoints."""
import pytest
from httpx import ASGITransport, AsyncClient
from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_health_check_returns_ok():
    """Verify that /api/health returns HTTP 200 and schema conforming payload."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == settings.PROJECT_NAME
        assert data["version"] == settings.VERSION
        assert data["environment"] == settings.ENVIRONMENT
        assert data["ai_provider"] == settings.AI_PROVIDER
        assert "timestamp" in data
        assert "database" in data


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
        assert "documentation" in data
