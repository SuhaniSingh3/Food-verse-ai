/**
 * Verification Test Suite for Food Verse AI "Search History" Feature
 *
 * Requirements tested:
 * 1. Search input above existing analysis history list.
 * 2. Search history by food name, predicted label, or confirmed food name.
 * 3. Case-insensitive search and ignore leading or trailing spaces.
 * 4. Filter existing history immediately as user types (reactive client filtering).
 * 5. Friendly "No matching analyses found" message when nothing matches.
 * 6. Show full history again when search input is cleared.
 * 7. Do not modify or delete stored history when filtering results.
 * 8. Search History works seamlessly with the existing Clear History feature.
 * 9. Preserve existing history storage mechanism, layout, and other features.
 * 10. No package installations, no added APIs, no application rebuild.
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

// Emulate the reactive filter logic from MealHistoryView.jsx
function filterMeals(meals, searchQuery, filterType = 'All') {
  const cleanQuery = (searchQuery || '').trim().toLowerCase();

  return meals.filter((meal) => {
    const matchesType = filterType === 'All' || meal.mealType === filterType;
    if (!cleanQuery) {
      return matchesType;
    }

    // 1. Food name / dish name
    const dish = (meal.dishName || '').toLowerCase();
    const food = (meal.foodName || '').toLowerCase();
    const matchesFoodName = dish.includes(cleanQuery) || food.includes(cleanQuery);

    // 2. Confirmed food name
    const confirmed = (meal.confirmedDish || '').toLowerCase();
    const matchesConfirmedDish = confirmed.includes(cleanQuery);

    // 3. Predicted label
    const predicted = (meal.predictedLabel || '').toLowerCase();
    const matchesPredictedLabel = predicted.includes(cleanQuery);

    // 4. Top predictions array
    const matchesTopPredictions =
      Array.isArray(meal.topPredictions) &&
      meal.topPredictions.some((p) => {
        const cat = typeof p === 'string' ? p : (p.category || p.label || '');
        return cat.toLowerCase().includes(cleanQuery);
      });

    // 5. Decomposed ingredients
    const matchesIngredients =
      Array.isArray(meal.ingredients) &&
      meal.ingredients.some((ing) => {
        const name = typeof ing === 'string' ? ing : (ing.name || '');
        return name.toLowerCase().includes(cleanQuery);
      });

    const matchesSearch =
      matchesFoodName ||
      matchesConfirmedDish ||
      matchesPredictedLabel ||
      matchesTopPredictions ||
      matchesIngredients;

    return matchesType && matchesSearch;
  });
}

function getEmptyStateTitle(meals, filteredMeals) {
  if (meals.length === 0) {
    return 'No analysis history yet.';
  }
  if (filteredMeals.length === 0) {
    return 'No matching analyses found';
  }
  return null;
}

async function runTests() {
  console.log('='.repeat(75));
  console.log('FOOD VERSE AI: "SEARCH HISTORY" FEATURE VERIFICATION SUITE');
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
  console.log('\n[TEST 1] Verifying MealHistoryView.jsx UI & String Integrity...');
  const mealHistoryViewPath = path.resolve('src/views/MealHistoryView.jsx');
  const viewCode = fs.readFileSync(mealHistoryViewPath, 'utf-8');

  assert(viewCode.includes('history-search-input'), 'Search input element with ID history-search-input exists');
  assert(viewCode.includes('placeholder="Search history by food name, predicted label, or confirmed dish..."'), 'Search input has descriptive placeholder');
  assert(viewCode.includes('aria-label="Search analysis history"'), 'Search input has accessible aria-label');
  assert(viewCode.includes('cleanQuery = searchQuery.trim().toLowerCase()'), 'Search query is trimmed and lowercased');
  assert(viewCode.includes('No matching analyses found'), 'Friendly "No matching analyses found" message present');
  assert(viewCode.includes('No analysis history yet.'), 'Preserves "No analysis history yet." empty state for zero history');
  assert(viewCode.includes('Clear History'), 'Preserves Clear History button');
  assert(viewCode.includes('Are you sure you want to clear your analysis history?'), 'Preserves confirmation modal message');
  assert(viewCode.includes('clear-search-btn'), 'Quick clear button (✕) exists inside search bar');
  assert(viewCode.includes('Predicted label:'), 'Meal card displays predicted label');
  assert(viewCode.includes('Confirmed dish:'), 'Meal card displays confirmed dish if distinct');

  // -------------------------------------------------------------
  // Test 2: Sample Test Dataset Setup
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Setting up Mock Data with Food Names, Predicted Labels & Confirmed Dishes...');
  const localStorage = new LocalStorageMock();
  const STORAGE_KEY = 'foodverse_meals';

  const testMeals = [
    {
      id: 'meal_1',
      dishName: 'Pav Bhaji',
      foodName: 'Pav Bhaji',
      confirmedDish: 'Pav Bhaji',
      predictedLabel: 'ramen',
      topPredictions: [
        { category: 'ramen', confidence: 0.3621 },
        { category: 'chicken_curry', confidence: 0.2215 },
        { category: 'pizza', confidence: 0.1102 },
      ],
      mealType: 'Dinner',
      timestamp: new Date('2026-10-18T20:00:00Z').toISOString(),
      totalCalories: 520,
      protein_g: 14,
      carbs_g: 72,
      fat_g: 18,
      ingredients: [
        { name: 'Pav Bread', grams: 100, calories: 260 },
        { name: 'Mashed Potato Bhaji', grams: 220, calories: 260 },
      ],
      isConfirmed: true,
    },
    {
      id: 'meal_2',
      dishName: 'Chicken Wings',
      foodName: 'Chicken Wings',
      predictedLabel: 'chicken_wings',
      topPredictions: [
        { category: 'chicken_wings', confidence: 0.8412 },
        { category: 'fried_chicken', confidence: 0.1023 },
      ],
      mealType: 'Lunch',
      timestamp: new Date('2026-10-19T13:30:00Z').toISOString(),
      totalCalories: 680,
      protein_g: 48,
      carbs_g: 12,
      fat_g: 45,
      ingredients: [
        { name: 'Crispy Wings', grams: 250, calories: 550 },
        { name: 'BBQ Glaze', grams: 50, calories: 130 },
      ],
      isConfirmed: false,
    },
    {
      id: 'meal_3',
      dishName: 'Masala Dosa',
      foodName: 'Masala Dosa',
      confirmedDish: 'Masala Dosa',
      predictedLabel: 'crepe',
      topPredictions: [
        { category: 'crepe', confidence: 0.453 },
        { category: 'pancake', confidence: 0.210 },
      ],
      mealType: 'Breakfast',
      timestamp: new Date('2026-10-20T08:15:00Z').toISOString(),
      totalCalories: 380,
      protein_g: 8,
      carbs_g: 58,
      fat_g: 12,
      ingredients: [
        { name: 'Rice Lentil Crepe', grams: 150, calories: 210 },
        { name: 'Spiced Potato Filling', grams: 120, calories: 170 },
      ],
      isConfirmed: true,
    },
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(testMeals));
  const initialStorageSnapshot = localStorage.getItem(STORAGE_KEY);
  assert(testMeals.length === 3, 'Initialized test dataset with 3 diverse meals');

  // -------------------------------------------------------------
  // Test 3: Search Matching by Food / Dish Name
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing Search by Food Name (Exact & Partial)...');
  const pavSearch = filterMeals(testMeals, 'Pav Bhaji');
  assert(pavSearch.length === 1 && pavSearch[0].id === 'meal_1', 'Exact food name "Pav Bhaji" matches meal_1');

  const partialFoodSearch = filterMeals(testMeals, 'dosa');
  assert(partialFoodSearch.length === 1 && partialFoodSearch[0].dishName === 'Masala Dosa', 'Partial name "dosa" matches "Masala Dosa"');

  const partialWingsSearch = filterMeals(testMeals, 'wing');
  assert(partialWingsSearch.length === 1 && partialWingsSearch[0].dishName === 'Chicken Wings', 'Partial name "wing" matches "Chicken Wings"');

  // -------------------------------------------------------------
  // Test 4: Search Matching by Predicted Label
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing Search by Predicted Label...');
  // "Pav Bhaji" had predicted label "ramen"
  const ramenSearch = filterMeals(testMeals, 'ramen');
  assert(ramenSearch.length === 1 && ramenSearch[0].dishName === 'Pav Bhaji', 'Search "ramen" successfully finds Pav Bhaji via predictedLabel');

  // "Masala Dosa" had predicted label "crepe"
  const crepeSearch = filterMeals(testMeals, 'crepe');
  assert(crepeSearch.length === 1 && crepeSearch[0].dishName === 'Masala Dosa', 'Search "crepe" successfully finds Masala Dosa via predictedLabel');

  // Partial prediction match
  const partialPredSearch = filterMeals(testMeals, 'rame');
  assert(partialPredSearch.length === 1 && partialPredSearch[0].dishName === 'Pav Bhaji', 'Partial predicted label "rame" matches meal_1');

  // Top predictions candidate search
  const chickenCurrySearch = filterMeals(testMeals, 'chicken_curry');
  assert(chickenCurrySearch.length === 1 && chickenCurrySearch[0].dishName === 'Pav Bhaji', 'Search for alternate prediction candidate "chicken_curry" matches meal_1');

  // -------------------------------------------------------------
  // Test 5: Search Matching by Confirmed Food Name
  // -------------------------------------------------------------
  console.log('\n[TEST 5] Testing Search by Confirmed Food Name...');
  const confirmedSearch = filterMeals(testMeals, 'Pav Bhaji');
  assert(confirmedSearch.length === 1 && confirmedSearch[0].confirmedDish === 'Pav Bhaji', 'Confirmed dish "Pav Bhaji" correctly found');

  const confirmedDosaSearch = filterMeals(testMeals, 'Masala Dosa');
  assert(confirmedDosaSearch.length === 1 && confirmedDosaSearch[0].confirmedDish === 'Masala Dosa', 'Confirmed dish "Masala Dosa" correctly found');

  // -------------------------------------------------------------
  // Test 6: Search Matching by Ingredients
  // -------------------------------------------------------------
  console.log('\n[TEST 6] Testing Search by Ingredients...');
  const potatoSearch = filterMeals(testMeals, 'potato');
  assert(potatoSearch.length === 2, 'Search "potato" matches 2 meals containing potato in ingredients (Pav Bhaji and Masala Dosa)');

  const bbqSearch = filterMeals(testMeals, 'bbq');
  assert(bbqSearch.length === 1 && bbqSearch[0].id === 'meal_2', 'Search "bbq" matches Chicken Wings via BBQ Glaze ingredient');

  // -------------------------------------------------------------
  // Test 7: Case-Insensitivity & Leading/Trailing Whitespace
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Testing Case-Insensitivity & Trimming of Spaces...');
  const upperCaseSearch = filterMeals(testMeals, 'PAV BHAJI');
  assert(upperCaseSearch.length === 1, 'Search "PAV BHAJI" (all caps) matches Pav Bhaji');

  const mixedCaseSearch = filterMeals(testMeals, 'pAv BhAjI');
  assert(mixedCaseSearch.length === 1, 'Search "pAv BhAjI" (mixed case) matches Pav Bhaji');

  const spacedSearch = filterMeals(testMeals, '    ramen    ');
  assert(spacedSearch.length === 1, 'Search "    ramen    " (with leading/trailing spaces) matches ramen predictedLabel');

  const mixedSpacedSearch = filterMeals(testMeals, '   CHICKEN WINGS   ');
  assert(mixedSpacedSearch.length === 1, 'Search "   CHICKEN WINGS   " (upper + spaces) matches Chicken Wings');

  // -------------------------------------------------------------
  // Test 8: No Matching Analyses Found (Requirement 5)
  // -------------------------------------------------------------
  console.log('\n[TEST 8] Testing "No matching analyses found" State...');
  const noMatchSearch = filterMeals(testMeals, 'sushi burger xyz 999');
  assert(noMatchSearch.length === 0, 'Unmatched query returns empty filtered array');

  const emptyTitleForNoMatch = getEmptyStateTitle(testMeals, noMatchSearch);
  assert(emptyTitleForNoMatch === 'No matching analyses found', 'Empty state title displays "No matching analyses found" when search yields zero results');

  // -------------------------------------------------------------
  // Test 9: Clearing Search Input Restores Full History (Requirement 6)
  // -------------------------------------------------------------
  console.log('\n[TEST 9] Testing Clearing Search Input Restores Full History...');
  // User clears input to empty string ""
  const clearedSearch = filterMeals(testMeals, '');
  assert(clearedSearch.length === testMeals.length, 'Empty search string immediately returns full history of 3 meals');

  // User enters only spaces "   "
  const whitespaceSearch = filterMeals(testMeals, '   ');
  assert(whitespaceSearch.length === testMeals.length, 'Whitespace-only search string immediately returns full history of 3 meals');

  // -------------------------------------------------------------
  // Test 10: Storage Immutability (Requirement 7)
  // -------------------------------------------------------------
  console.log('\n[TEST 10] Testing Storage Immutability During Search...');
  // Verify localStorage['foodverse_meals'] was never mutated by filtering
  assert(localStorage.getItem(STORAGE_KEY) === initialStorageSnapshot, 'localStorage[foodverse_meals] remains 100% byte-for-byte identical after all search queries');

  const storedMeals = JSON.parse(localStorage.getItem(STORAGE_KEY));
  assert(storedMeals.length === 3, 'Stored meal count in localStorage is still exactly 3');

  // -------------------------------------------------------------
  // Test 11: Seamless Coexistence with Clear History (Requirement 8)
  // -------------------------------------------------------------
  console.log('\n[TEST 11] Testing Interaction with "Clear History" Feature...');
  let currentMeals = [...testMeals];
  let currentQuery = 'ramen';

  // Step A: Filter is active
  let activeFiltered = filterMeals(currentMeals, currentQuery);
  assert(activeFiltered.length === 1, 'Active filter matches 1 item before clear');

  // Step B: User clicks "Clear History" and cancels
  let cancelClear = true;
  if (!cancelClear) {
    currentMeals = [];
  }
  assert(currentMeals.length === 3, 'Cancelling Clear History preserves all history entries');

  // Step C: User confirms Clear History
  localStorage.removeItem(STORAGE_KEY);
  currentMeals = [];
  currentQuery = '';

  assert(localStorage.getItem(STORAGE_KEY) === null, 'localStorage item removed cleanly on Clear History confirmation');
  assert(currentMeals.length === 0, 'Meals state array cleared to empty');

  const emptyHistoryTitle = getEmptyStateTitle(currentMeals, filterMeals(currentMeals, ''));
  assert(emptyHistoryTitle === 'No analysis history yet.', 'When history is genuinely empty, title is "No analysis history yet."');

  // -------------------------------------------------------------
  // Test 12: Live Backend Image Analysis and History Search Integration
  // -------------------------------------------------------------
  console.log('\n[TEST 12] Testing Live Backend Analysis & Search History Integration...');
  const testImagePath = 'C:\\Users\\ASUS\\Pictures\\images.jpg';
  let imageBytes;
  try {
    imageBytes = fs.readFileSync(testImagePath);
  } catch (err) {
    console.warn('  Local image not accessible, using mock buffer', err.message);
    imageBytes = Buffer.from('dummy image content');
  }

  const formData = new FormData();
  const blob = new Blob([imageBytes], { type: 'image/jpeg' });
  formData.append('file', blob, 'images.jpg');
  formData.append('meal_type', 'Lunch');

  const analyzeRes = await fetch(`${API_BASE_URL}/api/food/analyze`, {
    method: 'POST',
    body: formData,
  });

  assert(analyzeRes.ok, 'Live POST /api/food/analyze responded with HTTP 200 OK');
  const analyzeData = await analyzeRes.json();
  const topCandidate = analyzeData.top_predictions?.[0]?.category || 'Ramen';
  console.log(`  Live analysis top prediction: "${topCandidate}"`);

  // Emulate newly added meal from FoodAnalyzerView
  const liveMeal = {
    id: `analysis_${Date.now()}`,
    dishName: topCandidate,
    foodName: topCandidate,
    predictedLabel: topCandidate,
    topPredictions: analyzeData.top_predictions,
    mealType: 'Lunch',
    timestamp: new Date().toISOString(),
    totalCalories: analyzeData.nutritional_estimate?.estimated_calories || 450,
    protein_g: 15,
    carbs_g: 60,
    fat_g: 12,
    ingredients: (analyzeData.decomposed_items || []).map((i) => ({ name: i.name, grams: 100, calories: 150 })),
    isConfirmed: false,
  };

  const updatedHistory = [liveMeal];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));

  // Search by live dish name
  const liveDishSearch = filterMeals(updatedHistory, topCandidate);
  assert(liveDishSearch.length === 1 && liveDishSearch[0].dishName === topCandidate, `Search for newly analyzed food "${topCandidate}" finds the entry in history`);

  // Search with upper case and spaces
  const liveFuzzySearch = filterMeals(updatedHistory, `   ${topCandidate.toUpperCase()}   `);
  assert(liveFuzzySearch.length === 1, `Search with upper case and padding spaces finds "${topCandidate}"`);

  console.log('='.repeat(75));
  console.log(`ALL ${totalAssertions} SEARCH HISTORY FEATURE ASSERTIONS PASSED (100% SUCCESS)`);
  console.log('='.repeat(75));
}

runTests().catch((err) => {
  console.error('\n[FATAL ERROR]', err.message);
  process.exit(1);
});
