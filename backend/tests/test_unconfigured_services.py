"""Unit tests verifying that unfinished AI services return explicit not-configured responses (HTTP 501) rather than fake AI outputs."""
import io
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image
from app.main import app


def create_test_image() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (80, 80), color="blue").save(buf, format="JPEG")
    return buf.getvalue()


@pytest.mark.asyncio
async def test_vision_analyze_returns_explicit_unconfigured_response(monkeypatch):
    """Verify POST /api/v1/vision/analyze returns 501 Not Implemented when live AI provider is unconfigured."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        image_bytes = create_test_image()
        files = {"file": ("meal.jpg", image_bytes, "image/jpeg")}
        data = {"meal_type": "Lunch"}

        response = await client.post("/api/v1/vision/analyze", files=files, data=data)
        assert response.status_code == 501
        body = response.json()
        assert "error" in body
        assert body["error"]["code"] == "SERVICE_NOT_CONFIGURED"
        assert "not configured" in body["error"]["message"].lower()


@pytest.mark.asyncio
async def test_recipe_generate_returns_explicit_unconfigured_response(monkeypatch):
    """Verify POST /api/v1/recipes/generate returns 501 Not Implemented without generating fake recipes."""
    from app.core.config import settings
    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "ingredients": ["Tomato", "Olive Oil", "Garlic"],
            "dietary_preference": "Vegetarian",
            "max_cook_time_minutes": 25,
        }
        response = await client.post("/api/v1/recipes/generate", json=payload)
        assert response.status_code == 501
        body = response.json()
        assert "error" in body
        assert body["error"]["code"] == "SERVICE_NOT_CONFIGURED"
        assert body["error"]["code"] == "SERVICE_NOT_CONFIGURED"


@pytest.mark.asyncio
async def test_freshness_analyze_returns_explicit_unconfigured_response():
    """Verify POST /api/v1/optional/freshness returns 501 Not Implemented with Phase 5 explanation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        image_bytes = create_test_image()
        files = {"file": ("apple.jpg", image_bytes, "image/jpeg")}

        response = await client.post("/api/v1/optional/freshness", files=files)
        assert response.status_code == 501
        body = response.json()
        assert "error" in body
        assert body["error"]["code"] == "SERVICE_NOT_CONFIGURED"
        assert "Phase 5" in body["error"]["message"]


@pytest.mark.asyncio
async def test_hygiene_audit_returns_explicit_unconfigured_response():
    """Verify POST /api/v1/optional/hygiene returns 501 Not Implemented with Phase 5 explanation."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        image_bytes = create_test_image()
        files = {"file": ("kitchen.jpg", image_bytes, "image/jpeg")}

        response = await client.post("/api/v1/optional/hygiene", files=files)
        assert response.status_code == 501
        body = response.json()
        assert "error" in body
        assert body["error"]["code"] == "SERVICE_NOT_CONFIGURED"
        assert "Phase 5" in body["error"]["message"]
