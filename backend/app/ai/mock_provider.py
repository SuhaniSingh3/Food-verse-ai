"""Mock AI vision provider for testing, offline CI/CD, and local frontend preview."""
import asyncio
from typing import Optional
from app.ai.base import BaseVisionAIProvider
from app.core.errors import AIProviderError
from app.schemas.food_analysis import (
    IngredientObservation,
    NutritionEstimate,
    StructuredFoodAnalysisResponse,
)


class MockVisionAIProvider(BaseVisionAIProvider):
    """Deterministic, mock provider that strictly follows ethical guardrails:
    - Distinguishes visible ingredients from inferred culinary guesses.
    - Explicitly surfaces uncertainties (allergens, unseen layers, dressing ingredients).
    - Refuses to claim medical certainty or pathogen safety from an image.
    - Supports simulated failures for testing error branches.
    """

    def __init__(
        self,
        simulate_timeout: bool = False,
        simulate_rate_limit: bool = False,
        simulate_error: bool = False,
    ):
        self._simulate_timeout = simulate_timeout
        self._simulate_rate_limit = simulate_rate_limit
        self._simulate_error = simulate_error

    @property
    def provider_name(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return "mock-gemini-vision-v1"

    async def analyze_food(
        self,
        image_bytes: bytes,
        mime_type: str,
        user_question: Optional[str] = None,
    ) -> StructuredFoodAnalysisResponse:
        # Simulate slight processing latency (50ms)
        await asyncio.sleep(0.05)

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

        # Build dynamic answer for user question if supplied
        q_answer = None
        if user_question:
            q_clean = user_question.lower()
            if "dairy" in q_clean or "lactose" in q_clean:
                q_answer = (
                    "Based strictly on visible observations, no direct dairy items (like cheese shreds, butter pats, or cream sauce) are visible. "
                    "However, marinades or cooking fats might contain dairy solids, which cannot be visually ruled out. Check with the preparer for severe allergies."
                )
            elif "gluten" in q_clean or "wheat" in q_clean:
                q_answer = (
                    "Quinoa and vegetables are naturally gluten-free in visual appearance. "
                    "However, soy sauces or cross-contact in kitchen equipment cannot be detected from photography alone."
                )
            elif "nut" in q_clean or "peanut" in q_clean:
                q_answer = (
                    "No visible nuts or seed garnishes are detected in this portion. "
                    "However, nut-derived cooking oils or shared fryers cannot be confirmed visually."
                )
            else:
                q_answer = (
                    f"In response to '{user_question}': Visual inspection confirms visible surface constituents, but hidden seasonings, exact oil varieties, "
                    f"and preparation subtleties cannot be confirmed without ingredient verification."
                )

        return StructuredFoodAnalysisResponse(
            dish_name="Mediterranean Grilled Salmon Bowl",
            confidence_assessment="High",
            apparent_preparation_method="Char-grilled fish fillet served over steamed grain bed with freshly sliced raw produce",
            visible_ingredients=[
                "Atlantic salmon fillet with distinct dark grill crosshatch marks",
                "Steamed quinoa grain bed (white and tri-color grains)",
                "Steamed bright green broccoli florets",
                "Diced fresh ripe avocado cubes",
                "Halved fresh red cherry tomatoes",
                "Fresh chopped flat-leaf parsley garnish"
            ],
            potential_ingredients_or_guesses=[
                "Cooking oil (likely extra virgin olive oil, canola, or butter used during grill searing)",
                "Salt and freshly cracked black pepper seasoning",
                "Lemon juice or light vinaigrette dressing on vegetables",
                "Garlic or herb marinade on the salmon fillet"
            ],
            visual_uncertainties_and_ambiguities=[
                "Exact cooking oil cannot be verified from image; seed oils, olive oil, or butter look identical when absorbed.",
                "Hidden sauces or marinades beneath the salmon fillet cannot be seen from this angle.",
                "Allergen presence (cross-contamination, hidden soy in seasonings, dairy in marinade) cannot be ruled out by sight.",
                "Portion depth and true density cannot be determined with laboratory precision from a 2D photograph.",
                "Microbial freshness and internal cooking temperature (e.g. 145°F for salmon) cannot be verified visually."
            ],
            decomposed_items=[
                IngredientObservation(
                    name="Grilled Salmon Fillet",
                    is_directly_visible=True,
                    notes="Clear pinkish-orange flesh with char marks",
                    estimated_grams=180.0
                ),
                IngredientObservation(
                    name="Cooked Quinoa",
                    is_directly_visible=True,
                    notes="Visible spiral germ rings characteristic of cooked quinoa",
                    estimated_grams=120.0
                ),
                IngredientObservation(
                    name="Steamed Broccoli",
                    is_directly_visible=True,
                    notes="Intact green florets and tender stalks",
                    estimated_grams=80.0
                ),
                IngredientObservation(
                    name="Diced Hass Avocado",
                    is_directly_visible=True,
                    notes="Firm green-yellow diced cubes",
                    estimated_grams=50.0
                ),
                IngredientObservation(
                    name="Cherry Tomatoes",
                    is_directly_visible=True,
                    notes="Cut fresh red tomato halves",
                    estimated_grams=40.0
                ),
                IngredientObservation(
                    name="Cooking Oil / Marinade",
                    is_directly_visible=False,
                    notes="Inferred from surface sheen on grilled fish and broccoli",
                    estimated_grams=10.0
                ),
                IngredientObservation(
                    name="Salt & Seasonings",
                    is_directly_visible=False,
                    notes="Inferred culinary baseline; cannot measure sodium grams visually",
                    estimated_grams=2.0
                ),
            ],
            nutritional_estimate=NutritionEstimate(
                estimated_calories=540,
                protein_g=41.5,
                carbs_g=38.0,
                fat_g=24.5,
                basis="Visual portion approximation relative to USDA FoodData Central reference density table"
            ),
            dietary_tags=["Pescatarian", "High-Protein", "Whole-Food", "Omega-3 Rich"],
            user_question=user_question,
            user_question_answer=q_answer,
            safety_and_allergen_disclaimer=(
                "Visual analysis cannot confirm hidden ingredients, allergens, food safety, or exact portion weight. "
                "Never rely on image recognition for medical or severe allergy management."
            ),
            provider_metadata={
                "provider": self.provider_name,
                "model": self.model_name,
                "latency_ms": 52.0,
                "authenticated_via": "Deterministic Mock Provider (Offline / Testing Mode)",
            }
        )
