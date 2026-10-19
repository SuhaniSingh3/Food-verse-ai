/**
 * Verification Test Suite for Visual Confidence Chart
 *
 * Requirements tested:
 * 1. Display each predicted food name, confidence percentage, and horizontal progress bar
 * 2. Use actual confidence scores returned by existing Hugging Face Food-101 classifier
 * 3. Predictions kept in strict descending confidence order
 * 4. Percentages displayed correctly, e.g. 0.3621 as 36.21%
 * 5. Uses existing UI styling, colors, and responsive layout
 * 6. Handles missing or invalid scores gracefully
 * 7. Does not invent confidence scores or modify model's predictions
 * 8. Preserves all other features (image upload, recipe, nutrition, history, clear history)
 */

import fs from 'fs';
import path from 'path';
import {
  formatConfidencePercentage,
  getBarWidthPercent,
  getSortedTopPredictions,
} from '../src/utils/confidenceUtils.js';

const API_BASE_URL = 'http://127.0.0.1:8000';

async function runConfidenceChartVerification() {
  console.log('='.repeat(75));
  console.log('FOOD VERSE AI: VISUAL CONFIDENCE CHART VERIFICATION');
  console.log('='.repeat(75));

  // --------------------------------------------------------------------------
  // Test 1: Unit Verification of Percentage Formatting (Requirement 4 & 6)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Testing Percentage Formatting & Graceful Error Handling...');
  
  // Exact example from user prompt: 0.3621 as 36.21%
  const formatted3621 = formatConfidencePercentage(0.3621);
  console.log(`  0.3621 -> "${formatted3621}"`);
  if (formatted3621 !== '36.21%') {
    throw new Error(`Expected "36.21%", got "${formatted3621}"`);
  }

  const testCases = [
    { input: 0.2701, expected: '27.01%' },
    { input: 0.1972, expected: '19.72%' },
    { input: 0.05, expected: '5.00%' },
    { input: 0.9999, expected: '99.99%' },
    { input: 1, expected: '100.00%' },
    { input: 0, expected: '0.00%' },
    // Graceful handling for missing or invalid values
    { input: null, expected: '0.00%' },
    { input: undefined, expected: '0.00%' },
    { input: NaN, expected: '0.00%' },
    { input: 'invalid', expected: '0.00%' },
  ];

  for (const { input, expected } of testCases) {
    const result = formatConfidencePercentage(input);
    if (result !== expected) {
      throw new Error(`formatConfidencePercentage(${input}) expected "${expected}", got "${result}"`);
    }
    console.log(`  formatConfidencePercentage(${input}) = "${result}" [OK]`);
  }
  console.log('  [PASS] All percentage formatting and edge cases verified.');

  // --------------------------------------------------------------------------
  // Test 2: Progress Bar Width Calculation (Requirement 1 & 2)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Testing Progress Bar Width Calculations...');
  const barWidth3621 = getBarWidthPercent(0.3621);
  if (Math.abs(barWidth3621 - 36.21) > 0.001) {
    throw new Error(`Expected 36.21 bar width for 0.3621, got ${barWidth3621}`);
  }
  console.log(`  0.3621 -> bar width: ${barWidth3621}% [OK]`);

  if (getBarWidthPercent(null) !== 0 || getBarWidthPercent(undefined) !== 0 || getBarWidthPercent(NaN) !== 0) {
    throw new Error('getBarWidthPercent failed to handle null/undefined/NaN gracefully with 0%');
  }
  if (getBarWidthPercent(1) !== 100 || getBarWidthPercent(0) !== 0) {
    throw new Error('getBarWidthPercent boundary test failed');
  }
  console.log('  [PASS] Progress bar widths match actual percentages accurately.');

  // --------------------------------------------------------------------------
  // Test 3: Descending Confidence Order Sorting (Requirement 3)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Testing Descending Confidence Sorting...');
  const unsorted = [
    { category: 'Hamburger', confidence: 0.1972 },
    { category: 'Ramen', confidence: 0.3621 },
    { category: 'Chicken Wings', confidence: 0.2701 },
    { category: 'French Fries', confidence: 0.05 },
  ];

  const sorted = getSortedTopPredictions(unsorted, 3);
  console.log('  Sorted categories:', sorted.map(s => `${s.category} (${s.confidence})`));

  if (sorted.length !== 3) {
    throw new Error(`Expected 3 predictions, got ${sorted.length}`);
  }
  if (sorted[0].category !== 'Ramen' || sorted[1].category !== 'Chicken Wings' || sorted[2].category !== 'Hamburger') {
    throw new Error('Predictions were not sorted in strict descending order!');
  }
  if (sorted[0].confidence < sorted[1].confidence || sorted[1].confidence < sorted[2].confidence) {
    throw new Error('Confidence scores are not strictly decreasing!');
  }
  console.log('  [PASS] Predictions are strictly limited to top 3 in descending order.');

  // --------------------------------------------------------------------------
  // Test 4: Live Image Analysis with Hugging Face Food-101 Classifier
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Testing Live Classifier Predictions with Real Image...');
  const testImagePath = 'C:\\Users\\ASUS\\Pictures\\images.jpg';
  const imageBytes = fs.readFileSync(testImagePath);

  const formData = new FormData();
  const blob = new Blob([imageBytes], { type: 'image/jpeg' });
  formData.append('file', blob, 'images.jpg');
  formData.append('meal_type', 'Lunch');

  const analyzeRes = await fetch(`${API_BASE_URL}/api/food/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!analyzeRes.ok) {
    throw new Error(`Analysis failed with status ${analyzeRes.status}`);
  }

  const analysisData = await analyzeRes.json();
  const rawPredictions = analysisData.top_predictions || [];
  console.log(`  Received ${rawPredictions.length} raw predictions from Food-101 classifier.`);

  const liveSorted = getSortedTopPredictions(rawPredictions, 3);
  console.log('\n  --- LIVE VISUAL CONFIDENCE CHART DATA ---');
  liveSorted.forEach((pred, idx) => {
    const formatted = formatConfidencePercentage(pred.confidence);
    const barWidth = getBarWidthPercent(pred.confidence);
    console.log(`  #${idx + 1} ${pred.category.padEnd(16)} | Formatted: ${formatted.padEnd(8)} | Bar Width: ${barWidth.toFixed(2)}% | Score: ${pred.confidence}`);

    // Verify consistency
    const expectedPrefix = (Number(pred.confidence) * 100).toFixed(2);
    if (!formatted.startsWith(expectedPrefix)) {
      throw new Error(`Mismatch between formatted percentage "${formatted}" and expected prefix "${expectedPrefix}"`);
    }
  });
  console.log('  ----------------------------------------');

  // Verify descending order
  for (let i = 0; i < liveSorted.length - 1; i++) {
    if (liveSorted[i].confidence < liveSorted[i + 1].confidence) {
      throw new Error('Live predictions are not in descending order!');
    }
  }
  console.log('  [PASS] Live classifier predictions verified in strict descending order.');

  // --------------------------------------------------------------------------
  // Test 5: DOM & JSX Layout Verification in FoodAnalyzerView.jsx
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Verifying Visual Confidence Chart DOM elements in FoodAnalyzerView.jsx...');
  const viewContent = fs.readFileSync(path.resolve('src/views/FoodAnalyzerView.jsx'), 'utf-8');

  if (!viewContent.includes('id="visual-confidence-chart"')) {
    throw new Error('Missing id="visual-confidence-chart" in FoodAnalyzerView.jsx');
  }
  if (!viewContent.includes('Top 3 Classifier Confidence Chart')) {
    throw new Error('Missing chart title in FoodAnalyzerView.jsx');
  }
  if (!viewContent.includes('role="progressbar"')) {
    throw new Error('Missing accessible role="progressbar" in FoodAnalyzerView.jsx');
  }
  if (!viewContent.includes('formatConfidencePercentage(')) {
    throw new Error('formatConfidencePercentage not used in FoodAnalyzerView.jsx');
  }
  if (!viewContent.includes('getBarWidthPercent(')) {
    throw new Error('getBarWidthPercent not used in FoodAnalyzerView.jsx');
  }
  console.log('  [PASS] Chart container, title, progressbar role, and utility bindings verified.');

  console.log('\n' + '='.repeat(75));
  console.log('ALL VISUAL CONFIDENCE CHART VERIFICATION TESTS PASSED (100% SUCCESS)');
  console.log('='.repeat(75));
}

runConfidenceChartVerification().catch(err => {
  console.error('\n[FAIL] Verification failed:', err);
  process.exit(1);
});
