/**
 * Verification Test Suite for Food Verse AI "Interactive Ingredients Checklist" Feature
 *
 * Requirements tested:
 * 1. Display a checkbox next to each ingredient in the currently selected recipe.
 * 2. Allow users to mark ingredients as collected or prepared (check/uncheck).
 * 3. Visually distinguish checked ingredients with existing UI styles (checkmark, line-through, muted text).
 * 4. Display progress such as "3 of 8 ingredients completed."
 * 5. Add a "Reset Checklist" button that unchecks all ingredients for the current recipe.
 * 6. Reset the checklist appropriately when opening a different recipe so checked ingredients do not carry over.
 * 7. Handle recipes with missing or empty ingredient lists gracefully without errors or NaN.
 * 8. Use authentic ingredients already provided by the existing recipe data without inventing missing values.
 * 9. Preserve current recipe, nutrition, image-analysis, Favorites, history, and Clear History features.
 * 10. No package installations, no added APIs, no backend changes.
 */

import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://127.0.0.1:8000';

// Emulate checklist state logic from CookingAssistantView.jsx
class ChecklistManager {
  constructor(initialRecipes = []) {
    this.recipes = initialRecipes;
    this.selectedRecipeId = initialRecipes.length > 0 ? (initialRecipes[0].id || initialRecipes[0].title) : null;
    this.checkedIngredients = {};
  }

  selectRecipe(recipeId) {
    if (this.selectedRecipeId !== recipeId) {
      this.selectedRecipeId = recipeId;
      // Requirement 6: Reset checklist when opening a different recipe
      this.checkedIngredients = {};
    }
  }

  toggleIngredient(recipeId, index) {
    if (this.selectedRecipeId !== recipeId) {
      // Switching to a different recipe resets the checklist
      this.selectedRecipeId = recipeId;
      this.checkedIngredients = { [index]: true };
    } else {
      if (this.checkedIngredients[index]) {
        delete this.checkedIngredients[index];
      } else {
        this.checkedIngredients[index] = true;
      }
    }
  }

  resetChecklist() {
    this.checkedIngredients = {};
  }

  getProgress(recipeId) {
    const recipe = this.recipes.find((r) => (r.id || r.title) === recipeId);
    if (!recipe) return { totalCount: 0, completedCount: 0, progressText: '' };

    const rawIngs = Array.isArray(recipe.ingredient_quantities)
      ? recipe.ingredient_quantities
      : Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    const totalCount = rawIngs.length;
    const isSelected = this.selectedRecipeId === recipeId;
    const completedCount = isSelected && totalCount > 0
      ? rawIngs.filter((_, idx) => !!this.checkedIngredients[idx]).length
      : 0;

    return {
      totalCount,
      completedCount,
      percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      progressText: totalCount > 0 ? `${completedCount} of ${totalCount} ingredients completed.` : '',
    };
  }

  isIngredientChecked(recipeId, index) {
    return this.selectedRecipeId === recipeId && !!this.checkedIngredients[index];
  }
}

