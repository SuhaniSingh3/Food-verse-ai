"""AI Recipe Synthesis engine supporting Vertex AI, Gemini Developer API, and dynamic mock generator."""
import asyncio
import time
from typing import List, Optional
from app.ai.recipe_prompts import RECIPE_SYSTEM_INSTRUCTION, audit_recipe_allergens, build_recipe_prompt
from app.core.config import settings
from app.core.errors import AIProviderError, ServiceNotConfiguredError
from app.core.logging import logger
from app.schemas.recipes import (
    RecipeGenerationRequest,
    RecipeGenerationResponse,
    RecipeIngredientQuantity,
    RecipeItem,
    RecipeSubstitution,
)


class RecipeGenerator:
    """Orchestrates structured recipe synthesis across configured AI providers."""

    @classmethod
    async def generate_recipes(cls, request: RecipeGenerationRequest) -> RecipeGenerationResponse:
        provider = settings.AI_PROVIDER.lower().strip()
        start_time = time.perf_counter()

        logger.info(
            f"Generating recipes via provider '{provider}' for {len(request.ingredients)} ingredients. "
            f"Servings: {request.servings}, Time: {request.max_cook_time_minutes}m, Cuisine: {request.cuisine}"
        )

        from app.ai.ollama_provider import OllamaVisionProvider
        ollama_online = OllamaVisionProvider.is_server_online(settings.OLLAMA_BASE_URL)

        if provider == "auto":
            if ollama_online:
                response = await cls._generate_with_ollama(request, start_time)
            elif settings.is_gemini_configured:
                response = await cls._generate_with_gemini(request, start_time)
            elif settings.is_vertexai_configured:
                response = await cls._generate_with_vertexai(request, start_time)
            else:
                response = await cls._generate_with_mock(request, start_time)
        elif provider == "ollama":
            response = await cls._generate_with_ollama(request, start_time)
        elif provider == "vertexai":
            response = await cls._generate_with_vertexai(request, start_time)
        elif provider == "gemini":
            response = await cls._generate_with_gemini(request, start_time)
        elif provider in ("food101", "transformers", "mock"):
            response = await cls._generate_with_mock(request, start_time)
        else:
            raise ServiceNotConfiguredError(
                service_name="recipe_generation",
                message=f"Unsupported AI provider '{provider}'. Choose 'food101', 'auto', 'ollama', 'gemini', 'vertexai', or 'mock'.",
            )

        # Audit all recipes for any allergen conflicts
        for recipe in response.recipes:
            conflicts = audit_recipe_allergens(recipe, request.allergies_and_avoid)
            if conflicts:
                recipe.allergens_flagged.extend(conflicts)
                logger.warning(f"Allergen conflict detected in recipe '{recipe.title}': {conflicts}")

        return response

    @classmethod
    async def _generate_with_ollama(cls, request: RecipeGenerationRequest, start_time: float) -> RecipeGenerationResponse:
        from app.ai.ollama_provider import OllamaVisionProvider
        clean_url = (settings.OLLAMA_BASE_URL or "http://localhost:11434").rstrip("/")
        if not OllamaVisionProvider.is_server_online(clean_url):
            raise ServiceNotConfiguredError(
                service_name="recipe_generation",
                message=f"Local Ollama is not running at {clean_url}. Start Ollama with 'ollama serve' or choose AI_PROVIDER=gemini / mock.",
            )

        import httpx
        import re
        model_name = settings.OLLAMA_MODEL or "llama3.2-vision"
        prompt = build_recipe_prompt(request)
        system_instruction = (
            f"{RECIPE_SYSTEM_INSTRUCTION}\n\n"
            "CRITICAL: Respond ONLY with a valid JSON object matching the RecipeGenerationResponse schema. "
            "Do not include any conversational preamble or text outside the JSON."
        )

        payload = {
            "model": model_name,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt},
            ],
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.3},
        }

        try:
            async with httpx.AsyncClient(timeout=settings.AI_REQUEST_TIMEOUT_SECONDS) as client:
                res = await client.post(f"{clean_url}/api/chat", json=payload)
        except httpx.TimeoutException:
            raise AIProviderError(
                message=f"Local Ollama recipe generation timed out after {settings.AI_REQUEST_TIMEOUT_SECONDS}s.",
                is_timeout=True,
                details={"provider": "ollama", "model": model_name},
            )
        except Exception as exc:
            raise AIProviderError(
                message=f"Failed to communicate with local Ollama for recipe generation: {exc}",
                details={"provider": "ollama"},
            )

        if res.status_code != 200:
            raise AIProviderError(
                message=f"Ollama returned HTTP error {res.status_code} during recipe generation.",
                details={"provider": "ollama", "status_code": res.status_code},
            )

        data = res.json()
        raw_text = data.get("message", {}).get("content", "").strip()
        duration_ms = (time.perf_counter() - start_time) * 1000

        clean_json = raw_text
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
        if match:
            clean_json = match.group(1)

        try:
            result = RecipeGenerationResponse.model_validate_json(clean_json)
        except Exception as parse_err:
            logger.warning(f"Ollama strict JSON validation failed: {parse_err}. Attempting fallback.")
            raise AIProviderError(
                message=f"Ollama model '{model_name}' returned malformed recipe JSON: {parse_err}",
                details={"provider": "ollama", "raw": raw_text[:300]},
            )

        result.provider_metadata = {
            "provider": "ollama",
            "model": model_name,
            "latency_ms": round(duration_ms, 1),
            "servings_synthesized": request.servings,
        }
        return result

    @classmethod
    async def _generate_with_gemini(cls, request: RecipeGenerationRequest, start_time: float) -> RecipeGenerationResponse:
        if not settings.is_gemini_configured:
            raise ServiceNotConfiguredError(
                service_name="recipe_generation",
                message="Gemini Developer API is selected (AI_PROVIDER=gemini) but GEMINI_API_KEY is not configured. "
                        "Add GEMINI_API_KEY to backend/.env or set AI_PROVIDER=mock for offline development.",
            )

        try:
            from google import genai
            from google.genai import errors, types
        except ImportError as err:
            raise ServiceNotConfiguredError(
                service_name="recipe_generation",
                message="google-genai SDK is not installed.",
                details={"error": str(err)},
            )

        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = build_recipe_prompt(request)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RecipeGenerationResponse,
            system_instruction=RECIPE_SYSTEM_INSTRUCTION,
            temperature=0.3,
        )

        try:
            call_coro = client.aio.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=config,
            )
            model_resp = await asyncio.wait_for(call_coro, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            raise AIProviderError(
                message=f"Gemini recipe generation timed out after {settings.AI_REQUEST_TIMEOUT_SECONDS}s.",
                is_timeout=True,
            )
        except errors.APIError as api_err:
            code = getattr(api_err, "code", None)
            if code == 429 or "rate limit" in str(api_err).lower() or "quota" in str(api_err).lower():
                raise AIProviderError(
                    message="Gemini API rate limit exceeded during recipe synthesis. Please try again shortly.",
                    details={"provider": "gemini", "code": 429},
                )
            raise AIProviderError(
                message=f"Gemini API returned error: {getattr(api_err, 'message', str(api_err))}",
                details={"provider": "gemini", "code": code},
            )
        except Exception as exc:
            raise AIProviderError(
                message=f"Failed to generate recipe via Gemini: {str(exc)}",
                details={"provider": "gemini"},
            )

        duration_ms = (time.perf_counter() - start_time) * 1000

        try:
            if hasattr(model_resp, "parsed") and isinstance(model_resp.parsed, RecipeGenerationResponse):
                result = model_resp.parsed
            elif hasattr(model_resp, "text") and model_resp.text:
                result = RecipeGenerationResponse.model_validate_json(model_resp.text)
            else:
                raise ValueError("Model response contained no parsed or text JSON payload.")
        except Exception as parse_err:
            raise AIProviderError(
                message=f"Received malformed output format from Gemini model: {str(parse_err)}",
                details={"provider": "gemini"},
            )

        result.provider_metadata = {
            "provider": "gemini",
            "model": settings.GEMINI_MODEL,
            "latency_ms": round(duration_ms, 1),
            "servings_synthesized": request.servings,
        }
        return result

    @classmethod
    async def _generate_with_vertexai(cls, request: RecipeGenerationRequest, start_time: float) -> RecipeGenerationResponse:
        if not settings.is_vertexai_configured:
            raise ServiceNotConfiguredError(
                service_name="recipe_generation",
                message="Google Cloud Vertex AI is selected (AI_PROVIDER=vertexai) but GCP_PROJECT_ID is not configured. "
                        "Specify GCP_PROJECT_ID in backend/.env.",
            )

        try:
            from google import genai
            from google.genai import errors, types
        except ImportError as err:
            raise ServiceNotConfiguredError(
                service_name="recipe_generation",
                message="google-genai SDK is not installed.",
                details={"error": str(err)},
            )

        client = genai.Client(
            vertexai=True,
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION,
        )
        prompt = build_recipe_prompt(request)
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RecipeGenerationResponse,
            system_instruction=RECIPE_SYSTEM_INSTRUCTION,
            temperature=0.3,
        )

        try:
            call_coro = client.aio.models.generate_content(
                model=settings.GEMINI_MODEL,
                contents=prompt,
                config=config,
            )
            model_resp = await asyncio.wait_for(call_coro, timeout=settings.AI_REQUEST_TIMEOUT_SECONDS)
        except asyncio.TimeoutError:
            raise AIProviderError(
                message=f"Vertex AI recipe generation timed out after {settings.AI_REQUEST_TIMEOUT_SECONDS}s.",
                is_timeout=True,
            )
        except errors.APIError as api_err:
            code = getattr(api_err, "code", None)
            if code == 429 or "rate limit" in str(api_err).lower() or "quota" in str(api_err).lower():
                raise AIProviderError(
                    message="Vertex AI rate limit or quota exceeded. Please try again shortly.",
                    details={"provider": "vertexai", "code": 429},
                )
            raise AIProviderError(
                message=f"Vertex AI returned error: {getattr(api_err, 'message', str(api_err))}",
                details={"provider": "vertexai", "code": code},
            )
        except Exception as exc:
            raise AIProviderError(
                message=f"Failed to generate recipe via Vertex AI: {str(exc)}",
                details={"provider": "vertexai"},
            )

        duration_ms = (time.perf_counter() - start_time) * 1000

        try:
            if hasattr(model_resp, "parsed") and isinstance(model_resp.parsed, RecipeGenerationResponse):
                result = model_resp.parsed
            elif hasattr(model_resp, "text") and model_resp.text:
                result = RecipeGenerationResponse.model_validate_json(model_resp.text)
            else:
                raise ValueError("Model response contained no parsed or text JSON payload.")
        except Exception as parse_err:
            raise AIProviderError(
                message=f"Received malformed output format from Vertex AI: {str(parse_err)}",
                details={"provider": "vertexai"},
            )

        result.provider_metadata = {
            "provider": "vertexai",
            "model": settings.GEMINI_MODEL,
            "latency_ms": round(duration_ms, 1),
            "servings_synthesized": request.servings,
        }
        return result

    @classmethod
    async def _generate_with_mock(cls, request: RecipeGenerationRequest, start_time: float) -> RecipeGenerationResponse:
        """Deterministic synthesis engine tailored to the confirmed dish and user inputs using local catalogue."""
        await asyncio.sleep(0.04)

        # 1. Check verified local recipe catalogue first (Requirement 4)
        from app.ai.local_recipe_catalogue import find_catalogue_recipes
        catalogue_recipes = find_catalogue_recipes(
            dish_name=request.dish_name,
            ingredients=request.ingredients,
            servings=request.servings,
            max_cook_time_minutes=request.max_cook_time_minutes,
        )
        if catalogue_recipes:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return RecipeGenerationResponse(
                recipes=catalogue_recipes,
                matched_ingredients_count=len(request.ingredients),
                disclaimer="Recipes retrieved from verified local culinary catalogue for confirmed dish. Always check allergen labeling.",
                provider_metadata={
                    "provider": "local_recipe_catalogue",
                    "dish_name": request.dish_name or "matched_catalogue_dish",
                    "latency_ms": round(duration_ms, 1),
                    "servings_synthesized": request.servings,
                },
            )

        # 2. Sanitize pantry ingredients: eliminate placeholder phrases (Requirement 5)
        def _sanitize_pantry_label(label: str) -> str:
            cleaned = label.strip()
            # Strip "Primary " prefix
            if cleaned.lower().startswith("primary "):
                cleaned = cleaned[8:].strip()
            # Strip trailing placeholder suffixes
            for suffix in (" portion", " core serving", " main component", " main serving", " serving"):
                if cleaned.lower().endswith(suffix):
                    cleaned = cleaned[:-len(suffix)].strip()
            low = cleaned.lower()
            if "characteristic garnish" in low or "surface texture" in low:
                return "Fresh Culinary Herbs & Aromatics"
            if "accompanying base" in low or "side elements" in low or "side condiments" in low:
                return "Accompanying Culinary Side"
            if "cooking fat & seasoning" in low or "cooking fat & spices" in low:
                return "Cooking Oil & Seasoning"
            return cleaned or "Pantry Ingredient"

        pantry = [_sanitize_pantry_label(i) for i in request.ingredients if i.strip()]
        pantry = [i for i in pantry if i]
        if not pantry:
            raise AIProviderError(
                message="No valid pantry ingredients provided for recipe synthesis.",
                details={"ingredients": request.ingredients},
            )

        lead_ingredient = pantry[0]
        secondary_ingredients = pantry[1:] if len(pantry) > 1 else ["Olive Oil", "Garlic", "Sea Salt"]

        servings = request.servings
        cuisine = request.cuisine if request.cuisine and request.cuisine.lower() != "any" else "Artisanal Kitchen"
        dietary = request.dietary_preference or "Standard"
        difficulty = request.skill_level or "Beginner"

        # Filter out prohibited items from pantry if user specified them in avoid list
        avoid_lower = [a.lower() for a in request.allergies_and_avoid]
        safe_secondary = [
            item for item in secondary_ingredients
            if not any(avoid in item.lower() for avoid in avoid_lower)
        ]

        # Calculate scaled quantities based on servings
        base_quantities_1: List[RecipeIngredientQuantity] = [
            RecipeIngredientQuantity(
                name=lead_ingredient,
                amount=round(120.0 * servings, 1),
                unit="g",
                notes="Freshly prepped and measured",
            )
        ]

        for idx, item in enumerate(safe_secondary[:4]):
            units = ["g", "tbsp", "cloves", "tsp", "cup"]
            chosen_unit = units[idx % len(units)]
            base_amount = [50.0, 1.0, 2.0, 0.5, 0.75][idx % 5]
            base_quantities_1.append(
                RecipeIngredientQuantity(
                    name=item,
                    amount=round(base_amount * servings, 1),
                    unit=chosen_unit,
                    notes="Measured for portion scaling",
                )
            )

        # Cook time calibration
        target_cook = min(request.max_cook_time_minutes, 35)
        prep_time = max(5, int(target_cook * 0.35))
        actual_cook = max(5, target_cook - prep_time)

        # Requirement 6: If dish cannot be matched to verified food-specific recipes,
        # provide a clearly labeled fallback recipe rather than pretending it is personalized.
        is_unverified_dish = bool(request.dish_name and request.dish_name.strip())
        dish_label = request.dish_name.strip() if is_unverified_dish else lead_ingredient

        if is_unverified_dish:
            recipe_1_title = f"Culinary Kitchen Preparation Guide (Fallback for {dish_label})"
            recipe_1_desc = (
                f"A verified authentic recipe for '{dish_label}' is not currently available in the catalogue. "
                f"This clearly labeled culinary fallback guide outlines safe, general kitchen preparation using your available ingredients."
            )
            recipe_1_steps = [
                f"Inspect and prepare {lead_ingredient}: wash produce thoroughly under clean running water, trim any damaged parts, and measure all ingredients.",
                "Prep aromatics and seasonings: peel and finely chop aromatics on a clean cutting board.",
                "Warm cooking vessel: heat a suitable skillet, pan, or saucepan over medium heat with cooking oil or broth.",
                f"Sauté aromatics ({', '.join(safe_secondary[:2]) or 'seasonings'}) gently for 1-2 minutes until fragrant without scorching.",
                f"Incorporate {lead_ingredient} and secondary ingredients; cook thoroughly until tender and safe food temperatures are reached.",
                f"Season to taste with salt, herbs, and spices, then divide evenly across {servings} serving portion(s) and serve warm.",
            ]
            recipe_1_tags = [dietary, "Culinary Fallback", "General Guide", f"{cuisine} Style"]
            disclaimer_msg = (
                f"Authentic recipe instructions for '{dish_label}' could not be dynamically verified. "
                "A clearly labeled general culinary fallback guide is provided instead."
            )
        else:
            recipe_1_title = f"{cuisine} Sautéed {lead_ingredient} Medley"
            recipe_1_desc = f"A flavorful, zero-waste {cuisine.lower()} preparation combining {lead_ingredient} with aromatic pantry seasonings."
            recipe_1_steps = [
                f"Prepare {lead_ingredient}: inspect, wash, and cut into suitable portions for even cooking.",
                "Heat cooking oil in a wide heavy-bottomed skillet over medium-high heat until shimmering.",
                f"Add aromatics ({', '.join(safe_secondary[:2]) or 'seasonings'}) and sauté for 1-2 minutes until fragrant.",
                f"Add {lead_ingredient} and cook evenly, stirring occasionally for {actual_cook} minutes until tender and cooked through.",
                "Remove from heat and let rest for 2 minutes before serving.",
                f"Divide evenly across {servings} serving plate(s) and garnish with fresh herbs or citrus.",
            ]
            recipe_1_tags = [dietary, "Zero-Waste", f"{cuisine} Style"]
            disclaimer_msg = (
                "Recipe recommendations are generated for culinary inspiration. "
                "Verify all packaged ingredients for potential allergens and food safety temperatures."
            )

        recipe_1 = RecipeItem(
            id=f"recipe_{lead_ingredient.lower().replace(' ', '_')}_skillet",
            title=recipe_1_title,
            description=recipe_1_desc,
            cuisine=cuisine,
            difficulty=difficulty,
            prep_time_minutes=prep_time,
            cook_time_minutes=actual_cook,
            base_servings=servings,
            servings=servings,
            ingredient_quantities=base_quantities_1,
            preparation_steps=recipe_1_steps,
            substitutions=[
                RecipeSubstitution(
                    original=lead_ingredient,
                    substitute="Firm Tofu, Mushrooms, or Chickpeas" if "vegan" in dietary.lower() or "vegetarian" in dietary.lower() else "Lean Protein of Choice",
                    notes="Maintains primary protein and textural structure",
                ),
                RecipeSubstitution(
                    original=safe_secondary[0] if safe_secondary else "Cooking Oil",
                    substitute="Avocado Oil, Grapeseed Oil, or Vegetable Broth",
                    notes="Provides high smoke point cooking medium",
                ),
            ],
            dietary_tags=recipe_1_tags,
            allergens_flagged=[],
            allergen_advisory=(
                "Culinary suggestions are inspirational. Always verify manufactured ingredient packaging for "
                "cross-contamination warnings, unlisted additives, and allergen facilities before preparing food for individuals with severe allergies."
            ),
            estimated_calories_per_serving=420,
            protein_g=28.0,
            carbs_g=22.0,
            fat_g=16.0,
        )

        # Recipe 2: Secondary Quick Roasted or Tossed Medley
        base_quantities_2: List[RecipeIngredientQuantity] = [
            RecipeIngredientQuantity(
                name=lead_ingredient,
                amount=round(100.0 * servings, 1),
                unit="g",
                notes="Bite-sized cut",
            )
        ]
        for idx, item in enumerate(safe_secondary[:3]):
            base_quantities_2.append(
                RecipeIngredientQuantity(
                    name=item,
                    amount=round((30.0 + idx * 10) * servings, 1),
                    unit="g",
                    notes="Tossed and incorporated",
                )
            )

        if is_unverified_dish:
            recipe_2_title = f"Simple Kitchen Tossed Bowl (Fallback for {dish_label})"
            recipe_2_desc = f"Secondary culinary fallback preparation guide for {dish_label} using available pantry produce and seasonings."
            recipe_2_steps = [
                f"Inspect and cut {lead_ingredient} and secondary produce into bite-sized pieces.",
                "Toss with olive oil or cooking oil, sea salt, and ground black pepper until evenly coated.",
                f"Sauté in a preheated pan or roast in an oven preheated to 400°F (200°C) for {actual_cook} minutes until tender.",
                "Check tenderness, adjust seasoning to taste with fresh lemon or herbs.",
                f"Assemble into {servings} serving bowl(s) and serve warm.",
            ]
            recipe_2_tags = [dietary, "Culinary Fallback", "Quick & Easy"]
        else:
            recipe_2_title = f"Golden {cuisine} {lead_ingredient} & Herb Medley Bowl"
            recipe_2_desc = f"Nutrient-dense {lead_ingredient} bowl tossed with pan-caramelized vegetables and a zesty finish."
            recipe_2_steps = [
                f"Cut {lead_ingredient} and secondary vegetables into bite-sized pieces.",
                "Toss with olive oil, salt, and pepper until evenly coated.",
                f"Sauté in a preheated pan or roast in an oven preheated to 400°F (200°C) for {actual_cook} minutes.",
                "Check tenderness and season to taste.",
                f"Assemble into {servings} serving bowl(s) and serve hot.",
            ]
            recipe_2_tags = [dietary, "Quick & Easy", "Whole-Food"]

        recipe_2 = RecipeItem(
            id=f"recipe_{lead_ingredient.lower().replace(' ', '_')}_bowl",
            title=recipe_2_title,
            description=recipe_2_desc,
            cuisine=cuisine,
            difficulty="Beginner",
            prep_time_minutes=prep_time,
            cook_time_minutes=actual_cook,
            base_servings=servings,
            servings=servings,
            ingredient_quantities=base_quantities_2,
            preparation_steps=recipe_2_steps,
            substitutions=[
                RecipeSubstitution(
                    original=lead_ingredient,
                    substitute="Tempeh or Lentils" if "vegetarian" in dietary.lower() else "Beans or Grilled Chicken",
                    notes="Direct alternative protein swap",
                )
            ],
            dietary_tags=recipe_2_tags,
            allergens_flagged=[],
            allergen_advisory=(
                "Culinary suggestions are inspirational. Always verify manufactured ingredient packaging for "
                "cross-contamination warnings, unlisted additives, and allergen facilities before preparing food for individuals with severe allergies."
            ),
            estimated_calories_per_serving=380,
            protein_g=24.0,
            carbs_g=35.0,
            fat_g=12.0,
        )

        duration_ms = (time.perf_counter() - start_time) * 1000

        return RecipeGenerationResponse(
            recipes=[recipe_1, recipe_2],
            matched_ingredients_count=len(pantry),
            disclaimer=disclaimer_msg,
            provider_metadata={
                "provider": "dynamic-recipe-synthesizer",
                "model": "catalogue-guided-v2",
                "latency_ms": round(duration_ms, 1),
                "servings_synthesized": servings,
            },
        )

