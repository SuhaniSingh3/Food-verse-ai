"""Gemini Developer API vision provider integration."""
import asyncio
import time
from typing import Optional
from app.ai.base import BaseVisionAIProvider
from app.ai.prompts import FOOD_ANALYSIS_SYSTEM_INSTRUCTION, build_food_analysis_prompt
from app.core.errors import AIProviderError, ServiceNotConfiguredError
from app.core.logging import logger
from app.schemas.food_analysis import StructuredFoodAnalysisResponse


class GeminiDeveloperProvider(BaseVisionAIProvider):
    """Integrates with Google AI Studio's Gemini Developer API via the google-genai SDK."""

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-1.5-flash",
        timeout_seconds: int = 25,
    ):
        if not api_key or not api_key.strip() or api_key.startswith("your_"):
            raise ServiceNotConfiguredError(
                service_name="gemini",
                message="Gemini Developer API is selected (AI_PROVIDER=gemini) but GEMINI_API_KEY is not configured. "
                        "Add a valid API key to backend/.env or select AI_PROVIDER=mock for offline development.",
            )
        self._api_key = api_key.strip()
        self._model = model.strip() or "gemini-1.5-flash"
        self._timeout_seconds = timeout_seconds

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model

    async def analyze_food(
        self,
        image_bytes: bytes,
        mime_type: str,
        user_question: Optional[str] = None,
    ) -> StructuredFoodAnalysisResponse:
        start_time = time.perf_counter()

        try:
            from google import genai
            from google.genai import errors, types
        except ImportError as err:
            raise ServiceNotConfiguredError(
                service_name="gemini",
                message="The 'google-genai' SDK is not installed in the Python environment.",
                details={"error": str(err)},
            )

        client = genai.Client(api_key=self._api_key)

        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        user_prompt = build_food_analysis_prompt(user_question)

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StructuredFoodAnalysisResponse,
            system_instruction=FOOD_ANALYSIS_SYSTEM_INSTRUCTION,
            temperature=0.2,
        )

        logger.info(
            f"Invoking Gemini Developer API model '{self._model}' "
            f"(image: {len(image_bytes)} bytes, mime: {mime_type}, has_question: {bool(user_question)})"
        )

        try:
            call_coro = client.aio.models.generate_content(
                model=self._model,
                contents=[image_part, user_prompt],
                config=config,
            )
            response = await asyncio.wait_for(call_coro, timeout=self._timeout_seconds)
        except asyncio.TimeoutError:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.warning(f"Gemini API request timed out after {self._timeout_seconds}s ({duration_ms:.1f}ms elapsed)")
            raise AIProviderError(
                message=f"Gemini API request timed out after {self._timeout_seconds} seconds. Please try again.",
                is_timeout=True,
            )
        except errors.APIError as api_err:
            duration_ms = (time.perf_counter() - start_time) * 1000
            err_str = str(api_err).lower()
            code = getattr(api_err, "code", None)

            if code == 429 or "resource_exhausted" in err_str or "rate limit" in err_str or "quota" in err_str:
                logger.warning(f"Gemini API quota/rate limit encountered ({duration_ms:.1f}ms): {api_err}")
                raise AIProviderError(
                    message="Gemini API rate limit or quota exceeded. Please wait a moment before retrying.",
                    details={"provider": "gemini", "code": 429},
                )

            logger.error(f"Gemini APIError ({duration_ms:.1f}ms): {api_err}", exc_info=True)
            raise AIProviderError(
                message=f"Gemini AI provider returned error (HTTP {code or 'unknown'}): {getattr(api_err, 'message', str(api_err))}",
                details={"provider": "gemini", "code": code},
            )
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(f"Unexpected error communicating with Gemini API: {exc}", exc_info=True)
            raise AIProviderError(
                message=f"Failed to communicate with Gemini AI service: {str(exc)}",
                details={"provider": "gemini"},
            )

        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.info(f"Gemini model response received in {duration_ms:.1f}ms")

        # Extract structured model output
        try:
            if hasattr(response, "parsed") and isinstance(response.parsed, StructuredFoodAnalysisResponse):
                result = response.parsed
            elif hasattr(response, "text") and response.text:
                result = StructuredFoodAnalysisResponse.model_validate_json(response.text)
            else:
                raise ValueError("Model response did not contain valid structured data or text payload.")
        except Exception as parse_err:
            logger.error(f"Failed to parse Gemini response payload into structured schema: {parse_err}")
            raise AIProviderError(
                message=f"Received unstructured or invalid output format from Gemini model: {str(parse_err)}",
                details={"provider": "gemini"},
            )

        # Attach provider runtime metadata
        result.provider_metadata = {
            "provider": self.provider_name,
            "model": self.model_name,
            "latency_ms": round(duration_ms, 1),
            "authenticated_via": "Gemini Developer API Key",
        }
        if user_question:
            result.user_question = user_question

        return result
