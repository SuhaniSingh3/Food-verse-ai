"""Pantry recipe matching engine for 'Cook With Ingredients You Have' feature.

Normalizes user ingredients and synonyms, evaluates curated recipe catalogue,
strictly applies vegetarian and vegan filters, computes individual ingredient coverage,
decomposes grouped ingredients, and ranks recipes by available vs. missing ingredients.
"""
import re
from typing import Dict, List, Optional, Set, Tuple
from app.ai.local_recipe_catalogue import LOCAL_RECIPE_CATALOGUE
from app.core.errors import MediaValidationError
from app.core.logging import logger
from app.schemas.recipes import (
    CookWithIngredientsRequest,
    CookWithIngredientsResponse,
    MatchedRecipeItem,
    RecipeIngredientQuantity,
    RecipeItem,
    RecipeSubstitution,
)

# ---------------------------------------------------------------------------
# Strict Animal-Derived Keywords for Vegetarian & Vegan Filtering
# ---------------------------------------------------------------------------
NON_VEGETARIAN_TERMS: Set[str] = {
    "chicken", "pork", "beef", "meat", "fish", "salmon", "tuna", "prawn",
    "prawns", "shrimp", "seafood", "lamb", "mutton", "bacon", "ham",
    "chashu", "anchovy", "anchovies", "crab", "lobster",
}

NON_VEGAN_TERMS: Set[str] = NON_VEGETARIAN_TERMS | {
    "butter", "cheese", "cream", "milk", "yogurt", "ghee", "paneer",
    "egg", "eggs", "honey", "dairy", "whey", "mayo", "mayonnaise",
    "mozzarella", "cheddar", "parmesan", "dahi", "malai", "makhan",
}

# ---------------------------------------------------------------------------
# Common Preparation Adjectives & Stop-Words to Strip Before Matching
# ---------------------------------------------------------------------------
PREP_WORDS: Set[str] = {
    "fresh", "diced", "chopped", "minced", "shredded", "grated", "sliced",
    "cooked", "boiled", "steamed", "roasted", "fried", "dried", "salted",
    "cracked", "whole", "pureed", "finely", "coarsely", "ripe", "raw",
    "dry", "pieces", "cubed", "mashed", "split", "toasted", "warm", "cold",
    "cloves", "clove", "stalks", "leaves", "leaf", "wedge", "wedges",
}

