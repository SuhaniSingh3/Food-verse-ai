"""Pydantic schemas for cooking assistant and recipe synthesis."""
from typing import List, Optional
from pydantic import BaseModel, Field


class RecipeGenerationRequest(BaseModel):
    """Input payload for dynamic pantry-driven recipe generation."""
    ingredients: List[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="List of available ingredients in user pantry",
        example=["Salmon", "Quinoa", "Broccoli", "Lemon", "Garlic"],
    )
    dietary_preferences: List[str] = Field(
        default_factory=list,
        description="Dietary filters such as High-Protein, Vegan, Gluten-Free",
        example=["High-Protein"],
    )
    max_cook_time_minutes: int = Field(
        default=30,
        ge=5,
        le=180,
        description="Upper boundary for total preparation and cooking time in minutes",
        example=30,
    )


class RecipeSubstitution(BaseModel):
    """Common pantry ingredient substitution."""
    original: str = Field(..., example="Quinoa")
    substitute: str = Field(..., example="Brown Rice or Cauliflower Rice")


class RecipeNutritionalEstimate(BaseModel):
    """Estimated nutritional profile per serving."""
    calories: int = Field(..., ge=0, example=480)
    protein_g: float = Field(..., ge=0, example=38.0)
    carbs_g: float = Field(..., ge=0, example=32.0)
    fat_g: float = Field(..., ge=0, example=22.0)


class RecipeItem(BaseModel):
    """Single synthesized recipe."""
    id: str = Field(..., description="Unique recipe identifier", example="recipe_01")
    title: str = Field(..., description="Recipe name", example="Crispy Pan-Seared Salmon with Herb Quinoa")
    match_percentage: int = Field(..., ge=0, le=100, description="Pantry ingredient overlap percentage", example=95)
    difficulty: str = Field(..., example="Easy")
    prep_time_minutes: int = Field(..., ge=0, example=10)
    cook_time_minutes: int = Field(..., ge=0, example=15)
    servings: int = Field(..., ge=1, example=2)
    ingredients_used: List[str] = Field(...)
    pantry_staples_needed: List[str] = Field(default_factory=list)
    substitutions: List[RecipeSubstitution] = Field(default_factory=list)
    instructions: List[str] = Field(..., min_length=1)
    nutritional_estimate: RecipeNutritionalEstimate


class RecipeGenerationResponse(BaseModel):
    """Output payload from recipe generation service."""
    recipes: List[RecipeItem] = Field(..., description="Generated candidate recipes")
    matched_pantry_count: int = Field(..., ge=0, description="Number of user ingredients matched")
