"""Smart cooking assistant and recipe generation API endpoints."""
from fastapi import APIRouter
from app.schemas.recipes import RecipeGenerationRequest, RecipeGenerationResponse
from app.services.recipe_service import RecipeService

router = APIRouter(prefix="/recipes", tags=["Cooking Assistant"])


@router.post(
    "/generate",
    response_model=RecipeGenerationResponse,
    summary="Generate Zero-Waste Recipes from Pantry",
    description="Synthesizes practical recipes using available pantry items and dietary constraints.",
)
async def generate_recipes(request: RecipeGenerationRequest) -> RecipeGenerationResponse:
    return await RecipeService.generate_recipes(request)
