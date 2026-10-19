"""Unit tests verifying AI provider abstraction, Food-101 classification, top-3 predictions, and error handling."""
import io
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image
from app.ai.base import BaseVisionAIProvider
from app.ai.factory import get_vision_ai_provider
from app.ai.food101_provider import Food101ClassificationProvider, Food101ModelManager
from app.ai.gemini_provider import GeminiDeveloperProvider
from app.ai.mock_provider import MockVisionAIProvider
from app.ai.ollama_provider import OllamaVisionProvider
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
# 1. Food-101 Pretrained Computer Vision Provider Unit Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_food101_provider_classification():
    """Verify Food-101 provider runs real inference and returns top-3 predictions with confidence."""
    # Ensure model is initialized
    Food101ModelManager.get_instance().load_model(settings.FOOD101_MODEL_NAME)
    provider = Food101ClassificationProvider()
    image_bytes = create_valid_test_image()

    result = await provider.analyze_food(image_bytes=image_bytes, mime_type="image/jpeg")

    assert isinstance(result, StructuredFoodAnalysisResponse)
    assert result.dish_name, "Must predict a primary dish name"
    assert result.confidence_assessment in ("High", "Moderate", "Low")
    assert len(result.top_predictions) == 3, "Must return exactly top 3 predicted food categories"

    # Verify top predictions structure
    for pred in result.top_predictions:
        assert pred.category, "Category name must not be empty"
        assert pred.raw_label, "Raw Food-101 label must be present"
        assert 0.0 <= pred.confidence <= 1.0, "Confidence score must be between 0.0 and 1.0"
        assert pred.percentage.endswith("%"), "Percentage must be formatted string"

    # Verify top 1 prediction matches dish name
    assert result.dish_name == result.top_predictions[0].category

    # Verify regional Indian cuisine & food safety note (Requirement 9)
    assert "Indian dish" in result.regional_disclaimer or "Indian" in result.regional_disclaimer
    assert "freshness" in result.regional_disclaimer.lower()

    # Requirement 5 & 7: Never invent visually verified ingredients or nutrition before confirmation
    assert result.is_confirmed is False
    assert result.requires_user_confirmation is True
    assert len(result.visible_ingredients) == 0
    assert len(result.decomposed_items) == 0
    assert result.nutritional_estimate is None
    assert len(result.confirmation_options) >= 7
    assert "Pav Bhaji" in result.confirmation_options

    # Requirement 4: Confirming dish loads verified culinary baseline and benchmark nutrition
    confirmed = provider.confirm_dish(
        confirmed_dish="Pav Bhaji",
        original_prediction=result.dish_name,
        confidence=result.top_predictions[0].confidence,
        top_predictions=result.top_predictions,
    )
    assert confirmed.is_confirmed is True
    assert confirmed.requires_user_confirmation is False
    assert confirmed.confirmed_dish == "Pav Bhaji"
    assert len(confirmed.visible_ingredients) > 0
    assert any("pav" in item.lower() for item in confirmed.visible_ingredients)
    assert len(confirmed.decomposed_items) > 0
    assert confirmed.nutritional_estimate is not None
    assert confirmed.nutritional_estimate.estimated_calories > 0
    assert len(confirmed.top_predictions) == 3



@pytest.mark.asyncio
async def test_food101_provider_dynamic_user_question():
    """Verify Food-101 provider handles user queries while respecting safety guardrails."""
    Food101ModelManager.get_instance().load_model(settings.FOOD101_MODEL_NAME)
    provider = Food101ClassificationProvider()
    image_bytes = create_valid_test_image()

    result = await provider.analyze_food(
        image_bytes=image_bytes,
        mime_type="image/jpeg",
        user_question="Is this food fresh and safe to eat?"
    )

    assert result.user_question == "Is this food fresh and safe to eat?"
    assert result.user_question_answer is not None
    assert "cannot" in result.user_question_answer.lower()
    assert "freshness" in result.user_question_answer.lower() or "safety" in result.user_question_answer.lower()


@pytest.mark.asyncio
async def test_food101_provider_not_loaded_raises_clear_error(monkeypatch):
    """Verify Requirement 8: Shows clear error if model cannot load, never fabricates predictions."""
    from app.ai.food101_provider import Food101ModelManager
    manager = Food101ModelManager()
    manager._is_loaded = False
    manager._load_error = "Model weights file not found on filesystem."

    provider = Food101ClassificationProvider(model_manager=manager)
    image_bytes = create_valid_test_image()

    with pytest.raises(AIProviderError) as exc_info:
        await provider.analyze_food(image_bytes=image_bytes, mime_type="image/jpeg")

    assert "not available" in exc_info.value.message.lower()
    assert "Fabricated/mock results are strictly disallowed" in exc_info.value.message


# ---------------------------------------------------------------------------
# 2. Mock Adapter Unit Tests (Simulated Error Branches)
# ---------------------------------------------------------------------------

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
# 3. Provider Factory & Configuration Enforcement Tests
# ---------------------------------------------------------------------------

def test_factory_returns_food101_when_configured(monkeypatch):
    """Verify factory returns Food101ClassificationProvider when configured."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "food101")
    provider = get_vision_ai_provider()
    assert isinstance(provider, Food101ClassificationProvider)
    assert provider.provider_name == "food101-transformers"


def test_factory_returns_mock_adapter_when_configured(monkeypatch):
    """Verify factory returns MockVisionAIProvider when configured."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")
    provider = get_vision_ai_provider()
    assert isinstance(provider, MockVisionAIProvider)


