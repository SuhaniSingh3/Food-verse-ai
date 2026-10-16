"""Food image recognition and ingredient decomposition service."""
import time
from typing import Optional
from app.core.config import settings
from app.core.errors import AIProviderError, ServiceNotConfiguredError
from app.core.logging import logger
from app.schemas.vision import FoodItem, VisionAnalysisResponse
from app.utils.image_guard import ImageGuard, SanitizedImageResult


class FoodAnalysisService:
    """Orchestrates image sanitization, AI vision model inference, and ingredient analysis."""

    @classmethod
    async def analyze_food_image(
        cls,
        image_bytes: bytes,
        mime_type: str,
        meal_type: Optional[str] = "Lunch",
        filename: str = "food_image"
    ) -> VisionAnalysisResponse:
        start_time = time.perf_counter()

        # 1. Image security validation & EXIF sanitization
        sanitized: SanitizedImageResult = ImageGuard.validate_and_sanitize(
            file_bytes=image_bytes,
            declared_mime_type=mime_type,
            filename=filename,
        )

        logger.info(
            f"Validated image for food analysis: {sanitized.width}x{sanitized.height} {sanitized.format} "
            f"({len(sanitized.raw_bytes)} bytes). Meal type: {meal_type}"
        )

        # 2. Check AI Provider configuration
        if settings.AI_PROVIDER == "gemini":
            if not settings.is_gemini_configured:
                raise ServiceNotConfiguredError(
                    service_name="food_analysis",
                    message="Google Cloud Gemini Vision provider is not configured. "
                            "Provide a valid GEMINI_API_KEY in backend/.env to enable live image decomposition.",
                )

            # Live Gemini Vision inference
            try:
                from google import genai
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                # Model inference with timeout
                # When GEMINI_API_KEY is supplied, client analyzes image
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=[
                        genai.types.Part.from_bytes(data=sanitized.raw_bytes, mime_type=sanitized.mime_type),
                        "Identify the dish, decompose all food ingredients with estimated gram weights and dietary tags. Respond strictly in JSON."
                    ]
                )
                duration_ms = (time.perf_counter() - start_time) * 1000
                logger.info(f"Gemini Vision inference completed in {duration_ms:.1f}ms")
                # Parse model response or return structured output
                raise ServiceNotConfiguredError(
                    service_name="food_analysis",
                    message="Gemini model response parsing is in active development for Phase 2."
                )
            except ServiceNotConfiguredError:
                raise
            except Exception as err:
                logger.error(f"AI Provider error during vision inference: {err}", exc_info=True)
                raise AIProviderError(
                    message=f"Google Gemini model call failed: {str(err)}",
                    is_timeout=False,
                )

        # In mock or unconfigured mode, explicitly inform caller per project requirements
        raise ServiceNotConfiguredError(
            service_name="food_analysis",
            message="Food image recognition service requires an active Google Cloud Gemini integration. "
                    "Set AI_PROVIDER=gemini and provide GEMINI_API_KEY in backend/.env to run live inference.",
            details={
                "configured_provider": settings.AI_PROVIDER,
                "sanitized_image": {
                    "width": sanitized.width,
                    "height": sanitized.height,
                    "format": sanitized.format,
                    "size_bytes": len(sanitized.raw_bytes),
                }
            }
        )
