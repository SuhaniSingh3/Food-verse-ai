import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import ConfirmModal from '../components/common/ConfirmModal';
import AlertMessage from '../components/common/AlertMessage';
import AiDisclaimer from '../components/common/AiDisclaimer';

export default function MealHistoryView({ setActiveView }) {
  const { meals, deleteMeal, clearAllMeals } = useApp();
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [mealToDelete, setMealToDelete] = useState(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [notification, setNotification] = useState(null);
  const [backendSyncStatus, setBackendSyncStatus] = useState('checking'); // 'checking' | 'synced' | 'local_only'

  useEffect(() => {
    async function checkBackendMeals() {
      try {
        await api.getMealHistory();
        setBackendSyncStatus('synced');
      } catch (err) {
        if (err.isUnavailable) {
          // Endpoint not implemented yet (scheduled for Phase 3)
          setBackendSyncStatus('local_only');
        } else {
          setBackendSyncStatus('local_only');
        }
      }
    }
    checkBackendMeals();
  }, []);

  // Filtered meals: reactive immediately as user types, case-insensitive, ignores leading/trailing spaces
  const cleanQuery = searchQuery.trim().toLowerCase();

  const filteredMeals = meals.filter((meal) => {
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

    // 4. Top predictions array (Food-101 classifier results)
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

  // Calculate totals for filtered meals
  const totals = filteredMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.totalCalories || 0),
      protein: acc.protein + (m.protein_g || 0),
      carbs: acc.carbs + (m.carbs_g || 0),
      fat: acc.fat + (m.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const confirmDeleteMeal = async () => {
    if (mealToDelete) {
      try {
        await api.deleteMeal(mealToDelete.id);
      } catch {
        // Backend delete pending Phase 3
      }
      deleteMeal(mealToDelete.id);
      setNotification({
        type: 'info',
        message: `"${mealToDelete.dishName}" removed from meal history.`,
      });
      setMealToDelete(null);
    }
  };

  const confirmClearAll = () => {
    try {
      clearAllMeals();
      setSearchQuery('');
      setShowClearAllModal(false);
      setNotification({
        type: 'success',
        message: 'Analysis history cleared successfully.',
      });
    } catch (err) {
      setShowClearAllModal(false);
      setNotification({
        type: 'error',
        message: `Failed to clear analysis history: ${err.message || 'Unknown error'}`,
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2>Meal History & Nutritional Logs</h2>
            <span
              className="ai-pill-tag"
              style={{
                background: backendSyncStatus === 'synced' ? 'var(--color-success-bg)' : 'var(--bg-subtle)',
                color: backendSyncStatus === 'synced' ? 'var(--color-success)' : 'var(--text-muted)',
                borderColor: backendSyncStatus === 'synced' ? 'var(--green-border)' : 'var(--border-light)',
              }}
              title="Indicates whether meal history is syncing with FastAPI backend SQLite database or persisting locally"
            >
              {backendSyncStatus === 'synced' && '● Backend Database Synced'}
              {backendSyncStatus === 'checking' && '○ Checking Backend Sync...'}
              {backendSyncStatus === 'local_only' && '○ Persistent Client Mode (GET /api/v1/meals pending Phase 3)'}
            </span>
          </div>
          <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
            Chronological record of recognized and logged meals with ingredient decompositions.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => setShowClearAllModal(true)}
          disabled={meals.length === 0}
          title={meals.length === 0 ? 'No history to clear' : 'Clear all analysis history entries'}
        >
          🗑️ Clear History
        </button>
      </div>

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
              <button
                key={type}
                type="button"
                className={`btn btn-sm ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterType(type)}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              minWidth: '260px',
              flex: 1,
              maxWidth: '420px',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '0.75rem',
                color: 'var(--text-dim)',
                fontSize: '0.9rem',
                pointerEvents: 'none',
              }}
              aria-hidden="true"
            >
              🔍
            </span>
            <input
              id="history-search-input"
              type="text"
              placeholder="Search history by food name, predicted label, or confirmed dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 2.2rem 0.5rem 2.2rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-card, #fff)',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
              }}
              aria-label="Search analysis history"
            />
            {searchQuery && (
              <button
                type="button"
                id="clear-search-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search query"
                aria-label="Clear search query"
                style={{
                  position: 'absolute',
                  right: '0.6rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem',
                  padding: '0.2rem 0.4rem',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Aggregated Filtered Totals Bar */}
        {filteredMeals.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: '1.5rem',
              marginTop: '1rem',
              paddingTop: '0.85rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
              color: 'var(--text-muted)',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <span>
              Showing: <strong>{filteredMeals.length}</strong> of <strong>{meals.length}</strong> {meals.length === 1 ? 'analysis' : 'analyses'}
            </span>
            {cleanQuery && (
              <span
                style={{
                  background: 'var(--bg-subtle, #f3f4f6)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.78rem',
                }}
              >
                Filtered by: "<em>{cleanQuery}</em>"
              </span>
            )}
            <span>Filtered Energy: <strong style={{ color: 'var(--green-deep)' }}>{totals.calories} kcal</strong></span>
            <span>Protein: <strong style={{ color: 'var(--orange-primary)' }}>{totals.protein}g</strong></span>
            <span>Carbs: <strong>{totals.carbs}g</strong></span>
            <span>Fat: <strong>{totals.fat}g</strong></span>
          </div>
        )}
      </div>

      {/* Meal List */}
      {filteredMeals.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {filteredMeals.map((meal) => (
            <div key={meal.id} className="card">
              <div className="card-header-clean">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {meal.imageUrl && (
                    <img
                      src={meal.imageUrl}
                      alt={meal.dishName}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: 'var(--radius-md)',
                        objectFit: 'cover',
                        border: '1px solid var(--border-light)',
                      }}
                    />
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <h3>{meal.dishName || meal.foodName}</h3>
                      <span className="ai-pill-tag">{meal.mealType}</span>
                      {meal.isConfirmed && (
                        <span
                          className="ai-pill-tag"
                          style={{
                            background: 'var(--color-success-bg, #ecfdf5)',
                            color: 'var(--color-success, #059669)',
                            borderColor: 'var(--green-border, #10b981)',
                            fontSize: '0.72rem',
                          }}
                        >
                          ✓ Confirmed
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Logged on {new Date(meal.timestamp).toLocaleDateString()} at{' '}
                      {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {meal.predictedLabel && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
                        <span>Predicted label: <strong>{meal.predictedLabel}</strong></span>
                        {meal.confirmedDish && meal.confirmedDish.toLowerCase() !== meal.predictedLabel.toLowerCase() && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--green-deep)' }}>
                            • Confirmed dish: <strong>{meal.confirmedDish}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--green-deep)' }}>
                      {meal.totalCalories} kcal
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {meal.protein_g}g P • {meal.carbs_g}g C • {meal.fat_g}g F
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setMealToDelete(meal)}
                    title="Delete meal entry"
                    aria-label={`Delete ${meal.dishName}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Decomposed items list */}
              {meal.ingredients && meal.ingredients.length > 0 && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Decomposed Ingredients
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {meal.ingredients.map((ing, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.8rem',
                          background: 'var(--bg-subtle)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        {ing.name} ({ing.grams}g — {ing.calories} kcal)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">{meals.length === 0 ? '📖' : '🔍'}</div>
          <h3>{meals.length === 0 ? 'No analysis history yet.' : 'No matching analyses found'}</h3>
          <p>
            {meals.length === 0
              ? 'Your analysis history is currently empty. Upload and analyze a food image to record entries.'
              : cleanQuery
                ? `No past food analyses match "${searchQuery.trim()}". Check your spelling or try clearing the search.`
                : `No analyses found for category "${filterType}". Try selecting "All" to view all recorded analyses.`}
          </p>
          {meals.length > 0 && (
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.75rem' }}>
              <button
                type="button"
                id="reset-search-btn"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('All');
                }}
              >
                Clear Search & Filters
              </button>
            </div>
          )}
          {meals.length === 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveView('analyzer')}
            >
              📸 Scan Food in Analyzer
            </button>
          )}
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={!!mealToDelete}
        title="Delete Meal Log"
        message={`Are you sure you want to delete "${mealToDelete?.dishName}" from your meal history? This will recalculate today's nutritional budget.`}
        confirmText="Delete Meal"
        isDanger={true}
        onConfirm={confirmDeleteMeal}
        onCancel={() => setMealToDelete(null)}
      />

      <ConfirmModal
        isOpen={showClearAllModal}
        title="Clear Analysis History"
        message="Are you sure you want to clear your analysis history?"
        confirmText="Clear History"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmClearAll}
        onCancel={() => setShowClearAllModal(false)}
      />

      {/* Limitation Notice */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