# ---------------------------------------------------------------------------
# Curated Ingredient Synonyms & Plural Normalization Map
# ---------------------------------------------------------------------------
INGREDIENT_SYNONYMS: Dict[str, str] = {
    # Nightshades & Root Veggies
    "potatoes": "potato",
    "potato": "potato",
    "aloo": "potato",
    "batata": "potato",
    "sweet potatoes": "sweet potato",
    "sweet potato": "sweet potato",
    "shakarkand": "sweet potato",
    "tomatoes": "tomato",
    "tomato": "tomato",
    "tamatar": "tomato",
    "tomato puree": "tomato",
    "onions": "onion",
    "onion": "onion",
    "kanda": "onion",
    "pyaz": "onion",
    "shallots": "onion",
    "shallot": "onion",
    "red onion": "onion",
    "red onions": "onion",
    "yellow onion": "onion",
    "white onion": "onion",
    # Spring Onions (Distinct from bulb onions)
    "spring onion": "spring onion",
    "spring onions": "spring onion",
    "scallion": "spring onion",
    "scallions": "spring onion",
    "green onion": "spring onion",
    "green onions": "spring onion",
    # Aromatics
    "garlic": "garlic",
    "garlic cloves": "garlic",
    "garlic clove": "garlic",
    "minced garlic": "garlic",
    "garlic paste": "garlic",
    "lahsun": "garlic",
    "ginger": "ginger",
    "fresh ginger": "ginger",
    "minced ginger": "ginger",
    "ginger paste": "ginger",
    "adrak": "ginger",
    # Condiments (Distinct from raw produce)
    "chutney": "red chutney",
    "red chutney": "red chutney",
    "tomato chutney": "red chutney",
    "tomato chili chutney": "red chutney",
    "red tomato chili chutney": "red chutney",
    "dipping chutney": "red chutney",
    "spicy red chutney": "red chutney",
    # Flours & Grains
    "flour": "flour",
    "all purpose flour": "flour",
    "all-purpose flour": "flour",
    "maida": "flour",
    "plain flour": "flour",
    "wheat flour": "flour",
    "atta": "flour",
    "rice": "rice",
    "cooked rice": "rice",
    "basmati rice": "rice",
    "jasmine rice": "rice",
    "poha": "flattened rice",
    "flattened rice": "flattened rice",
    "beaten rice": "flattened rice",
    "aval": "flattened rice",
    "bread": "bread",
    "bread slices": "bread",
    "pav": "bread",
    "bread rolls": "bread",
    "buns": "bread",
    "dinner rolls": "bread",
    "pasta": "pasta",
    "spaghetti": "pasta",
    "penne": "pasta",
    "fusilli": "pasta",
    "macaroni": "pasta",
    "noodles": "noodles",
    "ramen noodles": "noodles",
    # Dairy & Fats
    "butter": "butter",
    "salted butter": "butter",
    "dairy butter": "butter",
    "unsalted butter": "butter",
    "makhan": "butter",
    "ghee": "ghee",
    "clarified butter": "ghee",
    "paneer": "paneer",
    "cottage cheese": "paneer",
    "indian cottage cheese": "paneer",
    "cheese": "cheese",
    "cheddar": "cheese",
    "mozzarella": "cheese",
    "cream": "cream",
    "heavy cream": "cream",
    "fresh cream": "cream",
    "malai": "cream",
    "yogurt": "yogurt",
    "curd": "yogurt",
    "dahi": "yogurt",
    "egg": "egg",
    "eggs": "egg",
    "whole eggs": "egg",
    # Oils
    "oil": "oil",
    "cooking oil": "oil",
    "olive oil": "oil",
    "extra virgin olive oil": "oil",
    "vegetable oil": "oil",
    "sunflower oil": "oil",
    "mustard oil": "oil",
    "sesame oil": "sesame oil",
    "toasted sesame oil": "sesame oil",
    # Legumes & Pulses
    "chickpeas": "chickpeas",
    "chana": "chickpeas",
    "kabuli chana": "chickpeas",
    "garbanzo": "chickpeas",
    "garbanzo beans": "chickpeas",
    "peas": "peas",
    "green peas": "peas",
    "matar": "peas",
    "lentils": "lentils",
    "black lentils": "black lentils",
    "urad dal": "black lentils",
    "kidney beans": "kidney beans",
    "rajma": "kidney beans",
    "toor dal": "lentils",
    "yellow lentils": "lentils",
    # Vegetables & Produce
    "cabbage": "cabbage",
    "shredded cabbage": "cabbage",
    "patta gobi": "cabbage",
    "carrot": "carrot",
    "carrots": "carrot",
    "gajar": "carrot",
    "spinach": "spinach",
    "baby spinach": "spinach",
    "palak": "spinach",
    "cauliflower": "cauliflower",
    "gobi": "cauliflower",
    "peanuts": "peanuts",
    "peanut": "peanuts",
    "groundnuts": "peanuts",
    "coriander": "coriander",
    "cilantro": "coriander",
    "fresh coriander": "coriander",
    "coriander leaves": "coriander",
    "dhaniya": "coriander",
    "lemon": "lemon",
    "lemons": "lemon",
    "lemon juice": "lemon",
    "lime": "lemon",
    "parsley": "parsley",
    "fresh parsley": "parsley",
    "basil": "basil",
    "fresh basil": "basil",
    # Seasonings & Condiments
    "chili": "chili",
    "chilies": "chili",
    "green chili": "chili",
    "green chilies": "chili",
    "red chili": "chili",
    "red chilies": "chili",
    "chili powder": "chili",
    "chili flakes": "chili",
    "mirchi": "chili",
    "soy sauce": "soy sauce",
    "dark soy sauce": "soy sauce",
    "light soy sauce": "soy sauce",
    "vinegar": "vinegar",
    "mustard seeds": "mustard seeds",
    "rai": "mustard seeds",
    "curry leaves": "curry leaves",
    "kadi patta": "curry leaves",
    "cumin": "cumin",
    "cumin seeds": "cumin",
    "jeera": "cumin",
    "turmeric": "turmeric",
    "turmeric powder": "turmeric",
    "haldi": "turmeric",
    "black pepper": "black pepper",
    "pepper": "black pepper",
    "salt": "salt",
    "sea salt": "salt",
    # Proteins
    "chicken": "chicken",
    "chicken breast": "chicken",
    "chicken pieces": "chicken",
    "pork": "pork",
    "chashu pork": "pork",
    "salmon": "salmon",
    "salmon fillet": "salmon",
    "tofu": "tofu",
    "firm tofu": "tofu",
}

# Sorted synonym entries (longest first) to prevent sub-phrase misattributions
SORTED_SYNONYMS: List[Tuple[str, str]] = sorted(
    INGREDIENT_SYNONYMS.items(), key=lambda x: len(x[0]), reverse=True
)


