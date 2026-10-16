"""Pydantic schemas for deterministic nutrition calculation and profile targets."""
from typing import List, Optional
from pydantic import BaseModel, Field


class IngredientPortionInput(BaseModel):
    """Input representation of an ingredient and weight."""
    name: str = Field(..., min_length=1, max_length=100, description="Ingredient name", example="Salmon")
    grams: float = Field(..., gt=0, le=5000, description="Portion weight in grams", example=180.0)


class NutritionCalculationRequest(BaseModel):
    """Request payload for deterministic nutritional calibration."""
    items: List[IngredientPortionInput] = Field(..., min_length=1, max_length=50)


class NutritionalItemBreakdown(BaseModel):
    """Calibrated nutritional breakdown for a single ingredient portion."""
    name: str = Field(...)
    grams: float = Field(..., gt=0)
    calories: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    carbs_g: float = Field(..., ge=0)
    fat_g: float = Field(..., ge=0)
    is_benchmark_match: bool = Field(..., description="True if matched in verified reference tables")


class NutritionalTotals(BaseModel):
    """Summed macros and energy for the aggregate meal."""
    calories: float = Field(..., ge=0)
    protein_g: float = Field(..., ge=0)
    carbs_g: float = Field(..., ge=0)
    fat_g: float = Field(..., ge=0)


class NutritionCalculationResponse(BaseModel):
    """Response returned by nutrition calculation engine."""
    items: List[NutritionalItemBreakdown] = Field(...)
    totals: NutritionalTotals = Field(...)
    calibrated_against: str = Field(default="USDA FoodData Central Reference Benchmarks")
