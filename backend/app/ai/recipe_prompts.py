"""Recipe synthesis prompts and allergen conflict auditing."""
from typing import List
from app.schemas.recipes import RecipeGenerationRequest, RecipeItem

RECIPE_SYSTEM_INSTRUCTION = """You are Food Verse AI's expert culinary chef and nutritional formulation specialist.
Your mission is to synthesize practical, delicious, zero-waste recipes using the ingredients currently available in the user's home pantry.

CRITICAL ALLERGEN & DIETARY SAFETY RULES:
1. STRICT ALLERGEN PROHIBITION:
   - The user will provide a list of "allergies_and_avoid".
   - You MUST NOT include any of those ingredients, or any hidden derivatives (e.g., if Dairy is prohibited, do NOT use butter, cheese, cream, milk, whey, or ghee).
   - If an ingredient in the user's pantry conflicts with their stated allergies, DO NOT USE IT.
2. DIETARY RESTRICTION ENFORCEMENT:
   - If Vegetarian: NO meat, poultry, fish, seafood, or gelatin.
   - If Vegan: NO meat, poultry, fish, seafood, dairy, eggs, honey, or gelatin.
   - If Pescatarian: Fish and seafood are permitted, but NO red meat or poultry.
3. SCALED QUANTITIES:
   - Scale every ingredient quantity (numerical amount + standard unit) to precisely serve the requested number of servings.
4. HONEST SUBSTITUTIONS:
   - Suggest 2-3 realistic substitutions for ingredients a user might want to swap.
5. NO MEDICAL CLAIMS:
   - Include the mandatory advisory that recipes are inspirational and packaged labels must be inspected for cross-contact.
"""


def build_recipe_prompt(req: RecipeGenerationRequest) -> str:
    """Generate structured user prompt for recipe synthesis."""
    ingredients_str = ", ".join(req.ingredients)
    allergies_str = ", ".join(req.allergies_and_avoid) if req.allergies_and_avoid else "None specified"

    return (
        f"Synthesize 2 candidate recipes matching these criteria:\n\n"
        f"- Available Pantry Ingredients: {ingredients_str}\n"
        f"- Cuisine Preference: {req.cuisine or 'Any'}\n"
        f"- Dietary Focus: {req.dietary_preference or 'Standard'}\n"
        f"- STRICT ALLERGIES & INGREDIENTS TO AVOID: {allergies_str}\n"
        f"- Target Servings: {req.servings}\n"
        f"- Maximum Cooking Time: {req.max_cook_time_minutes} minutes\n"
        f"- Cooking Skill Level: {req.skill_level or 'Beginner'}\n\n"
        f"Requirements:\n"
        f"1. Maximize usage of the available pantry ingredients.\n"
        f"2. Provide exact ingredient quantities (amount, unit, name, notes) scaled for {req.servings} servings.\n"
        f"3. Provide numbered step-by-step instructions.\n"
        f"4. Provide 2-3 substitutions.\n"
        f"5. Check that ZERO ingredients conflict with the avoidance list: [{allergies_str}].\n"
        f"Strictly output according to the requested JSON schema."
    )


# Common allergen derivative mappings
ALLERGEN_KEYWORDS = {
    "dairy": ["dairy", "milk", "butter", "cheese", "cream", "yogurt", "ghee", "whey", "casein", "sour cream", "parmesan", "mozzarella", "cheddar"],
    "peanut": ["peanut", "groundnut", "peanut butter", "peanut oil"],
    "tree nut": ["tree nut", "almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia"],
    "gluten": ["gluten", "wheat", "flour", "barley", "rye", "bread", "pasta", "semolina", "couscous"],
    "shellfish": ["shellfish", "shrimp", "prawn", "crab", "lobster", "mussel", "oyster", "clam", "scallop"],
    "egg": ["egg", "eggs", "mayonnaise", "meringue", "albumin", "yolk", "egg white"],
    "soy": ["soy", "soya", "tofu", "edamame", "miso", "tempeh", "soy sauce"],
    "sesame": ["sesame", "tahini", "sesame oil", "sesame seed"],
}


def audit_recipe_allergens(recipe: RecipeItem, allergies_and_avoid: List[str]) -> List[str]:
    """Scan a recipe for conflicts with user-specified allergies or avoidance items.

    Returns a list of conflict messages if any prohibited item is detected.
    """
    conflicts = []
    if not allergies_and_avoid:
        return conflicts

    # Aggregate all recipe text to inspect
    recipe_texts = [recipe.title.lower(), recipe.description.lower()]
    for ing in recipe.ingredient_quantities:
        recipe_texts.append(ing.name.lower())
        if ing.notes:
            recipe_texts.append(ing.notes.lower())
    for step in recipe.preparation_steps:
        recipe_texts.append(step.lower())
    for sub in recipe.substitutions:
        recipe_texts.append(sub.substitute.lower())

    full_text = " ".join(recipe_texts)

    for item in allergies_and_avoid:
        clean_item = item.strip().lower()
        if not clean_item:
            continue

        # Check direct keyword
        if clean_item in full_text:
            conflicts.append(f"Contains or references '{item}' which is in your avoidance list.")
            continue

        # Check known derivative synonyms
        for category, synonyms in ALLERGEN_KEYWORDS.items():
            if clean_item in category or category in clean_item:
                for syn in synonyms:
                    # Match word boundary
                    if f" {syn} " in f" {full_text} ":
                        conflicts.append(f"Potential conflict: detected '{syn}' related to '{item}' allergy.")
                        break

    return list(dict.fromkeys(conflicts))  # Remove duplicates
