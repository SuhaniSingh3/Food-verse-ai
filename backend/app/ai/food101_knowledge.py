"""Culinary knowledge base and helper mappings for Food-101 and regional dishes.

Maps raw Food-101 dataset labels as well as common Indian dishes to human-readable dish titles,
typical baseline ingredients, cooking methods, dietary tags, and benchmark nutritional estimates.
"""
from typing import Dict, List, Optional
from app.schemas.food_analysis import IngredientObservation, NutritionEstimate

COMMON_INDIAN_DISHES = [
    "Pav Bhaji",
    "Poha",
    "Samosa",
    "Dosa",
    "Idli",
    "Chole Bhature",
    "Dal Makhani",
]

# Format raw snake_case labels into title case
SPECIAL_DISPLAY_NAMES: Dict[str, str] = {
    "apple_pie": "Apple Pie",
    "baby_back_ribs": "Baby Back Ribs",
    "baklava": "Baklava",
    "beef_carpaccio": "Beef Carpaccio",
    "beef_tartare": "Beef Tartare",
    "beet_salad": "Beet Salad",
    "beignets": "Beignets",
    "bibimbap": "Bibimbap",
    "bread_pudding": "Bread Pudding",
    "breakfast_burrito": "Breakfast Burrito",
    "bruschetta": "Bruschetta",
    "caesar_salad": "Caesar Salad",
    "cannoli": "Cannoli",
    "caprese_salad": "Caprese Salad",
    "carrot_cake": "Carrot Cake",
    "ceviche": "Ceviche",
    "cheese_plate": "Cheese Plate",
    "cheesecake": "Cheesecake",
    "chicken_curry": "Chicken Curry",
    "chicken_quesadilla": "Chicken Quesadilla",
    "chicken_wings": "Chicken Wings",
    "chocolate_cake": "Chocolate Cake",
    "chocolate_mousse": "Chocolate Mousse",
    "churros": "Churros",
    "clam_chowder": "Clam Chowder",
    "club_sandwich": "Club Sandwich",
    "crab_cakes": "Crab Cakes",
    "creme_brulee": "Crème Brûlée",
    "croque_madame": "Croque Madame",
    "cup_cakes": "Cupcakes",
    "deviled_eggs": "Deviled Eggs",
    "donuts": "Donuts",
    "dumplings": "Dumplings",
    "edamame": "Edamame",
    "eggs_benedict": "Eggs Benedict",
    "escargots": "Escargots",
    "falafel": "Falafel",
    "filet_mignon": "Filet Mignon",
    "fish_and_chips": "Fish and Chips",
    "foie_gras": "Foie Gras",
    "french_fries": "French Fries",
    "french_onion_soup": "French Onion Soup",
    "french_toast": "French Toast",
    "fried_calamari": "Fried Calamari",
    "fried_rice": "Fried Rice",
    "frozen_yogurt": "Frozen Yogurt",
    "garlic_bread": "Garlic Bread",
    "gnocchi": "Gnocchi",
    "greek_salad": "Greek Salad",
    "grilled_cheese_sandwich": "Grilled Cheese Sandwich",
    "grilled_salmon": "Grilled Salmon",
    "guacamole": "Guacamole",
    "gyoza": "Gyoza",
    "hamburger": "Hamburger",
    "hot_and_sour_soup": "Hot and Sour Soup",
    "hot_dog": "Hot Dog",
    "huevos_rancheros": "Huevos Rancheros",
    "hummus": "Hummus",
    "ice_cream": "Ice Cream",
    "lasagna": "Lasagna",
    "lobster_bisque": "Lobster Bisque",
    "lobster_roll_sandwich": "Lobster Roll",
    "macaroni_and_cheese": "Macaroni and Cheese",
    "macarons": "Macarons",
    "miso_soup": "Miso Soup",
    "mussels": "Steamed Mussels",
    "nachos": "Nachos",
    "omelette": "Omelette",
    "onion_rings": "Onion Rings",
    "oysters": "Oysters",
    "pad_thai": "Pad Thai",
    "paella": "Paella",
    "pancakes": "Pancakes",
    "panna_cotta": "Panna Cotta",
    "peking_duck": "Peking Duck",
    "pho": "Vietnamese Pho",
    "pizza": "Pizza",
    "pork_chop": "Pork Chop",
    "poutine": "Poutine",
    "prime_rib": "Prime Rib",
    "pulled_pork_sandwich": "Pulled Pork Sandwich",
    "ramen": "Ramen",
    "ravioli": "Ravioli",
    "red_velvet_cake": "Red Velvet Cake",
    "risotto": "Risotto",
    "samosa": "Samosa",
    "sashimi": "Sashimi",
    "scallops": "Pan-Seared Scallops",
    "seaweed_salad": "Seaweed Salad",
    "shrimp_and_grits": "Shrimp and Grits",
    "spaghetti_bolognese": "Spaghetti Bolognese",
    "spaghetti_carbonara": "Spaghetti Carbonara",
    "spring_rolls": "Spring Rolls",
    "steak": "Steak",
    "strawberry_shortcake": "Strawberry Shortcake",
    "sushi": "Sushi",
    "tacos": "Tacos",
    "takoyaki": "Takoyaki",
    "tiramisu": "Tiramisu",
    "tuna_tartare": "Tuna Tartare",
    "waffles": "Waffles",
    # Common Indian dishes
    "pav_bhaji": "Pav Bhaji",
    "poha": "Poha",
    "dosa": "Dosa",
    "masala_dosa": "Masala Dosa",
    "idli": "Idli",
    "chole_bhature": "Chole Bhature",
    "dal_makhani": "Dal Makhani",
    "biryani": "Biryani",
    "paneer_tikka": "Paneer Tikka",
}


