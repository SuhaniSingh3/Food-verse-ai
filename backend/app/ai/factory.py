"""AI Vision Provider Factory respecting strict configuration and environment selection."""
from app.ai.base import BaseVisionAIProvider
from app.ai.food101_provider import Food101ClassificationProvider
from app.ai.gemini_provider import GeminiDeveloperProvider
from app.ai.mock_provider import MockVisionAIProvider
from app.ai.ollama_provider import OllamaVisionProvider
from app.ai.vertex_provider import VertexAIGeminiProvider
from app.core.config import settings
from app.core.errors import ServiceNotConfiguredError
from app.core.logging import logger


def get_vision_ai_provider() -> BaseVisionAIProvider:
    """Instantiate and return the configured AI vision provider.

    Behavior:
    1. 'food101' / 'transformers': Uses the pretrained Hugging Face Food-101 model.
    2. 'mock': Replaced with real Food-101 model (preserving simulation test hooks).
    3. 'auto': Checks local Ollama, then free Gemini API, then Vertex AI.
       If none of those are configured, uses the real local Food-101 model (100% free, local, offline).
    4. 'ollama': Explicit Local Ollama.
    5. 'gemini': Explicit Gemini Developer API.
    6. 'vertexai': Explicit Google Cloud Vertex AI.
    """
    provider_key = settings.AI_PROVIDER.lower().strip()

    if provider_key in ("food101", "transformers"):
        logger.info(f"Using Hugging Face Food-101 classification provider (Model: '{settings.FOOD101_MODEL_NAME}')")
        return Food101ClassificationProvider()

    elif provider_key == "mock":
        logger.info(f"Using Food-101 provider via MockVisionAIProvider adapter (Model: '{settings.FOOD101_MODEL_NAME}')")
        return MockVisionAIProvider()

    elif provider_key == "auto":
        # 1. Prefer local Ollama if online
        if OllamaVisionProvider.is_server_online(settings.OLLAMA_BASE_URL):
            logger.info(f"Auto-selected Local Ollama vision provider at {settings.OLLAMA_BASE_URL}")
            return OllamaVisionProvider(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_MODEL,
                timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
            )

        # 2. Prefer free-tier Gemini Developer API if API key is provided
        if settings.is_gemini_configured:
            logger.info(f"Auto-selected Gemini Developer API provider (Model: '{settings.GEMINI_MODEL}')")
            return GeminiDeveloperProvider(
                api_key=settings.GEMINI_API_KEY,
                model=settings.GEMINI_MODEL,
                timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
            )

        # 3. Google Cloud Vertex AI if configured
        if settings.is_vertexai_configured:
            logger.info(f"Auto-selected Google Cloud Vertex AI provider (Project: '{settings.GCP_PROJECT_ID}')")
            return VertexAIGeminiProvider(
                project_id=settings.GCP_PROJECT_ID,
                location=settings.GCP_LOCATION,
                model=settings.GEMINI_MODEL,
                credentials_path=settings.GOOGLE_APPLICATION_CREDENTIALS or None,
                timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
            )

        # 4. Default to local Food-101 model (100% free, local, offline, no paid API or Ollama needed)
        logger.info(f"Auto-selected local Food-101 classification provider (Model: '{settings.FOOD101_MODEL_NAME}')")
        return Food101ClassificationProvider()

    elif provider_key == "ollama":
        logger.info(f"Initializing Local Ollama vision provider (Endpoint: '{settings.OLLAMA_BASE_URL}')")
        return OllamaVisionProvider(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
        )

    elif provider_key == "gemini":
        logger.info(f"Initializing Gemini Developer API provider (Model: '{settings.GEMINI_MODEL}')")
        return GeminiDeveloperProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
            timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
        )

    elif provider_key == "vertexai":
        logger.info(f"Initializing Google Cloud Vertex AI provider (Project: '{settings.GCP_PROJECT_ID}', Location: '{settings.GCP_LOCATION}')")
        return VertexAIGeminiProvider(
            project_id=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION,
            model=settings.GEMINI_MODEL,
            credentials_path=settings.GOOGLE_APPLICATION_CREDENTIALS or None,
            timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
        )

    else:
        raise ServiceNotConfiguredError(
            service_name="food_vision",
            message=f"Unknown AI provider '{provider_key}'. Supported options are 'food101', 'transformers', 'auto', 'ollama', 'gemini', 'vertexai', and 'mock'.",
        )
