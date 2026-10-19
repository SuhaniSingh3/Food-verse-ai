"""Food vision analysis API endpoints."""
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile
from app.schemas.food_analysis import DishConfirmationRequest, StructuredFoodAnalysisResponse
from app.services.food_analysis_service import FoodAnalysisService

router = APIRouter(prefix="/vision", tags=["Food Vision"])


@router.post(
    "/analyze",
    response_model=StructuredFoodAnalysisResponse,
    summary="Analyze Food Image & Decompose Ingredients",
    description="Accepts a multipart food photo and optional question, verifies MIME & headers, strips EXIF, and decomposes ingredients.",
)
async def analyze_food(
    file: UploadFile = File(..., description="Food image file (JPEG, PNG, WEBP, max 10MB)"),
    question: Optional[str] = Form(None, description="Optional user inquiry"),
    meal_type: Optional[str] = Form("Lunch", description="Meal context tag (Breakfast, Lunch, Dinner, Snack)"),
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
    summary="Confirm or Correct Identified Dish",
    description="Accepts user confirmation or correction payload and returns authentic culinary and benchmark nutritional data.",
)
async def confirm_dish(
    payload: DishConfirmationRequest,
) -> StructuredFoodAnalysisResponse:
    return FoodAnalysisService.confirm_food_dish(payload)

