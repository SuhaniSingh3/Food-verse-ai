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

  // Filtered meals
  const filteredMeals = meals.filter((meal) => {
    const matchesType = filterType === 'All' || meal.mealType === filterType;
    const matchesSearch =
      !searchQuery ||
      meal.dishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      meal.ingredients?.some((ing) => ing.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
    clearAllMeals();
    setShowClearAllModal(false);
    setNotification({
      type: 'warning',
      message: 'All meal logs have been cleared from local storage.',
    });
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

        {meals.length > 0 && (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setShowClearAllModal(true)}
          >
            🗑️ Clear All History
          </button>
        )}
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
          <div style={{ minWidth: '240px', flex: 1, maxWidth: '380px' }}>
            <input
              type="text"
              placeholder="Search by dish or ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
              }}
              aria-label="Search meal history"
            />
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
            }}
          >
            <span>Showing: <strong>{filteredMeals.length} meal(s)</strong></span>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <h3>{meal.dishName}</h3>
                      <span className="ai-pill-tag">{meal.mealType}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      Logged on {new Date(meal.timestamp).toLocaleDateString()} at{' '}
                      {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
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
          <div className="empty-state-icon" aria-hidden="true">📖</div>
          <h3>No Meals Found</h3>
          <p>
            {searchQuery || filterType !== 'All'
              ? 'No meals matched your search query or filter. Try clearing the filter.'
              : 'Your meal timeline is empty. Analyze a plate to log your first meal.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setActiveView('analyzer')}
          >
            📸 Scan Food in Analyzer
          </button>
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
        title="Clear Entire Meal History"
        message="Are you sure you want to delete all historical meal entries? This action cannot be undone."
        confirmText="Clear All History"
        isDanger={true}
        onConfirm={confirmClearAll}
        onCancel={() => setShowClearAllModal(false)}
      />

      {/* Limitation Notice */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
