"""Pydantic schemas for restaurant and kitchen hygiene screener."""
from typing import List
from pydantic import BaseModel, Field


class HygieneChecklistItem(BaseModel):
    """Specific sanitation checkpoint inspected visually."""
    item: str = Field(..., example="Stainless Steel Prep Surfaces")
    status: str = Field(..., example="Compliant")
    score: str = Field(..., example="10/10")
    observation: str = Field(..., example="Clean, degreased, zero biological residue")


class HygieneAuditResponse(BaseModel):
    """Structured scorecard returned by kitchen hygiene screening service."""
    station_type: str = Field(..., example="Commercial Prep Station")
    hygiene_score: int = Field(..., ge=0, le=100, example=96)
    risk_tier: str = Field(..., example="Low Risk — Commercial Standard")
    checklist: List[HygieneChecklistItem] = Field(...)
    recommendations: List[str] = Field(default_factory=list)
