"""Pydantic schemas for food vision analysis and ingredient decomposition."""
from typing import List, Optional
from pydantic import BaseModel, Field


class FoodItem(BaseModel):
    """Decomposed constituent item identified from plate imagery."""
    name: str = Field(..., description="Name of the recognized food or ingredient", example="Grilled Atlantic Salmon")
    estimated_grams: float = Field(..., ge=1, le=5000, description="Model portion estimate in grams", example=180.0)
    calories: float = Field(..., ge=0, description="Estimated calories for portion", example=370.0)
    protein_g: float = Field(..., ge=0, description="Protein content in grams", example=36.0)
    carbs_g: float = Field(..., ge=0, description="Carbohydrates in grams", example=0.0)
    fat_g: float = Field(..., ge=0, description="Fat in grams", example=22.0)
    confidence: float = Field(..., ge=0.0, le=1.0, description="Vision model detection certainty", example=0.96)
    category: str = Field(..., description="Nutrient classification", example="Protein")


class VisionAnalysisResponse(BaseModel):
    """Structured response returned by vision recognition endpoint."""
    dish_name: str = Field(..., description="Primary identified culinary preparation", example="Mediterranean Grilled Salmon Bowl")
    overall_confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence in overall dish classification", example=0.94)
    ingredients: List[FoodItem] = Field(..., description="List of recognized constituents")
    dietary_tags: List[str] = Field(default_factory=list, description="Dietary tags e.g. Pescatarian, High-Protein")
    processing_time_ms: float = Field(..., description="Time taken to process and validate image")
    model_version: str = Field(..., description="AI provider model tag")
