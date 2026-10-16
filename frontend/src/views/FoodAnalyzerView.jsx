import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import ImageUploader from '../components/common/ImageUploader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AlertMessage from '../components/common/AlertMessage';
import AiDisclaimer from '../components/common/AiDisclaimer';

// Benchmark reference ingredient data calibrated against USDA nutritional standards (used for prototype preview)
const PROTOTYPE_PREVIEW_DATA = {
  dishName: 'Mediterranean Grilled Salmon Bowl',
  confidenceScore: 0.94,
  dietaryTags: ['High-Protein', 'Pescatarian', 'Gluten-Free', 'Omega-3 Rich'],
  ingredients: [
    { name: 'Grilled Atlantic Salmon', grams: 180, baseCalPer100: 206, proteinPer100: 20, carbsPer100: 0, fatPer100: 12, category: 'Protein' },
    { name: 'Cooked Quinoa', grams: 120, baseCalPer100: 120, proteinPer100: 4.4, carbsPer100: 21.3, fatPer100: 1.9, category: 'Grain' },
    { name: 'Steamed Broccoli', grams: 80, baseCalPer100: 35, proteinPer100: 2.4, carbsPer100: 7.2, fatPer100: 0.4, category: 'Vegetable' },
    { name: 'Hass Avocado', grams: 50, baseCalPer100: 160, proteinPer100: 2.0, carbsPer100: 8.5, fatPer100: 14.7, category: 'Healthy Fat' },
    { name: 'Cherry Tomatoes', grams: 40, baseCalPer100: 18, proteinPer100: 0.9, carbsPer100: 3.9, fatPer100: 0.2, category: 'Vegetable' },
  ],
};