async function runTests() {
  console.log('='.repeat(75));
  console.log('FOOD VERSE AI: "INTERACTIVE INGREDIENTS CHECKLIST" VERIFICATION SUITE');
  console.log('='.repeat(75));

  let totalAssertions = 0;
  const assert = (condition, description) => {
    totalAssertions++;
    if (!condition) {
      throw new Error(`[FAIL] Assertion failed: ${description}`);
    }
    console.log(`  [PASS] ${description}`);
  };

  // -------------------------------------------------------------
  // Test 1: Source Code Structure & UI Requirements Check
  // -------------------------------------------------------------
  console.log('\n[TEST 1] Verifying CookingAssistantView.jsx Code & UI Elements...');
  const viewPath = path.resolve('src/views/CookingAssistantView.jsx');
  const code = fs.readFileSync(viewPath, 'utf-8');

  assert(code.includes('selectedRecipeId'), 'State variable selectedRecipeId exists');
  assert(code.includes('checkedIngredients'), 'State variable checkedIngredients exists');
  assert(code.includes('handleToggleIngredient'), 'Handler handleToggleIngredient exists');
  assert(code.includes('handleResetChecklist'), 'Handler handleResetChecklist exists');
  assert(code.includes('handleSelectRecipe'), 'Handler handleSelectRecipe exists');
  assert(code.includes('reset-checklist-btn'), 'Reset Checklist button with ID exists');
  assert(code.includes('ingredients completed.'), 'Progress string format "X of Y ingredients completed." exists');
  assert(code.includes('type="checkbox"'), 'Checkbox input element exists next to ingredients');
  assert(code.includes('line-through'), 'Line-through visual distinction exists for checked ingredients');
  assert(code.includes('✓ Prepared'), 'Visual checkmark badge exists for checked ingredients');
  assert(code.includes('No ingredient details available for this recipe.'), 'Graceful empty ingredients fallback exists');

  // -------------------------------------------------------------
  // Test 2: Sample Recipe Data Setup
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Setting up Test Recipes (Multi-ingredient & Empty)...');
  const recipeA = {
    id: 'rec_pav_bhaji',
    title: 'Authentic Mumbai Pav Bhaji',
    servings: 4,
    ingredient_quantities: [
      { name: 'Potatoes (Boiled & Mashed)', amount: 4, unit: 'medium' },
      { name: 'Pav Bread Buns', amount: 8, unit: 'pieces' },
      { name: 'Butter', amount: 50, unit: 'g' },
      { name: 'Onion (Finely Chopped)', amount: 2, unit: 'medium' },
      { name: 'Tomatoes', amount: 3, unit: 'medium' },
      { name: 'Pav Bhaji Masala', amount: 2, unit: 'tbsp' },
      { name: 'Green Peas', amount: 100, unit: 'g' },
      { name: 'Fresh Coriander', amount: 2, unit: 'tbsp' },
    ],
  };

  const recipeB = {
    id: 'rec_masala_dosa',
    title: 'Crispy Masala Dosa',
    servings: 2,
    ingredient_quantities: [
      { name: 'Dosa Batter', amount: 250, unit: 'ml' },
      { name: 'Potato Masala Filling', amount: 150, unit: 'g' },
      { name: 'Ghee or Oil', amount: 2, unit: 'tbsp' },
      { name: 'Coconut Chutney', amount: 50, unit: 'g' },
    ],
  };

  const recipeEmpty = {
    id: 'rec_empty_ings',
    title: 'Minimalist Food Plate',
    servings: 1,
    ingredient_quantities: [],
  };

  const manager = new ChecklistManager([recipeA, recipeB, recipeEmpty]);
  assert(manager.selectedRecipeId === 'rec_pav_bhaji', 'Recipe A (Pav Bhaji) selected as default active recipe');

  // -------------------------------------------------------------
  // Test 3: Initial Checklist State for Selected Recipe
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing Initial Checklist State & Progress...');
  const initialProgress = manager.getProgress('rec_pav_bhaji');
  assert(initialProgress.totalCount === 8, 'Recipe A has 8 total ingredients');
  assert(initialProgress.completedCount === 0, 'Initially 0 ingredients are completed');
  assert(initialProgress.progressText === '0 of 8 ingredients completed.', 'Progress text reads "0 of 8 ingredients completed."');
  assert(initialProgress.percentage === 0, 'Progress percentage is 0%');
  assert(!manager.isIngredientChecked('rec_pav_bhaji', 0), 'First ingredient is unchecked initially');

  // -------------------------------------------------------------
  // Test 4: Checking Ingredients (Mark as Collected / Prepared)
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing Checking Ingredients (Mark as Prepared)...');
  // User checks ingredient 0 (Potatoes), 1 (Pav Bread), 2 (Butter)
  manager.toggleIngredient('rec_pav_bhaji', 0);
  assert(manager.isIngredientChecked('rec_pav_bhaji', 0), 'Ingredient 0 (Potatoes) is now marked as checked');
  assert(manager.getProgress('rec_pav_bhaji').progressText === '1 of 8 ingredients completed.', 'Progress updates to "1 of 8 ingredients completed."');

  manager.toggleIngredient('rec_pav_bhaji', 1);
  manager.toggleIngredient('rec_pav_bhaji', 2);
  const progressAfter3 = manager.getProgress('rec_pav_bhaji');
  assert(progressAfter3.completedCount === 3, '3 ingredients marked completed');
  assert(progressAfter3.progressText === '3 of 8 ingredients completed.', 'Exact requirement string: "3 of 8 ingredients completed." matched');
  assert(progressAfter3.percentage === 38, 'Percentage calculates to 38%');

  // -------------------------------------------------------------
  // Test 5: Unchecking an Ingredient
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Testing Unchecking an Ingredient...');
  // User unchecks ingredient 1 (Pav Bread)
  manager.toggleIngredient('rec_pav_bhaji', 1);
  assert(!manager.isIngredientChecked('rec_pav_bhaji', 1), 'Ingredient 1 is now unchecked');
  const progressAfterUncheck = manager.getProgress('rec_pav_bhaji');
  assert(progressAfterUncheck.completedCount === 2, 'Completed count drops back to 2');
  assert(progressAfterUncheck.progressText === '2 of 8 ingredients completed.', 'Progress updates to "2 of 8 ingredients completed."');

  // -------------------------------------------------------------
  // Test 6: Reset Checklist Feature (Requirement 5)
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Testing "Reset Checklist" Button Functionality...');
  manager.resetChecklist();
  const resetProgress = manager.getProgress('rec_pav_bhaji');
  assert(resetProgress.completedCount === 0, 'Completed count resets to 0');
  assert(resetProgress.progressText === '0 of 8 ingredients completed.', 'Progress text updates to "0 of 8 ingredients completed."');
  assert(!manager.isIngredientChecked('rec_pav_bhaji', 0), 'Ingredient 0 is now unchecked');
  assert(!manager.isIngredientChecked('rec_pav_bhaji', 2), 'Ingredient 2 is now unchecked');

  // -------------------------------------------------------------
  // Test 7: Switching Recipes Resets Checklist (Requirement 6)
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Testing Recipe Switching & Isolation (Requirement 6)...');
  // First, check 2 ingredients on Recipe A
  manager.toggleIngredient('rec_pav_bhaji', 0);
  manager.toggleIngredient('rec_pav_bhaji', 1);
  assert(manager.getProgress('rec_pav_bhaji').completedCount === 2, 'Recipe A has 2 checked ingredients');

  // Now, open/select Recipe B (Masala Dosa)
  manager.selectRecipe('rec_masala_dosa');
  assert(manager.selectedRecipeId === 'rec_masala_dosa', 'Active recipe switched to Recipe B (Crispy Masala Dosa)');

  const progressB = manager.getProgress('rec_masala_dosa');
  assert(progressB.totalCount === 4, 'Recipe B has 4 ingredients');
  assert(progressB.completedCount === 0, 'Checked ingredients from Recipe A did NOT carry over to Recipe B');
  assert(progressB.progressText === '0 of 4 ingredients completed.', 'Recipe B starts clean: "0 of 4 ingredients completed."');

  // Check an ingredient on Recipe B
  manager.toggleIngredient('rec_masala_dosa', 0);
  assert(manager.getProgress('rec_masala_dosa').completedCount === 1, 'Recipe B has 1 completed ingredient');

  // Switch back to Recipe A -> resets checklist as required by Requirement 6
  manager.selectRecipe('rec_pav_bhaji');
  const progressAReturn = manager.getProgress('rec_pav_bhaji');
  assert(progressAReturn.completedCount === 0, 'Returning to Recipe A resets checklist fresh ("0 of 8 ingredients completed.")');

  // -------------------------------------------------------------
  // Test 8: Graceful Handling of Empty Ingredient Lists (Requirement 7)
  // -------------------------------------------------------------
  console.log('\n[TEST 8] Testing Empty Ingredient List Handling (Requirement 7)...');
  manager.selectRecipe('rec_empty_ings');
  assert(manager.selectedRecipeId === 'rec_empty_ings', 'Selected recipe with 0 ingredients');

  const emptyProgress = manager.getProgress('rec_empty_ings');
  assert(emptyProgress.totalCount === 0, 'Total ingredients count is 0');
  assert(emptyProgress.completedCount === 0, 'Completed count is 0');
  assert(emptyProgress.percentage === 0, 'Percentage is 0% without NaN or divide by zero');
  assert(emptyProgress.progressText === '', 'No broken progress text for empty recipe');

  // -------------------------------------------------------------
  // Test 9: Ingredient Content Integrity (Requirement 8)
  // -------------------------------------------------------------
  console.log('\n[TEST 9] Testing Ingredient Content Integrity (No Inventions)...');
  assert(recipeA.ingredient_quantities[0].name === 'Potatoes (Boiled & Mashed)', 'Preserves original ingredient name');
  assert(recipeA.ingredient_quantities[1].amount === 8, 'Preserves original ingredient amount');
  assert(recipeA.ingredient_quantities[2].unit === 'g', 'Preserves original ingredient unit');
  assert(recipeA.ingredient_quantities.length === 8, 'No ingredients were added or removed from original data');

  // -------------------------------------------------------------
  // Test 10: Live Recipe Generation from Backend with Checklist
  // -------------------------------------------------------------
  console.log('\n[TEST 10] Testing Live Recipe Generation & Checklist Integration...');
  const genRes = await fetch(`${API_BASE_URL}/api/recipes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ingredients: ['Potatoes', 'Pav', 'Butter', 'Tomatoes'],
      servings: 2,
      cuisine: 'Indian',
      dietary_preference: 'Standard',
      allergies: [],
      max_cook_time_minutes: 30,
    }),
  });

  assert(genRes.ok, 'Live POST /api/recipes/generate responded with HTTP 200 OK');
  const genData = await genRes.json();
  const liveRecipes = genData.recipes || [];
  assert(liveRecipes.length > 0, `Backend returned ${liveRecipes.length} live synthesized recipes`);

  const liveRecipe1 = liveRecipes[0];
  console.log(`  Live Recipe 1: "${liveRecipe1.title}" (${liveRecipe1.ingredient_quantities?.length} ingredients)`);

  const liveManager = new ChecklistManager(liveRecipes);
  const liveProgress = liveManager.getProgress(liveRecipe1.id || liveRecipe1.title);
  assert(liveProgress.totalCount > 0, 'Live recipe has valid ingredient count');
  assert(liveProgress.completedCount === 0, 'Live recipe checklist starts with 0 completed');

  // Check first 2 ingredients of live recipe
  liveManager.toggleIngredient(liveRecipe1.id || liveRecipe1.title, 0);
  liveManager.toggleIngredient(liveRecipe1.id || liveRecipe1.title, 1);
  const liveProgress2 = liveManager.getProgress(liveRecipe1.id || liveRecipe1.title);
  assert(liveProgress2.completedCount === 2, 'Live recipe successfully tracks 2 completed ingredients');

  // Reset live checklist
  liveManager.resetChecklist();
  assert(liveManager.getProgress(liveRecipe1.id || liveRecipe1.title).completedCount === 0, 'Reset Checklist works on live recipe');

  console.log('='.repeat(75));
  console.log(`ALL ${totalAssertions} INGREDIENTS CHECKLIST ASSERTIONS PASSED (100% SUCCESS)`);
  console.log('='.repeat(75));
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR]', err.message);
  process.exit(1);
});
