"""Nutrition calculation API endpoints."""
from fastapi import APIRouter
from app.schemas.nutrition import NutritionCalculationRequest, NutritionCalculationResponse
from app.services.nutrition_service import NutritionService

router = APIRouter(prefix="/nutrition", tags=["Nutrition Engine"])


@router.post(
    "/calculate",
    response_model=NutritionCalculationResponse,
    summary="Calculate Calibrated Nutrition for Ingredients",
    description="Cross-references ingredient gram weights with verified USDA reference benchmarks.",
)
async def calculate_nutrition(request: NutritionCalculationRequest) -> NutritionCalculationResponse:
    return NutritionService.calculate_nutrition(request)
