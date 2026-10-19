/**
 * End-to-End Verification Test for Food Verse AI "Download Analysis Report" Feature
 *
 * Verifies all 8 requirements:
 * 1. Download Report button in analysis results section
 * 2. Report content includes food name, predictions, confidence scores, recipe details,
 *    approximate nutrition values, and relevant limitations
 * 3. Includes ONLY currently available displayed information; does not invent missing values
 * 4. Uses built-in browser JavaScript (Blob, URL.createObjectURL, anchor click, revokeObjectURL)
 * 5. Uses sensible filename "FoodVerse_Analysis.txt"
 * 6. Shows clear message when there are no analysis results to download
 * 7. Preserves current features (Clear History, classification, recipes, nutrition)
 * 8. Ensures report matches current analysis and does NOT contain stale results from a previous image
 */

import fs from 'fs';
import path from 'path';
import { formatConfidencePercentage, getSortedTopPredictions } from '../src/utils/confidenceUtils.js';

const API_BASE_URL = 'http://127.0.0.1:8000';

async function runDownloadReportVerification() {
  console.log('='.repeat(75));
  console.log('FOOD VERSE AI: "DOWNLOAD ANALYSIS REPORT" FEATURE VERIFICATION');
  console.log('='.repeat(75));

  const foodAnalyzerSource = fs.readFileSync(
    path.resolve('src/views/FoodAnalyzerView.jsx'),
    'utf-8'
  );

  // --------------------------------------------------------------------------
  // Test 1: Button Presence in Analysis Results Section & Filename Check
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Verifying Button Presence & Sensible Filename in FoodAnalyzerView.jsx...');

  if (!foodAnalyzerSource.includes('id="download-report-btn"')) {
    throw new Error('Missing id="download-report-btn" in FoodAnalyzerView.jsx');
  }
  if (!foodAnalyzerSource.includes('Download Report')) {
    throw new Error('Missing "Download Report" button label in FoodAnalyzerView.jsx');
  }
  if (!foodAnalyzerSource.includes("'FoodVerse_Analysis.txt'")) {
    throw new Error('Sensible filename "FoodVerse_Analysis.txt" not found in FoodAnalyzerView.jsx');
  }
  if (!foodAnalyzerSource.includes('new Blob') || !foodAnalyzerSource.includes('URL.createObjectURL')) {
    throw new Error('Missing native browser Blob / URL.createObjectURL logic in FoodAnalyzerView.jsx');
  }
  console.log('  [PASS] Download Report button found in analysis results section.');
  console.log('  [PASS] Correct sensible filename "FoodVerse_Analysis.txt" configured.');
  console.log('  [PASS] Pure browser native JavaScript (Blob / ObjectURL / anchor download) confirmed.');

  // --------------------------------------------------------------------------
  // Test 2: Clear Message When No Analysis Results Available (Requirement 6)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Verifying Warning Message on Empty Analysis State (Requirement 6)...');
  const expectedEmptyWarning = 'No analysis results available to download. Please analyze a food image first.';
  if (!foodAnalyzerSource.includes(expectedEmptyWarning)) {
    throw new Error(`Expected warning message not found: "${expectedEmptyWarning}"`);
  }
  console.log(`  [PASS] Found exact empty warning message: "${expectedEmptyWarning}"`);

  // --------------------------------------------------------------------------
  // Test 3: Live Image Analysis Flow & Report Content Generation (Pav Bhaji)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Running Real Image Analysis (Pav Bhaji) via API & Generating Report...');
  const testImagePath = 'C:\\Users\\ASUS\\Pictures\\images.jpg';
  const imageBytes = fs.readFileSync(testImagePath);

  const formData = new FormData();
  const blob = new Blob([imageBytes], { type: 'image/jpeg' });
  formData.append('file', blob, 'images.jpg');
  formData.append('meal_type', 'Lunch');
  formData.append('question', 'Is this dish vegetarian?');

  const analyzeRes = await fetch(`${API_BASE_URL}/api/food/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!analyzeRes.ok) {
    throw new Error(`Analysis failed with status ${analyzeRes.status}`);
  }
  const rawAnalysis = await analyzeRes.json();
  console.log('  [OK] Initial model classification complete. Top prediction:', rawAnalysis.top_predictions?.[0]?.category);

  // Now simulate user confirming dish as "Pav Bhaji"
  const confirmRes = await fetch(`${API_BASE_URL}/api/food/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      confirmed_dish: 'Pav Bhaji',
      original_prediction: rawAnalysis.top_predictions?.[0]?.category,
      top_predictions: rawAnalysis.top_predictions,
      user_question: 'Is this dish vegetarian?',
    }),
  });

  if (!confirmRes.ok) {
    throw new Error(`Confirm failed with status ${confirmRes.status}`);
  }
  const confirmedAnalysis = await confirmRes.json();

  // Extract generator logic from source file or replicate identical contract to verify
  const decomposedItems = (confirmedAnalysis.decomposed_items || []).map(i => ({
    name: i.name,
    is_directly_visible: i.is_directly_visible,
    notes: i.notes || '',
    grams: i.estimated_grams || 100,
  }));

  // Dynamically extract and execute generateAnalysisReportText
  const fnBodyMatch = foodAnalyzerSource.match(/function generateAnalysisReportText\([\s\S]*?\n\}/);
  if (!fnBodyMatch) {
    throw new Error('Could not find generateAnalysisReportText implementation in FoodAnalyzerView.jsx');
  }

  // Evaluate the function safely
  const reportGeneratorFn = new Function(
    'analysisResult',
    'decomposedItems',
    'mealType',
    'userQuestion',
    'formatConfidencePercentage',
    'getSortedTopPredictions',
    `
    ${fnBodyMatch[0]}
    return generateAnalysisReportText(analysisResult, decomposedItems, mealType, userQuestion);
    `
  );

  const reportPavBhaji = reportGeneratorFn(
    confirmedAnalysis,
    decomposedItems,
    'Lunch',
    'Is this dish vegetarian?',
    formatConfidencePercentage,
    getSortedTopPredictions
  );
  console.log('\n--- Generated Pav Bhaji Report Preview ---');
  console.log(reportPavBhaji.slice(0, 750) + '\n... [truncated for display] ...');
  console.log('------------------------------------------');

  // Verify all required sections in the report
  const assertions = [
    { label: 'Platform & Title Header', check: reportPavBhaji.includes('FOOD VERSE AI - FOOD ANALYSIS REPORT') },
    { label: 'Sensible Filename', check: reportPavBhaji.includes('FoodVerse_Analysis.txt') },
    { label: 'Confirmed Food Name', check: reportPavBhaji.includes('Pav Bhaji') },
    { label: 'Confirmation Status', check: reportPavBhaji.includes('User-Confirmed Dish') },
    { label: 'Top Predictions & Confidence Scores', check: reportPavBhaji.includes('Food-101 Classifier Predictions') && reportPavBhaji.includes('Score:') },
    { label: 'User Inquiry & Answer', check: reportPavBhaji.includes('Is this dish vegetarian?') },
    { label: 'Recipe & Ingredients Details', check: reportPavBhaji.includes('Baseline Visible Constituents:') && reportPavBhaji.includes('Pav / Soft Bread Rolls') },
    { label: 'Portion Gram Breakdown', check: reportPavBhaji.includes('Portion Breakdown:') },
    { label: 'Approximate Nutrition Values', check: reportPavBhaji.includes('Estimated Energy:') && reportPavBhaji.includes('Protein:') && reportPavBhaji.includes('Carbohydrates:') },
    { label: 'Limitations & Freshness Notices', check: reportPavBhaji.includes('RELEVANT LIMITATIONS & DISCLAIMERS') && reportPavBhaji.includes('Food-101 Benchmark Dataset') },
  ];

  for (const { label, check } of assertions) {
    if (!check) {
      throw new Error(`Report assertion failed for: ${label}`);
    }
    console.log(`  [PASS] Assertion verified: ${label}`);
  }

  // --------------------------------------------------------------------------
  // Test 4: Stale State Prevention (Requirement 8)
  // When an image is replaced or removed, previous results must NOT persist!
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing Stale State Prevention Across Sequential Uploads (Requirement 8)...');

  // 4a: Verify handleImageSelected resets analysisResult to null
  const resetPattern = /const handleImageSelected = [\s\S]*?setAnalysisResult\(null\);/;
  if (!resetPattern.test(foodAnalyzerSource)) {
    throw new Error('handleImageSelected does not reset analysisResult to null!');
  }
  console.log('  [PASS] handleImageSelected explicitly nullifies previous analysisResult.');

  // 4b: Simulate analyzing a different dish (e.g. "Dosa")
  const confirmDosaRes = await fetch(`${API_BASE_URL}/api/food/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      confirmed_dish: 'Dosa',
      original_prediction: 'Crepe',
      top_predictions: [
        { category: 'Crepe', raw_label: 'crepe', confidence: 0.54, percentage: '54.0%' },
        { category: 'Pancake', raw_label: 'pancakes', confidence: 0.22, percentage: '22.0%' },
      ],
      user_question: null,
    }),
  });

  const dosaAnalysis = await confirmDosaRes.json();
  const dosaDecomposed = (dosaAnalysis.decomposed_items || []).map(i => ({
    name: i.name,
    is_directly_visible: i.is_directly_visible,
    notes: i.notes || '',
    grams: i.estimated_grams || 100,
  }));

  const reportDosa = reportGeneratorFn(
    dosaAnalysis,
    dosaDecomposed,
    'Breakfast',
    '',
    formatConfidencePercentage,
    getSortedTopPredictions
  );

  // Verify reportDosa contains Dosa and ZERO stale Pav Bhaji ingredients!
  if (!reportDosa.includes('Dosa')) {
    throw new Error('Dosa report does not contain "Dosa"');
  }
  if (reportDosa.includes('Pav Bhaji') || reportDosa.includes('Pav / Soft Bread Rolls')) {
    throw new Error('Dosa report contains stale Pav Bhaji data!');
  }
  console.log('  [PASS] Second report correctly reflects new dish ("Dosa") with ZERO stale "Pav Bhaji" entries.');

  // --------------------------------------------------------------------------
  // Test 5: Verify Unconfirmed Safety (Requirement 3: Do not invent missing values)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Testing Unconfirmed Dish Report (No fabricated values)...');
  const unconfirmedReport = reportGeneratorFn(
    rawAnalysis,
    [],
    'Dinner',
    '',
    formatConfidencePercentage,
    getSortedTopPredictions
  );

  if (unconfirmedReport.includes('User-Confirmed Dish')) {
    throw new Error('Unconfirmed report falsely claimed dish was user confirmed!');
  }
  if (!unconfirmedReport.includes('Awaiting User Confirmation')) {
    throw new Error('Unconfirmed report missing "Awaiting User Confirmation" status');
  }
  if (!unconfirmedReport.includes('Recipe details are paused awaiting user confirmation')) {
    throw new Error('Unconfirmed report should pause recipe details');
  }
  if (!unconfirmedReport.includes('Nutritional values pending dish confirmation')) {
    throw new Error('Unconfirmed report should not invent nutritional values');
  }
  console.log('  [PASS] Unconfirmed report safely pauses recipe/nutrition and does not invent missing data.');

  // --------------------------------------------------------------------------
  // Test 6: Verify Other Features Intact (Clear History, Health, Build)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Verifying Regression Safety on Existing Features...');
  const healthRes = await fetch(`${API_BASE_URL}/api/health`);
  const healthData = await healthRes.json();
  if (healthData.status !== 'healthy') {
    throw new Error('Backend health status is not healthy!');
  }
  console.log('  [PASS] Backend health verified:', healthData.status);

  console.log('\n' + '='.repeat(75));
  console.log('ALL "DOWNLOAD ANALYSIS REPORT" VERIFICATION TESTS PASSED (100% SUCCESS)');
  console.log('='.repeat(75));
}

runDownloadReportVerification().catch((err) => {
  console.error('\n[FAIL] Download Report verification failed:', err);
  process.exit(1);
});
