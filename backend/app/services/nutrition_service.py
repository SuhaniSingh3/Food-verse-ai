"""Deterministic Nutrition Engine grounded in verified benchmark reference data."""
from typing import Dict, List, Optional
from app.core.logging import logger
from app.schemas.nutrition import (
    IngredientPortionInput,
    NutritionalItemBreakdown,
    NutritionCalculationRequest,
    NutritionCalculationResponse,
    NutritionalTotals,
)

# Reference nutrition table per 100g based on standard USDA FoodData Central values
# (cal, protein_g, carbs_g, fat_g)
USDA_BENCHMARK_DENSITIES: Dict[str, Dict[str, float]] = {
    "salmon": {"calories": 206.0, "protein_g": 20.4, "carbs_g": 0.0, "fat_g": 12.3},
    "atlantic salmon": {"calories": 206.0, "protein_g": 20.4, "carbs_g": 0.0, "fat_g": 12.3},
    "grilled salmon": {"calories": 206.0, "protein_g": 20.4, "carbs_g": 0.0, "fat_g": 12.3},
    "quinoa": {"calories": 120.0, "protein_g": 4.4, "carbs_g": 21.3, "fat_g": 1.9},
    "cooked quinoa": {"calories": 120.0, "protein_g": 4.4, "carbs_g": 21.3, "fat_g": 1.9},
    "broccoli": {"calories": 35.0, "protein_g": 2.4, "carbs_g": 7.2, "fat_g": 0.4},
    "steamed broccoli": {"calories": 35.0, "protein_g": 2.4, "carbs_g": 7.2, "fat_g": 0.4},
    "avocado": {"calories": 160.0, "protein_g": 2.0, "carbs_g": 8.5, "fat_g": 14.7},
    "hass avocado": {"calories": 160.0, "protein_g": 2.0, "carbs_g": 8.5, "fat_g": 14.7},
    "rice": {"calories": 130.0, "protein_g": 2.7, "carbs_g": 28.2, "fat_g": 0.3},
    "brown rice": {"calories": 123.0, "protein_g": 2.7, "carbs_g": 25.6, "fat_g": 1.0},
    "white rice": {"calories": 130.0, "protein_g": 2.7, "carbs_g": 28.2, "fat_g": 0.3},
    "chicken": {"calories": 165.0, "protein_g": 31.0, "carbs_g": 0.0, "fat_g": 3.6},
    "chicken breast": {"calories": 165.0, "protein_g": 31.0, "carbs_g": 0.0, "fat_g": 3.6},
    "egg": {"calories": 143.0, "protein_g": 12.6, "carbs_g": 0.7, "fat_g": 9.5},
    "eggs": {"calories": 143.0, "protein_g": 12.6, "carbs_g": 0.7, "fat_g": 9.5},
    "spinach": {"calories": 23.0, "protein_g": 2.9, "carbs_g": 3.6, "fat_g": 0.4},
    "tomato": {"calories": 18.0, "protein_g": 0.9, "carbs_g": 3.9, "fat_g": 0.2},
    "cherry tomatoes": {"calories": 18.0, "protein_g": 0.9, "carbs_g": 3.9, "fat_g": 0.2},
    "olive oil": {"calories": 884.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 100.0},
    "garlic": {"calories": 149.0, "protein_g": 6.4, "carbs_g": 33.1, "fat_g": 0.5},
    "lemon": {"calories": 29.0, "protein_g": 1.1, "carbs_g": 9.3, "fat_g": 0.3},
    "oats": {"calories": 389.0, "protein_g": 16.9, "carbs_g": 66.3, "fat_g": 6.9},
    "rolled oats": {"calories": 389.0, "protein_g": 16.9, "carbs_g": 66.3, "fat_g": 6.9},
    "greek yogurt": {"calories": 97.0, "protein_g": 10.0, "carbs_g": 3.6, "fat_g": 5.0},
    "apple": {"calories": 52.0, "protein_g": 0.3, "carbs_g": 13.8, "fat_g": 0.2},
    "banana": {"calories": 89.0, "protein_g": 1.1, "carbs_g": 22.8, "fat_g": 0.3},
    # Regional Indian & benchmark dish ingredients (Requirement 5)
    "pav": {"calories": 265.0, "protein_g": 8.5, "carbs_g": 49.0, "fat_g": 3.2},
    "pav bread": {"calories": 265.0, "protein_g": 8.5, "carbs_g": 49.0, "fat_g": 3.2},
    "bread rolls": {"calories": 265.0, "protein_g": 8.5, "carbs_g": 49.0, "fat_g": 3.2},
    "soft bread rolls": {"calories": 265.0, "protein_g": 8.5, "carbs_g": 49.0, "fat_g": 3.2},
    "bhaji": {"calories": 110.0, "protein_g": 2.5, "carbs_g": 16.5, "fat_g": 4.0},
    "vegetable bhaji": {"calories": 110.0, "protein_g": 2.5, "carbs_g": 16.5, "fat_g": 4.0},
    "mixed vegetable bhaji": {"calories": 110.0, "protein_g": 2.5, "carbs_g": 16.5, "fat_g": 4.0},
    "pav bhaji": {"calories": 140.0, "protein_g": 2.7, "carbs_g": 16.5, "fat_g": 6.8},
    "butter": {"calories": 717.0, "protein_g": 0.9, "carbs_g": 0.1, "fat_g": 81.1},
    "salted butter": {"calories": 717.0, "protein_g": 0.9, "carbs_g": 0.1, "fat_g": 81.1},
    "dairy butter": {"calories": 717.0, "protein_g": 0.9, "carbs_g": 0.1, "fat_g": 81.1},
    "ghee": {"calories": 876.0, "protein_g": 0.3, "carbs_g": 0.0, "fat_g": 99.5},
    "onion": {"calories": 40.0, "protein_g": 1.1, "carbs_g": 9.3, "fat_g": 0.1},
    "onions": {"calories": 40.0, "protein_g": 1.1, "carbs_g": 9.3, "fat_g": 0.1},
    "red onion": {"calories": 40.0, "protein_g": 1.1, "carbs_g": 9.3, "fat_g": 0.1},
    "diced onions": {"calories": 40.0, "protein_g": 1.1, "carbs_g": 9.3, "fat_g": 0.1},
    "potato": {"calories": 87.0, "protein_g": 1.9, "carbs_g": 20.1, "fat_g": 0.1},
    "potatoes": {"calories": 87.0, "protein_g": 1.9, "carbs_g": 20.1, "fat_g": 0.1},
    "boiled potato": {"calories": 87.0, "protein_g": 1.9, "carbs_g": 20.1, "fat_g": 0.1},
    "peas": {"calories": 81.0, "protein_g": 5.4, "carbs_g": 14.5, "fat_g": 0.4},
    "green peas": {"calories": 81.0, "protein_g": 5.4, "carbs_g": 14.5, "fat_g": 0.4},
    "cauliflower": {"calories": 25.0, "protein_g": 1.9, "carbs_g": 5.0, "fat_g": 0.3},
    "coriander": {"calories": 23.0, "protein_g": 2.1, "carbs_g": 3.7, "fat_g": 0.5},
    "cilantro": {"calories": 23.0, "protein_g": 2.1, "carbs_g": 3.7, "fat_g": 0.5},
    "fresh coriander": {"calories": 23.0, "protein_g": 2.1, "carbs_g": 3.7, "fat_g": 0.5},
    "poha": {"calories": 350.0, "protein_g": 7.0, "carbs_g": 77.0, "fat_g": 1.5},
    "flattened rice": {"calories": 350.0, "protein_g": 7.0, "carbs_g": 77.0, "fat_g": 1.5},
    "peanut": {"calories": 567.0, "protein_g": 25.8, "carbs_g": 16.1, "fat_g": 49.2},
    "peanuts": {"calories": 567.0, "protein_g": 25.8, "carbs_g": 16.1, "fat_g": 49.2},
    "samosa": {"calories": 262.0, "protein_g": 3.5, "carbs_g": 32.0, "fat_g": 13.5},
    "dosa": {"calories": 168.0, "protein_g": 3.9, "carbs_g": 29.0, "fat_g": 3.7},
    "idli": {"calories": 139.0, "protein_g": 5.0, "carbs_g": 28.0, "fat_g": 0.5},
    "sambar": {"calories": 55.0, "protein_g": 2.5, "carbs_g": 8.5, "fat_g": 1.2},
    "vegetable sambar": {"calories": 55.0, "protein_g": 2.5, "carbs_g": 8.5, "fat_g": 1.2},
    "coconut chutney": {"calories": 210.0, "protein_g": 2.8, "carbs_g": 6.5, "fat_g": 20.0},
    "chole": {"calories": 164.0, "protein_g": 8.9, "carbs_g": 27.4, "fat_g": 2.6},
    "chickpeas": {"calories": 164.0, "protein_g": 8.9, "carbs_g": 27.4, "fat_g": 2.6},
    "bhatura": {"calories": 340.0, "protein_g": 7.5, "carbs_g": 48.0, "fat_g": 13.5},
    "dal makhani": {"calories": 140.0, "protein_g": 5.5, "carbs_g": 14.0, "fat_g": 7.0},
    "lentils": {"calories": 116.0, "protein_g": 9.0, "carbs_g": 20.0, "fat_g": 0.4},
    "paneer": {"calories": 296.0, "protein_g": 18.3, "carbs_g": 4.0, "fat_g": 22.8},
    "cheese": {"calories": 403.0, "protein_g": 25.0, "carbs_g": 1.3, "fat_g": 33.0},
    "noodles": {"calories": 138.0, "protein_g": 4.5, "carbs_g": 25.0, "fat_g": 2.1},
    "ramen": {"calories": 140.0, "protein_g": 4.5, "carbs_g": 22.0, "fat_g": 4.0},
    "pizza": {"calories": 266.0, "protein_g": 11.0, "carbs_g": 33.0, "fat_g": 10.0},
    "french fries": {"calories": 312.0, "protein_g": 3.4, "carbs_g": 41.0, "fat_g": 15.0},
}



