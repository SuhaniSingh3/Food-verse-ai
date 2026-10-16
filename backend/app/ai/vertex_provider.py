"""Google Cloud Vertex AI vision provider integration."""
import asyncio
import os
import time
from typing import Optional
from app.ai.base import BaseVisionAIProvider
from app.ai.prompts import FOOD_ANALYSIS_SYSTEM_INSTRUCTION, build_food_analysis_prompt
from app.core.errors import AIProviderError, ServiceNotConfiguredError
from app.core.logging import logger
from app.schemas.food_analysis import StructuredFoodAnalysisResponse


class VertexAIGeminiProvider(BaseVisionAIProvider):
    """Integrates with Google Cloud Vertex AI Gemini models via the google-genai SDK."""

    def __init__(
        self,
        project_id: str,
        location: str = "us-central1",
        model: str = "gemini-1.5-flash",
        credentials_path: Optional[str] = None,
        timeout_seconds: int = 25,
    ):
        if not project_id or not project_id.strip() or project_id.startswith("your_"):
            raise ServiceNotConfiguredError(
                service_name="vertexai",
                message="Google Cloud Vertex AI is selected (AI_PROVIDER=vertexai) but GCP_PROJECT_ID is not configured. "
                        "Specify your Google Cloud Project ID in backend/.env.",
                details={"guide": "docs/AI_PROVIDER_GUIDE.md"}
            )

        self._project_id = project_id.strip()
        self._location = location.strip() or "us-central1"
        self._model = model.strip() or "gemini-1.5-flash"
        self._credentials_path = credentials_path.strip() if credentials_path else None
        self._timeout_seconds = timeout_seconds

        # If a service account file is specified, verify its existence and set environment
        if self._credentials_path:
            if not os.path.isfile(self._credentials_path):
                raise ServiceNotConfiguredError(
                    service_name="vertexai",
                    message=f"Service account key file not found at: '{self._credentials_path}'. "
                            f"Check GOOGLE_APPLICATION_CREDENTIALS path in backend/.env.",
                )
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = self._credentials_path

    @property
    def provider_name(self) -> str:
        return "vertexai"

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
            from google.auth.exceptions import DefaultCredentialsError
        except ImportError as err:
            raise ServiceNotConfiguredError(
                service_name="vertexai",
                message="Google Cloud libraries ('google-genai', 'google-auth') are not available.",
                details={"error": str(err)},
            )

        # Initialize Vertex AI client
        try:
            client = genai.Client(
                vertexai=True,
                project=self._project_id,
                location=self._location,
            )
        except DefaultCredentialsError as cred_err:
            logger.error(f"Google Cloud Application Default Credentials missing: {cred_err}")
            raise ServiceNotConfiguredError(
                service_name="vertexai",
                message="Google Cloud Application Default Credentials (ADC) were not found. "
                        "To authenticate for local development, run: 'gcloud auth application-default login' "
                        "or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file.",
                details={"error": str(cred_err)},
            )
        except Exception as init_err:
            logger.error(f"Failed to initialize Vertex AI client: {init_err}", exc_info=True)
            raise AIProviderError(
                message=f"Vertex AI initialization error: {str(init_err)}",
                details={"provider": "vertexai"},
            )

        image_part = types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
        user_prompt = build_food_analysis_prompt(user_question)

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=StructuredFoodAnalysisResponse,
            system_instruction=FOOD_ANALYSIS_SYSTEM_INSTRUCTION,
            temperature=0.2,
        )

        logger.info(
            f"Invoking Vertex AI Gemini model '{self._model}' in project '{self._project_id}' ({self._location}) "
            f"[image: {len(image_bytes)} bytes, mime: {mime_type}]"
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
            logger.warning(f"Vertex AI request timed out after {self._timeout_seconds}s ({duration_ms:.1f}ms elapsed)")
            raise AIProviderError(
                message=f"Vertex AI request timed out after {self._timeout_seconds} seconds. Please try again.",
                is_timeout=True,
            )
        except errors.APIError as api_err:
            duration_ms = (time.perf_counter() - start_time) * 1000
            err_str = str(api_err).lower()
            code = getattr(api_err, "code", None)

            if code == 429 or "resource_exhausted" in err_str or "rate limit" in err_str or "quota" in err_str:
                logger.warning(f"Vertex AI quota/rate limit encountered ({duration_ms:.1f}ms): {api_err}")
                raise AIProviderError(
                    message="Vertex AI quota exceeded or rate limit reached. Check GCP quota or retry shortly.",
                    details={"provider": "vertexai", "code": 429},
                )

            if "aiplatform.googleapis.com" in err_str and ("disabled" in err_str or "not enabled" in err_str):
                raise ServiceNotConfiguredError(
                    service_name="vertexai",
                    message=f"Vertex AI API (aiplatform.googleapis.com) is not enabled on project '{self._project_id}'. "
                            f"Enable it via the Google Cloud Console or: gcloud services enable aiplatform.googleapis.com",
                )

            logger.error(f"Vertex AI APIError ({duration_ms:.1f}ms): {api_err}", exc_info=True)
            raise AIProviderError(
                message=f"Google Cloud Vertex AI returned error (HTTP {code or 'unknown'}): {getattr(api_err, 'message', str(api_err))}",
                details={"provider": "vertexai", "code": code},
            )
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.error(f"Unexpected error communicating with Vertex AI: {exc}", exc_info=True)
            raise AIProviderError(
                message=f"Failed to communicate with Vertex AI service: {str(exc)}",
                details={"provider": "vertexai"},
            )

        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.info(f"Vertex AI model response received in {duration_ms:.1f}ms")

        # Extract structured model output
        try:
            if hasattr(response, "parsed") and isinstance(response.parsed, StructuredFoodAnalysisResponse):
                result = response.parsed
            elif hasattr(response, "text") and response.text:
                result = StructuredFoodAnalysisResponse.model_validate_json(response.text)
            else:
                raise ValueError("Model response did not contain valid structured data or text payload.")
        except Exception as parse_err:
            logger.error(f"Failed to parse Vertex AI response into structured schema: {parse_err}")
            raise AIProviderError(
                message=f"Received unstructured or invalid output format from Vertex AI: {str(parse_err)}",
                details={"provider": "vertexai"},
            )

        auth_method = "Service Account JSON" if self._credentials_path else "Application Default Credentials (ADC)"
        result.provider_metadata = {
            "provider": self.provider_name,
            "project_id": self._project_id,
            "location": self._location,
            "model": self.model_name,
            "latency_ms": round(duration_ms, 1),
            "authenticated_via": auth_method,
        }
        if user_question:
            result.user_question = user_question

        return result