def test_factory_auto_selects_ollama_when_online(monkeypatch):
    """Verify AI_PROVIDER=auto selects Ollama when local daemon is online."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "auto")
    from app.ai.ollama_provider import OllamaVisionProvider
    monkeypatch.setattr(OllamaVisionProvider, "is_server_online", classmethod(lambda cls, base_url: True))

    provider = get_vision_ai_provider()
    assert isinstance(provider, OllamaVisionProvider)
    assert provider.provider_name == "ollama"


def test_factory_auto_selects_gemini_when_key_configured(monkeypatch):
    """Verify AI_PROVIDER=auto selects Gemini Developer API when GEMINI_API_KEY is configured."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "auto")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test_gemini_key_12345")
    from app.ai.ollama_provider import OllamaVisionProvider
    monkeypatch.setattr(OllamaVisionProvider, "is_server_online", classmethod(lambda cls, base_url: False))

    provider = get_vision_ai_provider()
    assert isinstance(provider, GeminiDeveloperProvider)
    assert provider.provider_name == "gemini"


def test_factory_auto_defaults_to_food101_when_offline(monkeypatch):
    """Verify AI_PROVIDER=auto defaults to local Food-101 when no external providers are present."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "auto")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")
    monkeypatch.setattr(settings, "GCP_PROJECT_ID", "")
    from app.ai.ollama_provider import OllamaVisionProvider
    monkeypatch.setattr(OllamaVisionProvider, "is_server_online", classmethod(lambda cls, base_url: False))

    provider = get_vision_ai_provider()
    assert isinstance(provider, Food101ClassificationProvider)


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

    with pytest.raises(ServiceNotConfiguredError):
        get_vision_ai_provider()


# ---------------------------------------------------------------------------
# 4. Dedicated Endpoint Tests: POST /api/food/analyze
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_food_analyze_success(monkeypatch):
    """Verify POST /api/food/analyze returns 200 and top-3 predicted food categories."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "food101")
    Food101ModelManager.get_instance().load_model(settings.FOOD101_MODEL_NAME)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        image_bytes = create_valid_test_image()
        files = {"file": ("lunch.jpg", image_bytes, "image/jpeg")}
        data = {"meal_type": "Lunch", "question": "Are there any peanuts?"}

        response = await client.post("/api/food/analyze", files=files, data=data)
        assert response.status_code == 200

        body = response.json()
        assert "dish_name" in body
        assert len(body["top_predictions"]) == 3, "Must return top 3 predictions"
        assert body["dish_name"] == body["top_predictions"][0]["category"]
        assert "regional_disclaimer" in body
        assert "visible_ingredients" in body
        assert "potential_ingredients_or_guesses" in body
        assert "visual_uncertainties_and_ambiguities" in body
        assert body["user_question"] == "Are there any peanuts?"
        assert "nutritional_estimate" in body
        assert "provider_metadata" in body


@pytest.mark.asyncio
async def test_v1_vision_analyze_compatibility(monkeypatch):
    """Verify POST /api/v1/vision/analyze also routes correctly and returns top predictions."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "food101")
    Food101ModelManager.get_instance().load_model(settings.FOOD101_MODEL_NAME)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        image_bytes = create_valid_test_image()
        files = {"file": ("lunch.jpg", image_bytes, "image/jpeg")}

        response = await client.post("/api/v1/vision/analyze", files=files)
        assert response.status_code == 200
        body = response.json()
        assert "dish_name" in body
        assert "visible_ingredients" in body


@pytest.mark.asyncio
async def test_api_food_confirm_success(monkeypatch):
    """Verify POST /api/food/confirm loads authentic Indian culinary profile for Pav Bhaji."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "food101")
    Food101ModelManager.get_instance().load_model(settings.FOOD101_MODEL_NAME)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "confirmed_dish": "Pav Bhaji",
            "original_prediction": "Ramen",
            "confidence": 0.3621,
            "top_predictions": [
                {"category": "Ramen", "raw_label": "ramen", "confidence": 0.3621, "percentage": "36.2%"},
                {"category": "Chicken Wings", "raw_label": "chicken_wings", "confidence": 0.2701, "percentage": "27.0%"},
                {"category": "Hamburger", "raw_label": "hamburger", "confidence": 0.1972, "percentage": "19.7%"},
            ],
            "user_question": "Does this have dairy butter?",
        }
        response = await client.post("/api/food/confirm", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert body["is_confirmed"] is True
        assert body["confirmed_dish"] == "Pav Bhaji"
        assert len(body["top_predictions"]) == 3
        assert len(body["visible_ingredients"]) > 0
        assert any("pav" in item.lower() for item in body["visible_ingredients"])
        assert body["nutritional_estimate"]["estimated_calories"] > 0
        assert "Pav Bhaji" in body["nutritional_estimate"]["basis"]
        assert body["user_question_answer"] is not None


@pytest.mark.asyncio
async def test_v1_vision_confirm_compatibility(monkeypatch):
    """Verify POST /api/v1/vision/confirm endpoint also confirms correctly."""
    monkeypatch.setattr(settings, "AI_PROVIDER", "food101")
    Food101ModelManager.get_instance().load_model(settings.FOOD101_MODEL_NAME)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        payload = {
            "confirmed_dish": "Poha",
            "original_prediction": "Fried Rice",
            "confidence": 0.45,
        }
        response = await client.post("/api/v1/vision/confirm", json=payload)
        assert response.status_code == 200
        body = response.json()
        assert body["is_confirmed"] is True
        assert body["confirmed_dish"] == "Poha"
        assert len(body["visible_ingredients"]) > 0



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
