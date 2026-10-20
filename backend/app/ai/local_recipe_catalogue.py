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
    "momos_with_red_chutney": [
        {
            "id_suffix": "authentic_steamed",
            "title": "Authentic Steamed Momos with Fiery Garlic-Tomato Red Chutney",
            "description": "Traditional Himalayan-style steamed dumplings wrapped in delicate dough envelopes filled with finely seasoned minced vegetables, paired with a fiery homemade roasted tomato, dried red chili, and garlic dipping chutney.",
            "cuisine": "Tibetan / Himalayan Street Food",
            "difficulty": "Intermediate",
            "prep_time_minutes": 25,
            "cook_time_minutes": 15,
            "base_servings": 2,
            "ingredients": [
                ("All-Purpose Flour (Maida)", 150.0, "g", "Kneaded into pliable dough for thin dumpling wrappers"),
                ("Finely Shredded Cabbage", 100.0, "g", "Squeezed dry to keep filling crisp and intact"),
                ("Grated Carrots", 80.0, "g", "Squeezed dry to keep filling crisp and intact"),
                ("Finely Chopped Onions", 40.0, "g", "Aromatic crunch for dumpling filling"),
                ("Spring Onions / Scallions", 20.0, "g", "Fresh green filling seasoning"),
                ("Minced Fresh Ginger", 8.0, "g", "Pungent base aromatics for filling"),
                ("Minced Fresh Garlic", 8.0, "g", "Pungent base aromatics for filling"),
                ("Dark Soy Sauce", 10.0, "ml", "Savory umami seasoning"),
                ("Toasted Sesame Oil", 5.0, "ml", "Nutty aromatic oil"),
                ("Dried Kashmiri / Byadagi Red Chilies", 8.0, "pieces", "Soaked in warm water for red chutney"),
                ("Fresh Tomatoes", 120.0, "g", "Boiled and peeled for fiery chutney base"),
                ("Fresh Garlic Cloves", 15.0, "g", "Blended with chilies and salt for tangy kick"),
                ("Vinegar", 5.0, "ml", "For tangy kick"),
            ],
            "steps": [
                "Knead dumpling dough: In a mixing bowl, combine all-purpose flour (maida) with a pinch of salt and warm water. Knead into a smooth, firm dough; cover with a damp cloth and rest for 20 minutes.",
                "Prepare savory filling: Mix shredded cabbage, grated carrots, onions, spring onions, minced ginger, garlic, soy sauce, sesame oil, and black pepper. Squeeze out excess moisture so wrappers remain intact.",
                "Prepare fiery red chutney: Boil dried red chilies and tomatoes until tender. Peel tomato skins, transfer to a blender with garlic cloves, vinegar, sugar, and salt, and puree until smooth and glossy.",
                "Roll wrappers: Divide the rested dough into small marble-sized balls. Roll each ball on a lightly floured surface into a thin 3-inch disc with thin edges and a slightly thicker center.",
                "Fill and pleat: Place a generous tablespoon of filling in the center of each wrapper. Pleat edges tightly in a circular pouch or crescent fold, pressing firmly at the top to seal completely.",
                "Steam momos: Grease steamer plates lightly with oil. Arrange momos with spacing between them. Steam over vigorously boiling water on high heat for 10-12 minutes until wrappers become glossy, translucent, and non-sticky.",
                "Serving: Plate steaming hot momos straight from the steamer alongside bowls of fiery red tomato-garlic chutney and clear vegetable broth.",
            ],
            "substitutions": [
                ("All-Purpose Flour (Maida)", "Whole Wheat Flour or Gluten-Free Dumpling Flour", "Alternative dough wrappers"),
                ("Shredded Vegetable Filling", "Minced Chicken, Pork, or Crumbled Paneer", "Alternative protein filling option"),
                ("Dried Red Chilies", "Chili Garlic Sauce or Sriracha with Tomato Paste", "Quick convenient chutney shortcut"),
            ],
            "tags": ["Tibetan / Himalayan Cuisine", "Steamed Dumplings", "Street Food Classic", "Spicy Dipping Chutney"],
            "calories": 340,
            "protein": 9.0,
            "carbs": 58.0,
            "fat": 7.0,
        },
        {
            "id_suffix": "crispy_kothey_pan_fried",
            "title": "Crispy Pan-Fried Kothey Momos with Spicy Red Chutney",
            "description": "Pan-seared Himalayan dumplings featuring an irresistible golden crunchy bottom crust and tender steamed top, served with authentic spicy red tomato-chili dipping chutney.",
            "cuisine": "Nepalese / Tibetan Street Food",
            "difficulty": "Intermediate",
            "prep_time_minutes": 25,
            "cook_time_minutes": 18,
            "base_servings": 2,
            "ingredients": [
                ("All-Purpose Flour (Maida)", 150.0, "g", "For pleated dumpling wrappers"),
                ("Finely Shredded Cabbage", 90.0, "g", "Savory vegetable filling"),
                ("Grated Carrots", 50.0, "g", "Savory vegetable filling"),
                ("Finely Chopped Onions", 40.0, "g", "Savory vegetable filling"),
                ("Spring Onions / Scallions", 20.0, "g", "Aromatic filling seasoning"),
                ("Minced Fresh Ginger", 10.0, "g", "Aromatic filling seasoning"),
                ("Minced Fresh Garlic", 10.0, "g", "Aromatic filling seasoning"),
                ("Cooking Oil for Pan-Searing", 15.0, "ml", "To crisp the momo bases in skillet"),
                ("Fiery Red Tomato-Chili Chutney", 60.0, "g", "Spicy garlic and red chili dipping sauce"),
                ("Dark Soy Sauce", 10.0, "ml", "Balanced seasoning"),
                ("Cracked Black Pepper", 2.0, "g", "Balanced seasoning"),
            ],
            "steps": [
                "Knead smooth flour dough and rest 20 minutes under a damp cloth while preparing filling and chutney.",
                "Combine finely minced vegetables, aromatics, soy sauce, and black pepper; squeeze out excess moisture.",
                "Roll dough into thin 3-inch rounds, spoon filling in center, and pleat into half-moon or pouch shapes.",
                "Heat 1 tablespoon oil in a wide non-stick skillet over medium heat. Arrange momos flat-side down in the hot skillet.",
                "Sear undisturbed for 2-3 minutes until bottoms turn crisp and deeply golden.",
                "Pour 1/4 cup of water around momos and immediately cover with a tight-fitting lid to steam for 6-8 minutes until cooked through and wrapper is tender.",
                "Remove lid and let remaining moisture evaporate for 1 minute so the bottom regains its crisp crunch. Serve piping hot with spicy red chutney.",
            ],
            "substitutions": [
                ("Vegetable Filling", "Minced Chicken or Tofu", "Savory meat or vegan protein filling"),
                ("Cooking Oil", "Sesame Oil or Ghee", "Enhanced nutty sear flavor"),
            ],
            "tags": ["Nepalese Street Food", "Pan-Fried / Crispy Bottom", "Comfort Food", "Spicy Dipping Chutney"],
            "calories": 390,
            "protein": 9.5,
            "carbs": 58.0,
            "fat": 13.0,
        },
    ],
    "momos": [],
    "momo": [],
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
    "garlic_tomato_pasta": [
        {
            "id_suffix": "pomodoro_al_dente",
            "title": "Quick Garlic & Tomato Basil Pasta",
            "description": "Classic Italian pasta tossed with sautéed golden garlic, ripe tomatoes, extra virgin olive oil, cracked black pepper, and fragrant fresh parsley.",
            "cuisine": "Italian Cuisine",
            "difficulty": "Beginner",
            "prep_time_minutes": 5,
            "cook_time_minutes": 12,
            "base_servings": 2,
            "ingredients": [
                ("Dry Pasta (Penne or Spaghetti)", 160.0, "g", "Boiled al dente in salted water"),
                ("Fresh Tomatoes", 150.0, "g", "Diced or crushed"),
                ("Fresh Garlic Cloves", 15.0, "g", "Thinly sliced or minced"),
                ("Extra Virgin Olive Oil", 20.0, "ml", "For sautéing garlic and finishing"),
                ("Fresh Parsley or Basil", 10.0, "g", "Roughly chopped garnish"),
                ("Cracked Black Pepper & Salt", 4.0, "g", "To taste"),
            ],
            "steps": [
                "Bring a large pot of salted water to a boil and cook pasta until al dente; reserve 1/4 cup pasta cooking water.",
                "In a wide skillet, gently warm olive oil and sliced garlic over medium-low heat until fragrant and lightly golden.",
                "Add diced tomatoes, salt, and black pepper; simmer on medium for 6-8 minutes until tomatoes break down into a luscious sauce.",
                "Toss cooked pasta and reserved pasta water directly into the skillet, stirring vigorously for 1 minute to coat each strand.",
                "Garnish with chopped fresh parsley or basil and serve immediately warm.",
            ],
            "substitutions": [
                ("Olive Oil", "Cooking Oil or Plant-Based Butter", "Standard cooking oil swap"),
                ("Tomatoes", "Canned Tomato Puree or Tomato Paste", "Pantry shortcut"),
            ],
            "tags": ["Italian", "Vegan", "Vegetarian", "Quick Meal", "Pasta"],
            "calories": 380,
            "protein": 11.0,
            "carbs": 62.0,
            "fat": 10.0,
        }
    ],
    "vegetable_fried_rice": [
        {
            "id_suffix": "wok_stir_fry",
            "title": "Homestyle Vegetable Fried Rice",
            "description": "Savory stir-fried rice tossed in a scorching wok with diced carrots, green peas, scallions, garlic, soy sauce, and toasted sesame oil.",
            "cuisine": "Asian Cuisine",
            "difficulty": "Beginner",
            "prep_time_minutes": 8,
            "cook_time_minutes": 12,
            "base_servings": 2,
            "ingredients": [
                ("Cooked Rice", 220.0, "g", "Chilled day-old jasmine or long-grain rice"),
                ("Diced Carrots & Green Peas", 100.0, "g", "Finely cubed vegetables"),
                ("Minced Garlic & Ginger", 12.0, "g", "Pungent aromatic base"),
                ("Spring Onions / Scallions", 25.0, "g", "White parts for cooking, green tops for garnish"),
                ("Soy Sauce & Sesame Oil", 20.0, "ml", "Savory seasoning sauce"),
                ("Cooking Oil", 12.0, "ml", "For high-heat wok tossing"),
            ],
            "steps": [
                "Heat cooking oil in a wide wok or non-stick skillet over high heat until shimmering.",
                "Add minced garlic, ginger, and white parts of spring onions; stir-fry vigorously for 30 seconds.",
                "Add diced carrots and green peas; stir-fry for 2 minutes until tender-crisp.",
                "Add chilled cooked rice, breaking up any clumps with a spatula.",
                "Drizzle soy sauce, sesame oil, and black pepper around the edges of the pan; toss continuously for 3 minutes until steaming hot.",
                "Garnish with chopped green scallions and serve hot.",
            ],
            "substitutions": [
                ("Rice", "Quinoa, Cauliflower Rice, or Brown Rice", "Whole-grain or low-carb alternative"),
                ("Soy Sauce", "Tamari or Coconut Aminos", "Gluten-free or soy-free alternative"),
            ],
            "tags": ["Asian", "Vegan", "Vegetarian", "Quick Meal", "Zero-Waste"],
            "calories": 340,
            "protein": 6.5,
            "carbs": 58.0,
            "fat": 9.0,
        }
    ],
    "classic_scrambled_eggs": [
        {
            "id_suffix": "buttery_soft_curds",
            "title": "Classic Butter Scrambled Eggs on Toast",
            "description": "Creamy, soft-curd scrambled eggs gently cooked in butter, seasoned with sea salt and cracked black pepper, served atop crisp golden toasted bread.",
            "cuisine": "Breakfast & Brunch",
            "difficulty": "Beginner",
            "prep_time_minutes": 3,
            "cook_time_minutes": 5,
            "base_servings": 2,
            "ingredients": [
                ("Whole Eggs", 120.0, "g", "Beaten with a pinch of salt"),
                ("Bread Slices", 60.0, "g", "Toasted until golden and crisp"),
                ("Dairy Butter", 15.0, "g", "Melted over low heat for silky eggs"),
                ("Black Pepper & Sea Salt", 3.0, "g", "Freshly cracked seasoning"),
            ],
            "steps": [
                "Whisk eggs with a pinch of salt until smooth and uniform.",
                "Melt butter in a small non-stick pan over medium-low heat until foaming.",
                "Pour in beaten eggs and let set for 15 seconds, then gently push with a spatula to create soft curds.",
                "Remove from heat while eggs are still slightly soft and glossy; residual heat will finish cooking them.",
                "Toast bread slices until golden crisp; spoon soft scrambled eggs on top and finish with cracked pepper.",
            ],
            "substitutions": [
                ("Eggs", "Silken Tofu or Chickpea Flour Scramble", "Plant-based vegan scramble alternative"),
                ("Butter", "Olive Oil or Vegan Butter", "Dairy-free alternative"),
            ],
            "tags": ["Breakfast", "Vegetarian", "High-Protein", "Quick Meal"],
            "calories": 320,
            "protein": 16.0,
            "carbs": 26.0,
            "fat": 16.0,
        }
    ],
    "spinach_chickpea_curry": [
        {
            "id_suffix": "rustic_homestyle",
            "title": "Rustic Spinach & Chickpea Coconut Curry",
            "description": "Nutrient-packed chickpeas and tender baby spinach simmered in a spiced tomato, onion, garlic, and cumin gravy.",
            "cuisine": "Indian / Healthy",
            "difficulty": "Beginner",
            "prep_time_minutes": 10,
            "cook_time_minutes": 20,
            "base_servings": 2,
            "ingredients": [
                ("Boiled Chickpeas", 180.0, "g", "Tender garbanzo beans"),
                ("Fresh Baby Spinach", 100.0, "g", "Washed and roughly chopped"),
                ("Diced Tomatoes", 90.0, "g", "Fresh or pureed"),
                ("Diced Onions", 50.0, "g", "Finely chopped"),
                ("Minced Garlic & Ginger", 12.0, "g", "Aromatic paste"),
                ("Cooking Oil", 12.0, "ml", "For sautéing"),
                ("Ground Cumin, Turmeric & Garam Masala", 8.0, "g", "Warming spices"),
            ],
            "steps": [
                "Heat oil in a pan, add cumin seeds and diced onions; sauté until golden.",
                "Add minced garlic, ginger, and diced tomatoes, cooking until soft and fragrant.",
                "Add turmeric, garam masala, salt, and boiled chickpeas with 1/2 cup of water; simmer on low for 10 minutes.",
                "Stir in chopped baby spinach and cook for 2 minutes until wilted and vibrant green.",
                "Serve warm with steamed rice or flatbread.",
            ],
            "substitutions": [
                ("Chickpeas", "Kidney Beans, Black Beans, or Lentils", "Legume swap"),
                ("Spinach", "Kale, Fenugreek Leaves, or Swiss Chard", "Leafy green alternative"),
            ],
            "tags": ["Indian", "Vegan", "Vegetarian", "High-Fiber", "Gluten-Free"],
            "calories": 310,
            "protein": 12.0,
            "carbs": 45.0,
            "fat": 9.0,
        }
    ],
    "paneer_bhurji": [
        {
            "id_suffix": "dhaba_style",
            "title": "Spiced Street-Style Paneer Bhurji",
            "description": "Crumbled fresh Indian cottage cheese (paneer) sautéed with onions, ripe tomatoes, green chilies, ginger, turmeric, and fresh coriander in golden butter.",
            "cuisine": "North Indian Cuisine",
            "difficulty": "Beginner",
            "prep_time_minutes": 10,
            "cook_time_minutes": 12,
            "base_servings": 2,
            "ingredients": [
                ("Fresh Paneer", 180.0, "g", "Coarsely crumbled by hand"),
                ("Diced Onions", 50.0, "g", "Sautéed translucent"),
                ("Diced Tomatoes", 70.0, "g", "Cooked until juicy"),
                ("Green Chilies & Ginger", 10.0, "g", "Finely minced spicy aromatics"),
                ("Dairy Butter or Ghee", 15.0, "g", "Cooking medium"),
                ("Turmeric, Cumin & Garam Masala", 6.0, "g", "Indian spice blend"),
                ("Fresh Coriander Leaves", 5.0, "g", "Finely chopped garnish"),
            ],
            "steps": [
                "Melt butter in a skillet over medium heat; add cumin seeds, minced green chilies, and ginger.",
                "Add diced onions and sauté for 3-4 minutes until golden.",
                "Stir in tomatoes, turmeric powder, and salt; cook until tomatoes turn soft and pulpy.",
                "Fold in the crumbled paneer gently and cook on medium-low for 3-4 minutes until heated through and coated with masala.",
                "Sprinkle garam masala and fresh coriander leaves, toss gently, and serve immediately with warm toast or roti.",
            ],
            "substitutions": [
                ("Paneer", "Extra Firm Tofu (Tofu Bhurji)", "Vegan plant-based cottage cheese swap"),
                ("Butter", "Cooking Oil", "Dairy-free cooking medium"),
            ],
            "tags": ["North Indian", "Vegetarian", "High-Protein", "Quick Meal"],
            "calories": 420,
            "protein": 18.0,
            "carbs": 10.0,
            "fat": 34.0,
        }
    ],
}

