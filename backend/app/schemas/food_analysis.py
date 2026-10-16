"""Pydantic schemas for food vision analysis, separating direct observations from culinary inferences."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class IngredientObservation(BaseModel):
    """An ingredient item with strict distinction between direct physical observation and culinary inference."""
    name: str = Field(
        ...,
        description="Ingredient name",
        example="Grilled Atlantic Salmon"
    )
    is_directly_visible: bool = Field(
        ...,
        description="True if physically visible in the image; False if an inferred culinary guess (e.g., cooking oil, seasoning, hidden filler)",
        example=True,
    )
    notes: Optional[str] = Field(
        None,
        description="Visual description or rationale for inference",
        example="Distinct pink flesh with charred grill crosshatch marks"
    )
    estimated_grams: Optional[float] = Field(
        None,
        ge=1,
        le=5000,
        description="Visual portion estimate in grams (approximate only)",
        example=180.0,
    )


class NutritionEstimate(BaseModel):
    """Macronutrient approximation calibrated against standard reference benchmarks."""
    estimated_calories: int = Field(
        ...,
        ge=0,
        description="Estimated total calories based on visual portion",
        example=520
    )
    protein_g: float = Field(
        ...,
        ge=0,
        description="Estimated protein in grams",
        example=42.0
    )
    carbs_g: float = Field(
        ...,
        ge=0,
        description="Estimated carbohydrates in grams",
        example=28.0
    )
    fat_g: float = Field(
        ...,
        ge=0,
        description="Estimated fat in grams",
        example=18.0
    )
    basis: str = Field(
        default="Visual portion approximation relative to USDA reference data",
        description="Estimation basis statement reminding user this is non-clinical"
    )


class StructuredFoodAnalysisResponse(BaseModel):
    """Multimodal food recognition response with strict boundary between observations and guesses."""
    dish_name: str = Field(
        ...,
        description="Identified culinary preparation or likely dish name",
        example="Mediterranean Grilled Salmon Bowl"
    )
    confidence_assessment: str = Field(
        ...,
        description="Qualitative confidence rating: 'High', 'Moderate', or 'Low' based on visual clarity",
        example="High"
    )
    apparent_preparation_method: str = Field(
        ...,
        description="Observed cooking technique (e.g., pan-seared, roasted, grilled, raw, deep-fried)",
        example="Grilled / Pan-seared with charred exterior, served over steamed grain"
    )
    visible_ingredients: List[str] = Field(
        ...,
        description="Constituents, produce, and garnishes directly visible to the naked eye",
        example=[
            "Atlantic Salmon fillet with grill marks",
            "Cooked quinoa grain bed",
            "Steamed broccoli florets",
            "Diced avocado",
            "Halved cherry tomatoes"
        ]
    )
    potential_ingredients_or_guesses: List[str] = Field(
        ...,
        description="Culinary inferences, hidden seasonings, cooking oils, broths, or fillings not directly verifiable by sight",
        example=[
            "Extra virgin olive oil (used in searing/dressing)",
            "Salt and black pepper seasoning",
            "Lemon juice marinade",
            "Cooking fat"
        ]
    )
    visual_uncertainties_and_ambiguities: List[str] = Field(
        ...,
        description="Explicit uncertainties: hidden sauces, unseen layers, allergen ambiguity, 2D depth ambiguity",
        example=[
            "Exact cooking oil cannot be verified visually; could be seed oil, olive oil, or butter.",
            "Potential hidden dairy, gluten, or soy in dressing or marinades cannot be ruled out by sight.",
            "Internal seasoning, sodium levels, and added sugars cannot be detected.",
            "Portion volume and density cannot be measured precisely from a 2D photograph."
        ]
    )
    decomposed_items: List[IngredientObservation] = Field(
        default_factory=list,
        description="Detailed list of items flagging visible vs inferred"
    )
    nutritional_estimate: Optional[NutritionEstimate] = Field(
        None,
        description="Approximate macronutrient breakdown based on visual portion estimation"
    )
    dietary_tags: List[str] = Field(
        default_factory=list,
        description="Dietary tags e.g. Pescatarian, High-Protein, Gluten-Free Option",
        example=["Pescatarian", "High-Protein", "Whole-Food"]
    )
    user_question: Optional[str] = Field(
        None,
        description="The user's query if one was submitted with the image",
        example="Is this suitable for a dairy-free diet?"
    )
    user_question_answer: Optional[str] = Field(
        None,
        description="Model answer strictly distinguishing visible evidence from speculation",
        example="No dairy products (such as cheese, butter sauces, or sour cream) are visually visible. However, marinades or cooking fats might contain butter or dairy solids, which cannot be verified without ingredient labeling."
    )
    safety_and_allergen_disclaimer: str = Field(
        default="Visual analysis cannot confirm hidden ingredients, allergens, food safety, or exact portion weight. Never rely on image recognition for medical or severe allergy management.",
        description="Mandatory health & safety disclaimer"
    )
    provider_metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Metadata regarding AI provider, model version, and processing time"
    )
