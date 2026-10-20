"""Pydantic schemas for Smart Cooking Assistant and dynamic recipe synthesis."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RecipeIngredientQuantity(BaseModel):
    """Specific ingredient with measured quantity, unit, and optional preparation note."""
    name: str = Field(..., description="Ingredient name", example="Atlantic Salmon Fillet")
    amount: float = Field(..., ge=0, description="Numerical quantity", example=200.0)
    unit: str = Field(..., description="Measurement unit (e.g., g, ml, tbsp, tsp, cup, piece, cloves)", example="g")
    notes: Optional[str] = Field(None, description="Culinary prep note (e.g., 'diced', 'minced', 'skin-on')", example="skin-on, patted dry")
    is_available: bool = Field(default=False, description="Authoritative availability status against user pantry")
    matched_by: Optional[str] = Field(default=None, description="Pantry ingredient that matched this recipe ingredient")
    available_components: List[str] = Field(default_factory=list, description="Available sub-components if grouped")
    missing_components: List[str] = Field(default_factory=list, description="Missing sub-components if grouped")



class RecipeSubstitution(BaseModel):
    """Pantry ingredient substitution recommendation."""
    original: str = Field(..., description="Original ingredient in recipe", example="Quinoa")
    substitute: str = Field(..., description="Suggested alternative", example="Brown Rice, Couscous, or Riced Cauliflower")
    notes: Optional[str] = Field(None, description="Culinary reasoning or ratio advice", example="Cook 1:2 ratio with vegetable broth")


class RecipeItem(BaseModel):
    """Single synthesized zero-waste culinary recipe."""
    id: str = Field(..., description="Unique recipe identifier", example="recipe_salmon_herb_quinoa")
    title: str = Field(..., description="Recipe name", example="Crispy Pan-Seared Salmon with Herb Quinoa")
    description: str = Field(..., description="Flavor profile and brief culinary overview")
    cuisine: str = Field(..., description="Cuisine category (e.g., Mediterranean, Italian, Asian)", example="Mediterranean")
    difficulty: str = Field(default="Beginner", description="Skill level (Beginner, Intermediate, Advanced)", example="Beginner")
    prep_time_minutes: int = Field(..., ge=1, description="Preparation time in minutes", example=10)
    cook_time_minutes: int = Field(..., ge=1, description="Cooking time in minutes", example=15)
    base_servings: int = Field(default=2, ge=1, description="Base serving count for ingredient quantities", example=2)
    servings: int = Field(default=2, ge=1, description="Scaled serving count", example=2)
    ingredient_quantities: List[RecipeIngredientQuantity] = Field(..., min_length=1, description="Ingredients with exact quantities")
    preparation_steps: List[str] = Field(..., min_length=1, description="Step-by-step cooking instructions")
    substitutions: List[RecipeSubstitution] = Field(default_factory=list, description="Ingredient alternatives")
    dietary_tags: List[str] = Field(default_factory=list, description="Dietary tags (e.g., High-Protein, Pescatarian)")
    allergens_flagged: List[str] = Field(default_factory=list, description="Detected allergen warnings or conflict alerts")
    allergen_advisory: str = Field(
        default="Culinary suggestions are inspirational. Always verify manufactured ingredient packaging for cross-contamination warnings, unlisted additives, and allergen facilities before preparing food for individuals with severe allergies.",
        description="Mandatory health & allergen advisory"
    )
    estimated_calories_per_serving: Optional[int] = Field(None, ge=0, description="Estimated calories per portion", example=480)
    protein_g: Optional[float] = Field(None, ge=0, description="Protein in grams", example=38.0)
    carbs_g: Optional[float] = Field(None, ge=0, description="Carbohydrates in grams", example=32.0)
    fat_g: Optional[float] = Field(None, ge=0, description="Fat in grams", example=22.0)


class RecipeGenerationRequest(BaseModel):
    """Input payload for dynamic pantry-driven recipe synthesis."""
    ingredients: List[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="List of available ingredients in user pantry",
        example=["Salmon", "Quinoa", "Broccoli", "Lemon", "Garlic", "Olive Oil"],
    )
    dish_name: Optional[str] = Field(
        default=None,
        description="Optional confirmed dish name from image analysis (e.g. 'Pav Bhaji')",
        example="Pav Bhaji",
    )
    cuisine: Optional[str] = Field(
        default="Any",
        description="Cuisine preference (e.g., Italian, Mexican, Indian, Mediterranean, Asian, Any)",
        example="Mediterranean",
    )
    dietary_preference: Optional[str] = Field(
        default="Standard",
        description="Vegetarian, Non-Vegetarian, Vegan, Pescatarian, Keto, Gluten-Free, Standard",
        example="Pescatarian",
    )
    allergies_and_avoid: List[str] = Field(
        default_factory=list,
        description="Allergens and ingredients to strictly avoid (e.g., Peanuts, Dairy, Gluten, Shellfish, Soy)",
        example=["Peanuts", "Dairy"],
    )
    servings: int = Field(
        default=2,
        ge=1,
        le=12,
        description="Desired number of servings (1 to 12)",
        example=2,
    )
    max_cook_time_minutes: int = Field(
        default=30,
        ge=5,
        le=180,
        description="Maximum cooking time in minutes",
        example=30,
    )
    skill_level: Optional[str] = Field(
        default="Beginner",
        description="User cooking skill level: Beginner, Intermediate, or Advanced",
        example="Beginner",
    )


class RecipeScaleRequest(BaseModel):
    """Payload to scale ingredient quantities for an existing recipe."""
    recipe: RecipeItem = Field(..., description="The recipe to scale")
    target_servings: int = Field(..., ge=1, le=24, description="Target serving count")


class RecipeGenerationResponse(BaseModel):
    """Output payload from recipe generation service."""
    recipes: List[RecipeItem] = Field(..., min_length=1, description="Synthesized candidate recipes")
    matched_ingredients_count: int = Field(..., ge=0, description="Number of user pantry ingredients matched")
    disclaimer: str = Field(
        default="Recipe recommendations are generated for culinary inspiration. Verify all packaged ingredients for potential allergens and food safety temperatures.",
        description="Universal culinary disclaimer"
    )
    provider_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata on AI provider, model version, and generation latency"
    )


class CookWithIngredientsRequest(BaseModel):
    """Input payload to find recipes matching available pantry items."""
    ingredients: List[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="List of ingredients available in the user's pantry",
        example=["Potatoes", "Onions", "Tomatoes", "Butter"],
    )
    dietary_preference: Optional[str] = Field(
        default="no_restriction",
        description="Dietary filter: 'no_restriction', 'vegetarian', or 'vegan'",
        example="vegetarian",
    )
    max_cook_time_minutes: Optional[int] = Field(
        default=None,
        ge=1,
        le=240,
        description="Optional maximum cooking time in minutes",
        example=30,
    )


class MatchedRecipeItem(BaseModel):
    """A matched recipe item ranked by ingredient coverage."""
    recipe: RecipeItem
    match_percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage of required recipe ingredients available")
    matched_ingredients_count: int = Field(..., ge=0, description="Number of required ingredients matched")
    total_recipe_ingredients_count: int = Field(..., ge=1, description="Total ingredients required by recipe")
    available_ingredients: List[str] = Field(..., description="Recipe ingredients the user has")
    missing_ingredients: List[str] = Field(..., description="Recipe ingredients the user is missing")
    can_make_now: bool = Field(..., description="True only if zero ingredients are missing")
    supported_substitutions: List[RecipeSubstitution] = Field(default_factory=list, description="Supported substitutions for missing items")


class CookWithIngredientsResponse(BaseModel):
    """Output payload for Cook With Ingredients search."""
    total_matched: int = Field(..., ge=0, description="Total number of matching recipes found")
    query_ingredients: List[str] = Field(..., description="Sanitized list of query ingredients")
    dietary_preference: str = Field(..., description="Applied dietary constraint")
    max_cook_time_minutes: Optional[int] = Field(None, description="Applied cooking time constraint")
    recipes: List[MatchedRecipeItem] = Field(default_factory=list, description="Ranked list of matching recipes")
    message: str = Field(..., description="Helpful summary or empty state guidance")
