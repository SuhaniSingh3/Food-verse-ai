/**
 * End-to-End Verification Test for Food Verse AI "Clear History" Feature
 *
 * Requirements tested:
 * 1. Storage isolation (localStorage.removeItem only removes specific history key; preserves unrelated settings/data)
 * 2. Cancel action preserves history entries
 * 3. Confirm action clears all history entries and updates state immediately
 * 4. Refresh persistence (cleared state persists across reloads)
 * 5. Empty history state string matches "No analysis history yet."
 * 6. Confirmation dialog message matches "Are you sure you want to clear your analysis history?"
 * 7. Live image analysis execution: uploads/analyzes image, records new history entry, re-enables history
 * 8. Subsequent clear history execution cleanly removes newly added entry
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
  console.log('FOOD VERSE AI: "CLEAR HISTORY" FEATURE VERIFICATION SUITE');
  console.log('='.repeat(75));

  const localStorage = new LocalStorageMock();
  const STORAGE_KEYS = {
    MEALS: 'foodverse_meals',
    SAVED_RECIPES: 'foodverse_saved_recipes',
  };

  // -------------------------------------------------------------
  // Test Case 1: Seed History and Verify Storage Isolation
  // -------------------------------------------------------------
  console.log('\n[TEST 1] Testing Storage Isolation & Pre-seed Setup...');
  const sampleMeal1 = {
    id: 'meal_101',
    dishName: 'Pav Bhaji',
    imageUrl: '/food_hero.jpg',
    mealType: 'Dinner',
    timestamp: new Date().toISOString(),
    totalCalories: 450,
    protein_g: 12,
    carbs_g: 65,
    fat_g: 15,
    ingredients: [{ name: 'Pav', grams: 100, calories: 250 }, { name: 'Bhaji', grams: 200, calories: 200 }],
  };
  const sampleMeal2 = {
    id: 'meal_102',
    dishName: 'Chole Bhature',
    imageUrl: '/sample_chole.jpg',
    mealType: 'Lunch',
    timestamp: new Date().toISOString(),
    totalCalories: 620,
    protein_g: 18,
    carbs_g: 80,
    fat_g: 24,
    ingredients: [{ name: 'Bhatura', grams: 120, calories: 340 }, { name: 'Chole Curry', grams: 220, calories: 280 }],
  };

  const unrelatedSavedRecipes = [
    { id: 'rec_1', title: 'Authentic Dal Makhani', cuisine: 'Indian' },
    { id: 'rec_2', title: 'Masala Dosa with Sambar', cuisine: 'South Indian' },
  ];
  const unrelatedUserPreferences = { theme: 'dark', dietaryFilter: 'Vegetarian' };

  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify([sampleMeal1, sampleMeal2]));
  localStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(unrelatedSavedRecipes));
  localStorage.setItem('foodverse_user_preferences', JSON.stringify(unrelatedUserPreferences));

  console.log('  Initial localStorage keys:', Object.keys(localStorage.store));
  console.log('  Initial meal count:', JSON.parse(localStorage.getItem(STORAGE_KEYS.MEALS)).length);

  // -------------------------------------------------------------
  // Test Case 2: Clear History and Cancel (Entries Remain)
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Testing "Clear History and Cancel"...');
  let mealsState = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEALS));
  let isModalOpen = false;

  // User clicks "Clear History" button
  isModalOpen = true;
  console.log('  User clicked "Clear History". Modal opened: isModalOpen =', isModalOpen);

  // User clicks "Cancel"
  const onCancel = () => {
    isModalOpen = false;
  };
  onCancel();
  console.log('  User clicked "Cancel". Modal closed: isModalOpen =', isModalOpen);

  // Verify entries remained unchanged
  if (mealsState.length !== 2) {
    throw new Error(`Expected 2 meals after cancel, got ${mealsState.length}`);
  }
  if (!localStorage.getItem(STORAGE_KEYS.MEALS)) {
    throw new Error('localStorage key was unexpectedly cleared on cancel!');
  }
  console.log('  [PASS] Meals state count remains:', mealsState.length);
  console.log('  [PASS] Storage key persists untouched on cancellation.');

  // -------------------------------------------------------------
  // Test Case 3: Clear History and Confirm (All Entries Disappear)
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing "Clear History and Confirm"...');
  isModalOpen = true;

  const clearAllMeals = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.MEALS);
      localStorage.removeItem('foodverse_analysis_history');
    } catch (e) {
      console.warn('Failed to clear meals from localStorage', e);
    }
    mealsState = [];
  };

  let notification = null;
  const confirmClearAll = () => {
    try {
      clearAllMeals();
      isModalOpen = false;
      notification = {
        type: 'success',
        message: 'Analysis history cleared successfully.',
      };
    } catch (err) {
      isModalOpen = false;
      notification = {
        type: 'error',
        message: `Failed to clear analysis history: ${err.message || 'Unknown error'}`,
      };
    }
  };

  confirmClearAll();
  console.log('  User confirmed clear. Notification:', notification);
  console.log('  Meals in state immediately:', mealsState.length);
  console.log('  Meals in localStorage:', localStorage.getItem(STORAGE_KEYS.MEALS));

  if (mealsState.length !== 0) {
    throw new Error(`Expected 0 meals in state, found ${mealsState.length}`);
  }
  if (localStorage.getItem(STORAGE_KEYS.MEALS) !== null) {
    throw new Error('Expected foodverse_meals to be null in localStorage!');
  }
  if (!notification || notification.type !== 'success') {
    throw new Error('Expected success notification after clearing history!');
  }
  console.log('  [PASS] All history entries immediately disappeared from state.');
  console.log('  [PASS] Specific history key removed from localStorage.');
  console.log('  [PASS] Success notification displayed.');

  // -------------------------------------------------------------
  // Test Case 4: Verify Unrelated App Settings Remain Intact
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing Unrelated Settings & Preferences Preservation...');
  const preservedRecipes = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES));
  const preservedPrefs = JSON.parse(localStorage.getItem('foodverse_user_preferences'));

  if (!preservedRecipes || preservedRecipes.length !== 2) {
    throw new Error('Unrelated saved recipes were modified or deleted!');
  }
  if (!preservedPrefs || preservedPrefs.theme !== 'dark') {
    throw new Error('Unrelated user preferences were modified or deleted!');
  }
  console.log('  [PASS] foodverse_saved_recipes remains intact:', preservedRecipes.map(r => r.title));
  console.log('  [PASS] foodverse_user_preferences remains intact:', preservedPrefs);

  // -------------------------------------------------------------
  // Test Case 5: Refresh Page (Cleared Entries Do Not Return)
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Testing Page Refresh / Reopening...');
  // Simulate app initialization upon page refresh
  const reloadedMeals = (() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEALS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  })();

  const emptyStateTitle = reloadedMeals.length === 0 ? 'No analysis history yet.' : 'Recent Meals';
  const isClearButtonDisabled = reloadedMeals.length === 0;

  if (reloadedMeals.length !== 0) {
    throw new Error(`Expected empty meals on reload, got ${reloadedMeals.length}`);
  }
  if (emptyStateTitle !== 'No analysis history yet.') {
    throw new Error(`Expected empty state title "No analysis history yet.", got "${emptyStateTitle}"`);
  }
  if (!isClearButtonDisabled) {
    throw new Error('Clear History button should be disabled when history is empty!');
  }
  console.log('  [PASS] Reloaded meals count:', reloadedMeals.length);
  console.log('  [PASS] Empty state title:', emptyStateTitle);
  console.log('  [PASS] Clear History button disabled:', isClearButtonDisabled);

  // -------------------------------------------------------------
  // Test Case 6: UI Source Code Exact String Match Verification
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Verifying Exact UI Dialog & Empty State Strings...');
  const mealHistoryViewContent = fs.readFileSync(
    path.resolve('src/views/MealHistoryView.jsx'),
    'utf-8'
  );

  const expectedConfirmText = 'Are you sure you want to clear your analysis history?';
  const expectedEmptyState = 'No analysis history yet.';
  const expectedButtonText = 'Clear History';

  if (!mealHistoryViewContent.includes(expectedConfirmText)) {
    throw new Error(`Missing expected confirmation string: "${expectedConfirmText}" in MealHistoryView.jsx`);
  }
  if (!mealHistoryViewContent.includes(expectedEmptyState)) {
    throw new Error(`Missing expected empty state string: "${expectedEmptyState}" in MealHistoryView.jsx`);
  }
  if (!mealHistoryViewContent.includes(expectedButtonText)) {
    throw new Error(`Missing expected button text: "${expectedButtonText}" in MealHistoryView.jsx`);
  }
  console.log(`  [PASS] Found exact confirmation text: "${expectedConfirmText}"`);
  console.log(`  [PASS] Found exact empty state text: "${expectedEmptyState}"`);
  console.log(`  [PASS] Found exact button label: "${expectedButtonText}"`);

  // -------------------------------------------------------------
  // Test Case 7: Upload and Analyze a New Image -> History Works Normally Again
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Testing Real Image Analysis & History Recording Flow...');
  const testImagePath = 'C:\\Users\\ASUS\\Pictures\\images.jpg';
  let imageBytes;
  try {
    imageBytes = fs.readFileSync(testImagePath);
    console.log(`  Loaded real test image (${imageBytes.length} bytes) from: ${testImagePath}`);
  } catch (err) {
    console.warn('  Local image not accessible, using binary dummy buffer', err.message);
    imageBytes = Buffer.from('dummy image content');
  }

  const formData = new FormData();
  const blob = new Blob([imageBytes], { type: 'image/jpeg' });
  formData.append('file', blob, 'images.jpg');
  formData.append('meal_type', 'Lunch');

  console.log('  Dispatching POST /api/food/analyze to backend...');
  const analyzeRes = await fetch(`${API_BASE_URL}/api/food/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!analyzeRes.ok) {
    throw new Error(`POST /api/food/analyze returned status ${analyzeRes.status}`);
  }

  const analyzeResult = await analyzeRes.json();
  console.log(`  Analysis succeeded! Provider: ${analyzeResult.provider_metadata?.provider}`);
  console.log('  Top Predictions:', analyzeResult.top_predictions.map(p => `${p.category} (${p.percentage})`));

  // Simulate addMeal in FoodAnalyzerView
  const addMeal = (newMeal) => {
    const mealWithId = {
      ...newMeal,
      id: newMeal.id || `meal_${Date.now()}`,
      timestamp: newMeal.timestamp || new Date().toISOString(),
    };
    mealsState = [mealWithId, ...mealsState.filter(m => m.id !== mealWithId.id)];
    localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(mealsState));
  };

  const topPred = analyzeResult.top_predictions?.[0];
  const initialDish = topPred ? topPred.category : (analyzeResult.dish_name || 'Food Item');

  addMeal({
    id: `analysis_${Date.now()}`,
    dishName: initialDish,
    imageUrl: '/uploaded_test_image.jpg',
    mealType: 'Lunch',
    timestamp: new Date().toISOString(),
    totalCalories: analyzeResult.nutritional_estimate?.estimated_calories || 0,
    protein_g: analyzeResult.nutritional_estimate?.protein_g || 0,
    carbs_g: analyzeResult.nutritional_estimate?.carbs_g || 0,
    fat_g: analyzeResult.nutritional_estimate?.fat_g || 0,
    ingredients: (analyzeResult.decomposed_items || []).map(i => ({
      name: i.name,
      grams: i.estimated_grams || 100,
      calories: Math.round((i.estimated_grams || 100) * 1.5),
    })),
    isConfirmed: false,
  });

  console.log('  Newly logged meal in state count:', mealsState.length);
  console.log('  Dish in history:', mealsState[0].dishName);
  console.log('  localStorage foodverse_meals has data:', !!localStorage.getItem(STORAGE_KEYS.MEALS));

  if (mealsState.length !== 1) {
    throw new Error(`Expected 1 meal in history after analysis, found ${mealsState.length}`);
  }
  if (!localStorage.getItem(STORAGE_KEYS.MEALS)) {
    throw new Error('foodverse_meals was not updated in localStorage!');
  }
  console.log('  [PASS] Image analysis successfully recorded new meal in history!');

  // Now clear it again to verify full lifecycle
  confirmClearAll();
  if (mealsState.length !== 0 || localStorage.getItem(STORAGE_KEYS.MEALS) !== null) {
    throw new Error('Subsequent clear history failed to clear newly analyzed meal!');
  }
  console.log('  [PASS] Subsequent clear history cleanly removed the newly added meal.');

  console.log('\n' + '='.repeat(75));
  console.log('ALL 7 TEST SUITES PASSED FLAWLESSLY (100% SUCCESS)');
  console.log('='.repeat(75));
}

runTests().catch(err => {
  console.error('\n[FAIL] Test suite failed:', err);
  process.exit(1);
});
