"""Smart cooking assistant and recipe generation API endpoints."""
from fastapi import APIRouter
from app.schemas.recipes import (
    RecipeGenerationRequest,
    RecipeGenerationResponse,
    RecipeItem,
    RecipeScaleRequest,
)
from app.services.recipe_service import RecipeService

router = APIRouter(prefix="/recipes", tags=["Cooking Assistant"])


@router.post(
    "/generate",
    response_model=RecipeGenerationResponse,
    summary="Generate Zero-Waste Recipes from Pantry",
    description="Synthesizes practical, portion-scaled recipes using available pantry items and dietary constraints via the configured AI provider.",
)
async def generate_recipes(request: RecipeGenerationRequest) -> RecipeGenerationResponse:
    return await RecipeService.generate_recipes(request)


@router.post(
    "/scale",
    response_model=RecipeItem,
    summary="Scale Recipe Ingredient Quantities",
    description="Recalculates ingredient quantities proportionally for a desired target serving count.",
)
async def scale_recipe(payload: RecipeScaleRequest) -> RecipeItem:
    return RecipeService.scale_recipe(
        recipe=payload.recipe,
        target_servings=payload.target_servings,
    )
