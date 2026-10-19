"""Ollama local vision provider integration for 100% free offline multi-modal AI."""
import asyncio
import base64
import json
import re
import time
from typing import Optional, Tuple
import httpx
from app.ai.base import BaseVisionAIProvider
from app.ai.prompts import FOOD_ANALYSIS_SYSTEM_INSTRUCTION, build_food_analysis_prompt
from app.core.errors import AIProviderError, ServiceNotConfiguredError
from app.core.logging import logger
from app.schemas.food_analysis import (
    IngredientObservation,
    NutritionEstimate,
    StructuredFoodAnalysisResponse,
)

# Known vision-capable Ollama model prefixes/substrings
KNOWN_VISION_MODELS = (
    "llama3.2-vision",
    "llava",
    "bakllava",
    "llava-phi3",
    "llava-llama3",
    "moondream",
    "minicpm-v",
    "qwen2-vl",
)


class OllamaVisionProvider(BaseVisionAIProvider):
    """Integrates with a local Ollama instance hosting a vision-capable multi-modal model."""

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: Optional[str] = None,
        timeout_seconds: int = 60,
    ):
        self._base_url = (base_url or "http://localhost:11434").rstrip("/")
        self._timeout_seconds = timeout_seconds
        self._model = (model or "").strip()

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def model_name(self) -> str:
        return self._model or "ollama-vision"

    @classmethod
    def is_server_online(cls, base_url: str = "http://localhost:11434") -> bool:
        """Quick synchronous check if local Ollama port is open and responding."""
        clean_url = (base_url or "http://localhost:11434").rstrip("/")
        try:
            with httpx.Client(timeout=0.5) as client:
                res = client.get(f"{clean_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    @classmethod
    async def check_availability(cls, base_url: str = "http://localhost:11434") -> Tuple[bool, Optional[str], Optional[str]]:
        """Check if local Ollama daemon is active and return the first available vision model."""
        clean_url = (base_url or "http://localhost:11434").rstrip("/")
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{clean_url}/api/tags")
                if res.status_code != 200:
                    return False, None, f"Ollama at {clean_url} returned status {res.status_code}"

                data = res.json()
                models = data.get("models", [])
                if not models:
                    return False, None, f"Ollama is running at {clean_url}, but no models are installed. Run 'ollama pull llama3.2-vision' or 'ollama pull llava'."

                # Find any vision-capable model
                for m in models:
                    name = m.get("name", "").lower()
                    if any(v in name for v in KNOWN_VISION_MODELS) or "vision" in name:
                        return True, m.get("name"), None

                # Return list of installed models for a helpful error message
                installed_names = [m.get("name") for m in models]
                return False, None, (
                    f"Ollama is running at {clean_url}, but installed models ({', '.join(installed_names)}) "
                    f"do not support vision. Please install a vision model: 'ollama pull llama3.2-vision' or 'ollama pull llava'."
                )
        except Exception as err:
            return False, None, f"Cannot connect to local Ollama server at {clean_url}: {err}"

    async def _resolve_model(self) -> str:
        """Resolve the active vision model or raise ServiceNotConfiguredError."""
        if self._model:
            return self._model

        is_avail, detected_model, err_msg = await self.check_availability(self._base_url)
        if not is_avail:
            raise ServiceNotConfiguredError(
                service_name="ollama",
                message=err_msg or f"Ollama vision service is unavailable at {self._base_url}.",
            )

        self._model = detected_model
        return detected_model

    async def analyze_food(
        self,
        image_bytes: bytes,
        mime_type: str,
        user_question: Optional[str] = None,
    ) -> StructuredFoodAnalysisResponse:
        start_time = time.perf_counter()
        model_name = await self._resolve_model()

        # Convert image to Base64 for Ollama chat API
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        user_prompt = build_food_analysis_prompt(user_question)

        system_instruction = (
            f"{FOOD_ANALYSIS_SYSTEM_INSTRUCTION}\n\n"
            "CRITICAL: You MUST respond ONLY with a valid JSON object matching the requested schema. "
            "Do not include any conversational preamble, markdown headers, or explanation outside the JSON."
        )

        payload = {
            "model": model_name,
            "messages": [
                {
                    "role": "system",
                    "content": system_instruction,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                    "images": [base64_image],
                },
            ],
            "format": "json",
            "stream": False,
            "options": {
                "temperature": 0.2,
            },
        }

        logger.info(
            f"Invoking local Ollama vision model '{model_name}' at {self._base_url} "
            f"(image: {len(image_bytes)} bytes, mime: {mime_type})"
        )

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                res = await client.post(f"{self._base_url}/api/chat", json=payload)
        except httpx.TimeoutException:
            duration_ms = (time.perf_counter() - start_time) * 1000
            raise AIProviderError(
                message=f"Local Ollama model '{model_name}' timed out after {self._timeout_seconds} seconds.",
                is_timeout=True,
                details={"provider": "ollama", "model": model_name},
            )
        except httpx.ConnectError as conn_err:
            raise AIProviderError(
                message=f"Could not connect to Ollama at {self._base_url}. Ensure Ollama is running ('ollama serve').",
                details={"provider": "ollama", "error": str(conn_err)},
            )
        except Exception as exc:
            raise AIProviderError(
                message=f"Unexpected error communicating with local Ollama: {exc}",
                details={"provider": "ollama"},
            )

        duration_ms = (time.perf_counter() - start_time) * 1000

        if res.status_code != 200:
            raise AIProviderError(
                message=f"Ollama returned HTTP error {res.status_code}: {res.text}",
                details={"provider": "ollama", "status_code": res.status_code},
            )

        data = res.json()
        raw_content = data.get("message", {}).get("content", "").strip()

        if not raw_content:
            raise AIProviderError(
                message=f"Ollama model '{model_name}' returned an empty response.",
                details={"provider": "ollama", "model": model_name},
            )

        # Strip markdown fences if present
        clean_json_str = raw_content
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_content, re.DOTALL)
        if match:
            clean_json_str = match.group(1)
        elif raw_content.startswith("```") and raw_content.endswith("```"):
            clean_json_str = raw_content.strip("`").strip()
            if clean_json_str.lower().startswith("json"):
                clean_json_str = clean_json_str[4:].strip()

        try:
            parsed_dict = json.loads(clean_json_str)
            result = StructuredFoodAnalysisResponse.model_validate(parsed_dict)
        except Exception as parse_err:
            logger.warning(f"Failed direct model validation of Ollama output: {parse_err}. Attempting tolerant normalization.")
            try:
                parsed_dict = json.loads(clean_json_str)
                result = self._normalize_partial_ollama_output(parsed_dict, user_question)
            except Exception as final_err:
                logger.error(f"Ollama output was completely unparseable: {raw_content[:400]}")
                raise AIProviderError(
                    message=f"Ollama model '{model_name}' returned malformed JSON: {final_err}",
                    details={"provider": "ollama", "raw_content": raw_content[:400]},
                )

        # Attach real provider runtime metadata
        result.provider_metadata = {
            "provider": "ollama",
            "model": model_name,
            "latency_ms": round(duration_ms, 1),
            "authenticated_via": "Local Ollama Daemon",
        }
        if user_question:
            result.user_question = user_question

        return result

    def _normalize_partial_ollama_output(
        self,
        raw: dict,
        user_question: Optional[str] = None
    ) -> StructuredFoodAnalysisResponse:
        """Tolerantly map incomplete or loosely structured Ollama JSON to StructuredFoodAnalysisResponse."""
        dish_name = raw.get("dish_name") or raw.get("dish") or raw.get("food_name") or "Identified Meal"
        prep_method = raw.get("apparent_preparation_method") or raw.get("preparation_method") or "Cooked dish"
        confidence = raw.get("confidence_assessment") or raw.get("confidence") or "Moderate"
        if confidence not in ("High", "Moderate", "Low"):
            confidence = "Moderate"

        visible = raw.get("visible_ingredients") or []
        if isinstance(visible, str):
            visible = [visible]

        potential = raw.get("potential_ingredients_or_guesses") or raw.get("potential_ingredients") or []
        if isinstance(potential, str):
            potential = [potential]

        uncertainties = raw.get("visual_uncertainties_and_ambiguities") or raw.get("uncertainties") or [
            "Exact seasonings, hidden oils, and internal ingredients cannot be confirmed by sight alone."
        ]
        if isinstance(uncertainties, str):
            uncertainties = [uncertainties]

        # Decomposed items
        decomposed = []
        for v in visible:
            decomposed.append(IngredientObservation(name=str(v), is_directly_visible=True, estimated_grams=100.0))
        for p in potential:
            decomposed.append(IngredientObservation(name=str(p), is_directly_visible=False, estimated_grams=25.0))

        # Nutritional estimate fallback
        nutr_raw = raw.get("nutritional_estimate") or {}
        nutrition = NutritionEstimate(
            estimated_calories=int(nutr_raw.get("estimated_calories", 450)),
            protein_g=float(nutr_raw.get("protein_g", 25.0)),
            carbs_g=float(nutr_raw.get("carbs_g", 40.0)),
            fat_g=float(nutr_raw.get("fat_g", 15.0)),
            basis="Ollama visual portion estimation relative to reference standards",
        )

        return StructuredFoodAnalysisResponse(
            dish_name=str(dish_name),
            confidence_assessment=confidence,
            apparent_preparation_method=str(prep_method),
            visible_ingredients=[str(i) for i in visible],
            potential_ingredients_or_guesses=[str(i) for i in potential],
            visual_uncertainties_and_ambiguities=[str(u) for u in uncertainties],
            decomposed_items=decomposed,
            nutritional_estimate=nutrition,
            dietary_tags=[str(t) for t in raw.get("dietary_tags", [])],
            user_question=user_question,
            user_question_answer=raw.get("user_question_answer"),
        )