def normalize_dish_key(dish_name: str) -> str:
    """Normalize dish name for dictionary lookups."""
    return dish_name.lower().strip().replace(" ", "_").replace("-", "_")


def format_dish_name(raw_label: str) -> str:
    """Convert raw Food-101 or Indian dish label into clean title case."""
    clean = normalize_dish_key(raw_label)
    if clean in SPECIAL_DISPLAY_NAMES:
        return SPECIAL_DISPLAY_NAMES[clean]
    return raw_label.replace("_", " ").title()


# Detailed culinary decomposition for notable Food-101 and Indian dishes
CULINARY_PROFILES: Dict[str, dict] = {
    # -------------------------------------------------------------
    # Common Indian Dishes
    # -------------------------------------------------------------
    "pav_bhaji": {
        "method": "Slow-simmered spiced mixed vegetable mash (potatoes, tomatoes, peas, cauliflower) sautéed with butter and pav bhaji masala, served with butter-toasted soft pav bread rolls, diced red onions, and fresh lemon",
        "visible": [
            "Soft butter-toasted pav bread rolls",
            "Rich spiced vegetable bhaji mash",
            "Butter melting on hot bhaji",
            "Diced raw red onions",
            "Fresh lemon wedge",
            "Chopped fresh coriander garnish"
        ],
        "inferred": [
            "Pav bhaji masala (coriander, cumin, chili, amchur, fennel, clove)",
            "Ginger-garlic aromatics",
            "Kasuri methi (fenugreek leaves)",
            "Kashmiri red chili powder and salt"
        ],
        "items": [
            ("Pav / Soft Bread Rolls", True, "Yeast bread rolls split and toasted with dairy butter", 120.0),
            ("Mixed Vegetable Bhaji Mash", True, "Mashed potato, tomato, green peas, and capsicum", 220.0),
            ("Dairy Butter", True, "Salted butter used for toasting pav and topping bhaji", 25.0),
            ("Diced Raw Onions & Lemon", True, "Crunchy red onion garnish and citrus wedge", 30.0),
            ("Fresh Coriander Garnish", True, "Finely chopped cilantro leaves", 5.0),
            ("Pav Bhaji Masala & Seasonings", False, "Inferred whole roasted spice blend and seasoning", 10.0),
        ],
        "macros": (490, 9.5, 58.0, 24.0),
        "tags": ["Indian Street Food", "Vegetarian", "Maharashtrian Cuisine", "Comfort Food"],
    },
    "poha": {
        "method": "Flattened rice flakes tempered with mustard seeds, curry leaves, green chilies, turmeric, and diced onions, garnished with roasted crunchy peanuts, fresh cilantro, and lemon juice",
        "visible": [
            "Turmeric-tinted flattened rice flakes (poha)",
            "Roasted whole peanuts",
            "Curry leaves and green chili slices",
            "Fresh chopped coriander leaves",
            "Fresh lemon wedge"
        ],
        "inferred": [
            "Mustard seeds and cumin seeds",
            "Turmeric powder and sea salt",
            "Vegetable cooking oil or ghee",
            "Pinch of sugar"
        ],
        "items": [
            ("Flattened Rice (Poha)", True, "Rinsed and steamed medium flattened rice flakes", 150.0),
            ("Roasted Peanuts", True, "Whole crunchy roasted peanuts", 20.0),
            ("Sautéed Onions & Chilies", True, "Tender sliced onions and green chilies", 35.0),
            ("Curry Leaves & Herbs", True, "Tempered curry leaves and fresh coriander", 10.0),
            ("Cooking Fat & Spices", False, "Inferred mustard seeds, turmeric, and cooking oil", 10.0),
        ],
        "macros": (280, 6.0, 46.0, 8.5),
        "tags": ["Indian Breakfast", "Vegetarian", "Gluten-Free", "Quick Meal"],
    },
    "dosa": {
        "method": "Crisp golden fermented crepe made from stone-ground rice and urad dal batter, cooked on a cast iron griddle with ghee, served with spiced potato masala, vegetable sambar, and coconut chutney",
        "visible": [
            "Crispy golden-brown fermented crepe",
            "Spiced yellow potato masala filling",
            "Vegetable sambar in bowl",
            "Fresh white coconut chutney"
        ],
        "inferred": [
            "Ghee or sesame oil on griddle",
            "Mustard seeds, curry leaves, and asafoetida in tempering",
            "Turmeric and ginger in potato masala"
        ],
        "items": [
            ("Crispy Dosa Crepe", True, "Fermented rice and urad dal crepe", 110.0),
            ("Potato Masala Filling", True, "Boiled potatoes sautéed with mustard and onions", 90.0),
            ("Vegetable Sambar", True, "Lentil stew with vegetables and tamarind", 120.0),
            ("Coconut Chutney", True, "Grated coconut ground with green chilies and roasted gram", 40.0),
            ("Ghee / Oil", False, "Inferred cooking fat used on griddle", 10.0),
        ],
        "macros": (360, 8.5, 54.0, 12.0),
        "tags": ["South Indian Cuisine", "Vegetarian", "Fermented Food", "Breakfast"],
    },
    "masala_dosa": {
        "method": "Crisp golden fermented crepe made from stone-ground rice and urad dal batter, cooked on a cast iron griddle with ghee, served with spiced potato masala, vegetable sambar, and coconut chutney",
        "visible": [
            "Crispy golden-brown fermented crepe",
            "Spiced yellow potato masala filling",
            "Vegetable sambar in bowl",
            "Fresh white coconut chutney"
        ],
        "inferred": [
            "Ghee or sesame oil on griddle",
            "Mustard seeds, curry leaves, and asafoetida in tempering",
            "Turmeric and ginger in potato masala"
        ],
        "items": [
            ("Crispy Dosa Crepe", True, "Fermented rice and urad dal crepe", 110.0),
            ("Potato Masala Filling", True, "Boiled potatoes sautéed with mustard and onions", 90.0),
            ("Vegetable Sambar", True, "Lentil stew with vegetables and tamarind", 120.0),
            ("Coconut Chutney", True, "Grated coconut ground with green chilies and roasted gram", 40.0),
            ("Ghee / Oil", False, "Inferred cooking fat used on griddle", 10.0),
        ],
        "macros": (360, 8.5, 54.0, 12.0),
        "tags": ["South Indian Cuisine", "Vegetarian", "Fermented Food", "Breakfast"],
    },
    "idli": {
        "method": "Soft, fluffy steamed savory cakes made from naturally fermented rice and de-husked black gram batter, served piping hot with vegetable sambar and fresh coconut chutney",
        "visible": [
            "Steamed white spongy idli cakes (2-3 pieces)",
            "Warm vegetable sambar with drumsticks or carrots",
            "White coconut chutney"
        ],
        "inferred": [
            "Fenugreek seeds in batter fermentation",
            "Mustard seeds and curry leaves tempering in chutney and sambar",
            "Salt"
        ],
        "items": [
            ("Steamed Idlis", True, "Steamed fermented rice and lentil cakes", 130.0),
            ("Vegetable Sambar", True, "Spiced toor dal and vegetable stew", 130.0),
            ("Coconut Chutney", True, "Fresh ground coconut condiment", 40.0),
        ],
        "macros": (220, 8.0, 43.0, 2.5),
        "tags": ["South Indian Cuisine", "Steamed / Oil-Free", "Vegetarian", "High-Digestibility"],
    },
    "chole_bhature": {
        "method": "Piquant, dark-spiced Punjabi chickpea curry (chole) simmered with dried amchur, tea liquor, and whole garam masala, served with puffed deep-fried leavened sourdough bread (bhatura), spiced pickled onions, and green chilies",
        "visible": [
            "Puffed golden-fried bhatura bread",
            "Dark spiced chickpea curry (chole)",
            "Pickled red onion rings & green chilies",
            "Fresh ginger juliennes and cilantro"
        ],
        "inferred": [
            "Chole masala (anardana, amchur, black cardamom, cinnamon, cloves)",
            "Deep-frying vegetable oil absorbed by bread",
            "Ginger-garlic paste and tomato puree"
        ],
        "items": [
            ("Puffed Bhatura Bread", True, "Deep-fried leavened flour bread", 120.0),
            ("Punjabi Chole Curry", True, "Simmered spiced chickpeas in thick gravy", 190.0),
            ("Pickled Onions & Chilies", True, "Tangy pickled side garnish", 30.0),
            ("Frying Oil & Spices", False, "Inferred cooking fat and ground masala blend", 20.0),
        ],
        "macros": (630, 17.5, 80.0, 26.0),
        "tags": ["North Indian Cuisine", "Punjabi", "Vegetarian", "High-Protein Option"],
    },
    "dal_makhani": {
        "method": "Rich, creamy slow-simmered whole black lentils (urad) and red kidney beans (rajma) cooked overnight on low heat with butter, fresh tomato puree, ginger, garlic, and dairy cream",
        "visible": [
            "Dark rich creamy lentil gravy",
            "Swirl of dairy cream and butter melting on surface",
            "Fresh ginger matchsticks and cilantro garnish"
        ],
        "inferred": [
            "Butter and fresh heavy cream",
            "Degi mirch (Kashmiri red chili powder)",
            "Garam masala, kasuri methi, and slow-cooked tomato base",
            "Salt and ghee"
        ],
        "items": [
            ("Slow-Simmered Black Lentils & Rajma", True, "Cooked whole urad dal and kidney beans", 210.0),
            ("Tomato & Ginger-Garlic Gravy", True, "Spiced tomato reduction", 60.0),
            ("Butter & Cream", True, "Dairy butter and fresh cream enrichment", 25.0),
            ("Ghee & Masala Blend", False, "Inferred spices and clarifying fat", 10.0),
        ],
        "macros": (390, 14.5, 34.0, 22.0),
        "tags": ["North Indian Cuisine", "Punjabi", "Vegetarian", "Rich Gravy"],
    },
    "samosa": {
        "method": "Crispy deep-fried triangular pastry pocket filled with spiced potatoes and green peas",
        "visible": [
            "Golden deep-fried triangular pastry shell",
            "Crumbly spiced potato filling",
            "Green peas"
        ],
        "inferred": [
            "Vegetable cooking oil (used for deep-frying)",
            "Cumin, coriander, garam masala, and turmeric spices",
            "Green chili and ginger paste"
        ],
        "items": [
            ("Pastry Dough (Maida)", True, "Flaky fried flour crust", 55.0),
            ("Spiced Potato Filling", True, "Boiled mashed spiced potato", 60.0),
            ("Green Peas", True, "Steamed green peas", 15.0),
            ("Cooking Oil", False, "Inferred frying oil absorbed by crust", 12.0),
        ],
        "macros": (310, 5.0, 36.0, 16.0),
        "tags": ["Indian Cuisine", "Vegetarian", "Street Food", "Snack"],
    },
    "chicken_curry": {
        "method": "Tender chicken simmered in a spiced onion, tomato, ginger, garlic, and aromatic masala gravy",
        "visible": [
            "Tender chicken pieces",
            "Rich spiced golden-orange curry gravy",
            "Fresh chopped coriander / cilantro garnish"
        ],
        "inferred": [
            "Cooking oil or ghee",
            "Turmeric, cumin, coriander, and garam masala blend",
            "Onion, ginger, and garlic puree base",
            "Yogurt or tomato puree"
        ],
        "items": [
            ("Chicken Pieces", True, "Bone-in or boneless cooked chicken", 150.0),
            ("Curry Gravy", True, "Spiced tomato and onion sauce", 120.0),
            ("Fresh Coriander", True, "Herb garnish", 5.0),
            ("Cooking Fat & Spices", False, "Inferred ghee/oil and ground spices", 15.0),
        ],
        "macros": (390, 34.0, 12.0, 22.0),
        "tags": ["Indian Cuisine", "High-Protein", "Gluten-Free Option"],
    },
    # -------------------------------------------------------------
    # Notable Food-101 Benchmark Dishes
    # -------------------------------------------------------------
    "ramen": {
        "method": "Simmered rich broth served with boiled noodles and assorted hot toppings",
        "visible": [
            "Wheat ramen noodles",
            "Rich seasoned broth",
            "Sliced chashu pork",
            "Soft-boiled seasoned ramen egg (ajitsuke tamago)",
            "Chopped green scallions",
            "Nori seaweed sheet"
        ],
        "inferred": [
            "Soy sauce tare (seasoning base)",
            "Garlic and ginger aromatics",
            "Sesame oil drizzle",
            "Mirin / cooking sake in broth"
        ],
        "items": [
            ("Ramen Noodles", True, "Boiled yellow wheat noodles", 160.0),
            ("Ramen Broth", True, "Simmered seasoned broth base", 220.0),
            ("Pork Chashu", True, "Braised pork belly slice", 50.0),
            ("Soft-Boiled Egg", True, "Halved seasoned egg", 50.0),
            ("Scallions & Nori", True, "Fresh sliced green onion and dried seaweed", 15.0),
            ("Seasoning Oil & Tare", False, "Inferred umami fat and soy tare base", 10.0),
        ],
        "macros": (480, 22.0, 58.0, 18.0),
        "tags": ["Japanese Cuisine", "Comfort Food", "High-Protein Option"],
    },
    "bruschetta": {
        "method": "Oven-toasted rustic bread rubbed with garlic and topped with freshly diced tomato relish",
        "visible": [
            "Toasted rustic baguette / ciabatta slices",
            "Diced ripe red tomatoes",
            "Fresh chopped basil leaves",
            "Minced fresh garlic"
        ],
        "inferred": [
            "Extra virgin olive oil",
            "Balsamic reduction drizzle",
            "Flaky sea salt and freshly cracked black pepper"
        ],
        "items": [
            ("Rustic Baguette / Bread", True, "Toasted golden crust slice", 80.0),
            ("Diced Tomatoes", True, "Fresh diced red tomato relish", 90.0),
            ("Fresh Basil & Garlic", True, "Minced aromatic herbs", 15.0),
            ("Extra Virgin Olive Oil", False, "Inferred dressing and bread brush", 12.0),
            ("Balsamic & Seasonings", False, "Inferred reduction and salt", 5.0),
        ],
        "macros": (260, 6.0, 34.0, 11.0),
        "tags": ["Italian Cuisine", "Vegetarian", "Appetizer"],
    },
    "pizza": {
        "method": "High-temperature stone-baked fermented dough topped with seasoned tomato sauce and melted cheese",
        "visible": [
            "Baked wheat crust with browned edges",
            "Melted mozzarella cheese layer",
            "Herb-seasoned crushed tomato sauce",
            "Savory toppings and herbs"
        ],
        "inferred": [
            "Olive oil in dough and sauce",
            "Oregano and dried basil seasoning",
            "Yeast and fermented gluten network"
        ],
        "items": [
            ("Pizza Crust", True, "Baked wheat dough base", 130.0),
            ("Mozzarella Cheese", True, "Melted whole milk cheese layer", 65.0),
            ("Tomato Sauce", True, "Crushed tomato and herb paste", 45.0),
            ("Olive Oil & Seasoning", False, "Inferred fat and dried herbs", 8.0),
        ],
        "macros": (560, 24.0, 64.0, 22.0),
        "tags": ["Italian-American", "Comfort Food", "Vegetarian Option"],
    },
    "caesar_salad": {
        "method": "Tossed crisp greens dressed in emulsified garlic-parmesan dressing with crunchy croutons",
        "visible": [
            "Crisp romaine lettuce leaves",
            "Toasted seasoned bread croutons",
            "Shaved Parmesan cheese curls"
        ],
        "inferred": [
            "Creamy Caesar dressing (anchovy, egg yolk, garlic, oil emulsion)",
            "Lemon juice",
            "Black pepper"
        ],
        "items": [
            ("Romaine Lettuce", True, "Crisp fresh green leaves", 120.0),
            ("Bread Croutons", True, "Toasted crunchy cubes", 30.0),
            ("Parmesan Cheese", True, "Aged shaved cheese", 20.0),
            ("Caesar Dressing", False, "Emulsified oil and dairy dressing", 35.0),
        ],
        "macros": (290, 8.0, 16.0, 22.0),
        "tags": ["Salad", "Low-Carb Option", "Vegetarian Option"],
    },
    "hamburger": {
        "method": "Grill-seared ground patty served between split toasted yeast buns with fresh produce",
        "visible": [
            "Toasted sesame or brioche bun",
            "Seared ground meat or veggie patty",
            "Fresh crisp green lettuce leaf",
            "Sliced red tomato",
            "Sliced pickles or onions"
        ],
        "inferred": [
            "Burger sauce or mayonnaise",
            "Ketchup and mustard condiments",
            "Salt and seasoning rub on patty"
        ],
        "items": [
            ("Burger Bun", True, "Toasted split bread bun", 80.0),
            ("Seared Patty", True, "Cooked ground patty", 120.0),
            ("Lettuce & Tomato", True, "Fresh vegetable slices", 40.0),
            ("Sauces & Seasoning", False, "Inferred mayonnaise and condiment layer", 20.0),
        ],
        "macros": (510, 28.0, 42.0, 24.0),
        "tags": ["American Cuisine", "High-Protein", "Casual Fare"],
    },
    "grilled_salmon": {
        "method": "Char-grilled fish fillet served hot with natural grill marks and light seasoning",
        "visible": [
            "Salmon fillet with dark grill crosshatch marks",
            "Lemon wedge garnish",
            "Fresh chopped herbs"
        ],
        "inferred": [
            "Olive oil brush",
            "Salt and black pepper seasoning",
            "Garlic or herb marinade"
        ],
        "items": [
            ("Grilled Salmon Fillet", True, "Pinkish-orange salmon flesh with char marks", 180.0),
            ("Lemon & Herbs", True, "Citrus wedge and parsley", 20.0),
            ("Olive Oil & Seasoning", False, "Inferred surface oil and cracked pepper", 10.0),
        ],
        "macros": (380, 38.0, 1.0, 24.0),
        "tags": ["Pescatarian", "High-Protein", "Omega-3 Rich", "Keto-Friendly"],
    },
    "french_fries": {
        "method": "Twice-fried potato batons seasoned with salt until golden and crispy",
        "visible": [
            "Golden crispy fried potato batons",
            "Surface sea salt crystals"
        ],
        "inferred": [
            "Vegetable frying oil",
            "Potato starch coating (optional for crispness)"
        ],
        "items": [
            ("Fried Potatoes", True, "Cut potato batons", 140.0),
            ("Cooking Oil", False, "Inferred frying fat absorbed", 18.0),
            ("Salt", False, "Fine surface seasoning", 2.0),
        ],
        "macros": (365, 4.0, 48.0, 17.0),
        "tags": ["Vegetarian", "Vegan", "Side Dish", "Gluten-Free Option"],
    },
    "spring_rolls": {
        "method": "Crispy fried or fresh rice paper rolls stuffed with shredded vegetables and proteins",
        "visible": [
            "Crisp golden fried wrapper",
            "Shredded cabbage and carrot filling",
            "Glass noodles or scallions"
        ],
        "inferred": [
            "Frying oil",
            "Sesame oil and soy sauce seasoning",
            "White pepper and garlic"
        ],
        "items": [
            ("Spring Roll Wrapper", True, "Fried wheat or rice wrapper", 40.0),
            ("Shredded Vegetables", True, "Cabbage, carrots, mushrooms", 70.0),
            ("Frying Oil & Seasoning", False, "Inferred oil and soy seasoning", 12.0),
        ],
        "macros": (210, 4.5, 24.0, 11.0),
        "tags": ["Asian Cuisine", "Appetizer", "Vegetarian Option"],
    },
    "sushi": {
        "method": "Seasoned vinegared sushi rice rolled or pressed with fresh raw seafood, vegetables, and nori",
        "visible": [
            "Vinegared sushi rice grains",
            "Fresh fish slices or seafood filling",
            "Dark nori seaweed wrap",
            "Wasabi and pickled ginger garnish"
        ],
        "inferred": [
            "Rice vinegar, sugar, and salt seasoning in rice",
            "Soy sauce dipping condiment"
        ],
        "items": [
            ("Sushi Rice", True, "Seasoned short-grain white rice", 120.0),
            ("Fish / Seafood", True, "Fresh salmon, tuna, or imitation crab", 60.0),
            ("Nori & Vegetables", True, "Seaweed and cucumber/avocado", 20.0),
            ("Rice Seasoning", False, "Inferred vinegar and mirin mixture", 8.0),
        ],
        "macros": (320, 14.0, 52.0, 4.5),
        "tags": ["Japanese Cuisine", "Pescatarian", "Low-Fat Option"],
    },
}


