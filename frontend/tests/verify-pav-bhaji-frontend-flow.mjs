/**
 * Frontend API Integration & State Verification for Pav Bhaji Workflow
 * Verifies that the client API methods called by FoodAnalyzerView, CookingAssistantView,
 * and NutritionPlannerView execute successfully, connect to the user-confirmed dish,
 * and contain zero hardcoded salmon fallback data.
 */

const API_BASE_URL = 'http://127.0.0.1:8000';

async function runFrontendContractVerification() {
  console.log('='.repeat(70));
  console.log('FRONTEND API & RECIPE/NUTRITION CONTRACT VERIFICATION');
  console.log('='.repeat(70));

  // 1. Confirm dish as Pav Bhaji (matches handleConfirmDish in FoodAnalyzerView.jsx)
  console.log('\n[1] Testing FoodAnalyzer confirmation API call for "Pav Bhaji"...');
  const confirmRes = await fetch(`${API_BASE_URL}/api/food/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      confirmed_dish: 'Pav Bhaji',
      original_prediction: 'Ramen',
      top_predictions: [
        { category: 'Ramen', raw_label: 'ramen', confidence: 0.362, percentage: '36.2%' },
        { category: 'Chicken Wings', raw_label: 'chicken_wings', confidence: 0.27, percentage: '27.0%' },
        { category: 'Hamburger', raw_label: 'hamburger', confidence: 0.197, percentage: '19.7%' },
      ],
      user_question: null,
    }),
  });

  if (!confirmRes.ok) {
    throw new Error(`confirmFoodDish failed: ${confirmRes.status}`);
  }

  const confirmedData = await confirmRes.json();
  console.log(`[OK] Confirmed dish: ${confirmedData.dish_name}`);
  console.log(`[OK] Decomposed items count: ${confirmedData.decomposed_items.length}`);
  console.log(`[OK] Nutritional Estimate: ~${confirmedData.nutritional_estimate.estimated_calories} kcal`);

  // Verify no salmon in confirm response
  const confirmStr = JSON.stringify(confirmedData).toLowerCase();
  if (confirmStr.includes('salmon')) {
    throw new Error('Found salmon in confirmed dish response!');
  }

  // 2. Recipe Synthesis Dispatch (matches handleGenerate in CookingAssistantView.jsx)
  console.log('\n[2] Testing CookingAssistant recipe generation for "Pav Bhaji"...');
  const recipePayload = {
    dish_name: confirmedData.dish_name,
    ingredients: confirmedData.visible_ingredients,
    cuisine: 'Indian',
    dietary_preference: 'Standard',
    allergies_and_avoid: [],
    servings: 2,
    max_cook_time_minutes: 30,
    skill_level: 'Beginner',
  };

  const recipeRes = await fetch(`${API_BASE_URL}/api/recipes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(recipePayload),
  });

  if (!recipeRes.ok) {
    throw new Error(`generateRecipes failed: ${recipeRes.status}`);
  }

  const recipeData = await recipeRes.json();
  const recipes = recipeData.recipes || [];
  console.log(`[OK] Generated ${recipes.length} recipes from local catalogue:`);
  for (const r of recipes) {
    console.log(`     - "${r.title}" (Cuisine: ${r.cuisine}, Servings: ${r.servings})`);
    if (r.title.toLowerCase().includes('salmon') || r.description.toLowerCase().includes('salmon')) {
      throw new Error(`Found salmon in synthesized recipe: ${r.title}`);
    }
  }

  const recipeStr = JSON.stringify(recipeData).toLowerCase();
  if (recipeStr.includes('salmon')) {
    throw new Error('Found salmon in recipe response!');
  }
  console.log('[OK] ZERO occurrences of "salmon" in synthesized recipes!');

  // 3. Nutrition Planner Calculation (matches handleCalculate in NutritionPlannerView.jsx)
  console.log('\n[3] Testing NutritionPlanner calculation for Pav Bhaji portion list...');
  const nutritionItems = confirmedData.decomposed_items.map((i) => ({
    name: i.name,
    grams: i.estimated_grams || 100,
  }));

  const nutritionRes = await fetch(`${API_BASE_URL}/api/v1/nutrition/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: nutritionItems }),
  });

  if (!nutritionRes.ok) {
    throw new Error(`calculateNutrition failed: ${nutritionRes.status}`);
  }

  const nutritionData = await nutritionRes.json();
  console.log(`[OK] Nutrition calculated for ${nutritionData.items.length} items.`);
  console.log(`     Total Calories: ${nutritionData.totals.calories} kcal`);
  console.log(`     Total Protein: ${nutritionData.totals.protein_g}g | Carbs: ${nutritionData.totals.carbs_g}g | Fat: ${nutritionData.totals.fat_g}g`);

  for (const item of nutritionData.items) {
    console.log(`     - ${item.name} (${item.grams}g): ${item.calories} kcal [Benchmark match: ${item.is_benchmark_match}]`);
    if (item.name.toLowerCase().includes('salmon')) {
      throw new Error(`Found salmon in nutrition item breakdown: ${item.name}`);
    }
  }

  const nutritionStr = JSON.stringify(nutritionData).toLowerCase();
  if (nutritionStr.includes('salmon')) {
    throw new Error('Found salmon in nutrition calculation response!');
  }
  console.log('[OK] ZERO occurrences of "salmon" in nutrition calculation!');

  console.log('\n' + '='.repeat(70));
  console.log('FRONTEND INTEGRATION CONTRACT VERIFICATION PASSED SUCCESSFULLY!');
  console.log('='.repeat(70));
}

runFrontendContractVerification().catch((err) => {
  console.error('[FAIL] Frontend verification failed:', err);
  process.exit(1);
});
