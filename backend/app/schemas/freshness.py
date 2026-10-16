"""Pydantic schemas for produce freshness and spoilage assessment."""
from typing import List
from pydantic import BaseModel, Field


class FreshnessMarker(BaseModel):
    """Specific visual quality indicator evaluated on produce."""
    marker: str = Field(..., example="Surface Firmness")
    status: str = Field(..., example="Optimal")
    detail: str = Field(..., example="Firm skin without bruising or indentation")


class FreshnessAnalysisResponse(BaseModel):
    """Structured report returned by freshness evaluation service."""
    item_type: str = Field(..., example="Apples and Leafy Greens")
    freshness_grade: str = Field(..., example="Grade A")
    freshness_title: str = Field(..., example="Peak Freshness & High Nutrient Density")
    estimated_shelf_life: str = Field(..., example="5 to 8 Days (Refrigerated)")
    confidence_score: float = Field(..., ge=0.0, le=1.0, example=0.95)
    visual_markers: List[FreshnessMarker] = Field(...)
    storage_tips: List[str] = Field(default_factory=list)
