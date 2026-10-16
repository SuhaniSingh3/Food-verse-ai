"""AI Vision Provider Factory respecting strict configuration and environment selection."""
from app.ai.base import BaseVisionAIProvider
from app.ai.gemini_provider import GeminiDeveloperProvider
from app.ai.mock_provider import MockVisionAIProvider
from app.ai.vertex_provider import VertexAIGeminiProvider
from app.core.config import settings
from app.core.errors import ServiceNotConfiguredError
from app.core.logging import logger


def get_vision_ai_provider() -> BaseVisionAIProvider:
    """Instantiate and return the configured AI vision provider.

    STRICT BEHAVIOR RULES:
    1. Reads settings.AI_PROVIDER ('vertexai', 'gemini', or 'mock').
    2. NEVER silently switches between providers. If the selected provider is missing
       requisite credentials or configuration, raises ServiceNotConfiguredError (HTTP 501).
    3. Never hardcodes credentials or API keys.
    """
    provider_key = settings.AI_PROVIDER.lower().strip()

    if provider_key == "vertexai":
        # Google Cloud Vertex AI integration
        logger.info(f"Initializing Google Cloud Vertex AI provider (Project: '{settings.GCP_PROJECT_ID}', Location: '{settings.GCP_LOCATION}')")
        return VertexAIGeminiProvider(
            project_id=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION,
            model=settings.GEMINI_MODEL,
            credentials_path=settings.GOOGLE_APPLICATION_CREDENTIALS or None,
            timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
        )

    elif provider_key == "gemini":
        # Gemini Developer API integration
        logger.info(f"Initializing Gemini Developer API provider (Model: '{settings.GEMINI_MODEL}')")
        return GeminiDeveloperProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
            timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
        )

    elif provider_key == "mock":
        # Test / offline development mode
        logger.info("Initializing Mock Vision AI provider (deterministic offline testing)")
        return MockVisionAIProvider()

    else:
        raise ServiceNotConfiguredError(
            service_name="food_vision",
            message=f"Unknown AI provider '{provider_key}'. Supported options are 'vertexai', 'gemini', and 'mock'.",
        )
