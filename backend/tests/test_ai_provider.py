"""Unit tests verifying AI provider abstraction, mock provider, structured validation, and error handling."""
import io
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image
from app.ai.base import BaseVisionAIProvider
from app.ai.factory import get_vision_ai_provider
from app.ai.gemini_provider import GeminiDeveloperProvider
from app.ai.mock_provider import MockVisionAIProvider
from app.ai.vertex_provider import VertexAIGeminiProvider
from app.core.config import settings
from app.core.errors import AIProviderError, ServiceNotConfiguredError
from app.main import app
from app.schemas.food_analysis import StructuredFoodAnalysisResponse


def create_valid_test_image(width: int = 120, height: int = 120, color: str = "green") -> bytes:
    """Generate a valid test image binary."""
    buf = io.BytesIO()
    Image.new("RGB", (width, height), color=color).save(buf, format="JPEG")
    return buf.getvalue()


# ---------------------------------------------------------------------------
# 1. Mock Vision Provider Unit Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_mock_provider_structure():
    """Verify mock provider generates structured response separating visible items from guesses."""
    provider = MockVisionAIProvider()
    image_bytes = create_valid_test_image()

    result = await provider.analyze_food(image_bytes=image_bytes, mime_type="image/jpeg")

    assert isinstance(result, StructuredFoodAnalysisResponse)
    assert result.dish_name == "Mediterranean Grilled Salmon Bowl"
    assert result.confidence_assessment in ("High", "Moderate", "Low")
    assert len(result.visible_ingredients) > 0
    assert len(result.potential_ingredients_or_guesses) > 0
    assert len(result.visual_uncertainties_and_ambiguities) > 0
    assert result.nutritional_estimate is not None
    assert result.nutritional_estimate.estimated_calories > 0
    assert "cannot confirm hidden ingredients" in result.safety_and_allergen_disclaimer.lower()

    # Verify decomposed items have explicit is_directly_visible flags
    visible_flags = [item.is_directly_visible for item in result.decomposed_items]
    assert True in visible_flags, "Must include directly visible items"
    assert False in visible_flags, "Must include inferred culinary guesses"


@pytest.mark.asyncio
async def test_mock_provider_dynamic_user_question():
    """Verify mock provider responds dynamically to user inquiries while enforcing safety boundaries."""
    provider = MockVisionAIProvider()
    image_bytes = create_valid_test_image()

    result = await provider.analyze_food(
        image_bytes=image_bytes,
        mime_type="image/jpeg",
        user_question="Is there any dairy or butter in this dish?"
    )

    assert result.user_question == "Is there any dairy or butter in this dish?"
    assert result.user_question_answer is not None
    assert "dairy" in result.user_question_answer.lower()
    # Confirms it explicitly mentions that hidden marinades or cooking fats cannot be visually ruled out
    assert "cannot" in result.user_question_answer.lower()


@pytest.mark.asyncio
async def test_mock_provider_simulated_timeout():
    """Verify provider timeout raises AIProviderError with is_timeout=True."""
    provider = MockVisionAIProvider(simulate_timeout=True)
    image_bytes = create_valid_test_image()

    with pytest.raises(AIProviderError) as exc_info:
        await provider.analyze_food(image_bytes=image_bytes, mime_type="image/jpeg")

    assert exc_info.value.code == "AI_TIMEOUT"
    assert exc_info.value.status_code == 504


@pytest.mark.asyncio
async def test_mock_provider_simulated_rate_limit():
    """Verify provider rate-limiting raises AIProviderError with 429 details."""
    provider = MockVisionAIProvider(simulate_rate_limit=True)
    image_bytes = create_valid_test_image()

    with pytest.raises(AIProviderError) as exc_info:
        await provider.analyze_food(image_bytes=image_bytes, mime_type="image/jpeg")

    assert exc_info.value.code == "AI_PROVIDER_ERROR"
    assert exc_info.value.details.get("code") == 429


@pytest.mark.asyncio
async def test_mock_provider_simulated_error():
    """Verify general upstream provider failure raises AIProviderError."""
    provider = MockVisionAIProvider(simulate_error=True)
    image_bytes = create_valid_test_image()

    with pytest.raises(AIProviderError) as exc_info:
        await provider.analyze_food(image_bytes=image_bytes, mime_type="image/jpeg")

    assert exc_info.value.code == "AI_PROVIDER_ERROR"
    assert exc_info.value.status_code == 502


# ---------------------------------------------------------------------------
# 2. Provider Factory & Configuration Enforcement Tests
# ---------------------------------------------------------------------------

def test_factory_returns_mock_when_configured(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")
    provider = get_vision_ai_provider()
    assert isinstance(provider, MockVisionAIProvider)
    assert provider.provider_name == "mock"


def test_factory_raises_when_vertex_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "vertexai")
    monkeypatch.setattr(settings, "GCP_PROJECT_ID", "")

    with pytest.raises(ServiceNotConfiguredError) as exc_info:
        get_vision_ai_provider()

    assert "GCP_PROJECT_ID" in exc_info.value.message
    assert exc_info.value.code == "SERVICE_NOT_CONFIGURED"


