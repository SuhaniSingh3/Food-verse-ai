"""Food image recognition and ingredient decomposition service."""
import time
from typing import Optional
from app.ai.factory import get_vision_ai_provider
from app.core.logging import logger
from app.schemas.food_analysis import StructuredFoodAnalysisResponse
from app.utils.image_guard import ImageGuard, SanitizedImageResult


class FoodAnalysisService:
    """Orchestrates image validation, AI vision provider execution, and structured food analysis."""

    @classmethod
    async def analyze_food_image(
        cls,
        image_bytes: bytes,
        mime_type: str,
        user_question: Optional[str] = None,
        meal_type: Optional[str] = "Lunch",
        filename: str = "food_image"
    ) -> StructuredFoodAnalysisResponse:
        start_time = time.perf_counter()

        # 1. Image security validation, dimension clamping, and EXIF sanitization
        sanitized: SanitizedImageResult = ImageGuard.validate_and_sanitize(
            file_bytes=image_bytes,
            declared_mime_type=mime_type,
            filename=filename,
        )

        logger.info(
            f"Validated image for food analysis: {sanitized.width}x{sanitized.height} {sanitized.format} "
            f"({len(sanitized.raw_bytes)} bytes). Meal type: {meal_type}, Has question: {bool(user_question)}"
        )

        # 2. Acquire configured AI vision provider (Vertex AI, Gemini Developer API, or Mock)
        provider = get_vision_ai_provider()

        # 3. Execute multimodal analysis
        result = await provider.analyze_food(
            image_bytes=sanitized.raw_bytes,
            mime_type=sanitized.mime_type,
            user_question=user_question,
        )

        total_elapsed_ms = (time.perf_counter() - start_time) * 1000
        result.provider_metadata["total_service_ms"] = round(total_elapsed_ms, 1)

        return result
