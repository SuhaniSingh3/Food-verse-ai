"""Cooking assistant and dynamic recipe synthesis service."""
from app.ai.recipe_generator import RecipeGenerator
from app.core.errors import MediaValidationError
from app.core.logging import logger
from app.schemas.recipes import (
    RecipeGenerationRequest,
    RecipeGenerationResponse,
    RecipeIngredientQuantity,
    RecipeItem,
)


class RecipeService:
    """Service orchestrating pantry-based recipe generation and portion scaling."""

    @classmethod
    async def generate_recipes(cls, request: RecipeGenerationRequest) -> RecipeGenerationResponse:
        """Validate input parameters and dispatch recipe synthesis to the configured AI provider."""
        clean_ingredients = [item.strip() for item in request.ingredients if item.strip()]
        if not clean_ingredients:
            raise MediaValidationError(
                message="At least one pantry ingredient must be provided to generate recipes.",
                details={"provided_ingredients": request.ingredients},
            )

        # Sanitize and assign cleaned list
        request.ingredients = clean_ingredients

        logger.info(
            f"Processing recipe generation for {len(clean_ingredients)} ingredients. "
            f"Dietary: {request.dietary_preference}, Servings: {request.servings}, Cuisine: {request.cuisine}"
        )

        return await RecipeGenerator.generate_recipes(request)

    @classmethod
    def scale_recipe(cls, recipe: RecipeItem, target_servings: int) -> RecipeItem:
        """Scale ingredient quantities of an existing recipe to the target serving count."""
        if target_servings < 1 or target_servings > 24:
            raise MediaValidationError(
                message="Target servings must be between 1 and 24.",
                details={"target_servings": target_servings},
            )

        base_servings = recipe.base_servings or recipe.servings or 1
        ratio = target_servings / base_servings

        scaled_quantities = []
        for ing in recipe.ingredient_quantities:
            scaled_amount = round(ing.amount * ratio, 2)
            # If round to 2 decimals gives clean int, keep clean
            if scaled_amount.is_integer():
                scaled_amount = int(scaled_amount)

            scaled_quantities.append(
                RecipeIngredientQuantity(
                    name=ing.name,
                    amount=scaled_amount,
                    unit=ing.unit,
                    notes=ing.notes,
                )
            )

        # Clone and update servings
        updated = recipe.model_copy(deep=True)
        updated.ingredient_quantities = scaled_quantities
        updated.servings = target_servings

        return updated