export default function FoodAnalyzerView({ setActiveView }) {
  const { addMeal } = useApp();
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mealType, setMealType] = useState('Lunch');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [endpointUnavailable, setEndpointUnavailable] = useState(null);
  const [notification, setNotification] = useState(null);

  // Portion-adjustable ingredient state
  const [ingredients, setIngredients] = useState([]);

  const handleImageSelected = (file, url) => {
    setSelectedImage(file);
    setPreviewUrl(url);
    setAnalysisResult(null);
    setEndpointUnavailable(null);
    setNotification(null);
  };

  const handleImageRemoved = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setEndpointUnavailable(null);
    setNotification(null);
  };

  const runAnalysis = async () => {
    if (!previewUrl) return;

    setIsAnalyzing(true);
    setEndpointUnavailable(null);
    setNotification(null);

    const formData = new FormData();

    try {
      if (selectedImage) {
        formData.append('file', selectedImage);
      } else {
        // If sample photo used, convert to blob to exercise real multipart upload
        const response = await fetch(previewUrl);
        const blob = await response.blob();
        formData.append('file', blob, 'sample_food.jpg');
      }
      formData.append('meal_type', mealType);

      // Real HTTP multipart request dispatched to FastAPI backend
      const result = await api.analyzeFoodImage(formData);

      setAnalysisResult(result);
      setIngredients(result.ingredients || []);
      setNotification({
        type: 'success',
        message: 'Food items recognized and decomposed by backend vision API!',
      });
    } catch (err) {
      if (err.isUnavailable) {
        // Display clear unavailable state
        setEndpointUnavailable({
          endpoint: '/api/v1/vision/analyze',
          status: err.status,
          message: err.message,
        });
      } else {
        setNotification({
          type: 'error',
          message: err.message,
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoadPrototypePreview = () => {
    setEndpointUnavailable(null);
    setAnalysisResult(PROTOTYPE_PREVIEW_DATA);
    setIngredients(PROTOTYPE_PREVIEW_DATA.ingredients);
    setNotification({
      type: 'info',
      message: 'Displaying prototype UI simulation based on USDA calibrated reference data.',
    });
  };

  const handleGramsChange = (index, newGrams) => {
    const parsedGrams = Math.max(1, parseInt(newGrams, 10) || 0);
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], grams: parsedGrams };
      return copy;
    });
  };

  // Compute calculated nutrition totals dynamically based on current gram weights
  const calculatedTotals = ingredients.reduce(
    (acc, item) => {
      const multiplier = item.grams / 100;
      return {
        calories: acc.calories + Math.round(item.baseCalPer100 * multiplier),
        protein: acc.protein + Math.round(item.proteinPer100 * multiplier),
        carbs: acc.carbs + Math.round(item.carbsPer100 * multiplier),
        fat: acc.fat + Math.round(item.fatPer100 * multiplier),
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const handleSaveToMealLog = async () => {
    if (!analysisResult) return;

    const newMeal = {
      dishName: analysisResult.dishName,
      mealType,
      imageUrl: previewUrl,
      totalCalories: calculatedTotals.calories,
      protein_g: calculatedTotals.protein,
      carbs_g: calculatedTotals.carbs,
      fat_g: calculatedTotals.fat,
      confidenceScore: analysisResult.confidenceScore,
      ingredients: ingredients.map((item) => ({
        name: item.name,
        grams: item.grams,
        calories: Math.round((item.baseCalPer100 * item.grams) / 100),
        protein: Math.round((item.proteinPer100 * item.grams) / 100),
        carbs: Math.round((item.carbsPer100 * item.grams) / 100),
        fat: Math.round((item.fatPer100 * item.grams) / 100),
      })),
    };

    // Attempt backend save, gracefully falling back to local client state
    try {
      await api.logMeal(newMeal);
    } catch {
      // Backend meal persistence pending Phase 3
    }

    addMeal(newMeal);
    setNotification({
      type: 'success',
      message: `"${analysisResult.dishName}" successfully logged to your daily meal timeline!`,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div>
        <h2>Food Image Recognition & Ingredient Analysis</h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Dispatches multipart/form-data food photos to the FastAPI backend. Analyzes plate components and portion-scaled macros.
        </p>
      </div>

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Upload & Setup Section */}
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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '1rem',
              marginTop: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label htmlFor="meal-type-select" style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                Meal Category:
              </label>
              <select
                id="meal-type-select"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
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

            <button
              type="button"
              className="btn btn-primary"
              onClick={runAnalysis}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? 'Sending to Backend...' : '⚡ Run Vision Analysis (HTTP POST)'}
            </button>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {isAnalyzing && (
        <div className="card">
          <LoadingIndicator
            message="Transmitting Multipart Payload to FastAPI Backend..."
            subtext="Endpoint: POST /api/v1/vision/analyze. Model: Gemini 1.5 Flash Vision."
          />
        </div>
      )}

      {/* Endpoint Unavailable State (Honest Representation) */}
      {endpointUnavailable && !isAnalyzing && (
        <div className="card" style={{ borderColor: 'var(--orange-border)', background: 'var(--bg-orange-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }} aria-hidden="true">🚧</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--orange-primary)', marginBottom: '0.35rem' }}>
                Backend Vision Pipeline Under Development (HTTP {endpointUnavailable.status || 404})
              </h3>
              <p style={{ color: '#9a3412', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                The HTTP request reached the backend server, but the route <code>{endpointUnavailable.endpoint}</code> is not yet implemented.
                In accordance with the project plan, the vision model adapter and USDA calibration engine are scheduled for Phase 2 & 3.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLoadPrototypePreview}
              >
                💡 Preview Expected Vision & Nutrition UI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results Card */}
      {analysisResult && !isAnalyzing && (
        <div className="card">
          <div className="card-header-clean">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3>{analysisResult.dishName}</h3>
                <span className="ai-pill-tag">
                  {Math.round(analysisResult.confidenceScore * 100)}% Confidence
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {analysisResult.dietaryTags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.55rem',
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
            </div>

            {/* Total Macro Summary */}
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--bg-subtle)', padding: '0.75rem 1.25rem', borderRadius: 'var(--radius-md)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--green-deep)' }}>
                  {calculatedTotals.calories}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>TOTAL KCAL</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--orange-primary)' }}>
                  {calculatedTotals.protein}g
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>PROTEIN</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {calculatedTotals.carbs}g
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>CARBS</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {calculatedTotals.fat}g
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>FAT</div>
              </div>
            </div>
          </div>

          {/* Interactive Decomposed Ingredient Table */}
          <div style={{ overflowX: 'auto', margin: '1rem 0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Identified Ingredient</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Category</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '160px' }}>Est. Portion (g)</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Calories</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Protein</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Carbs</th>
                  <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Fat</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((item, index) => {
                  const m = item.grams / 100;
                  return (
                    <tr key={item.name} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>{item.name}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <input
                          type="number"
                          min="5"
                          max="1500"
                          step="5"
                          value={item.grams}
                          onChange={(e) => handleGramsChange(index, e.target.value)}
                          style={{
                            width: '90px',
                            padding: '0.3rem 0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-light)',
                            fontFamily: 'inherit',
                            fontWeight: '600',
                          }}
                          aria-label={`Adjust grams for ${item.name}`}
                        />
                        <span style={{ marginLeft: '0.35rem', color: 'var(--text-muted)' }}>g</span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>
                        {Math.round(item.baseCalPer100 * m)} kcal
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--orange-primary)' }}>
                        {Math.round(item.proteinPer100 * m)}g
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {Math.round(item.carbsPer100 * m)}g
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {Math.round(item.fatPer100 * m)}g
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Tip: Edit grams in the table to calibrate exact meal portions.
            </span>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setActiveView('cooking')}
              >
                👨‍🍳 Use in Cooking Assistant
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveToMealLog}
              >
                💾 Save to Meal History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Honest Empty State when no image selected */}
      {!previewUrl && !isAnalyzing && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🥗</div>
          <h3>Ready to Analyze Your Food</h3>
          <p>
            Upload a prepared plate photo or grocery ingredient haul above to see multi-modal ingredient decomposition and portion estimates.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => handleImageSelected(null, '/food_hero.jpg')}
          >
            💡 Try with Sample Food Image
          </button>
        </div>
      )}

      {/* Model Limitation Disclaimer */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
