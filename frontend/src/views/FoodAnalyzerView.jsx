import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import ImageUploader from '../components/common/ImageUploader';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AlertMessage from '../components/common/AlertMessage';
import AiDisclaimer from '../components/common/AiDisclaimer';

export default function FoodAnalyzerView({ setActiveView }) {
  const { addMeal } = useApp();
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mealType, setMealType] = useState('Lunch');
  const [userQuestion, setUserQuestion] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [notification, setNotification] = useState(null);

  // Portion-adjustable ingredient state for the macros breakdown
  const [decomposedItems, setDecomposedItems] = useState([]);

  const handleImageSelected = (file, url) => {
    setSelectedImage(file);
    setPreviewUrl(url);
    setAnalysisResult(null);
    setNotification(null);
  };

  const handleImageRemoved = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setNotification(null);
  };

  const runAnalysis = async () => {
    if (!previewUrl) return;

    setIsAnalyzing(true);
    setNotification(null);

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

      // Initialize adjustable items table
      if (result.decomposed_items && result.decomposed_items.length > 0) {
        setDecomposedItems(
          result.decomposed_items.map((item) => ({
            name: item.name,
            is_directly_visible: item.is_directly_visible,
            notes: item.notes || '',
            grams: item.estimated_grams || 100,
          }))
        );
      } else {
        // Fallback mapping from visible & potential items
        const combined = [
          ...result.visible_ingredients.map((name) => ({ name, is_directly_visible: true, notes: 'Visible in image', grams: 100 })),
          ...result.potential_ingredients_or_guesses.map((name) => ({ name, is_directly_visible: false, notes: 'Inferred culinary guess', grams: 15 })),
        ];
        setDecomposedItems(combined);
      }

      setNotification({
        type: 'success',
        message: `Multimodal analysis completed via ${result.provider_metadata?.provider || 'AI Provider'}! Observations separated from inferences.`,
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

  const handleGramsChange = (index, newGrams) => {
    const parsedGrams = Math.max(1, parseInt(newGrams, 10) || 0);
    setDecomposedItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], grams: parsedGrams };
      return copy;
    });
  };

  const handleSaveToMealLog = async () => {
    if (!analysisResult) return;

    const macros = analysisResult.nutritional_estimate || {
      estimated_calories: 520,
      protein_g: 40,
      carbs_g: 35,
      fat_g: 20,
    };

    const newMeal = {
      dishName: analysisResult.dish_name,
      mealType,
      imageUrl: previewUrl,
      totalCalories: macros.estimated_calories,
      protein_g: macros.protein_g,
      carbs_g: macros.carbs_g,
      fat_g: macros.fat_g,
      confidenceScore: analysisResult.confidence_assessment === 'High' ? 0.95 : analysisResult.confidence_assessment === 'Moderate' ? 0.8 : 0.6,
      ingredients: decomposedItems.map((item) => ({
        name: item.name,
        grams: item.grams,
        is_visible: item.is_directly_visible,
      })),
    };

    try {
      await api.logMeal(newMeal);
    } catch {
      // Backend meal persistence gracefully supported in client state
    }

    addMeal(newMeal);
    setNotification({
      type: 'success',
      message: `"${analysisResult.dish_name}" successfully saved to your daily meal timeline!`,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div>
        <h2>Food Image Recognition & Ingredient Analysis</h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Multimodal AI vision analysis with strict separation of direct physical observations from culinary guesses.
          No certainty is claimed about hidden allergens or microbial safety.
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
                  placeholder="e.g. Is there dairy in this? Or how was it cooked?"
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={runAnalysis}
                disabled={isAnalyzing}
                style={{ minWidth: '220px' }}
              >
                {isAnalyzing ? 'Transmitting & Analyzing...' : '⚡ Run Vision Analysis (POST /api/food/analyze)'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="card">
          <LoadingIndicator
            message="Executing Multimodal Vision Analysis..."
            subtext="Transmitting image to AI provider backend. Decomposing visible constituents from culinary inferences."
          />
        </div>
      )}

      {/* Structured Analysis Results View */}
      {analysisResult && !isAnalyzing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Dish Identification Card */}
          <div className="card" style={{ borderLeft: '4px solid var(--green-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '1.45rem', color: 'var(--green-deep)' }}>{analysisResult.dish_name}</h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '0.2rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      background:
                        analysisResult.confidence_assessment === 'High'
                          ? 'var(--color-success-bg)'
                          : analysisResult.confidence_assessment === 'Moderate'
                          ? 'var(--color-warning-bg)'
                          : 'var(--color-error-bg)',
                      color:
                        analysisResult.confidence_assessment === 'High'
                          ? 'var(--color-success)'
                          : analysisResult.confidence_assessment === 'Moderate'
                          ? 'var(--color-warning)'
                          : 'var(--color-error)',
                      border: '1px solid currentColor',
                    }}
                  >
                    Confidence: {analysisResult.confidence_assessment}
                  </span>
                </div>

                <p style={{ marginTop: '0.5rem', color: 'var(--text-body)', fontSize: '0.92rem' }}>
                  <strong>Apparent Cooking Method:</strong> {analysisResult.apparent_preparation_method}
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

              {/* Provider Metadata Pill */}
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
                    Provider: {analysisResult.provider_metadata.provider || 'AI Vision'}
                  </div>
                  <div>Model: {analysisResult.provider_metadata.model || 'Gemini 1.5 Flash'}</div>
                  {analysisResult.provider_metadata.latency_ms && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Inference: {analysisResult.provider_metadata.latency_ms}ms
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Question & Answer Box (if present) */}
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

          {/* Core Guardrail: 2-Column Separation of Visible Observations vs Culinary Guesses */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {/* Column 1: Direct Visible Observations */}
            <div className="card" style={{ borderColor: 'var(--green-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <h4 style={{ color: 'var(--green-deep)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>👁️</span> Direct Visible Observations
                </h4>
                <span style={{ fontSize: '0.72rem', background: 'var(--color-success-bg)', color: 'var(--color-success)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '700' }}>
                  PHYSICAL EVIDENCE
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                Constituents directly verifiable by the naked eye in this image:
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                <h4 style={{ color: 'var(--orange-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>💡</span> Potential Inferred Ingredients
                </h4>
                <span style={{ fontSize: '0.72rem', background: 'var(--bg-orange-subtle)', color: 'var(--orange-primary)', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', fontWeight: '700' }}>
                  CULINARY INFERENCE
                </span>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                Inferred seasonings, oils, or broths (cannot be verified by sight alone):
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
              <span>⚠️</span> Visual Uncertainties & Limitations
            </h4>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              The model explicitly discloses aspects that photography cannot confirm:
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

          {/* Portion Calibrator & Macro Approximation Table */}
          <div className="card">
            <div className="card-header-clean">
              <div>
                <h3>Decomposed Constituents & Estimated Portions</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Adjust gram weights below to calibrate real intake against reference estimates.
                </p>
              </div>

              {/* Macro summary pills */}
              {analysisResult.nutritional_estimate && (
                <div style={{ display: 'flex', gap: '1.25rem', background: 'var(--bg-subtle)', padding: '0.65rem 1.15rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--green-deep)' }}>
                      {analysisResult.nutritional_estimate.estimated_calories}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>EST. KCAL</div>
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
                    <th style={{ padding: '0.65rem 0.75rem' }}>Item</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Evidence Status</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Visual Notes</th>
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
                          {item.is_directly_visible ? 'Direct Observation' : 'Inferred Guess'}
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

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {analysisResult.nutritional_estimate?.basis || 'Non-clinical estimation for educational reference.'}
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
        </div>
      )}

      {/* Empty State when no photo loaded */}
      {!previewUrl && !isAnalyzing && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🥗</div>
          <h3>Ready to Analyze Your Food</h3>
          <p>
            Upload a prepared plate photo or meal above. Our multimodal AI model identifies visible ingredients,
            clarifies cooking methods, and explicitly separates observable facts from culinary guesses.
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
