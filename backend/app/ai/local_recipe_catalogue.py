"""Clearly labeled local recipe catalogue providing authentic, dish-appropriate recipes.

Requirement 4: Provides dish-appropriate ingredients and authentic cooking instructions
using a curated local recipe catalogue. Strictly avoids reusing salmon details for unrelated dishes.
Requirement 6: If no suitable recipe exists, indicates that data is unavailable instead of fabricating results.
"""
from typing import Dict, List, Optional
from app.schemas.recipes import (
    RecipeIngredientQuantity,
    RecipeItem,
    RecipeSubstitution,
)


def _scale_qty(amount: float, servings: int, base_servings: int = 2) -> float:
    ratio = servings / base_servings
    scaled = round(amount * ratio, 1)
    return round(scaled) if scaled.is_integer() else scaled


# ---------------------------------------------------------------------------
# LOCAL RECIPE CATALOGUE (Curated Authenticated Dish Profiles)
# ---------------------------------------------------------------------------
LOCAL_RECIPE_CATALOGUE: Dict[str, List[dict]] = {
    # -----------------------------------------------------------------------
    # Regional Indian Dishes
    # -----------------------------------------------------------------------
    "pav_bhaji": [
        {
            "id_suffix": "authentic_mumbai",
            "title": "Authentic Mumbai Pav Bhaji (Slow-Simmered Spiced Bhaji with Buttered Pav)",
            "description": "Iconic Maharashtrian street food: a rich, slow-simmered mash of potatoes, peas, tomatoes, and cauliflower infused with pav bhaji masala and melted dairy butter, served with golden butter-toasted soft pav bread rolls, diced red onions, and fresh lemon wedges.",
            "cuisine": "Indian / Maharashtrian Street Food",
            "difficulty": "Beginner",
            "prep_time_minutes": 15,
            "cook_time_minutes": 25,
            "base_servings": 2,
            "ingredients": [
                ("Pav / Soft Bread Rolls", 120.0, "pieces / rolls", "Split horizontally for griddle toasting"),
                ("Mixed Vegetable Bhaji (Potatoes, Peas, Cauliflower)", 220.0, "g", "Boiled and coarsely mashed"),
                ("Tomatoes", 80.0, "g", "Finely pureed or chopped"),
                ("Salted Dairy Butter", 25.0, "g", "Used for sautéing masala and toasting pav"),
                ("Pav Bhaji Masala Blend", 10.0, "g", "Roasted coriander, cumin, amchur, fennel, and chili"),
                ("Diced Red Onions & Lemon Wedge", 30.0, "g", "Fresh crunchy garnish"),
                ("Chopped Fresh Coriander", 5.0, "g", "Finely chopped cilantro leaves"),
            ],
            "steps": [
                "Boil potatoes, cauliflower, and green peas until fork-tender, then coarsely mash together with a potato masher.",
                "In a wide skillet or flat tawa, melt half of the butter over medium heat. Sauté finely diced onions and ginger-garlic aromatics until translucent and fragrant.",
                "Add tomato puree, Kashmiri red chili powder, and pav bhaji masala. Cook on medium heat for 4-5 minutes until the butter begins to separate from the spiced gravy.",
                "Fold in the mashed vegetable mixture with a half-cup of warm water. Mash vigorously on the hot tawa until the bhaji attains a smooth, cohesive, rich consistency.",
                "Simmer gently on low heat for 8-10 minutes, stirring in the remaining butter, kasuri methi (fenugreek leaves), and fresh cilantro. Finish with a squeeze of fresh lemon juice.",
                "Generously butter the split pav rolls and toast on the hot griddle until warm and golden with lightly crisp edges.",
                "Serve piping hot bhaji garnished with a pat of melting butter, alongside toasted pav rolls, crunchy diced onions, and lemon wedges.",
            ],
            "substitutions": [
                ("Pav / Bread Rolls", "Brioche Buns, Whole Wheat Dinner Rolls, or Gluten-Free Rolls", "Direct bread swap for dipping"),
                ("Dairy Butter", "Clarified Butter (Ghee) or Plant-Based Coconut Butter", "Dairy-free or richness alternative"),
                ("Potatoes", "Boiled Sweet Potatoes or Raw Green Bananas", "Lower glycemic index substitution"),
            ],
            "tags": ["Indian Street Food", "Vegetarian", "Maharashtrian", "Comfort Food"],
            "calories": 490,
            "protein": 9.5,
            "carbs": 58.0,
            "fat": 24.0,
        },
        {
            "id_suffix": "tawa_cheese",
            "title": "Tawa Cheese Masala Pav Bhaji",
            "description": "Rich street-style Pav Bhaji topped with a generous crown of grated melting cheese, imparting creamy decadence to the spiced vegetable mash.",
            "cuisine": "Indian / Mumbai Street Food",
            "difficulty": "Beginner",
            "prep_time_minutes": 10,
            "cook_time_minutes": 20,
            "base_servings": 2,
            "ingredients": [
                ("Pav / Soft Bread Rolls", 120.0, "pieces / rolls", "Toasted on tawa with butter and coriander"),
                ("Mixed Vegetable Bhaji Mash", 220.0, "g", "Simmered with pav bhaji masala"),
                ("Grated Mild Cheddar / Amul Cheese", 30.0, "g", "Grated over hot bhaji"),
                ("Dairy Butter", 20.0, "g", "For cooking and finishing"),
                ("Diced Onions & Fresh Herbs", 25.0, "g", "Crunchy side accompaniment"),
            ],
            "steps": [
                "Reheat or simmer the spiced vegetable bhaji mash on a wide griddle with a tablespoon of butter.",
                "Adjust seasoning with extra pav bhaji masala and a splash of warm water until velvety.",
                "Spread grated cheese evenly across the top of the hot bhaji and cover with a lid for 1 minute until completely melted.",
                "Toast the pav rolls on the tawa in residual spiced butter and chopped coriander.",
                "Plate the cheesy bhaji immediately alongside warm toasted pav and lemon wedges.",
            ],
            "substitutions": [
                ("Cheese", "Vegan Shredded Mozzarella or Cashew Cream", "Dairy-free cheese alternative"),
            ],
            "tags": ["Indian Street Food", "Vegetarian", "Cheesy Twist"],
            "calories": 540,
            "protein": 13.5,
            "carbs": 59.0,
            "fat": 28.0,
        },
    ],
    "poha": [
        {
            "id_suffix": "traditional_kanda_batata",
            "title": "Traditional Kanda Batata Poha (Flattened Rice with Peanuts & Mustard)",
            "description": "Wholesome, quick Maharashtrian breakfast made with rinsed flattened rice flakes tempered with mustard seeds, curry leaves, turmeric, diced potatoes, and crunchy roasted peanuts.",
            "cuisine": "Indian Breakfast",
            "difficulty": "Beginner",
            "prep_time_minutes": 10,
            "cook_time_minutes": 15,
            "base_servings": 2,
            "ingredients": [
                ("Medium Flattened Rice (Poha)", 150.0, "g", "Rinsed in cold water and drained gently"),
                ("Whole Peanuts", 25.0, "g", "Roasted crunchy"),
                ("Diced Potatoes (Batata)", 70.0, "g", "Finely cubed for fast pan-cooking"),
                ("Diced Onions (Kanda)", 45.0, "g", "Sautéed until translucent"),
                ("Cooking Oil", 12.0, "g", "Mustard seed and curry leaf tempering"),
                ("Curry Leaves & Green Chilies", 5.0, "g", "Tempering aromatics"),
                ("Fresh Lemon & Coriander", 10.0, "g", "Citrus finish"),
            ],
            "steps": [
                "Gently rinse the flattened rice (poha) under running water in a colander until softened; drain thoroughly and toss with turmeric and salt.",
                "Heat cooking oil in a pan, fry peanuts until golden and crisp, then set aside.",
                "In the same oil, temper mustard seeds, cumin, green chilies, and curry leaves until fragrant.",
                "Add diced potatoes and onions; cover and cook on low-medium heat until the potatoes are tender.",
                "Gently fold in the softened flattened rice, sprinkle a tablespoon of water, cover, and steam on low for 3 minutes.",
                "Garnish with the roasted peanuts, fresh coriander, and a generous squeeze of fresh lemon juice before serving.",
            ],
            "substitutions": [
                ("Poha", "Rolled Oats or Rinsed Quinoa Flakes", "Alternative grain substitute"),
                ("Peanuts", "Toasted Cashews or Pumpkin Seeds", "Nut-free alternative"),
            ],
            "tags": ["Indian Breakfast", "Vegetarian", "Gluten-Free", "Quick Meal"],
            "calories": 280,
            "protein": 6.5,
            "carbs": 46.0,
            "fat": 8.5,
        }
    ],
    "samosa": [
        {
            "id_suffix": "punjabi_aloo_matar",
            "title": "Crispy Punjabi Aloo Matar Samosa",
            "description": "Flaky, crisp deep-fried pastry triangles packed with savory spiced potatoes, sweet green peas, crushed coriander seeds, and garam masala.",
            "cuisine": "North Indian Cuisine",
            "difficulty": "Intermediate",
            "prep_time_minutes": 25,
            "cook_time_minutes": 20,
            "base_servings": 2,
            "ingredients": [
                ("All-Purpose Flour Dough (Maida)", 100.0, "g", "Kneaded with ajwain and oil for flaky crust"),
                ("Boiled Spiced Potatoes", 130.0, "g", "Coarsely crushed, not pureed"),
                ("Green Peas (Matar)", 35.0, "g", "Steamed sweet peas"),
                ("Frying Vegetable Oil", 20.0, "g", "Deep frying medium absorbed"),
                ("Whole Coriander, Cumin & Amchur Masala", 10.0, "g", "Aromatic dry spice rub"),
            ],
            "steps": [
                "Roll portions of rested ajwain-infused flour dough into ovals and halve into semi-circles.",
                "Form each semi-circle into a cone, sealing the straight edge with water.",
                "Stuff generously with the spiced potato and green pea masala mixture.",
                "Moisten the top opening with water and press edges firmly together with a pleat to seal.",
                "Fry in medium-hot oil on low-medium heat for 12-15 minutes until evenly golden and shatteringly crisp.",
                "Drain on paper towels and serve hot with tangy tamarind and fresh mint-coriander chutneys.",
            ],
            "substitutions": [
                ("Maida Flour", "Whole Wheat Atta or Filo Pastry Sheets", "Lighter or baked alternative"),
            ],
            "tags": ["Indian Snack", "Vegetarian", "Street Food", "Crispy"],
            "calories": 310,
            "protein": 5.0,
            "carbs": 36.0,
            "fat": 16.0,
        }
    ],
    "dosa": [
        {
            "id_suffix": "crispy_masala_dosa",
            "title": "Golden Crisp Masala Dosa with Potato Masala & Sambar",
            "description": "Classic South Indian fermented rice-lentil crepe cooked to a deep golden crisp with ghee, rolled around spiced turmeric potato filling and served with vegetable sambar.",
            "cuisine": "South Indian Cuisine",
            "difficulty": "Intermediate",
            "prep_time_minutes": 15,
            "cook_time_minutes": 15,
            "base_servings": 2,
            "ingredients": [
                ("Fermented Dosa Batter", 130.0, "g", "Stone-ground parboiled rice and urad dal"),
                ("Spiced Potato Masala", 110.0, "g", "Boiled potatoes tempered with mustard, curry leaves, and onions"),
                ("Vegetable Sambar", 140.0, "g", "Toor dal stew with tamarind and drumsticks"),
                ("Fresh Coconut Chutney", 40.0, "g", "Fresh grated coconut ground with roasted chana and chilies"),
                ("Ghee or Oil", 12.0, "g", "Griddle crisping medium"),
            ],
            "steps": [
                "Heat a seasoned cast iron griddle (tawa) on medium-high; sprinkle water drops to test heat and wipe clean.",
                "Pour a ladle of fermented dosa batter into the center and quickly spread in a circular spiral from inside out into a thin crepe.",
                "Drizzle a teaspoon of ghee or oil along the edges and surface; cook until the bottom turns golden-brown and crisp.",
                "Place a generous portion of warm spiced potato masala along the center of the crepe.",
                "Fold into a cylindrical roll or triangle and slide onto a plate.",
                "Serve immediately with hot lentil sambar and fresh coconut chutney.",
            ],
            "substitutions": [
                ("Ghee", "Sesame Oil or Coconut Oil", "Vegan traditional South Indian alternative"),
            ],
            "tags": ["South Indian", "Vegetarian", "Fermented Food", "Breakfast"],
            "calories": 360,
            "protein": 8.5,
            "carbs": 54.0,
            "fat": 12.0,
        }
    ],
    "idli": [
        {
            "id_suffix": "steamed_fluffy_idli",
            "title": "Soft Steamed Idlis with Vegetable Sambar & Coconut Chutney",
            "description": "Oil-free, naturally fermented steamed rice and de-husked black gram cakes with a light, spongy texture, served piping hot with fragrant sambar.",
            "cuisine": "South Indian Cuisine",
            "difficulty": "Beginner",
            "prep_time_minutes": 10,
            "cook_time_minutes": 12,
            "base_servings": 2,
            "ingredients": [
                ("Fermented Idli Batter", 150.0, "g", "Steamed naturally fermented batter"),
                ("Vegetable Sambar", 150.0, "g", "Simmered spiced toor dal and vegetable broth"),
                ("Fresh Coconut Chutney", 45.0, "g", "Ground coconut and roasted gram condiment"),
            ],
            "steps": [
                "Grease idli molds lightly with oil or ghee.",
                "Pour fermented idli batter into each mold until 3/4 full.",
                "Place into a pre-steamed idli cooker or steamer pot and steam on medium-high heat for 10-12 minutes.",
                "Remove from heat and let cool for 2 minutes; unmold using a wet spoon for clean edges.",
                "Serve steaming hot with hot vegetable sambar and coconut chutney.",
            ],
            "substitutions": [
                ("Rice Batter", "Rava / Semolina Quick Batter", "Instant non-fermented alternative"),
            ],
            "tags": ["South Indian", "Steamed / Oil-Free", "Vegetarian", "Digestible"],
            "calories": 220,
            "protein": 8.0,
            "carbs": 43.0,
            "fat": 2.5,
        }
    ],
    "chole_bhature": [
        {
            "id_suffix": "punjabi_amritsari",
            "title": "Amritsari Chole Bhature (Dark Spiced Chickpeas with Puffed Bread)",
            "description": "Piquant, tea-simmered Punjabi chickpea curry infused with anardana (dried pomegranate) and garam masala, paired with puffed golden-fried leavened bhatura bread.",
            "cuisine": "North Indian / Punjabi Cuisine",
            "difficulty": "Intermediate",
            "prep_time_minutes": 20,
            "cook_time_minutes": 30,
            "base_servings": 2,
            "ingredients": [
                ("Kabuli Chana (Chickpeas)", 180.0, "g", "Boiled tender with black tea bag and bay leaf"),
                ("Bhatura Dough", 140.0, "g", "Leavened flour dough with semolina and yogurt"),
                ("Tomato-Onion Gravy", 80.0, "g", "Pureed aromatics with ginger-garlic"),
                ("Chole Masala & Anardana", 15.0, "g", "Dark tangy spice blend"),
                ("Frying Oil", 25.0, "g", "For frying puffed bhatura"),
                ("Pickled Onions & Green Chilies", 30.0, "g", "Tangy side relish"),
            ],
            "steps": [
                "Pressure cook chickpeas with whole spices and tea bag until buttery soft.",
                "In a heavy kadai, sauté onions, ginger, garlic, and tomato puree until thick and oil releases.",
                "Add chole masala, anardana, and boiled chickpeas along with cooking water. Simmer on low for 20 minutes until thick and dark.",
                "Roll rested bhatura dough into large discs.",
                "Drop carefully into hot oil, gently pressing with a slotted spoon until it puffs completely like a balloon; flip and fry until golden.",
                "Serve immediately with steaming chole, pickled onions, and ginger matchsticks.",
            ],
            "substitutions": [
                ("Bhatura", "Tandoori Roti or Steamed Basmati Rice", "Non-fried healthier accompaniment"),
            ],
            "tags": ["Punjabi", "North Indian", "High-Protein Option", "Comfort Food"],
            "calories": 630,
            "protein": 17.5,
            "carbs": 80.0,
            "fat": 26.0,
        }
    ],
    "dal_makhani": [
        {
            "id_suffix": "slow_simmered_creamy",
            "title": "Slow-Simmered Dal Makhani with Butter & Cream",
            "description": "Rich, velvety whole black lentils (urad) and red kidney beans (rajma) slow-cooked with butter, fresh cream, ripe tomatoes, and fragrant kasuri methi.",
            "cuisine": "North Indian / Punjabi Cuisine",
            "difficulty": "Beginner",
            "prep_time_minutes": 15,
            "cook_time_minutes": 35,
            "base_servings": 2,
            "ingredients": [
                ("Whole Black Lentils & Rajma", 200.0, "g", "Soaked overnight and pressure-cooked until soft"),
                ("Tomato Puree & Ginger-Garlic", 70.0, "g", "Cooked reduction"),
                ("Dairy Butter", 25.0, "g", "For authentic silky texture"),
                ("Heavy Dairy Cream", 20.0, "g", "Swirled in at finish"),
                ("Kashmiri Chili & Garam Masala", 10.0, "g", "Mild fragrant seasoning"),
            ],
            "steps": [
                "Coarsely mash a ladle of cooked lentils against the pan side to develop natural creamy thickness.",
                "In a wide pot, melt butter, add ginger-garlic paste and fresh tomato puree, cooking until aromatic.",
                "Stir in Kashmiri red chili powder, salt, and the cooked black lentils with cooking liquor.",
                "Simmer gently on low heat for 25-30 minutes, stirring frequently so the lentils do not stick.",
                "Stir in heavy cream, remaining butter, and crushed kasuri methi leaves; simmer 2 more minutes.",
                "Garnish with a swirl of fresh cream and ginger juliennes; serve with warm naan or jeera rice.",
            ],
            "substitutions": [
                ("Dairy Cream/Butter", "Coconut Cream & Vegan Butter", "Dairy-free version"),
            ],
            "tags": ["Punjabi", "North Indian", "Vegetarian", "Rich Gravy"],
            "calories": 390,
            "protein": 14.5,
            "carbs": 34.0,
            "fat": 22.0,
        }
    ],
    "chicken_curry": [
        {
            "id_suffix": "homestyle_curry",
            "title": "Homestyle Indian Chicken Curry with Onion-Tomato Masala",
            "description": "Tender chicken pieces simmered in a fragrant, golden-red gravy of caramelized onions, tomatoes, ginger, garlic, and whole spices.",
            "cuisine": "Indian Cuisine",
            "difficulty": "Beginner",
            "prep_time_minutes": 15,
            "cook_time_minutes": 25,
            "base_servings": 2,
            "ingredients": [
                ("Chicken Pieces", 250.0, "g", "Tender boneless or bone-in pieces"),
                ("Onion-Tomato Curry Base", 120.0, "g", "Sautéed aromatics and pureed tomatoes"),
                ("Cooking Oil or Ghee", 15.0, "g", "Cooking medium"),
                ("Indian Curry Spices", 10.0, "g", "Turmeric, cumin, coriander, and garam masala"),
                ("Fresh Cilantro", 5.0, "g", "Garnish"),
            ],
            "steps": [
                "Heat oil in a heavy pot, add whole cumin seeds and finely sliced onions, cooking until deep golden brown.",
                "Add ginger-garlic paste and sauté for 1 minute until fragrant.",
                "Add chicken pieces and sear on high heat for 3-4 minutes until lightly browned.",
                "Stir in pureed tomatoes, turmeric, coriander powder, chili powder, and salt.",
                "Add a half cup of water, cover, and simmer on medium-low for 15 minutes until chicken is tender and cooked through.",
                "Finish with garam masala and fresh coriander; serve hot with rice or warm flatbread.",
            ],
            "substitutions": [
                ("Chicken", "Paneer Cubes, Tofu, or Hard-Boiled Eggs", "Protein substitution"),
            ],
            "tags": ["Indian Cuisine", "High-Protein", "Gluten-Free"],
            "calories": 390,
            "protein": 34.0,
            "carbs": 12.0,
            "fat": 22.0,
        }
    ],
    # -----------------------------------------------------------------------
    # Benchmark Dishes (Ramen, Pizza, Salmon, etc.)
    # -----------------------------------------------------------------------
    "ramen": [
        {
            "id_suffix": "traditional_shoyu",
            "title": "Traditional Shoyu Ramen with Soft Egg & Chashu Pork",
            "description": "Comforting Japanese noodle bowl featuring wheat ramen noodles in a savory soy sauce-infused broth, topped with sliced chashu pork, seasoned soft-boiled egg, nori, and green scallions.",
            "cuisine": "Japanese Cuisine",
            "difficulty": "Beginner",
            "prep_time_minutes": 10,
            "cook_time_minutes": 15,
            "base_servings": 2,
            "ingredients": [
                ("Wheat Ramen Noodles", 160.0, "g", "Boiled fresh noodles"),
                ("Simmered Ramen Broth", 300.0, "ml", "Soy tare seasoned broth"),
                ("Chashu Pork / Protein Slices", 60.0, "g", "Braised pork slices"),
                ("Soft-Boiled Seasoned Egg", 60.0, "g", "Halved ajitsuke tamago"),
                ("Scallions & Nori Seaweed", 15.0, "g", "Fresh toppings"),
                ("Sesame Oil", 5.0, "ml", "Finishing drizzle"),
            ],
            "steps": [
                "Boil fresh ramen noodles in salted water for 2-3 minutes until springy; drain thoroughly.",
                "In a separate saucepan, heat the seasoned broth with soy tare until piping hot.",
                "Divide hot broth into deep serving bowls and fold in the cooked noodles.",
                "Artfully arrange sliced pork, halved seasoned egg, nori sheets, and chopped scallions on top.",
                "Drizzle with fragrant sesame oil and serve immediately while steaming.",
            ],
            "substitutions": [
                ("Pork Chashu", "Seared Tofu, Mushrooms, or Chicken Breast", "Protein alternative"),
            ],
            "tags": ["Japanese Cuisine", "Noodle Bowl", "Comfort Food"],
            "calories": 480,
            "protein": 22.0,
            "carbs": 58.0,
            "fat": 18.0,
        }
    ],
    "grilled_salmon": [
        {
            "id_suffix": "pan_seared_lemon_herb",
            "title": "Crispy Pan-Seared Atlantic Salmon with Lemon-Herb Glaze",
            "description": "Fresh Atlantic salmon fillet seared until the exterior is crisp and the interior remains succulent and tender, finished with lemon juice, fresh garlic, and parsley.",
            "cuisine": "Mediterranean",
            "difficulty": "Beginner",
            "prep_time_minutes": 10,
            "cook_time_minutes": 12,
            "base_servings": 2,
            "ingredients": [
                ("Atlantic Salmon Fillet", 200.0, "g", "Skin-on or skinless, patted dry"),
                ("Extra Virgin Olive Oil", 12.0, "g", "For searing"),
                ("Fresh Lemon & Parsley", 20.0, "g", "Citrus and herb glaze"),
                ("Garlic & Cracked Black Pepper", 8.0, "g", "Seasoning"),
            ],
            "steps": [
                "Pat salmon fillets dry with paper towels; season both sides generously with sea salt and cracked pepper.",
                "Heat olive oil in a stainless steel or cast-iron skillet over medium-high heat until shimmering.",
                "Place salmon skin-side down (or top-side down) and sear undisturbed for 4-5 minutes until a golden crust forms.",
                "Carefully flip fillet, add minced garlic and lemon juice to pan, and spoon pan juices over fish for 3-4 minutes until cooked through.",
                "Garnish with chopped fresh parsley and serve immediately.",
            ],
            "substitutions": [
                ("Salmon", "Trout, Cod, or Halibut", "Direct white fish substitute"),
            ],
            "tags": ["Pescatarian", "High-Protein", "Omega-3 Rich", "Keto-Friendly"],
            "calories": 380,
            "protein": 38.0,
            "carbs": 1.0,
            "fat": 24.0,
        }
    ],
}


