"""Cooking assistant and dynamic recipe synthesis service."""
from typing import List
from app.core.config import settings
from app.core.errors import AIProviderError, ServiceNotConfiguredError
from app.core.logging import logger
from app.schemas.recipes import RecipeGenerationRequest, RecipeGenerationResponse


class RecipeService:
    """Service orchestrating pantry-based recipe generation."""

    @classmethod
    async def generate_recipes(cls, request: RecipeGenerationRequest) -> RecipeGenerationResponse:
        clean_ingredients = [item.strip() for item in request.ingredients if item.strip()]
        if not clean_ingredients:
            raise ServiceNotConfiguredError(
                service_name="recipe_generation",
                message="At least one non-empty pantry ingredient must be provided.",
            )

        logger.info(
            f"Received recipe generation request with {len(clean_ingredients)} ingredients. "
            f"Dietary: {request.dietary_preferences}, Max time: {request.max_cook_time_minutes}m"
        )

        # Check AI provider configuration
        if settings.AI_PROVIDER == "gemini":
            if not settings.is_gemini_configured:
                raise ServiceNotConfiguredError(
                    service_name="recipe_generation",
                    message="Google Cloud Gemini text model provider is not configured. "
                            "Provide a valid GEMINI_API_KEY in backend/.env to synthesize live recipes.",
                )

            try:
                # Live Gemini text call with timeout
                raise ServiceNotConfiguredError(
                    service_name="recipe_generation",
                    message="Gemini recipe prompt orchestrator is in active development for Phase 3."
                )
            except ServiceNotConfiguredError:
                raise
            except Exception as err:
                logger.error(f"AI Provider error during recipe generation: {err}", exc_info=True)
                raise AIProviderError(
                    message=f"Google Gemini recipe generation call failed: {str(err)}",
                    is_timeout=False,
                )

        # In mock or unconfigured mode, return explicit not-configured response
        raise ServiceNotConfiguredError(
            service_name="recipe_generation",
            message="Smart Cooking Assistant service requires an active Google Cloud Gemini integration. "
                    "Set AI_PROVIDER=gemini and provide GEMINI_API_KEY in backend/.env to run live recipe generation.",
            details={
                "configured_provider": settings.AI_PROVIDER,
                "submitted_ingredients": clean_ingredients,
            }
        )
