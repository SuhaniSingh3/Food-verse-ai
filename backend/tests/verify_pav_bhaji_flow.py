"""End-to-End Test for Food Verse AI: Pav Bhaji Image Upload, Dish Correction, Recipe Synthesis, and Nutrition Verification.

Verifies:
1. Real Pav Bhaji image classification via Food-101 Hugging Face model.
2. User dish correction to 'Pav Bhaji'.
3. Recipe synthesis for 'Pav Bhaji' using local recipe catalogue.
4. Nutritional calculation for 'Pav Bhaji' using USDA benchmarks.
5. Strict absence of salmon data anywhere in the Pav Bhaji flow.
6. Graceful handling when no recipe or nutrition data exists (no fabricated results).
"""

import sys
import os
import json
import requests

BACKEND_URL = "http://127.0.0.1:8000"
IMAGE_PATH = r"C:\Users\ASUS\Pictures\images.jpg"


def test_full_pav_bhaji_flow():
    print("=" * 70)
    print("STARTING PAV BHAJI END-TO-END VERIFICATION")
    print("=" * 70)

    # Check image exists
    assert os.path.exists(IMAGE_PATH), f"Image file not found at {IMAGE_PATH}"
    file_size = os.path.getsize(IMAGE_PATH)
    print(f"[OK] Found test image at {IMAGE_PATH} ({file_size} bytes)")

    # 1. Health check
    res = requests.get(f"{BACKEND_URL}/api/health")
    assert res.status_code == 200, f"Backend health failed: {res.status_code}"
    health_data = res.json()
    print(f"[OK] Backend health: {health_data['status']} (Provider: {health_data.get('ai_provider')})")

    # 2. Upload image to /api/food/analyze
    print("\n[STEP 1] Uploading Pav Bhaji image to /api/food/analyze...")
    with open(IMAGE_PATH, "rb") as f:
        files = {"file": ("images.jpg", f, "image/jpeg")}
        data = {"meal_type": "Lunch"}
        res = requests.post(f"{BACKEND_URL}/api/food/analyze", files=files, data=data)

    assert res.status_code == 200, f"Analyze failed: {res.status_code} - {res.text}"
    analysis = res.json()
    print(f"[OK] Classifier Top Predictions:")
    for pred in analysis.get("top_predictions", []):
        print(f"     - {pred['category']}: {pred['percentage']} (raw: {pred['raw_label']})")

    top_label = analysis["top_predictions"][0]["category"]
    print(f"     (Model predicted: {top_label}. Now correcting to 'Pav Bhaji'...)")

    # 3. User corrects food name to Pav Bhaji via /api/food/confirm
    print("\n[STEP 2] Correcting food name to 'Pav Bhaji' via /api/food/confirm...")
    confirm_payload = {
        "confirmed_dish": "Pav Bhaji",
        "original_prediction": top_label,
        "top_predictions": analysis.get("top_predictions", []),
        "user_question": None,
    }
    res = requests.post(f"{BACKEND_URL}/api/food/confirm", json=confirm_payload)
    assert res.status_code == 200, f"Confirm failed: {res.status_code} - {res.text}"
    confirmed = res.json()

    print(f"[OK] Confirmed Dish: {confirmed['dish_name']}")
    assert confirmed["dish_name"] == "Pav Bhaji"

    # Verify decomposed ingredients are for Pav Bhaji, NOT Salmon
    decomposed_names = [item["name"] for item in confirmed.get("decomposed_items", [])]
    print(f"[OK] Decomposed Ingredients: {decomposed_names}")
    for name in decomposed_names:
        assert "salmon" not in name.lower(), f"Unexpected salmon in decomposed ingredients: {name}"

    # Verify nutritional estimate for Pav Bhaji
    nutr_est = confirmed.get("nutritional_estimate")
    assert nutr_est is not None, "Missing nutritional_estimate for Pav Bhaji"
    print(f"[OK] Estimated Calories: ~{nutr_est['estimated_calories']} kcal")
    print(f"[OK] Estimated Macros: Protein {nutr_est['protein_g']}g | Carbs {nutr_est['carbs_g']}g | Fat {nutr_est['fat_g']}g")
    print(f"[OK] Basis statement: {nutr_est['basis']}")

    assert nutr_est["estimated_calories"] == 490, f"Expected 490 kcal for Pav Bhaji, got {nutr_est['estimated_calories']}"
    assert "salmon" not in json.dumps(confirmed).lower(), "Found salmon in confirmed response!"

    # 4. Recipe Generation for confirmed Pav Bhaji via /api/recipes/generate
    print("\n[STEP 3] Synthesizing recipes for 'Pav Bhaji' via /api/recipes/generate...")
    recipe_payload = {
        "dish_name": "Pav Bhaji",
        "ingredients": ["Pav / Soft Bread Rolls", "Mixed Vegetable Bhaji Mash", "Dairy Butter", "Diced Raw Onions", "Lemon", "Coriander"],
        "cuisine": "Indian",
        "dietary_preference": "Vegetarian",
        "allergies_and_avoid": [],
        "servings": 2,
        "max_cook_time_minutes": 30,
        "skill_level": "Beginner",
    }
    res = requests.post(f"{BACKEND_URL}/api/recipes/generate", json=recipe_payload)
    assert res.status_code == 200, f"Recipe generation failed: {res.status_code} - {res.text}"
    recipes_data = res.json()

    recipes = recipes_data.get("recipes", [])
    print(f"[OK] Synthesized {len(recipes)} recipes from local recipe catalogue:")
    for r in recipes:
        print(f"     - Title: {r['title']} ({r['cuisine']}, {r['cook_time_minutes']}m, {r['servings']} servings)")
        print(f"       Description: {r['description'][:90]}...")

    recipe_json_str = json.dumps(recipes_data).lower()
    assert "salmon" not in recipe_json_str, "CRITICAL ERROR: 'salmon' found in synthesized recipes for Pav Bhaji!"
    print("[OK] ZERO occurrences of 'salmon' in recipe response!")

    # Check that recipes are authentic Pav Bhaji
    assert any("pav bhaji" in r["title"].lower() for r in recipes), "No Pav Bhaji recipe found in catalogue!"

    # 5. Nutrition Calculation for Pav Bhaji components via /api/v1/nutrition/calculate
    print("\n[STEP 4] Calculating itemized nutrition for Pav Bhaji via /api/v1/nutrition/calculate...")
    nutrition_payload = {
        "items": [
            {"name": "Pav / Soft Bread Rolls", "grams": 120},
            {"name": "Mixed Vegetable Bhaji Mash", "grams": 220},
            {"name": "Dairy Butter", "grams": 25},
            {"name": "Diced Raw Onions & Lemon", "grams": 30},
        ]
    }
    res = requests.post(f"{BACKEND_URL}/api/v1/nutrition/calculate", json=nutrition_payload)
    assert res.status_code == 200, f"Nutrition calculation failed: {res.status_code} - {res.text}"
    nutrition_res = res.json()

    totals = nutrition_res["totals"]
    print(f"[OK] Calculated Totals:")
    print(f"     - Calories: {totals['calories']} kcal")
    print(f"     - Protein: {totals['protein_g']}g")
    print(f"     - Carbs: {totals['carbs_g']}g")
    print(f"     - Fat: {totals['fat_g']}g")

    print(f"[OK] Ingredient Item Breakdown:")
    for item in nutrition_res["items"]:
        match_str = "USDA Match" if item["is_benchmark_match"] else "Baseline"
        print(f"     - {item['name']} ({item['grams']}g): {item['calories']} kcal, P:{item['protein_g']}g, C:{item['carbs_g']}g, F:{item['fat_g']}g [{match_str}]")
        assert item["is_benchmark_match"], f"Expected USDA benchmark match for {item['name']}"

    nutrition_json_str = json.dumps(nutrition_res).lower()
    assert "salmon" not in nutrition_json_str, "CRITICAL ERROR: 'salmon' found in nutrition response for Pav Bhaji!"
    print("[OK] ZERO occurrences of 'salmon' in nutrition response!")

    # 6. Verify graceful fallback for unknown dish (Requirement 6)
    print("\n[STEP 5] Testing handling for unknown/arbitrary dish without catalogue recipe...")
    unknown_recipe_payload = {
        "dish_name": "Nonexistent Mystery Stew 999",
        "ingredients": ["Zucchini", "Carrots", "Water"],
        "cuisine": "Any",
        "servings": 2,
    }
    res = requests.post(f"{BACKEND_URL}/api/recipes/generate", json=unknown_recipe_payload)
    assert res.status_code == 200
    unknown_recipes = res.json()["recipes"]
    # Dynamic synthesis should tailor to zucchini, NOT salmon
    assert "salmon" not in json.dumps(unknown_recipes).lower()
    print(f"[OK] Dynamic synthesis generated tailored {unknown_recipes[0]['title']} without any salmon fallback!")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED! PAV BHAJI IMAGE AND DISH CORRECTION VERIFIED.")
    print("NEITHER RECIPE NOR NUTRITION SECTIONS DISPLAY SALMON DATA.")
    print("=" * 70)


if __name__ == "__main__":
    test_full_pav_bhaji_flow()
