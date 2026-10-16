"""Food vision analysis API endpoints."""
from typing import Optional
from fastapi import APIRouter, File, Form, UploadFile
from app.schemas.vision import VisionAnalysisResponse
from app.services.food_analysis_service import FoodAnalysisService

router = APIRouter(prefix="/vision", tags=["Food Vision"])


@router.post(
    "/analyze",
    response_model=VisionAnalysisResponse,
    summary="Analyze Food Image & Decompose Ingredients",
    description="Accepts a multipart food photo, verifies MIME & headers, strips EXIF, and decomposes ingredients.",
)
async def analyze_food(
    file: UploadFile = File(..., description="Food image file (JPEG, PNG, WEBP, max 10MB)"),
    meal_type: Optional[str] = Form("Lunch", description="Meal context tag (Breakfast, Lunch, Dinner, Snack)"),
) -> VisionAnalysisResponse:
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    return await FoodAnalysisService.analyze_food_image(
        image_bytes=content,
        mime_type=content_type,
        meal_type=meal_type,
        filename=file.filename or "upload.jpg",
    )