def get_culinary_profile(dish_identifier: str) -> dict:
    """Retrieve or dynamically construct realistic culinary details for any dish label."""
    clean = normalize_dish_key(dish_identifier)
    if clean in CULINARY_PROFILES:
        return CULINARY_PROFILES[clean]

    # Partial / word search in known profiles
    for key, prof in CULINARY_PROFILES.items():
        if key in clean or clean in key:
            return prof

    # Dynamic fallback generator for any custom dish name
    dish_title = format_dish_name(dish_identifier)
    words = clean.replace("_", " ").split()
    primary_term = words[-1].title() if words else "Culinary"

    return {
        "method": f"Traditional preparation of {dish_title} following standard culinary techniques and regional seasonings",
        "visible": [
            f"Primary {dish_title} portion",
            "Characteristic garnish and surface texture",
            "Accompanying base or side elements"
        ],
        "inferred": [
            "Cooking oil, butter, or culinary fat",
            "Salt, pepper, and regional herb seasoning",
            "Underlying marinades or cooking base"
        ],
        "items": [
            (f"{dish_title} Core Serving", True, f"Primary portion of {dish_title}", 160.0),
            ("Accompanying Produce / Garnish", True, "Fresh herbs or side vegetables", 30.0),
            ("Cooking Fat & Seasoning", False, "Inferred preparation fat and seasonings", 12.0),
        ],
        "macros": (390, 15.0, 42.0, 18.0),
        "tags": [f"{primary_term} Preparation", "User-Confirmed Dish"],
    }