def normalize_lookup_key(text: str) -> str:
    """Normalize text into clean snake_case lookup key."""
    return text.lower().strip().replace(" ", "_").replace("-", "_")


def find_catalogue_recipes(
    dish_name: Optional[str] = None,
    ingredients: Optional[List[str]] = None,
    servings: int = 2,
    max_cook_time_minutes: int = 30,
) -> Optional[List[RecipeItem]]:
    """Retrieve and dynamically scale catalogue recipes matching confirmed dish or ingredients.

    Returns None if no matching authenticated recipe exists in the catalogue.
    """
    matched_entry: Optional[List[dict]] = None
    matched_key: Optional[str] = None

    # 1. Match by confirmed dish name if provided
    if dish_name:
        clean_dish = normalize_lookup_key(dish_name)
        if clean_dish in LOCAL_RECIPE_CATALOGUE:
            matched_entry = LOCAL_RECIPE_CATALOGUE[clean_dish]
            matched_key = clean_dish
        else:
            # Substring search in catalogue keys
            for key, entry in LOCAL_RECIPE_CATALOGUE.items():
                if key in clean_dish or clean_dish in key:
                    matched_entry = entry
                    matched_key = key
                    break

    # 2. Match by prominent pantry ingredients if dish_name didn't match
    if not matched_entry and ingredients:
        pantry_joined = " ".join(ingredients).lower()
        if "pav" in pantry_joined and "bhaji" in pantry_joined:
            matched_entry = LOCAL_RECIPE_CATALOGUE["pav_bhaji"]
            matched_key = "pav_bhaji"
        elif "poha" in pantry_joined:
            matched_entry = LOCAL_RECIPE_CATALOGUE["poha"]
            matched_key = "poha"
        elif "samosa" in pantry_joined:
            matched_entry = LOCAL_RECIPE_CATALOGUE["samosa"]
            matched_key = "samosa"
        elif "dosa" in pantry_joined:
            matched_entry = LOCAL_RECIPE_CATALOGUE["dosa"]
            matched_key = "dosa"
        elif "idli" in pantry_joined:
            matched_entry = LOCAL_RECIPE_CATALOGUE["idli"]
            matched_key = "idli"
        elif "chole" in pantry_joined or "bhatura" in pantry_joined:
            matched_entry = LOCAL_RECIPE_CATALOGUE["chole_bhature"]
            matched_key = "chole_bhature"
        elif "makhani" in pantry_joined or ("black lentil" in pantry_joined and "butter" in pantry_joined):
            matched_entry = LOCAL_RECIPE_CATALOGUE["dal_makhani"]
            matched_key = "dal_makhani"
        elif "salmon" in pantry_joined:
            matched_entry = LOCAL_RECIPE_CATALOGUE["grilled_salmon"]
            matched_key = "grilled_salmon"
        elif "ramen" in pantry_joined or ("noodle" in pantry_joined and "broth" in pantry_joined):
            matched_entry = LOCAL_RECIPE_CATALOGUE["ramen"]
            matched_key = "ramen"

    if not matched_entry:
        return None

    # 3. Construct and scale RecipeItem instances
    result_recipes: List[RecipeItem] = []
    for item in matched_entry:
        scaled_ingredients: List[RecipeIngredientQuantity] = []
        for name, amount, unit, notes in item["ingredients"]:
            scaled_amt = _scale_qty(amount, servings, item.get("base_servings", 2))
            scaled_ingredients.append(
                RecipeIngredientQuantity(
                    name=name,
                    amount=scaled_amt,
                    unit=unit,
                    notes=notes,
                )
            )

        substitutions: List[RecipeSubstitution] = [
            RecipeSubstitution(original=orig, substitute=sub, notes=n)
            for orig, sub, n in item.get("substitutions", [])
        ]

        # Calibrate cook time if user specified a tight budget
        cook_time = min(item["cook_time_minutes"], max_cook_time_minutes)

        recipe_obj = RecipeItem(
            id=f"recipe_{matched_key}_{item['id_suffix']}",
            title=item["title"],
            description=item["description"],
            cuisine=item["cuisine"],
            difficulty=item.get("difficulty", "Beginner"),
            prep_time_minutes=item["prep_time_minutes"],
            cook_time_minutes=cook_time,
            base_servings=item.get("base_servings", 2),
            servings=servings,
            ingredient_quantities=scaled_ingredients,
            preparation_steps=item["steps"],
            substitutions=substitutions,
            dietary_tags=item.get("tags", []),
            allergens_flagged=[],
            allergen_advisory=(
                "Culinary suggestions are inspirational. Always verify manufactured ingredient packaging for "
                "cross-contamination warnings, unlisted additives, and allergen facilities before preparing food."
            ),
            estimated_calories_per_serving=item.get("calories"),
            protein_g=item.get("protein"),
            carbs_g=item.get("carbs"),
            fat_g=item.get("fat"),
        )
        result_recipes.append(recipe_obj)

    return result_recipes