class NutritionService:
    """Service providing verified, non-hallucinatory nutritional calculations."""

    @staticmethod
    def _find_benchmark(name: str) -> Optional[Dict[str, float]]:
        """Perform fuzzy matching against calibrated reference benchmarks."""
        clean_name = name.lower().strip()
        # Direct lookup
        if clean_name in USDA_BENCHMARK_DENSITIES:
            return USDA_BENCHMARK_DENSITIES[clean_name]

        # Partial/word lookup
        for key, densities in USDA_BENCHMARK_DENSITIES.items():
            if key in clean_name or clean_name in key:
                return densities
        return None

    @classmethod
    def calculate_nutrition(cls, request: NutritionCalculationRequest) -> NutritionCalculationResponse:
        """Calculate exact macro and calorie values based on reference densities."""
        items: List[NutritionalItemBreakdown] = []
        tot_cal = 0.0
        tot_protein = 0.0
        tot_carbs = 0.0
        tot_fat = 0.0

        for item in request.items:
            density = cls._find_benchmark(item.name)
            multiplier = item.grams / 100.0

            if density:
                cal = round(density["calories"] * multiplier, 1)
                protein = round(density["protein_g"] * multiplier, 1)
                carbs = round(density["carbs_g"] * multiplier, 1)
                fat = round(density["fat_g"] * multiplier, 1)
                is_match = True
            else:
                # Fallback baseline for unspecified food item (standard mixed dish benchmark)
                cal = round(120.0 * multiplier, 1)
                protein = round(4.0 * multiplier, 1)
                carbs = round(15.0 * multiplier, 1)
                fat = round(3.5 * multiplier, 1)
                is_match = False
                logger.info(f"Ingredient '{item.name}' not found in USDA benchmark table. Applied generic baseline.")

            tot_cal += cal
            tot_protein += protein
            tot_carbs += carbs
            tot_fat += fat

            items.append(
                NutritionalItemBreakdown(
                    name=item.name,
                    grams=item.grams,
                    calories=cal,
                    protein_g=protein,
                    carbs_g=carbs,
                    fat_g=fat,
                    is_benchmark_match=is_match,
                )
            )

        totals = NutritionalTotals(
            calories=round(tot_cal, 1),
            protein_g=round(tot_protein, 1),
            carbs_g=round(tot_carbs, 1),
            fat_g=round(tot_fat, 1),
        )

        return NutritionCalculationResponse(
            items=items,
            totals=totals,
            calibrated_against="USDA FoodData Central Reference Benchmarks",
        )
