/**
 * Confidence Score and Percentage Utilities for Food-101 Classifier
 */

/**
 * Format raw confidence float into clean percentage string with two decimal places.
 * Example: 0.3621 -> "36.21%"
 * Handles null, undefined, NaN, and clamped probabilities gracefully.
 */
export function formatConfidencePercentage(score) {
  if (score === undefined || score === null || isNaN(Number(score))) {
    return '0.00%';
  }
  const num = Number(score);
  const percentageVal = num <= 1 ? num * 100 : num;
  return `${Math.max(0, percentageVal).toFixed(2)}%`;
}

/**
 * Compute progress bar width percentage clamped between 0 and 100.
 * Example: 0.3621 -> 36.21
 */
export function getBarWidthPercent(score) {
  if (score === undefined || score === null || isNaN(Number(score))) {
    return 0;
  }
  const num = Number(score);
  const pct = num <= 1 ? num * 100 : num;
  return Math.min(100, Math.max(0, pct));
}

/**
 * Sort predictions strictly in descending confidence order and limit to top 3.
 */
export function getSortedTopPredictions(predictions = [], limit = 3) {
  if (!Array.isArray(predictions)) return [];
  return [...predictions]
    .filter(Boolean)
    .sort((a, b) => {
      const scoreA = Number(a?.confidence) || 0;
      const scoreB = Number(b?.confidence) || 0;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}