def test_factory_raises_when_gemini_unconfigured(monkeypatch):
    monkeypatch.setattr(settings, "AI_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    with pytest.raises(ServiceNotConfiguredError) as exc_info:
        get_vision_ai_provider()

    assert "GEMINI_API_KEY" in exc_info.value.message
    assert exc_info.value.code == "SERVICE_NOT_CONFIGURED"


def test_factory_does_not_silently_fallback(monkeypatch):
    """Crucial requirement: application must NEVER silently switch between providers."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "vertexai")
    monkeypatch.setattr(settings, "GCP_PROJECT_ID", "")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "real_key_available_elsewhere")

    # Even though GEMINI_API_KEY might be present, requesting vertexai MUST NOT fall back to gemini or mock
    with pytest.raises(ServiceNotConfiguredError):
        get_vision_ai_provider()


# ---------------------------------------------------------------------------
# 3. Dedicated Endpoint Tests: POST /api/food/analyze
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_food_analyze_success(monkeypatch):
    """Verify POST /api/food/analyze returns 200 and structured response."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        image_bytes = create_valid_test_image()
        files = {"file": ("lunch.jpg", image_bytes, "image/jpeg")}
        data = {"meal_type": "Lunch", "question": "Are there any peanuts?"}

        response = await client.post("/api/food/analyze", files=files, data=data)
        assert response.status_code == 200

        body = response.json()
        assert body["dish_name"] == "Mediterranean Grilled Salmon Bowl"
        assert "visible_ingredients" in body
        assert "potential_ingredients_or_guesses" in body
        assert "visual_uncertainties_and_ambiguities" in body
        assert body["user_question"] == "Are there any peanuts?"
        assert "nutritional_estimate" in body
        assert "provider_metadata" in body
        assert body["provider_metadata"]["provider"] == "mock"


@pytest.mark.asyncio
async def test_api_food_analyze_invalid_mime():
    """Verify rejection of non-image MIME types."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        files = {"file": ("notes.txt", b"not an image", "text/plain")}
        response = await client.post("/api/food/analyze", files=files)

        assert response.status_code == 422
        body = response.json()
        assert body["error"]["code"] == "MEDIA_VALIDATION_ERROR"
        assert "unsupported" in body["error"]["message"].lower()


@pytest.mark.asyncio
async def test_api_food_analyze_corrupt_image():
    """Verify rejection of corrupted image headers."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        files = {"file": ("corrupt.jpg", b"fake binary data with invalid header", "image/jpeg")}
        response = await client.post("/api/food/analyze", files=files)

        assert response.status_code == 422
        body = response.json()
        assert body["error"]["code"] == "MEDIA_VALIDATION_ERROR"
        assert "could not be verified" in body["error"]["message"].lower()


@pytest.mark.asyncio
async def test_api_food_analyze_empty_file():
    """Verify rejection of 0-byte file."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        files = {"file": ("empty.jpg", b"", "image/jpeg")}
        response = await client.post("/api/food/analyze", files=files)

        assert response.status_code == 422
        body = response.json()
        assert body["error"]["code"] == "MEDIA_VALIDATION_ERROR"
        assert "empty" in body["error"]["message"].lower()


@pytest.mark.asyncio
async def test_api_food_analyze_simulated_timeout(monkeypatch):
    """Verify 504 Gateway Timeout when provider times out."""
    from app.services.food_analysis_service import FoodAnalysisService

    async def mock_timeout(*args, **kwargs):
        raise AIProviderError("Provider timed out after 25s", is_timeout=True)

    monkeypatch.setattr(FoodAnalysisService, "analyze_food_image", mock_timeout)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        image_bytes = create_valid_test_image()
        files = {"file": ("meal.jpg", image_bytes, "image/jpeg")}
        response = await client.post("/api/food/analyze", files=files)

        assert response.status_code == 504
        body = response.json()
        assert body["error"]["code"] == "AI_TIMEOUT"


@pytest.mark.asyncio
async def test_api_food_analyze_simulated_rate_limit(monkeypatch):
    """Verify 502 Bad Gateway when provider rate limits."""
    from app.services.food_analysis_service import FoodAnalysisService

    async def mock_rate_limit(*args, **kwargs):
        raise AIProviderError("Rate limit exceeded", is_timeout=False, details={"code": 429})

    monkeypatch.setattr(FoodAnalysisService, "analyze_food_image", mock_rate_limit)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        image_bytes = create_valid_test_image()
        files = {"file": ("meal.jpg", image_bytes, "image/jpeg")}
        response = await client.post("/api/food/analyze", files=files)

        assert response.status_code == 502
        body = response.json()
        assert body["error"]["code"] == "AI_PROVIDER_ERROR"
        assert body["error"]["details"]["code"] == 429


@pytest.mark.asyncio
async def test_v1_vision_analyze_compatibility(monkeypatch):
    """Verify POST /api/v1/vision/analyze also routes correctly and returns structured response."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        image_bytes = create_valid_test_image()
        files = {"file": ("lunch.jpg", image_bytes, "image/jpeg")}

        response = await client.post("/api/v1/vision/analyze", files=files)
        assert response.status_code == 200
        body = response.json()
        assert body["dish_name"] == "Mediterranean Grilled Salmon Bowl"
        assert "visible_ingredients" in body
