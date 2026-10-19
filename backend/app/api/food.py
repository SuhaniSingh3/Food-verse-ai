"""Food analysis dedicated API endpoint: POST /api/food/analyze."""
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile
from app.schemas.food_analysis import DishConfirmationRequest, StructuredFoodAnalysisResponse
from app.services.food_analysis_service import FoodAnalysisService

router = APIRouter(prefix="/food", tags=["Food Analysis"])


@router.post(
    "/analyze",
    response_model=StructuredFoodAnalysisResponse,
    summary="Multimodal Food Image Analysis & Ingredient Decomposition",
    description=(
        "Accepts a validated food photograph and an optional user inquiry. "
        "Returns a structured response separating direct physical observations from culinary inferences, "
        "identifying preparation methods, explicit ambiguities, and approximate macronutrients."
    ),
)
async def analyze_food(
    file: UploadFile = File(..., description="Food image file (JPEG, PNG, WEBP, max 10MB)"),
    question: Optional[str] = Form(None, description="Optional user inquiry (e.g. allergen checks, cooking method questions)"),
    meal_type: Optional[str] = Form("Lunch", description="Meal category (Breakfast, Lunch, Dinner, Snack)"),
) -> StructuredFoodAnalysisResponse:
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    return await FoodAnalysisService.analyze_food_image(
        image_bytes=content,
        mime_type=content_type,
        user_question=question,
        meal_type=meal_type,
        filename=file.filename or "upload.jpg",
    )


@router.post(
    "/confirm",
    response_model=StructuredFoodAnalysisResponse,
    summary="User Confirmation or Correction of Identified Dish",
    description=(
        "Accepts a user-confirmed dish identity (e.g., 'Pav Bhaji', 'Poha') and returns authentic "
        "culinary preparation method, baseline ingredients, and benchmark nutritional estimates."
    ),
)
async def confirm_dish(
    payload: DishConfirmationRequest,
) -> StructuredFoodAnalysisResponse:
    return FoodAnalysisService.confirm_food_dish(payload)