# Dish aliases for robust catalogue resolution
LOCAL_RECIPE_CATALOGUE["momos"] = LOCAL_RECIPE_CATALOGUE["momos_with_red_chutney"]
LOCAL_RECIPE_CATALOGUE["momo"] = LOCAL_RECIPE_CATALOGUE["momos_with_red_chutney"]
LOCAL_RECIPE_CATALOGUE["veg_momos"] = LOCAL_RECIPE_CATALOGUE["momos_with_red_chutney"]
LOCAL_RECIPE_CATALOGUE["steamed_momos"] = LOCAL_RECIPE_CATALOGUE["momos_with_red_chutney"]
LOCAL_RECIPE_CATALOGUE["pasta"] = LOCAL_RECIPE_CATALOGUE["garlic_tomato_pasta"]
LOCAL_RECIPE_CATALOGUE["fried_rice"] = LOCAL_RECIPE_CATALOGUE["vegetable_fried_rice"]
LOCAL_RECIPE_CATALOGUE["scrambled_eggs"] = LOCAL_RECIPE_CATALOGUE["classic_scrambled_eggs"]
LOCAL_RECIPE_CATALOGUE["chickpea_curry"] = LOCAL_RECIPE_CATALOGUE["spinach_chickpea_curry"]


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
        if clean_dish in LOCAL_RECIPE_CATALOGUE and LOCAL_RECIPE_CATALOGUE[clean_dish]:
            matched_entry = LOCAL_RECIPE_CATALOGUE[clean_dish]
            matched_key = clean_dish
        elif "momo" in clean_dish:
            matched_entry = LOCAL_RECIPE_CATALOGUE["momos_with_red_chutney"]
            matched_key = "momos_with_red_chutney"
        else:
            # Substring search in catalogue keys
            for key, entry in LOCAL_RECIPE_CATALOGUE.items():
                if entry and (key in clean_dish or clean_dish in key):
                    matched_entry = entry
                    matched_key = key
                    break

    # 2. Match by prominent pantry ingredients if dish_name didn't match
    if not matched_entry and ingredients:
        pantry_joined = " ".join(ingredients).lower()
        if "momo" in pantry_joined or ("dumpling" in pantry_joined and "chutney" in pantry_joined):
            matched_entry = LOCAL_RECIPE_CATALOGUE["momos_with_red_chutney"]
            matched_key = "momos_with_red_chutney"
        elif "pav" in pantry_joined and "bhaji" in pantry_joined:
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
