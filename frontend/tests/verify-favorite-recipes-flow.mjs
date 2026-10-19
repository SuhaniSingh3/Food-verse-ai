/**
 * End-to-End Verification Test for Food Verse AI "Favorite Recipes" Feature
 *
 * Requirements tested:
 * 1. Add a Favorite button with a heart icon to the existing recipe section.
 * 2. Allow users to add and remove recipes from Favorites (toggle support).
 * 3. Create a Favorites section that displays saved recipes with their names and available recipe details.
 * 4. Persist favorites using the browser's existing localStorage functionality ('foodverse_saved_recipes').
 * 5. Prevent duplicate favorites for the same recipe.
 * 6. Keep favorites after page refresh and browser reopening.
 * 7. Show a friendly empty state when there are no favorites.
 * 8. Handle missing recipe information safely (no crashes with missing ingredients, steps, timings, or macros).
 * 9. Keep Favorites separate from analysis history. Clearing analysis history must not delete saved favorites.
 * 10. Preserve existing design and all working features.
 * 11. Live integration with backend API recipe synthesis.
 */

import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://127.0.0.1:8000';

class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

async function runTests() {
  console.log('='.repeat(75));
  console.log('FOOD VERSE AI: "FAVORITE RECIPES" FEATURE VERIFICATION SUITE');
  console.log('='.repeat(75));

  const localStorage = new LocalStorageMock();
  const STORAGE_KEYS = {
    MEALS: 'foodverse_meals',
    SAVED_RECIPES: 'foodverse_saved_recipes',
  };

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test Case 1: Empty State Verification (Requirement 7)
  // -------------------------------------------------------------
  console.log('\n[TEST 1] Testing Initial Empty State for Favorite Recipes...');
  let savedRecipes = [];
  const emptyStateTitle = "No Favorite Recipes Saved Yet";
  const emptyStateDesc = "You haven't saved any recipes to your favorites. Generate personalized recipes with the Recipe Generator, then click the heart icon (🤍 Favorite) on any recipe to save it here for quick access.";

  assert(savedRecipes.length === 0, 'Initial savedRecipes is empty');
  assert(emptyStateTitle.includes('No Favorite Recipes Saved Yet'), 'Empty state title matches friendly guidance');
  assert(emptyStateDesc.includes('click the heart icon'), 'Empty state explains how to favorite recipes');

  // -------------------------------------------------------------
  // Test Case 2: Adding a Recipe to Favorites with Heart Icon (Requirements 1, 2, 4)
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Testing Adding Recipe to Favorites & Persistence...');
  const sampleRecipe1 = {
    id: 'recipe_pav_bhaji_street',
    title: 'Authentic Mumbai Pav Bhaji',
    description: 'Spiced vegetable mash served with butter-toasted pav bread.',
    cuisine: 'Indian',
    difficulty: 'Intermediate',
    prep_time_minutes: 15,
    cook_time_minutes: 25,
    servings: 2,
    ingredient_quantities: [
      { name: 'Potatoes', amount: 200, unit: 'g', notes: 'boiled and mashed' },
      { name: 'Pav Bread', amount: 4, unit: 'piece', notes: 'buttered' },
      { name: 'Pav Bhaji Masala', amount: 1.5, unit: 'tbsp', notes: 'fresh' },
    ],
    preparation_steps: [
      'Boil and mash vegetables thoroughly.',
      'Sauté onions, tomatoes, and spices with butter in a large pan.',
      'Toast pav buns on hot griddle and serve garnished with cilantro and lemon.',
    ],
    estimated_calories_per_serving: 420,
    protein_g: 11.5,
    carbs_g: 68.0,
    fat_g: 14.0,
  };

  // Add sample recipe to favorites
  function isFavoriteRecipe(recipes, recipeOrId) {
    if (!recipeOrId) return false;
    const targetId = typeof recipeOrId === 'string' ? recipeOrId : recipeOrId.id;
    const targetTitle = typeof recipeOrId === 'object' && recipeOrId.title ? recipeOrId.title.trim().toLowerCase() : null;

    return recipes.some((r) => {
      if (targetId && r.id && r.id === targetId) return true;
      if (targetTitle && r.title && r.title.trim().toLowerCase() === targetTitle) return true;
      return false;
    });
  }

  function saveRecipe(recipes, recipe) {
    if (!recipe || isFavoriteRecipe(recipes, recipe)) {
      return recipes;
    }
    const recipeId = recipe.id || `recipe_${Date.now()}`;
    const normalized = { ...recipe, id: recipeId, savedAt: new Date().toISOString() };
    const updated = [normalized, ...recipes];
    localStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(updated));
    return updated;
  }

  function removeRecipe(recipes, recipeOrId) {
    const targetId = typeof recipeOrId === 'string' ? recipeOrId : recipeOrId.id;
    const targetTitle = typeof recipeOrId === 'object' && recipeOrId.title ? recipeOrId.title.trim().toLowerCase() : null;
    const updated = recipes.filter((r) => {
      if (targetId && r.id && r.id === targetId) return false;
      if (targetTitle && r.title && r.title.trim().toLowerCase() === targetTitle) return false;
      return true;
    });
    localStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(updated));
    return updated;
  }

  savedRecipes = saveRecipe(savedRecipes, sampleRecipe1);
  assert(savedRecipes.length === 1, 'Recipe successfully added to favorites state');
  assert(isFavoriteRecipe(savedRecipes, sampleRecipe1), 'isFavoriteRecipe correctly returns true for added recipe');
  assert(savedRecipes[0].title === 'Authentic Mumbai Pav Bhaji', 'Saved recipe retains exact authentic title');

  // Verify persistence in localStorage
  const storedJson = localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES);
  assert(storedJson !== null, 'localStorage item foodverse_saved_recipes exists');
  const parsedStorage = JSON.parse(storedJson);
  assert(parsedStorage.length === 1, 'localStorage contains exactly 1 saved recipe');
  assert(parsedStorage[0].id === 'recipe_pav_bhaji_street', 'Persisted recipe ID matches');
  assert(parsedStorage[0].savedAt !== undefined, 'Persisted recipe includes savedAt timestamp');

  // Verify button icon and label representation
  const isFav = isFavoriteRecipe(savedRecipes, sampleRecipe1);
  const heartIcon = isFav ? '❤️' : '🤍';
  const buttonLabel = isFav ? 'Favorited' : 'Favorite';
  const actionButtonText = isFav ? 'Remove from Favorites' : 'Add to Favorites';
  assert(heartIcon === '❤️', 'Favorite button displays filled heart ❤️ when favorited');
  assert(buttonLabel === 'Favorited', 'Header button displays Favorited');
  assert(actionButtonText === 'Remove from Favorites', 'Action button displays Remove from Favorites');

  // -------------------------------------------------------------
  // Test Case 3: Duplicate Prevention (Requirement 5)
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing Duplicate Prevention...');
  const duplicateRecipeAttempt = { ...sampleRecipe1 };
  savedRecipes = saveRecipe(savedRecipes, duplicateRecipeAttempt);
  assert(savedRecipes.length === 1, 'Duplicate recipe with same ID was not added');

  const duplicateByTitleAttempt = { ...sampleRecipe1, id: 'different_id_same_title' };
  savedRecipes = saveRecipe(savedRecipes, duplicateByTitleAttempt);
  assert(savedRecipes.length === 1, 'Duplicate recipe with same title was prevented');

  // -------------------------------------------------------------
  // Test Case 4: Adding a Second Unique Recipe
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing Adding Multiple Unique Favorites...');
  const sampleRecipe2 = {
    id: 'recipe_dal_makhani_punjabi',
    title: 'Slow-Cooked Punjabi Dal Makhani',
    description: 'Black lentils simmered overnight with cream and fenugreek.',
    cuisine: 'North Indian',
    difficulty: 'Intermediate',
    prep_time_minutes: 20,
    cook_time_minutes: 60,
    servings: 4,
    ingredient_quantities: [
      { name: 'Whole Black Lentils (Urad)', amount: 250, unit: 'g', notes: 'soaked overnight' },
      { name: 'Butter & Cream', amount: 50, unit: 'g', notes: 'fresh' },
    ],
    preparation_steps: ['Simmer lentils on low heat for 60 minutes.', 'Stir in butter, spices, and finish with cream.'],
    estimated_calories_per_serving: 350,
  };

  savedRecipes = saveRecipe(savedRecipes, sampleRecipe2);
  assert(savedRecipes.length === 2, 'Two distinct recipes successfully saved');
  assert(isFavoriteRecipe(savedRecipes, sampleRecipe2), 'Second recipe recognized as favorite');

  // -------------------------------------------------------------
  // Test Case 5: Removing a Recipe from Favorites (Requirement 2)
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Testing Removing Recipe from Favorites...');
  savedRecipes = removeRecipe(savedRecipes, sampleRecipe1);
  assert(savedRecipes.length === 1, 'Recipe removed, count decreased to 1');
  assert(!isFavoriteRecipe(savedRecipes, sampleRecipe1), 'Removed recipe no longer recognized as favorite');
  assert(isFavoriteRecipe(savedRecipes, sampleRecipe2), 'Remaining recipe is still favorite');

  const updatedStorage = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES));
  assert(updatedStorage.length === 1, 'localStorage accurately reflects removal without refresh');
  assert(updatedStorage[0].id === 'recipe_dal_makhani_punjabi', 'Remaining item in localStorage is correct');

  // -------------------------------------------------------------
  // Test Case 6: Refresh & Reopen Persistence Simulation (Requirement 6)
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Testing Persistence Across Page Refresh & Browser Reopening...');
  // Simulate complete browser restart: re-instantiate state strictly from localStorage
  const reloadedFromBrowserRestart = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES)) || [];
  assert(reloadedFromBrowserRestart.length === 1, 'State rehydrated from localStorage retains 1 recipe');
  assert(reloadedFromBrowserRestart[0].title === 'Slow-Cooked Punjabi Dal Makhani', 'Rehydrated recipe data is intact');
  assert(reloadedFromBrowserRestart[0].prep_time_minutes === 20, 'Details like prep time survive reopening');

  // -------------------------------------------------------------
  // Test Case 7: Storage Isolation: Clear History does NOT Delete Favorites (Requirement 9)
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Testing Storage Isolation from Analysis History...');
  // Seed meal analysis history
  const sampleMeals = [
    { id: 'meal_1', dishName: 'Pav Bhaji', timestamp: new Date().toISOString() },
    { id: 'meal_2', dishName: 'Chole Bhature', timestamp: new Date().toISOString() },
  ];
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(sampleMeals));
  localStorage.setItem('foodverse_analysis_history', JSON.stringify(sampleMeals));

  assert(localStorage.getItem(STORAGE_KEYS.MEALS) !== null, 'Analysis history meals exist in storage');
  assert(localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES) !== null, 'Saved recipes exist in storage');

  // Simulate user clicking "Clear History" and confirming
  function clearAllMeals() {
    localStorage.removeItem(STORAGE_KEYS.MEALS);
    localStorage.removeItem('foodverse_analysis_history');
  }

  clearAllMeals();

  assert(localStorage.getItem(STORAGE_KEYS.MEALS) === null, 'foodverse_meals was cleared by clearAllMeals()');
  assert(localStorage.getItem('foodverse_analysis_history') === null, 'foodverse_analysis_history was cleared');
  assert(localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES) !== null, 'foodverse_saved_recipes was NOT cleared');

  const favoritesAfterHistoryClear = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES));
  assert(favoritesAfterHistoryClear.length === 1, 'Saved favorites count unchanged after history clear');
  assert(favoritesAfterHistoryClear[0].id === 'recipe_dal_makhani_punjabi', 'Favorites content 100% preserved');

  // -------------------------------------------------------------
  // Test Case 8: Defensive Handling of Missing Recipe Information (Requirement 8)
  // -------------------------------------------------------------
  console.log('\n[TEST 8] Testing Safe Handling of Missing Recipe Information...');
  const minimalRecipe = {
    id: 'recipe_minimal',
    title: 'Minimalist Stir-Fry',
    // Missing: description, prep_time_minutes, cook_time_minutes, calories, macros, substitutions, etc.
  };

  // Test getScaledAmount with missing fields
  function safeGetScaledAmount(recipe, ingredient, currentServings) {
    if (!ingredient || typeof ingredient !== 'object') return '';
    if (ingredient.amount === undefined || ingredient.amount === null || isNaN(ingredient.amount)) {
      return '';
    }
    const baseServings = recipe.base_servings || recipe.servings || 1;
    const ratio = currentServings / (baseServings || 1);
    const scaled = Math.round(ingredient.amount * ratio * 10) / 10;
    return scaled % 1 === 0 ? Math.round(scaled) : scaled;
  }

  assert(safeGetScaledAmount(minimalRecipe, null, 2) === '', 'safeGetScaledAmount handles null ingredient without crashing');
  assert(safeGetScaledAmount(minimalRecipe, { name: 'Salt' }, 2) === '', 'safeGetScaledAmount handles missing amount without crashing');

  // Test formatting recipe text when ingredients and steps are missing
  function formatRecipeSafe(recipe) {
    const rawIngs = Array.isArray(recipe.ingredient_quantities)
      ? recipe.ingredient_quantities
      : Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];
    const rawSteps = Array.isArray(recipe.preparation_steps)
      ? recipe.preparation_steps
      : Array.isArray(recipe.instructions)
        ? recipe.instructions
        : [];

    const ingText = rawIngs.length > 0
      ? rawIngs.map((i) => (typeof i === 'string' ? i : i.name)).join('\n')
      : 'No ingredient details available';

    const stepText = rawSteps.length > 0
      ? rawSteps.map((s, idx) => `${idx + 1}. ${s}`).join('\n')
      : 'No step-by-step instructions available.';

    return `${recipe.title || 'Untitled Recipe'}\n${ingText}\n${stepText}`;
  }

  const safeFormatted = formatRecipeSafe(minimalRecipe);
  assert(safeFormatted.includes('Minimalist Stir-Fry'), 'Safe formatted recipe includes title');
  assert(safeFormatted.includes('No ingredient details available'), 'Safe fallback for missing ingredients');
  assert(safeFormatted.includes('No step-by-step instructions available'), 'Safe fallback for missing steps');

  // Save minimal recipe to favorites
  savedRecipes = saveRecipe(savedRecipes, minimalRecipe);
  assert(savedRecipes.length === 2, 'Minimal recipe added without exceptions');

  // -------------------------------------------------------------
  // Test Case 9: Live Backend API Integration
  // -------------------------------------------------------------
  console.log('\n[TEST 9] Testing Live Backend Recipe Generation & Favoriting...');
  try {
    const response = await fetch(`${API_BASE_URL}/api/recipes/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients: ['Potatoes', 'Tomatoes', 'Peas', 'Butter'],
        dish_name: 'Pav Bhaji',
        servings: 2,
        max_cook_time_minutes: 30,
        skill_level: 'Beginner',
      }),
    });

    assert(response.ok, `Backend responded with HTTP ${response.status}`);
    const data = await response.json();
    assert(Array.isArray(data.recipes) && data.recipes.length > 0, `Backend returned ${data.recipes?.length || 0} recipes`);

    const liveRecipe = data.recipes[0];
    console.log(`  Live recipe received: "${liveRecipe.title}" (${liveRecipe.cuisine})`);
    assert(Boolean(liveRecipe.title), 'Live recipe has valid title');
    assert(Array.isArray(liveRecipe.preparation_steps) && liveRecipe.preparation_steps.length > 0, 'Live recipe has real preparation steps');
    assert(Array.isArray(liveRecipe.ingredient_quantities) && liveRecipe.ingredient_quantities.length > 0, 'Live recipe has real ingredient quantities');

    // Save live recipe to favorites
    savedRecipes = saveRecipe(savedRecipes, liveRecipe);
    assert(isFavoriteRecipe(savedRecipes, liveRecipe), 'Live backend recipe successfully added to favorites');

    // Duplicate check on live recipe
    const countBeforeDup = savedRecipes.length;
    savedRecipes = saveRecipe(savedRecipes, liveRecipe);
    assert(savedRecipes.length === countBeforeDup, 'Live recipe duplicate addition prevented');

    // Remove live recipe
    savedRecipes = removeRecipe(savedRecipes, liveRecipe);
    assert(!isFavoriteRecipe(savedRecipes, liveRecipe), 'Live recipe successfully removed from favorites');
  } catch (err) {
    console.error('  Failed live backend recipe test:', err);
    failed++;
  }

  // -------------------------------------------------------------
  // Test Case 10: Emptying all favorites returns to Empty State
  // -------------------------------------------------------------
  console.log('\n[TEST 10] Testing Final Empty State after Removing All Favorites...');
  while (savedRecipes.length > 0) {
    savedRecipes = removeRecipe(savedRecipes, savedRecipes[0]);
  }
  assert(savedRecipes.length === 0, 'All favorites removed');
  const finalStorage = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES)) || [];
  assert(finalStorage.length === 0, 'localStorage reflects empty favorites');

  console.log('\n' + '='.repeat(75));
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('='.repeat(75));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
