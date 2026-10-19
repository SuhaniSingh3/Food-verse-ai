"""Mock AI vision provider replaced with the real Food-101 classification provider.

Preserves simulated error hooks for testing while delegating all real predictions
to the pretrained Hugging Face Food-101 model. Never returns fabricated static output.
"""
import asyncio
from typing import Optional
from app.ai.base import BaseVisionAIProvider
from app.ai.food101_provider import Food101ClassificationProvider, Food101ModelManager
from app.core.config import settings
from app.core.errors import AIProviderError
from app.schemas.food_analysis import StructuredFoodAnalysisResponse


class MockVisionAIProvider(BaseVisionAIProvider):
    """Replaced Mock Vision Provider that delegates to the real Food-101 Transformers model."""

    def __init__(
        self,
        simulate_timeout: bool = False,
        simulate_rate_limit: bool = False,
        simulate_error: bool = False,
    ):
        self._simulate_timeout = simulate_timeout
        self._simulate_rate_limit = simulate_rate_limit
        self._simulate_error = simulate_error
        self._real_provider = Food101ClassificationProvider()

    @property
    def provider_name(self) -> str:
        return "food101-transformers"

    @property
    def model_name(self) -> str:
        return self._real_provider.model_name

    async def analyze_food(
        self,
        image_bytes: bytes,
        mime_type: str,
        user_question: Optional[str] = None,
    ) -> StructuredFoodAnalysisResponse:
        # Check simulated test error flags first (for unit test suite)
        if self._simulate_timeout:
            raise AIProviderError(
                message="Simulated AI model request timeout after 25 seconds.",
                is_timeout=True,
            )

        if self._simulate_rate_limit:
            raise AIProviderError(
                message="Simulated AI rate limit exceeded (HTTP 429).",
                details={"provider": "mock", "code": 429},
            )

        if self._simulate_error:
            raise AIProviderError(
                message="Simulated upstream AI provider connection error.",
                details={"provider": "mock"},
            )

        # Ensure model is initialized
        manager = Food101ModelManager.get_instance()
        if not manager.is_loaded:
            # Attempt loading once if not loaded yet
            try:
                manager.load_model(settings.FOOD101_MODEL_NAME)
            except Exception as e:
                raise AIProviderError(
                    message=f"Food-101 model failed to load: {e}. Fabricated mock predictions are prohibited.",
                    details={"error": str(e)},
                )

        return await self._real_provider.analyze_food(
            image_bytes=image_bytes,
            mime_type=mime_type,
            user_question=user_question,
        )

    def confirm_dish(
        self,
        confirmed_dish: str,
        original_prediction: Optional[str] = None,
        confidence: Optional[float] = None,
        top_predictions: Optional[list] = None,
        user_question: Optional[str] = None,
    ) -> StructuredFoodAnalysisResponse:
        return self._real_provider.confirm_dish(
            confirmed_dish=confirmed_dish,
            original_prediction=original_prediction,
            confidence=confidence,
            top_predictions=top_predictions,
            user_question=user_question,
        )

