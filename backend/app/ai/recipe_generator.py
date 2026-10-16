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

        if provider == "vertexai":
            response = await cls._generate_with_vertexai(request, start_time)
        elif provider == "gemini":
            response = await cls._generate_with_gemini(request, start_time)
        elif provider == "mock":
            response = await cls._generate_with_mock(request, start_time)
        else:
            raise ServiceNotConfiguredError(
                service_name="recipe_generation",
                message=f"Unsupported AI provider '{provider}'. Choose 'vertexai', 'gemini', or 'mock'.",
            )

        # Audit all recipes for any allergen conflicts
        for recipe in response.recipes:
            conflicts = audit_recipe_allergens(recipe, request.allergies_and_avoid)
            if conflicts:
                recipe.allergens_flagged.extend(conflicts)
                logger.warning(f"Allergen conflict detected in recipe '{recipe.title}': {conflicts}")

        return response

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
        """Deterministic, highly dynamic synthesis engine tailored to the exact user inputs."""
        await asyncio.sleep(0.06)

        # Primary and secondary pantry items
        pantry = [i.strip() for i in request.ingredients if i.strip()]
        lead_ingredient = pantry[0] if pantry else "Seasonal Vegetables"
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
                notes="Freshly prepped and trimmed",
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

        recipe_1 = RecipeItem(
            id=f"recipe_{lead_ingredient.lower().replace(' ', '_')}_skillet",
            title=f"{cuisine} Pan-Seared {lead_ingredient} Skillet",
            description=f"A flavorful, zero-waste {cuisine.lower()} preparation highlighting {lead_ingredient} with aromatic pantry seasonings.",
            cuisine=cuisine,
            difficulty=difficulty,
            prep_time_minutes=prep_time,
            cook_time_minutes=actual_cook,
            base_servings=servings,
            servings=servings,
            ingredient_quantities=base_quantities_1,
            preparation_steps=[
                f"Prepare {lead_ingredient}: rinse, pat dry, and slice into uniform portions for even cooking.",
                f"Heat cooking oil in a wide heavy-bottomed skillet over medium-high heat until shimmering.",
                f"Add aromatics ({', '.join(safe_secondary[:2]) or 'seasonings'}) and sauté for 1 minute until fragrant.",
                f"Carefully add {lead_ingredient} and cook undisturbed for {max(3, actual_cook // 2)} minutes until golden.",
                f"Turn and finish cooking through. Remove from heat and rest 2 minutes before serving.",
                f"Divide evenly across {servings} serving plate(s) and garnish with remaining herbs or citrus.",
            ],
            substitutions=[
                RecipeSubstitution(
                    original=lead_ingredient,
                    substitute=f"Firm Tofu, Mushrooms, or White Beans" if "vegan" in dietary.lower() or "vegetarian" in dietary.lower() else "Chicken Breast or Cod Fillet",
                    notes="Maintains primary protein and textural structure",
                ),
                RecipeSubstitution(
                    original=safe_secondary[0] if safe_secondary else "Cooking Oil",
                    substitute="Avocado Oil, Grapeseed Oil, or Vegetable Broth",
                    notes="Provides high smoke point cooking medium",
                ),
            ],
            dietary_tags=[dietary, "Zero-Waste", f"{cuisine} Style"],
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

        # Recipe 2: Quick Roasted or Stir-Fry Option
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

        recipe_2 = RecipeItem(
            id=f"recipe_{lead_ingredient.lower().replace(' ', '_')}_bowl",
            title=f"Golden {cuisine} {lead_ingredient} & Herb Medley Bowl",
            description=f"Nutrient-dense {lead_ingredient} bowl tossed with pan-caramelized vegetables and a zesty finish.",
            cuisine=cuisine,
            difficulty="Beginner",
            prep_time_minutes=prep_time,
            cook_time_minutes=actual_cook,
            base_servings=servings,
            servings=servings,
            ingredient_quantities=base_quantities_2,
            preparation_steps=[
                f"Chop {lead_ingredient} and secondary vegetables into bite-sized medallions.",
                "Toss with olive oil, salt, and pepper until evenly coated.",
                f"Sauté in a preheated pan or roast in an oven preheated to 400°F (200°C) for {actual_cook} minutes.",
                f"Check tenderness and season to taste.",
                f"Assemble into {servings} serving bowl(s) and serve hot.",
            ],
            substitutions=[
                RecipeSubstitution(
                    original=lead_ingredient,
                    substitute="Tempeh or Lentils" if "vegetarian" in dietary.lower() else "Salmon or Turkey",
                    notes="Direct alternative protein swap",
                )
            ],
            dietary_tags=[dietary, "Quick & Easy", "Whole-Food"],
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
            disclaimer="Recipe recommendations are generated for culinary inspiration. Verify all packaged ingredients for potential allergens and food safety temperatures.",
            provider_metadata={
                "provider": "mock",
                "model": "dynamic-recipe-synthesizer-v1",
                "latency_ms": round(duration_ms, 1),
                "servings_synthesized": servings,
            },
        )
