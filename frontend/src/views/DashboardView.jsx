import React from 'react';
import { useApp } from '../context/AppContext';
import AiDisclaimer from '../components/common/AiDisclaimer';

export default function DashboardView({ setActiveView }) {
  const { meals, targets, consumedToday, savedRecipes, deleteMeal } = useApp();

  const caloriePct = Math.min(100, Math.round((consumedToday.calories / targets.calories) * 100));
  const proteinPct = Math.min(100, Math.round((consumedToday.protein_g / targets.protein_g) * 100));
  const carbsPct = Math.min(100, Math.round((consumedToday.carbs_g / targets.carbs_g) * 100));
  const fatPct = Math.min(100, Math.round((consumedToday.fat_g / targets.fat_g) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Welcome Banner */}
      <div
        className="card"
        style={{
          padding: '2.5rem',
          background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #0f3d21 100%)',
          color: '#ffffff',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: '2rem',
          alignItems: 'center',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#bbf7d0',
              fontSize: '0.78rem',
              fontWeight: '700',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            NASSCOM FutureSkills GenAI Capstone
          </span>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(1.6rem, 2.5vw, 2.2rem)', marginBottom: '0.75rem' }}>
            Transforming Visual Food Intake & Culinary Health
          </h2>
          <p style={{ color: '#dcfce7', fontSize: '0.98rem', maxWidth: '520px', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Multi-modal food image recognition, zero-waste pantry cooking assistant, and verified nutritional intelligence.
          </p>
          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-orange"
              onClick={() => setActiveView('analyzer')}
            >
              📸 Scan a Plate
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ background: 'rgba(255, 255, 255, 0.12)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.25)' }}
              onClick={() => setActiveView('cooking')}
            >
              👨‍🍳 Cooking Assistant
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          <img
            src="/food_hero.jpg"
            alt="Appetizing Mediterranean food bowl"
            style={{
              maxHeight: '230px',
              width: '100%',
              maxWidth: '360px',
              objectFit: 'cover',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
            }}
          />
        </div>
      </div>

      {/* Daily Macro Progress Summary */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
          <h3>Today's Nutritional Budget</h3>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveView('nutrition')}
          >
            ⚙️ Adjust Targets
          </button>
        </div>

        <div className="grid-cols-4">
          {/* Calories */}
          <div className="card">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Calories
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--green-deep)', margin: '0.35rem 0' }}>
              {consumedToday.calories}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}> / {targets.calories} kcal</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: `${caloriePct}%`, height: '100%', background: 'var(--green-primary)' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
              {caloriePct}% target met
            </div>
          </div>

          {/* Protein */}
          <div className="card">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Protein
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--orange-primary)', margin: '0.35rem 0' }}>
              {consumedToday.protein_g}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}> / {targets.protein_g}g</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: `${proteinPct}%`, height: '100%', background: 'var(--orange-primary)' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
              {proteinPct}% target met
            </div>
          </div>

          {/* Carbs */}
          <div className="card">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Carbohydrates
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', margin: '0.35rem 0' }}>
              {consumedToday.carbs_g}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}> / {targets.carbs_g}g</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: `${carbsPct}%`, height: '100%', background: 'var(--green-medium)' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
              {carbsPct}% target met
            </div>
          </div>

          {/* Fats */}
          <div className="card">
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Healthy Fats
            </span>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)', margin: '0.35rem 0' }}>
              {consumedToday.fat_g}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}> / {targets.fat_g}g</span>
            </div>
            <div style={{ height: '6px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: `${fatPct}%`, height: '100%', background: '#0284c7' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
              {fatPct}% target met
            </div>
          </div>
        </div>
      </div>

      {/* Recent Meal Logs Stream */}
      <div>
        <div className="card-header-clean">
          <div>
            <h3>Recent Logged Meals</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Meals analyzed via vision model and logged to daily timeline.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveView('history')}
          >
            View All History ({meals.length}) →
          </button>
        </div>

        {meals.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {meals.slice(0, 3).map((meal) => (
              <div
                key={meal.id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  padding: '1.25rem',
                  flexWrap: 'wrap',
                }}
              >
                {meal.imageUrl && (
                  <img
                    src={meal.imageUrl}
                    alt={meal.dishName}
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: 'var(--radius-md)',
                      objectFit: 'cover',
                      border: '1px solid var(--border-light)',
                    }}
                  />
                )}
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <h4 style={{ fontSize: '1.05rem' }}>{meal.dishName}</h4>
                    <span className="ai-pill-tag">{meal.mealType}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                    {meal.ingredients?.length || 0} ingredients identified
                  </div>
                </div>

                {/* Macro Pills */}
                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color: 'var(--green-deep)' }}>{meal.totalCalories}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>KCAL</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color: 'var(--orange-primary)' }}>{meal.protein_g}g</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>PROTEIN</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{meal.carbs_g}g</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>CARBS</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{meal.fat_g}g</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>FAT</div>
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setActiveView('history')}
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon" aria-hidden="true">🍽️</div>
            <h3>No Meals Recorded Today</h3>
            <p>
              Capture or upload a plate photo in the Food Analyzer to identify items, compute verified macros, and populate your timeline.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setActiveView('analyzer')}
            >
              📸 Scan Your First Meal
            </button>
          </div>
        )}
      </div>

      {/* Model Disclaimer */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