def clean_ingredient_phrase(raw: str) -> str:
    """Normalize whitespace, remove parenthetical descriptors, and strip prep adjectives."""
    clean = raw.lower().strip()
    # Strip parenthetical descriptors e.g. '(Maida)', '(batata)'
    clean = re.sub(r"\(.*?\)", "", clean)
    clean = re.sub(r"[/_\-]+", " ", clean)
    clean = re.sub(r"[^\w\s]", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()

    words = clean.split()
    filtered = [w for w in words if w not in PREP_WORDS]
    if filtered:
        return " ".join(filtered)
    return clean


def canonicalize_ingredient(raw: str) -> str:
    """Map an ingredient phrase to its canonical synonym if recognized.

    Ensures distinct ingredients (e.g. spring onion vs onion, sweet potato vs potato,
    chutney vs tomato) are strictly maintained as distinct canonical entities.
    """
    cleaned = clean_ingredient_phrase(raw)
    if not cleaned:
        return ""

    # 1. Exact match in synonym map
    if cleaned in INGREDIENT_SYNONYMS:
        return INGREDIENT_SYNONYMS[cleaned]

    # 2. Singularize plural variations
    if cleaned.endswith("ies") and (cleaned[:-3] + "y") in INGREDIENT_SYNONYMS:
        return INGREDIENT_SYNONYMS[cleaned[:-3] + "y"]
    if cleaned.endswith("es") and cleaned[:-2] in INGREDIENT_SYNONYMS:
        return INGREDIENT_SYNONYMS[cleaned[:-2]]
    if cleaned.endswith("s") and not cleaned.endswith("ss") and cleaned[:-1] in INGREDIENT_SYNONYMS:
        return INGREDIENT_SYNONYMS[cleaned[:-1]]

    # 3. Check sorted synonyms (longest first) with word boundary matching
    for syn_key, canonical in SORTED_SYNONYMS:
        pattern = rf"\b{re.escape(syn_key)}\b"
        if re.search(pattern, cleaned):
            return canonical

    return cleaned


def decompose_ingredient_components(raw_name: str) -> List[str]:
    """Break a composite or grouped ingredient into individual component names.

    Examples:
        'Finely Shredded Cabbage, Carrots & Onions' -> ['Cabbage', 'Carrots', 'Onions']
        'Minced Ginger, Garlic & Spring Onions' -> ['Ginger', 'Garlic', 'Spring Onions']
        'Mixed Vegetable Bhaji (Potatoes, Peas, Cauliflower)' -> ['Potatoes', 'Peas', 'Cauliflower']
        'Fresh Tomatoes' -> ['Fresh Tomatoes']
    """
    # Check for parenthetical lists like '(Potatoes, Peas, Cauliflower)'
    paren_match = re.search(r"\(([^)]+)\)", raw_name)
    if paren_match:
        inside = paren_match.group(1)
        if "," in inside or " & " in inside or " and " in inside:
            parts = re.split(r",\s*|\s*&\s*|\s+and\s+", inside)
            comps = [p.strip() for p in parts if p.strip()]
            if len(comps) > 1:
                return comps

    # Check for conjunctions outside parentheses
    if " & " in raw_name or " and " in raw_name or ", " in raw_name:
        parts = re.split(r",\s*|\s*&\s*|\s+and\s+", raw_name)
        comps = [p.strip() for p in parts if p.strip() and p.strip().lower() != "water"]
        if comps:
            return comps

    return [raw_name.strip()]


def match_component_to_pantry(component_name: str, pantry_items: List[str]) -> Optional[str]:
    """Check if an individual ingredient component matches any user-entered pantry item.

    Returns the user's pantry item name if a valid match or synonym is found, or None.
    """
    comp_canon = canonicalize_ingredient(component_name)
    if not comp_canon:
        return None

    for p_raw in pantry_items:
        p_canon = canonicalize_ingredient(p_raw)
        if not p_canon:
            continue
        if comp_canon == p_canon:
            return p_raw

    return None


def extract_ingredient_tokens(text: str) -> Set[str]:
    """Extract normalized word tokens for allergen auditing and classification."""
    tokens: Set[str] = set()
    for comp in decompose_ingredient_components(text):
        canon = canonicalize_ingredient(comp)
        if canon:
            tokens.add(canon)
            for w in canon.split():
                if len(w) >= 3:
                    tokens.add(w)
        cleaned = clean_ingredient_phrase(comp)
        for w in cleaned.split():
            if len(w) >= 3:
                tokens.add(w)
    return tokens


def is_recipe_vegetarian(recipe_dict: dict) -> bool:
    """Strictly verify if a recipe contains zero meat, poultry, or seafood."""
    for name, *_ in recipe_dict.get("ingredients", []):
        tokens = extract_ingredient_tokens(name)
        if any(term in tokens for term in NON_VEGETARIAN_TERMS):
            return False
    return True


def is_recipe_vegan(recipe_dict: dict) -> bool:
    """Strictly verify if a recipe contains zero animal-derived ingredients (meat, fish, dairy, eggs, honey)."""
    for name, *_ in recipe_dict.get("ingredients", []):
        tokens = extract_ingredient_tokens(name)
        if any(term in tokens for term in NON_VEGAN_TERMS):
            return False
    return True


class PantryMatcher:
    """Evaluates and ranks curated recipes against a user's pantry ingredients."""

    @classmethod
    def match_pantry_ingredients(cls, request: CookWithIngredientsRequest) -> CookWithIngredientsResponse:
        """Execute pantry-based recipe matching, filtering, and ranking."""
        # 1. Input sanitization & validation
        raw_ingredients = request.ingredients or []
        cleaned_ingredients: List[str] = []
        for ing in raw_ingredients:
            s = ing.strip()
            if s and s not in cleaned_ingredients:
                cleaned_ingredients.append(s)

        if not cleaned_ingredients:
            raise MediaValidationError(
                message="At least one pantry ingredient must be provided.",
                details={"provided_ingredients": raw_ingredients},
            )

        dietary = (request.dietary_preference or "no_restriction").lower().strip()
        max_time = request.max_cook_time_minutes

        if max_time is not None and max_time <= 0:
            raise MediaValidationError(
                message="Maximum cooking time must be greater than 0 minutes.",
                details={"max_cook_time_minutes": max_time},
            )

        logger.info(
            f"Pantry Matcher query: {len(cleaned_ingredients)} ingredients ({cleaned_ingredients}). "
            f"Dietary: {dietary}, Max Time: {max_time}"
        )

        matched_results: List[MatchedRecipeItem] = []
        seen_recipe_titles: Set[str] = set()

        # 2. Iterate through all curated recipes in catalogue
        for catalogue_key, recipe_list in LOCAL_RECIPE_CATALOGUE.items():
            if not recipe_list:
                continue

            for recipe_dict in recipe_list:
                title = recipe_dict.get("title", "")
                if title in seen_recipe_titles:
                    continue

                # A. Dietary Filter
                if dietary == "vegan":
                    if not is_recipe_vegan(recipe_dict):
                        continue
                elif dietary in ("vegetarian", "veg"):
                    if not is_recipe_vegetarian(recipe_dict):
                        continue

                # B. Cooking Time Filter
                recipe_cook_time = recipe_dict.get("cook_time_minutes", 15)
                if max_time is not None and recipe_cook_time > max_time:
                    continue

                # C. Ingredient Matching & Coverage Calculation
                recipe_ingredients = recipe_dict.get("ingredients", [])
                if not recipe_ingredients:
                    continue

                recipe_available_items: List[str] = []
                recipe_missing_items: List[str] = []
                structured_quantities: List[RecipeIngredientQuantity] = []

                total_required_components = 0
                total_matched_components = 0

                for ing_tuple in recipe_ingredients:
                    ing_name, ing_amount, ing_unit, ing_notes = ing_tuple[0], ing_tuple[1], ing_tuple[2], ing_tuple[3]
                    components = decompose_ingredient_components(ing_name)
                    total_required_components += len(components)

                    avail_comps: List[Tuple[str, str]] = []
                    missing_comps: List[str] = []

                    for comp in components:
                        matched_by = match_component_to_pantry(comp, cleaned_ingredients)
                        if matched_by:
                            avail_comps.append((comp, matched_by))
                            total_matched_components += 1
                        else:
                            missing_comps.append(comp)

                    # An ingredient is fully available ONLY when ALL its required components are present
                    is_fully_available = (len(avail_comps) == len(components) and len(components) > 0)

                    if is_fully_available:
                        recipe_available_items.append(ing_name)
                        matched_by_name = avail_comps[0][1]
                    else:
                        matched_by_name = None
                        # For grouped ingredients where only some components are available:
                        if len(components) > 1 and len(avail_comps) > 0:
                            # Do NOT mark as available. Record missing components explicitly
                            for mc in missing_comps:
                                recipe_missing_items.append(mc)
                        else:
                            recipe_missing_items.append(ing_name)

                    structured_quantities.append(
                        RecipeIngredientQuantity(
                            name=ing_name,
                            amount=ing_amount,
                            unit=ing_unit,
                            notes=ing_notes,
                            is_available=is_fully_available,
                            matched_by=matched_by_name,
                            available_components=[c for c, _ in avail_comps],
                            missing_components=missing_comps,
                        )
                    )

                # Only include as candidate if user has at least one ingredient component
                if total_matched_components == 0:
                    continue

                seen_recipe_titles.add(title)

                # Match percentage calculated strictly from individual required ingredients
                if total_required_components > 0:
                    match_percentage = round((total_matched_components / total_required_components) * 100, 1)
                else:
                    match_percentage = 0.0

                can_make_now = (total_matched_components == total_required_components and total_required_components > 0)

                # D. Identify Supported Substitutions for Missing Ingredients
                catalogue_subs = recipe_dict.get("substitutions", [])
                supported_subs: List[RecipeSubstitution] = []
                for missing_ing in recipe_missing_items:
                    missing_canon = canonicalize_ingredient(missing_ing)
                    for orig, sub, notes in catalogue_subs:
                        orig_canon = canonicalize_ingredient(orig)
                        if missing_canon and orig_canon and (missing_canon == orig_canon or orig_canon in missing_canon):
                            supported_subs.append(
                                RecipeSubstitution(original=orig, substitute=sub, notes=notes)
                            )

                substitutions = [
                    RecipeSubstitution(original=orig, substitute=sub, notes=notes)
                    for orig, sub, notes in catalogue_subs
                ]

                # Dietary tags audit
                tags = list(recipe_dict.get("tags", []))
                if is_recipe_vegan(recipe_dict) and "Vegan" not in tags:
                    tags.append("Vegan")
                if is_recipe_vegetarian(recipe_dict) and "Vegetarian" not in tags:
                    tags.append("Vegetarian")

                recipe_item = RecipeItem(
                    id=f"recipe_{catalogue_key}_{recipe_dict.get('id_suffix', 'default')}",
                    title=recipe_dict["title"],
                    description=recipe_dict["description"],
                    cuisine=recipe_dict["cuisine"],
                    difficulty=recipe_dict.get("difficulty", "Beginner"),
                    prep_time_minutes=recipe_dict.get("prep_time_minutes", 10),
                    cook_time_minutes=recipe_cook_time,
                    base_servings=recipe_dict.get("base_servings", 2),
                    servings=recipe_dict.get("base_servings", 2),
                    ingredient_quantities=structured_quantities,
                    preparation_steps=recipe_dict["steps"],
                    substitutions=substitutions,
                    dietary_tags=tags,
                    allergens_flagged=[],
                    allergen_advisory=(
                        "Culinary suggestions are inspirational. Always verify manufactured ingredient packaging for "
                        "cross-contamination warnings, unlisted additives, and allergen facilities before cooking."
                    ),
                    estimated_calories_per_serving=recipe_dict.get("calories"),
                    protein_g=recipe_dict.get("protein"),
                    carbs_g=recipe_dict.get("carbs"),
                    fat_g=recipe_dict.get("fat"),
                )

                matched_results.append(
                    MatchedRecipeItem(
                        recipe=recipe_item,
                        match_percentage=match_percentage,
                        matched_ingredients_count=total_matched_components,
                        total_recipe_ingredients_count=total_required_components,
                        available_ingredients=recipe_available_items,
                        missing_ingredients=recipe_missing_items,
                        can_make_now=can_make_now,
                        supported_substitutions=supported_subs,
                    )
                )

        # 3. Rank Results
        # Primary: match_percentage (descending)
        # Secondary: missing ingredients count (ascending)
        # Tertiary: cook_time_minutes (ascending)
        matched_results.sort(
            key=lambda item: (
                -item.match_percentage,
                len(item.missing_ingredients),
                item.recipe.cook_time_minutes,
            )
        )

        # 4. Formulate response message
        if matched_results:
            fully_ready = sum(1 for r in matched_results if r.can_make_now)
            if fully_ready > 0:
                msg = f"Found {len(matched_results)} matching recipes ({fully_ready} ready to make right now with your ingredients!)."
            else:
                msg = f"Found {len(matched_results)} matching recipes based on your pantry ingredients. Check missing items and suggested substitutions."
        else:
            msg = (
                "No recipes matched your selected ingredients and filters. "
                "Try adding common staples (such as rice, pasta, flour, onions, or potatoes) "
                "or relaxing your dietary or cooking time preferences."
            )

        return CookWithIngredientsResponse(
            total_matched=len(matched_results),
            query_ingredients=cleaned_ingredients,
            dietary_preference=dietary,
            max_cook_time_minutes=max_time,
            recipes=matched_results,
            message=msg,
        )
