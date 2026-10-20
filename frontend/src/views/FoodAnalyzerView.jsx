import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import ImageUploader from '../components/common/ImageUploader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AlertMessage from '../components/common/AlertMessage';
import AiDisclaimer from '../components/common/AiDisclaimer';
import { formatConfidencePercentage, getBarWidthPercent, getSortedTopPredictions } from '../utils/confidenceUtils';

const COMMON_INDIAN_DISHES = [
  { name: 'Pav Bhaji', icon: '🍲', desc: 'Spiced vegetable mash with buttered pav' },
  { name: 'Poha', icon: '🍚', desc: 'Tempered flattened rice with peanuts & turmeric' },
  { name: 'Samosa', icon: '🥟', desc: 'Crispy pastry with spiced potato-pea filling' },
  { name: 'Dosa', icon: '🥞', desc: 'Crispy fermented crepe with sambar & chutney' },
  { name: 'Idli', icon: '⚪', desc: 'Steamed fluffy rice & lentil savory cakes' },
  { name: 'Chole Bhature', icon: '🫓', desc: 'Spicy chickpea curry with puffed bhatura' },
  { name: 'Dal Makhani', icon: '🥣', desc: 'Slow-simmered black lentils with butter & cream' },
];

function generateAnalysisReportText(analysisResult, decomposedItems = [], mealType = 'Lunch', userQuestion = '') {
  if (!analysisResult) return '';

  const timestamp = new Date().toLocaleString();
  const isConfirmed = Boolean(analysisResult.is_confirmed);
  const dishTitle = isConfirmed
    ? (analysisResult.confirmed_dish || analysisResult.dish_name || 'Confirmed Dish')
    : (analysisResult.dish_name || analysisResult.top_predictions?.[0]?.category || 'Unconfirmed Candidate');

  const topPred = analysisResult.top_predictions?.[0];

  const lines = [
    '================================================================================',
    '                    FOOD VERSE AI - FOOD ANALYSIS REPORT',
    '================================================================================',
    `Generated:           ${timestamp}`,
    'Platform:            Food Verse AI (Hugging Face Food-101 Multimodal Vision)',
    'Report File:         FoodVerse_Analysis.txt',
    '',
    '--------------------------------------------------------------------------------',
    '1. IDENTIFIED FOOD & CLASSIFICATION RESULTS',
    '--------------------------------------------------------------------------------',
    `Identified Dish:     ${dishTitle}`,
    `Confirmation Status: ${isConfirmed ? 'User-Confirmed Dish' : 'Awaiting User Confirmation'}`,
    `Meal Category:       ${mealType}`,
  ];

  if (topPred) {
    lines.push(`Top Model Candidate: ${topPred.category} (${topPred.percentage})`);
  }

  if (analysisResult.apparent_preparation_method) {
    lines.push(`Preparation Method:  ${analysisResult.apparent_preparation_method}`);
  }

  if (analysisResult.top_predictions && analysisResult.top_predictions.length > 0) {
    lines.push('');
    lines.push('Food-101 Classifier Predictions (Descending Confidence Order):');
    const sorted = getSortedTopPredictions(analysisResult.top_predictions, 3);
    sorted.forEach((pred, idx) => {
      const formattedPct = formatConfidencePercentage(pred.confidence);
      const scoreStr = pred.confidence !== undefined && pred.confidence !== null && !isNaN(Number(pred.confidence))
        ? Number(pred.confidence).toFixed(4)
        : 'N/A';
      lines.push(`  #${idx + 1}. ${pred.category} — ${formattedPct} (Score: ${scoreStr}, Label: ${pred.raw_label})`);
    });
  }

  if (analysisResult.dietary_tags && analysisResult.dietary_tags.length > 0) {
    lines.push('');
    lines.push(`Dietary Profile:     ${analysisResult.dietary_tags.join(', ')}`);
  }

  if (analysisResult.user_question || userQuestion) {
    lines.push('');
    lines.push(`User Inquiry:        "${analysisResult.user_question || userQuestion}"`);
    if (analysisResult.user_question_answer) {
      lines.push(`Inquiry Response:    ${analysisResult.user_question_answer}`);
    }
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('2. RECIPE & INGREDIENT DETAILS');
  lines.push('--------------------------------------------------------------------------------');

  if (!isConfirmed) {
    lines.push('Recipe details are paused awaiting user confirmation.');
    lines.push('(Per safety guardrails, verified recipe ingredients are never invented from raw classification logits alone.)');
  } else {
    if (analysisResult.visible_ingredients && analysisResult.visible_ingredients.length > 0) {
      lines.push('Baseline Visible Constituents:');
      analysisResult.visible_ingredients.forEach((item) => {
        lines.push(`  • ${item}`);
      });
      lines.push('');
    }

    if (analysisResult.potential_ingredients_or_guesses && analysisResult.potential_ingredients_or_guesses.length > 0) {
      lines.push('Inferred Culinary Seasonings & Ingredients:');
      analysisResult.potential_ingredients_or_guesses.forEach((item) => {
        lines.push(`  • ${item}`);
      });
      lines.push('');
    }

    if (decomposedItems && decomposedItems.length > 0) {
      lines.push('Portion Breakdown:');
      decomposedItems.forEach((item) => {
        const evidence = item.is_directly_visible ? 'Verified Baseline' : 'Inferred Seasoning';
        const notes = item.notes ? ` — ${item.notes}` : '';
        lines.push(`  - ${item.name}: ~${item.grams}g [${evidence}]${notes}`);
      });
    }
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('3. APPROXIMATE NUTRITIONAL VALUES');
  lines.push('--------------------------------------------------------------------------------');

  const nut = analysisResult.nutritional_estimate;
  if (nut && (nut.estimated_calories || nut.protein_g || nut.carbs_g || nut.fat_g)) {
    lines.push(`Estimated Energy:    ~${nut.estimated_calories || 0} kcal`);
    lines.push(`Protein:             ${nut.protein_g || 0}g`);
    lines.push(`Carbohydrates:       ${nut.carbs_g || 0}g`);
    lines.push(`Fat:                 ${nut.fat_g || 0}g`);
    lines.push(`Benchmark Basis:     ${nut.basis || 'Approximate reference benchmark per standard serving.'}`);
  } else {
    lines.push('Nutritional values pending dish confirmation.');
    lines.push('(Nutritional estimates are calibrated once the dish identity is confirmed by the user.)');
  }

  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('4. RELEVANT LIMITATIONS & DISCLAIMERS');
  lines.push('--------------------------------------------------------------------------------');

  if (analysisResult.visual_uncertainties_and_ambiguities && analysisResult.visual_uncertainties_and_ambiguities.length > 0) {
    lines.push('Visual Uncertainties & Boundaries:');
    analysisResult.visual_uncertainties_and_ambiguities.forEach((item) => {
      lines.push(`  • ${item}`);
    });
    lines.push('');
  }

  lines.push('Model Scope & Freshness Notices:');
  lines.push('  • Food-101 Benchmark Dataset: Pretrained on 101 primarily Western categories. Regional dishes are mapped to the closest visual benchmark class unless confirmed or corrected.');
  lines.push('  • Freshness & Microbial Safety: Visual classification evaluates surface photographic patterns only. It does NOT evaluate freshness, bacterial load, or internal temperatures.');
  lines.push('  • AI & Health Disclaimer: All nutritional values and ingredient breakdowns are approximate estimates for educational/informational reference only and do not replace professional medical or dietary consultation.');
  lines.push('');
  lines.push('================================================================================');
  lines.push('                            END OF REPORT');
  lines.push('================================================================================');

  return lines.join('\n');
}

export default function FoodAnalyzerView({ setActiveView }) {
  const {
    setPantrySeedItems,
    setNutritionSeedItems,
    clearAnalysisState,
    setConfirmedDishData,
    setActiveConfirmedDish,
    setCurrentAnalysisResult,
    addMeal,
  } = useApp();
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mealType, setMealType] = useState('Lunch');
  const [userQuestion, setUserQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [notification, setNotification] = useState(null);
  const [customDishInput, setCustomDishInput] = useState('');
  const [showCorrectionMenu, setShowCorrectionMenu] = useState(false);

  // Portion-adjustable ingredient state for the macros breakdown
  const [decomposedItems, setDecomposedItems] = useState([]);

  // Requirement 7: Reset previous image results & stale state on new image upload
  const handleImageSelected = (file, url) => {
    clearAnalysisState();
    setSelectedImage(file);
    setPreviewUrl(url);
    setAnalysisResult(null);
    setNotification(null);
    setDecomposedItems([]);
    setShowCorrectionMenu(false);
    setCustomDishInput('');
  };

  const handleImageRemoved = () => {
    clearAnalysisState();
    setSelectedImage(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setNotification(null);
    setDecomposedItems([]);
    setShowCorrectionMenu(false);
    setCustomDishInput('');
  };

  const runAnalysis = async () => {
    if (!previewUrl) return;

    // Reset previous image results from dependent sections immediately
    clearAnalysisState();
    setIsAnalyzing(true);
    setNotification(null);
    setShowCorrectionMenu(false);

    const formData = new FormData();

    try {
      if (selectedImage) {
        formData.append('file', selectedImage);
      } else {
        // If sample photo used, fetch binary blob to test real multipart pipeline
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        formData.append('file', blob, 'sample_food.jpg');
      }

      if (userQuestion.trim()) {
        formData.append('question', userQuestion.trim());
      }
      formData.append('meal_type', mealType);

      // Real HTTP multipart request dispatched to POST /api/food/analyze
      const result = await api.analyzeFood(formData);
      setAnalysisResult(result);
      setCurrentAnalysisResult(result);

      // Unconfirmed initial state: strictly do not invent ingredients or portions
      if (result.is_confirmed && result.decomposed_items && result.decomposed_items.length > 0) {
        setDecomposedItems(
          result.decomposed_items.map((item) => ({
            name: item.name,
            is_directly_visible: item.is_directly_visible,
            notes: item.notes || '',
            grams: item.estimated_grams || 100,
          }))
        );
      } else {
        setDecomposedItems([]);
      }

      const topPred = result.top_predictions?.[0];
      const initialDish = topPred ? topPred.category : (result.dish_name || 'Food Plate');
      addMeal({
        id: `analysis_${Date.now()}`,
        dishName: initialDish,
        foodName: initialDish,
        predictedLabel: topPred ? topPred.category : undefined,
        topPredictions: result.top_predictions,
        imageUrl: previewUrl,
        mealType: mealType,
        timestamp: new Date().toISOString(),
        totalCalories: result.nutritional_estimate?.estimated_calories || 0,
        protein_g: result.nutritional_estimate?.protein_g || 0,
        carbs_g: result.nutritional_estimate?.carbs_g || 0,
        fat_g: result.nutritional_estimate?.fat_g || 0,
        ingredients: (result.decomposed_items || []).map((i) => ({
          name: i.name,
          grams: i.estimated_grams || 100,
          calories: Math.round((i.estimated_grams || 100) * 1.5),
        })),
        isConfirmed: false,
      });

      setNotification({
        type: 'info',
        message: topPred
          ? `Model classified top candidate as "${topPred.category}" (${formatConfidencePercentage(topPred.confidence)}). Please confirm or correct your dish below.`
          : 'Classification complete. Please confirm the dish name.',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to complete vision analysis.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmDish = async (dishToConfirm) => {
    if (!dishToConfirm || !dishToConfirm.trim()) return;
    const targetDish = dishToConfirm.trim();

    setIsConfirming(true);
    setNotification(null);

    try {
      const topCand = analysisResult?.top_predictions?.[0];
      const payload = {
        confirmed_dish: targetDish,
        original_prediction: topCand?.category || analysisResult?.dish_name,
        confidence: topCand?.confidence,
        top_predictions: analysisResult?.top_predictions || [],
        user_question: userQuestion || analysisResult?.user_question,
      };

      const confirmedResult = await api.confirmFoodDish(payload);
      setAnalysisResult(confirmedResult);
      setCurrentAnalysisResult(confirmedResult);

      let extractedDecomposed = [];
      if (confirmedResult.decomposed_items && confirmedResult.decomposed_items.length > 0) {
        extractedDecomposed = confirmedResult.decomposed_items.map((item) => ({
          name: item.name,
          is_directly_visible: item.is_directly_visible,
          notes: item.notes || '',
          grams: item.estimated_grams || 100,
        }));
      } else {
        extractedDecomposed = [
          ...(confirmedResult.visible_ingredients || []).map((name) => ({
            name,
            is_directly_visible: true,
            notes: 'Verified baseline ingredient',
            grams: 100,
          })),
          ...(confirmedResult.potential_ingredients_or_guesses || []).map((name) => ({
            name,
            is_directly_visible: false,
            notes: 'Inferred culinary seasoning/oil',
            grams: 15,
          })),
        ];
      }
      setDecomposedItems(extractedDecomposed);

      // Connect to shared context to update Recipe and Nutrition sections automatically (Requirements 2, 3, 4, 5, 7)
      const confirmedIngredients = (confirmedResult.visible_ingredients && confirmedResult.visible_ingredients.length > 0)
        ? confirmedResult.visible_ingredients
        : extractedDecomposed.map((i) => i.name);

      const confirmedNutritionItems = extractedDecomposed.map((i) => ({
        name: i.name,
        grams: i.grams || 100,
      }));

      setConfirmedDishData(
        confirmedResult.confirmed_dish || targetDish,
        confirmedIngredients,
        confirmedNutritionItems,
        confirmedResult.nutritional_estimate
      );

      const nut = confirmedResult.nutritional_estimate;
      addMeal({
        id: `analysis_${Date.now()}`,
        dishName: confirmedResult.confirmed_dish || targetDish,
        foodName: confirmedResult.confirmed_dish || targetDish,
        confirmedDish: confirmedResult.confirmed_dish || targetDish,
        predictedLabel: analysisResult?.top_predictions?.[0]?.category,
        topPredictions: analysisResult?.top_predictions,
        imageUrl: previewUrl,
        mealType: mealType,
        timestamp: new Date().toISOString(),
        totalCalories: nut?.estimated_calories || 0,
        protein_g: nut?.protein_g || 0,
        carbs_g: nut?.carbs_g || 0,
        fat_g: nut?.fat_g || 0,
        ingredients: extractedDecomposed.map((i) => ({
          name: i.name,
          grams: i.grams || 100,
          calories: Math.round((i.grams || 100) * 1.5),
        })),
        isConfirmed: true,
      });


      setShowCorrectionMenu(false);
      setCustomDishInput('');
      setNotification({
        type: 'success',
        message: `Dish confirmed as "${confirmedResult.confirmed_dish || targetDish}"! Verified recipe ingredients and estimated nutrition are now unlocked.`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || `Failed to confirm dish as ${targetDish}.`,
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleGramsChange = (index, newGrams) => {
    const parsedGrams = Math.max(1, parseInt(newGrams, 10) || 0);
    setDecomposedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], grams: parsedGrams };
      return copy;
    });
  };

  const handleUseInCookingAssistant = () => {
    if (!analysisResult) return;
    const names = decomposedItems.map((item) => item.name).filter(Boolean);
    if (names.length > 0 && setPantrySeedItems) {
      setPantrySeedItems(names);
    }
    const currentDishName = analysisResult.confirmed_dish || analysisResult.dish_name;
    if (currentDishName && setActiveConfirmedDish) {
      setActiveConfirmedDish(currentDishName);
    }
    setActiveView('cooking');
  };

  const handleCalculateDetailedNutrition = () => {
    if (!analysisResult) return;
    const nutritionPayload = decomposedItems
      .filter((item) => item.name)
      .map((item) => ({
        name: item.name,
        grams: item.grams || 100,
      }));
    if (nutritionPayload.length > 0 && setNutritionSeedItems) {
      setNutritionSeedItems(nutritionPayload);
    }
    setActiveView('nutrition');
  };

  const handleDownloadReport = () => {
    if (!analysisResult) {
      setNotification({
        type: 'warning',
        message: 'No analysis results available to download. Please analyze a food image first.',
      });
      return;
    }

    try {
      const reportText = generateAnalysisReportText(
        analysisResult,
        decomposedItems,
        mealType,
        userQuestion
      );

      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = 'FoodVerse_Analysis.txt';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      setNotification({
        type: 'success',
        message: 'Analysis report downloaded as "FoodVerse_Analysis.txt".',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: `Failed to download analysis report: ${err.message || 'Unknown error'}`,
      });
    }
  };

  const sortedPredictions = getSortedTopPredictions(analysisResult?.top_predictions, 3);
  const topPrediction = sortedPredictions[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div>
        <h2>Food Image Recognition & Analysis</h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Powered by pretrained Hugging Face Food-101 computer vision with interactive user confirmation for Indian & regional dishes.
        </p>
      </div>

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Upload & Configuration Card */}
      <div className="card">
        <ImageUploader
          selectedImage={selectedImage}
          previewUrl={previewUrl}
          onImageSelected={handleImageSelected}
          onImageRemoved={handleImageRemoved}
          sampleImageUrl="/food_hero.jpg"
          sampleLabel="Load Demo Salmon Quinoa Bowl"
          label="Upload food plate photo"
        />

        {previewUrl && (
          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              {/* Meal Category */}
              <div>
                <label htmlFor="meal-type-select" style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  Meal Category:
                </label>
                <select
                  id="meal-type-select"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                  }}
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
              </div>

              {/* Optional User Inquiry */}
              <div>
                <label htmlFor="user-question-input" style={{ display: 'block', fontWeight: '600', fontSize: '0.88rem', marginBottom: '0.35rem' }}>
                  Optional Question for AI:
                </label>
                <input
                  id="user-question-input"
                  type="text"
                  value={userQuestion}
                  onChange={(e) => setUserQuestion(e.target.value)}
                  placeholder="e.g. Does this traditional recipe contain dairy or gluten?"
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-light)',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {!analysisResult && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleDownloadReport}
                  title="Download Analysis Report"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                >
                  <span>📥</span> Download Report
                </button>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={runAnalysis}
                disabled={isAnalyzing || isConfirming}
                style={{ minWidth: '220px' }}
              >
                {isAnalyzing ? 'Classifying Image...' : '⚡ Run Food-101 Classifier'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="card">
          <LoadingIndicator
            message="Executing Food-101 Image Classification..."
            subtext="Running real neural inference using Hugging Face Transformers model. Computing top 3 category probabilities."
          />
        </div>
      )}

      {/* Structured Analysis Results View */}
      {analysisResult && !isAnalyzing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Analysis Results Header & Download Report Action (Requirement 1 & 6) */}
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: '#ffffff',
              borderLeft: '4px solid var(--green-primary)',
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: '1.18rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>📋</span> Food Analysis Results
              </h3>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Classification logits, recipe ingredients, and nutritional estimates ready for review and export.
              </p>
            </div>

            <button
              type="button"
              id="download-report-btn"
              className="btn btn-secondary"
              onClick={handleDownloadReport}
              title="Download plain-text analysis report (.txt)"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600' }}
            >
              <span>📥</span> Download Report
            </button>
          </div>

          {/* 1. ACTUAL TOP 3 PREDICTIONS CARD (Requirement 1 & 6) */}
          {analysisResult.top_predictions && analysisResult.top_predictions.length > 0 && (
            <div className="card" style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🤖</span>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#1e293b' }}>
                      Model Classifier Predictions (Food-101 Taxonomy)
                    </h4>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '0.15rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        background: '#e2e8f0',
                        color: '#475569',
                      }}
                    >
                      STATISTICAL CLASSIFIER
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Raw neural network logits from the Hugging Face Food-101 checkpoint (101 Western benchmark classes).
                  </p>
                </div>

                {topPrediction && (
                  <span style={{ fontSize: '0.8rem', background: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)', fontWeight: '700' }}>
                    Top Candidate: {topPrediction.category} ({formatConfidencePercentage(topPrediction.confidence)})
                  </span>
                )}
              </div>

              {/* Visual Confidence Chart (Requirements 1, 2, 3, 4, 5, 6, 7) */}
              <div
                id="visual-confidence-chart"
                style={{
                  background: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)',
                  padding: '1.25rem 1.5rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.15rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.15rem' }}>📊</span>
                    <h5 style={{ margin: 0, fontSize: '0.98rem', fontWeight: '700', color: 'var(--text-main)' }}>
                      Top 3 Classifier Confidence Chart
                    </h5>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Ranked descending by probability
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {sortedPredictions.map((pred, idx) => {
                    const isTop = idx === 0;
                    const formattedPct = formatConfidencePercentage(pred.confidence);
                    const barWidth = getBarWidthPercent(pred.confidence);

                    const barGradient = isTop
                      ? 'linear-gradient(90deg, #16a34a 0%, #15803d 100%)'
                      : idx === 1
                      ? 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)'
                      : 'linear-gradient(90deg, #64748b 0%, #475569 100%)';

                    const badgeBg = isTop ? 'var(--green-primary)' : idx === 1 ? '#0284c7' : '#64748b';

                    return (
                      <div key={pred.raw_label || idx} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {/* Food Name, Tag, Score & Formatted Percentage */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '22px',
                                height: '22px',
                                borderRadius: '50%',
                                background: badgeBg,
                                color: '#ffffff',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                              }}
                            >
                              #{idx + 1}
                            </span>
                            <span style={{ fontWeight: isTop ? '700' : '600', color: isTop ? 'var(--green-deep)' : 'var(--text-main)', fontSize: '0.96rem' }}>
                              {pred.category}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'var(--bg-subtle)', padding: '0.1rem 0.45rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                              <code>{pred.raw_label}</code>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span style={{ fontWeight: '800', fontSize: '1.02rem', color: isTop ? 'var(--green-deep)' : 'var(--text-main)', fontFeatureSettings: '"tnum"' }}>
                              {formattedPct}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              (score: {pred.confidence !== undefined && pred.confidence !== null && !isNaN(Number(pred.confidence)) ? Number(pred.confidence).toFixed(4) : 'N/A'})
                            </span>
                          </div>
                        </div>

                        {/* Horizontal Progress Bar */}
                        <div
                          style={{
                            width: '100%',
                            height: '14px',
                            background: '#e2e8f0',
                            borderRadius: '9999px',
                            overflow: 'hidden',
                            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.06)',
                            position: 'relative',
                          }}
                          role="progressbar"
                          aria-valuenow={barWidth}
                          aria-valuemin="0"
                          aria-valuemax="100"
                          aria-label={`Confidence for ${pred.category}: ${formattedPct}`}
                        >
                          <div
                            style={{
                              width: `${barWidth}%`,
                              height: '100%',
                              background: barGradient,
                              borderRadius: '9999px',
                              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3 Prediction Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                {sortedPredictions.map((pred, idx) => {
                  const isTop = idx === 0;
                  const formattedPct = formatConfidencePercentage(pred.confidence);
                  const barWidth = getBarWidthPercent(pred.confidence);
                  return (
                    <div
                      key={pred.raw_label || idx}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        background: isTop ? '#ffffff' : '#f1f5f9',
                        border: isTop ? '2px solid var(--green-primary)' : '1px solid #e2e8f0',
                        boxShadow: isTop ? '0 2px 8px rgba(16, 185, 129, 0.12)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: isTop ? 'var(--green-primary)' : '#94a3b8',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              fontWeight: '800',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            #{idx + 1}
                          </span>
                          <span style={{ fontWeight: isTop ? '700' : '600', color: isTop ? 'var(--green-deep)' : 'var(--text-main)', fontSize: '0.98rem' }}>
                            {pred.category}
                          </span>
                        </div>
                        <span
                          style={{
                            fontWeight: '800',
                            fontSize: '0.95rem',
                            color: isTop ? 'var(--green-primary)' : 'var(--text-muted)',
                          }}
                        >
                          {formattedPct}
                        </span>
                      </div>

                      {/* Confidence Bar */}
                      <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${barWidth}%`,
                            height: '100%',
                            background: isTop ? 'linear-gradient(90deg, #10b981, #059669)' : '#94a3b8',
                            borderRadius: '4px',
                            transition: 'width 0.6s ease',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                        <span>Label: <code>{pred.raw_label}</code></span>
                        <span>Score: {pred.confidence !== undefined && pred.confidence !== null && !isNaN(Number(pred.confidence)) ? Number(pred.confidence).toFixed(4) : 'N/A'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. "IS THIS PREDICTION CORRECT?" SECTION (Requirement 2 & 3) */}
          <div
            className="card"
            style={{
              background: analysisResult.is_confirmed ? '#f0fdf4' : '#fffbeb',
              border: analysisResult.is_confirmed ? '2px solid #86efac' : '2px solid #fcd34d',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)',
              position: 'relative',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{analysisResult.is_confirmed ? '✅' : '🤔'}</span>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: analysisResult.is_confirmed ? '#166534' : '#92400e' }}>
                    {analysisResult.is_confirmed
                      ? `Dish Confirmed: ${analysisResult.confirmed_dish}`
                      : 'Is this prediction correct?'}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      padding: '0.2rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      background: analysisResult.is_confirmed ? '#dcfce7' : '#fef3c7',
                      color: analysisResult.is_confirmed ? '#15803d' : '#b45309',
                      border: '1px solid currentColor',
                    }}
                  >
                    {analysisResult.is_confirmed ? 'CONFIRMED' : 'ACTION REQUIRED'}
                  </span>
                </div>

                <p style={{ marginTop: '0.35rem', color: analysisResult.is_confirmed ? '#15803d' : '#78350f', fontSize: '0.88rem', lineHeight: 1.45 }}>
                  {analysisResult.is_confirmed
                    ? `Authentic recipe ingredients and benchmark nutrition are loaded for "${analysisResult.confirmed_dish}". You can re-select or enter another dish below at any time.`
                    : 'The Food-101 dataset contains mostly Western categories and often misclassifies regional Indian dishes (such as classifying Pav Bhaji as Ramen or Chicken Wings). Please confirm or select the correct dish below to unlock authentic recipe ingredients and nutrition.'}
                </p>
              </div>

              {analysisResult.is_confirmed && !showCorrectionMenu && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCorrectionMenu(true)}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.85rem' }}
                >
                  ✏️ Change / Re-correct Dish
                </button>
              )}
            </div>

            {/* Interactive Confirmation Controls */}
            {(!analysisResult.is_confirmed || showCorrectionMenu) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px dashed #d1d5db' }}>

                {/* Option A: Quick Confirm Candidate */}
                {topPrediction && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Option 1: If model candidate is correct:
                    </label>
                    <button
                      type="button"
                      onClick={() => handleConfirmDish(topPrediction.category)}
                      disabled={isConfirming}
                      style={{
                        padding: '0.6rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: '#ffffff',
                        border: '2px solid var(--green-primary)',
                        color: 'var(--green-deep)',
                        fontWeight: '700',
                        fontSize: '0.92rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.15)',
                      }}
                    >
                      <span>✓</span> Yes, it's {topPrediction.category} ({formatConfidencePercentage(topPrediction.confidence)})
                    </button>
                  </div>
                )}

                {/* Option B: Common Indian Dishes (Requirement 3) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Option 2: Select Common Indian Dish (Regional Specialties):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                    {COMMON_INDIAN_DISHES.map((dish) => {
                      const isSelected = analysisResult?.confirmed_dish?.toLowerCase() === dish.name.toLowerCase();
                      return (
                        <button
                          key={dish.name}
                          type="button"
                          onClick={() => handleConfirmDish(dish.name)}
                          disabled={isConfirming}
                          title={dish.desc}
                          style={{
                            padding: '0.55rem 0.95rem',
                            borderRadius: 'var(--radius-md)',
                            background: isSelected ? 'var(--green-primary)' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#1e293b',
                            border: isSelected ? '2px solid var(--green-deep)' : '1px solid #cbd5e1',
                            fontWeight: isSelected ? '700' : '600',
                            fontSize: '0.88rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = 'var(--green-primary)';
                              e.currentTarget.style.background = '#f0fdf4';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.background = '#ffffff';
                            }
                          }}
                        >
                          <span style={{ fontSize: '1.1rem' }}>{dish.icon}</span>
                          <span>{dish.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Option C: Custom Dish Name Input */}
                <div>
                  <label htmlFor="custom-dish-input" style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Option 3: Or enter any other food name:
                  </label>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (customDishInput.trim()) {
                        handleConfirmDish(customDishInput);
                      }
                    }}
                    style={{ display: 'flex', gap: '0.65rem', maxWidth: '520px' }}
                  >
                    <input
                      id="custom-dish-input"
                      type="text"
                      value={customDishInput}
                      onChange={(e) => setCustomDishInput(e.target.value)}
                      placeholder="e.g. Pav Bhaji, Biryani, Butter Chicken, Dal Tadka..."
                      disabled={isConfirming}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #cbd5e1',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                        background: '#ffffff',
                      }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isConfirming || !customDishInput.trim()}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {isConfirming ? 'Confirming...' : 'Confirm Dish'}
                    </button>
                  </form>
                </div>

                {showCorrectionMenu && analysisResult.is_confirmed && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowCorrectionMenu(false)}
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. CONDITIONAL DISH DETAILS (Requirements 4, 5, 6, 7) */}
          {!analysisResult.is_confirmed ? (
            /* Unconfirmed Placeholder Card (Requirement 7: pause details until confirmed) */
            <div
              className="card"
              style={{
                background: '#fffbeb',
                borderLeft: '4px solid #f59e0b',
                padding: '1.25rem 1.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>⏳</span>
                <div>
                  <h4 style={{ margin: 0, color: '#92400e', fontSize: '1.05rem', fontWeight: '700' }}>
                    Awaiting Dish Confirmation Before Showing Details
                  </h4>
                  <p style={{ margin: '0.4rem 0 0', color: '#78350f', fontSize: '0.88rem', lineHeight: 1.5 }}>
                    Per Food Verse AI safety guardrails, we <strong>never invent visually verified ingredients, cooking methods, or portion weights</strong> from raw classification logits alone.
                    Please confirm or correct the dish in the section above to unlock authentic recipe ingredients and estimated nutritional breakdown.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* User-Confirmed Dish Details */
            <>
              {/* Confirmed Dish Banner Card */}
              <div className="card" style={{ borderLeft: '4px solid var(--green-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.5rem', color: 'var(--green-deep)', margin: 0 }}>
                        {analysisResult.confirmed_dish || analysisResult.dish_name}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          padding: '0.2rem 0.65rem',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-success-bg)',
                          color: 'var(--color-success)',
                          border: '1px solid currentColor',
                        }}
                      >
                        ✓ USER-CONFIRMED DISH
                      </span>
                    </div>

                    <p style={{ marginTop: '0.65rem', color: 'var(--text-body)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                      <strong>Culinary Preparation Method:</strong> {analysisResult.apparent_preparation_method}
                    </p>

                    {/* Dietary Tags */}
                    {analysisResult.dietary_tags && analysisResult.dietary_tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.45rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                        {analysisResult.dietary_tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.6rem',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--bg-accent-subtle)',
                              color: 'var(--green-deep)',
                              fontWeight: '600',
                            }}
                          >
                            ✓ {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Provider & Audit Pill */}
                  {analysisResult.provider_metadata && (
                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        padding: '0.6rem 1rem',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        textAlign: 'right',
                      }}
                    >
                      <div style={{ fontWeight: '700', color: 'var(--green-deep)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Provider: {analysisResult.provider_metadata.provider || 'Food-101 + User Confirmation'}
                      </div>
                      <div>Status: Confirmed ({analysisResult.confirmed_dish})</div>
                      {topPrediction && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          Original Candidate: {topPrediction.category} ({formatConfidencePercentage(topPrediction.confidence)})
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* User Inquiry Box */}
                {analysisResult.user_question_answer && (
                  <div
                    style={{
                      marginTop: '1.25rem',
                      padding: '1rem',
                      background: 'var(--bg-orange-subtle)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--orange-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', color: 'var(--orange-primary)', fontSize: '0.88rem' }}>
                      <span>💬 Inquiry: "{analysisResult.user_question || userQuestion}"</span>
                    </div>
                    <p style={{ marginTop: '0.35rem', color: '#7c2d12', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      {analysisResult.user_question_answer}
                    </p>
                  </div>
                )}
              </div>

              {/* 2-Column Separation of Visible Observations vs Inferred Guesses */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {/* Column 1: Direct Visible Observations */}
                <div className="card" style={{ borderColor: 'var(--green-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h4 style={{ color: 'var(--green-deep)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <span>👁️</span> Baseline Visible Constituents
                    </h4>
                    <span style={{ fontSize: '0.72rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '700' }}>
                      VERIFIED BASELINE
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    Characteristic ingredients and visible constituents for {analysisResult.confirmed_dish}:
                  </p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0, margin: 0 }}>
                    {analysisResult.visible_ingredients.map((item, idx) => (
                      <li
                        key={idx}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-accent-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.88rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                          color: 'var(--green-deep)',
                        }}
                      >
                        <span style={{ color: 'var(--green-primary)', fontWeight: 'bold' }}>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Column 2: Inferred Culinary Guesses */}
                <div className="card" style={{ borderColor: 'var(--orange-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h4 style={{ color: 'var(--orange-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                      <span>💡</span> Potential Inferred Ingredients
                    </h4>
                    <span style={{ fontSize: '0.72rem', background: 'var(--bg-orange-subtle)', color: 'var(--orange-primary)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '700' }}>
                      CULINARY INFERENCE
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                    Inferred seasonings, oils, or aromatics (cannot be confirmed by sight alone):
                  </p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0, margin: 0 }}>
                    {analysisResult.potential_ingredients_or_guesses.map((item, idx) => (
                      <li
                        key={idx}
                        style={{
                          padding: '0.5rem 0.75rem',
                          background: 'var(--bg-orange-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.88rem',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.5rem',
                          color: '#9a3412',
                        }}
                      >
                        <span style={{ color: 'var(--orange-primary)', fontWeight: 'bold' }}>?</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Visual Uncertainties & Limitations Card */}
              <div className="card" style={{ background: '#f8fafc', borderLeft: '4px solid #64748b' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#334155' }}>
                  <span>⚠️</span> Explicit Boundaries & Uncertainties
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Disclosures regarding photography limitations and benchmark approximations:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.65rem' }}>
                  {analysisResult.visual_uncertainties_and_ambiguities.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.6rem 0.85rem',
                        background: '#ffffff',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.85rem',
                        color: '#475569',
                        lineHeight: 1.45,
                      }}
                    >
                      • {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Decomposed Constituents & Estimated Nutrition Table */}
              <div className="card">
                <div className="card-header-clean">
                  <div>
                    <h3 style={{ margin: 0 }}>Recipe Ingredients & Estimated Portions</h3>
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Calibrated for <strong>{analysisResult.confirmed_dish}</strong>. Adjust gram weights below to customize portions.
                    </p>
                  </div>

                  {/* Macro summary pills (Requirement 6: distinct approximate nutrition) */}
                  {analysisResult.nutritional_estimate && (
                    <div style={{ display: 'flex', gap: '1.25rem', background: 'var(--bg-subtle)', padding: '0.65rem 1.15rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--green-deep)' }}>
                          {analysisResult.nutritional_estimate.estimated_calories}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>APPROX. KCAL</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--orange-primary)' }}>
                          {analysisResult.nutritional_estimate.protein_g}g
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>PROTEIN</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          {analysisResult.nutritional_estimate.carbs_g}g
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>CARBS</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          {analysisResult.nutritional_estimate.fat_g}g
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>FAT</div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.65rem 0.75rem' }}>Constituent</th>
                        <th style={{ padding: '0.65rem 0.75rem' }}>Evidence Status</th>
                        <th style={{ padding: '0.65rem 0.75rem' }}>Culinary Details</th>
                        <th style={{ padding: '0.65rem 0.75rem', width: '140px' }}>Approx. Grams</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decomposedItems.map((item, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem', fontWeight: '600' }}>{item.name}</td>
                          <td style={{ padding: '0.75rem' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                background: item.is_directly_visible ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                                color: item.is_directly_visible ? 'var(--color-success)' : 'var(--color-warning)',
                                fontWeight: '700',
                              }}
                            >
                              {item.is_directly_visible ? 'Verified Baseline' : 'Inferred Seasoning'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                            {item.notes}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <input
                              type="number"
                              min="5"
                              max="2000"
                              step="5"
                              value={item.grams}
                              onChange={(e) => handleGramsChange(index, e.target.value)}
                              style={{
                                width: '80px',
                                padding: '0.3rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-light)',
                                fontFamily: 'inherit',
                                fontWeight: '600',
                              }}
                              aria-label={`Portion grams for ${item.name}`}
                            />
                            <span style={{ marginLeft: '0.35rem', color: 'var(--text-muted)' }}>g</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons (Requirement 4: use confirmed dish for recipe & nutrition) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    📊 {analysisResult.nutritional_estimate?.basis || 'Approximate reference benchmark per standard serving.'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleDownloadReport}
                      title="Download plain-text analysis report (.txt)"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}
                    >
                      <span>📥</span> Download Report
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleUseInCookingAssistant}
                    >
                      👨‍🍳 Generate Recipes for {analysisResult.confirmed_dish || analysisResult.dish_name}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleCalculateDetailedNutrition}
                    >
                      🥗 Calculate Detailed Nutrition
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Regional Cuisines limitations notice card */}
          <div
            className="card"
            style={{
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderLeft: '4px solid #f59e0b',
              padding: '0.95rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>ℹ️</span>
              <div>
                <h5 style={{ margin: 0, color: '#92400e', fontSize: '0.92rem', fontWeight: '700' }}>
                  Dataset Limitations & Freshness Notice
                </h5>
                <p style={{ margin: '0.35rem 0 0', color: '#78350f', fontSize: '0.85rem', lineHeight: 1.45 }}>
                  <strong>1. Food-101 Benchmark Dataset:</strong> Pretrained on 101 primarily Western categories. Regional Indian dishes are mapped to the closest visual category in the 101 taxonomy unless confirmed or corrected by the user.
                  <br />
                  <strong>2. Freshness & Spoilage:</strong> Visual image classification evaluates photographic patterns only. It <strong>does NOT</strong> determine food freshness, microbial safety, or internal temperatures.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Empty State when no photo loaded */}
      {!previewUrl && !isAnalyzing && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🥗</div>
          <h3>Ready to Analyze Your Food</h3>
          <p>
            Upload a prepared plate photo or meal above. Our Food-101 computer vision model classifies candidate categories
            and prompts you to confirm or correct the dish, ensuring accurate recipes and reliable nutrition.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleImageSelected(null, '/food_hero.jpg')}
          >
            💡 Try with Sample Salmon Quinoa Bowl
          </button>
        </div>
      )}

      {/* Mandatory AI & Medical Disclaimer */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
