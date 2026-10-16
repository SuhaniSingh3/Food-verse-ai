import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import AlertMessage from '../components/common/AlertMessage';
import AiDisclaimer from '../components/common/AiDisclaimer';

export default function NutritionPlannerView() {
  const { targets, updateTargets, consumedToday } = useApp();
  const [formTargets, setFormTargets] = useState({ ...targets });
  const [notification, setNotification] = useState(null);

  const handleSliderChange = (field, value) => {
    setFormTargets((prev) => ({
      ...prev,
      [field]: parseInt(value, 10) || 0,
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateTargets(formTargets);
    setNotification({
      type: 'success',
      message: 'Nutritional targets updated! Dashboard and progress gauges have synchronized.',
    });
  };

  // Quick preset macro splits
  const applyPreset = (presetName) => {
    let newTargets = { ...formTargets };
    if (presetName === 'high_protein') {
      newTargets = { ...newTargets, calories: 2200, protein_g: 165, carbs_g: 190, fat_g: 65, goal: 'High Protein / Lean Muscle' };
    } else if (presetName === 'balanced') {
      newTargets = { ...newTargets, calories: 2000, protein_g: 125, carbs_g: 225, fat_g: 60, goal: 'Balanced Maintenance' };
    } else if (presetName === 'low_carb') {
      newTargets = { ...newTargets, calories: 1900, protein_g: 140, carbs_g: 95, fat_g: 105, goal: 'Low-Carb / Keto Friendly' };
    }
    setFormTargets(newTargets);
  };

  // Remaining budget
  const remainingCal = Math.max(0, targets.calories - consumedToday.calories);
  const remainingProtein = Math.max(0, targets.protein_g - consumedToday.protein_g);
  const remainingCarbs = Math.max(0, targets.carbs_g - consumedToday.carbs_g);
  const remainingFat = Math.max(0, targets.fat_g - consumedToday.fat_g);

  // Macro calorie energy contribution (P:4, C:4, F:9)
  const proteinCal = consumedToday.protein_g * 4;
  const carbsCal = consumedToday.carbs_g * 4;
  const fatCal = consumedToday.fat_g * 9;
  const totalMacroCal = proteinCal + carbsCal + fatCal || 1;

  const proteinPctEnergy = Math.round((proteinCal / totalMacroCal) * 100);
  const carbsPctEnergy = Math.round((carbsCal / totalMacroCal) * 100);
  const fatPctEnergy = Math.round((fatCal / totalMacroCal) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h2>Personalized Nutrition Planner</h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Configure personalized calorie and macronutrient targets grounded in reliable nutritional benchmarks.
        </p>
      </div>

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Today's Remaining Budget Overview Card */}
      <div className="card" style={{ background: 'var(--bg-accent-subtle)', borderColor: 'var(--green-border)' }}>
        <div className="card-header-clean" style={{ borderColor: 'var(--green-border)' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--green-deep)', textTransform: 'uppercase' }}>
              Current Daily Status
            </span>
            <h3 style={{ color: 'var(--green-deep)' }}>Remaining Nutritional Budget</h3>
          </div>
          <span className="ai-pill-tag" style={{ background: '#ffffff', color: 'var(--green-deep)', borderColor: 'var(--green-border)' }}>
            Goal: {targets.goal}
          </span>
        </div>

        <div className="grid-cols-4" style={{ marginTop: '0.5rem' }}>
          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>REMAINING CALORIES</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--green-deep)', marginTop: '0.2rem' }}>
              {remainingCal} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>kcal</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {targets.calories} daily budget</div>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>REMAINING PROTEIN</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--orange-primary)', marginTop: '0.2rem' }}>
              {remainingProtein} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>g</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {targets.protein_g}g daily goal</div>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>REMAINING CARBS</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {remainingCarbs} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>g</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {targets.carbs_g}g daily goal</div>
          </div>

          <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>REMAINING FATS</span>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {remainingFat} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>g</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of {targets.fat_g}g daily goal</div>
          </div>
        </div>

        {/* Macro Energy Distribution Bar */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(22, 101, 52, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.4rem' }}>
            <span>Consumed Energy Ratio:</span>
            <span>
              Protein: {proteinPctEnergy}% • Carbs: {carbsPctEnergy}% • Fat: {fatPctEnergy}%
            </span>
          </div>
          <div style={{ height: '8px', display: 'flex', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ width: `${proteinPctEnergy}%`, background: 'var(--orange-primary)' }} title={`Protein: ${proteinPctEnergy}%`} />
            <div style={{ width: `${carbsPctEnergy}%`, background: 'var(--green-medium)' }} title={`Carbs: ${carbsPctEnergy}%`} />
            <div style={{ width: `${fatPctEnergy}%`, background: '#0284c7' }} title={`Fat: ${fatPctEnergy}%`} />
          </div>
        </div>
      </div>

      {/* Target Configurator Form */}
      <form onSubmit={handleSave} className="card">
        <div className="card-header-clean">
          <div>
            <h3>Customize Your Nutritional Goals</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              Adjust targets or choose a preset based on your health objectives.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset('high_protein')}
            >
              High-Protein
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset('balanced')}
            >
              Balanced
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset('low_carb')}
            >
              Low-Carb
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="goal-name-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.35rem' }}>
              PRIMARY HEALTH OBJECTIVE
            </label>
            <input
              id="goal-name-input"
              type="text"
              value={formTargets.goal}
              onChange={(e) => setFormTargets((prev) => ({ ...prev, goal: e.target.value }))}
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontFamily: 'inherit',
                fontSize: '0.9rem',
              }}
            />
          </div>

          {/* Calorie Target Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <label htmlFor="cal-slider" style={{ fontSize: '0.88rem', fontWeight: '600' }}>
                Daily Calorie Ceiling:
              </label>
              <span style={{ fontWeight: '800', color: 'var(--green-deep)' }}>
                {formTargets.calories} kcal
              </span>
            </div>
            <input
              id="cal-slider"
              type="range"
              min="1200"
              max="4000"
              step="50"
              value={formTargets.calories}
              onChange={(e) => handleSliderChange('calories', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--green-primary)' }}
            />
          </div>

          {/* Protein Target Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <label htmlFor="protein-slider" style={{ fontSize: '0.88rem', fontWeight: '600' }}>
                Protein Target (g):
              </label>
              <span style={{ fontWeight: '800', color: 'var(--orange-primary)' }}>
                {formTargets.protein_g}g ({formTargets.protein_g * 4} kcal)
              </span>
            </div>
            <input
              id="protein-slider"
              type="range"
              min="40"
              max="260"
              step="5"
              value={formTargets.protein_g}
              onChange={(e) => handleSliderChange('protein_g', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--orange-primary)' }}
            />
          </div>

          {/* Carbs Target Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <label htmlFor="carbs-slider" style={{ fontSize: '0.88rem', fontWeight: '600' }}>
                Carbohydrates Target (g):
              </label>
              <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>
                {formTargets.carbs_g}g ({formTargets.carbs_g * 4} kcal)
              </span>
            </div>
            <input
              id="carbs-slider"
              type="range"
              min="20"
              max="400"
              step="5"
              value={formTargets.carbs_g}
              onChange={(e) => handleSliderChange('carbs_g', e.target.value)}
              style={{ width: '100%', accentColor: 'var(--green-medium)' }}
            />
          </div>

          {/* Fat Target Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <label htmlFor="fat-slider" style={{ fontSize: '0.88rem', fontWeight: '600' }}>
                Healthy Fat Target (g):
              </label>
              <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>
                {formTargets.fat_g}g ({formTargets.fat_g * 9} kcal)
              </span>
            </div>
            <input
              id="fat-slider"
              type="range"
              min="20"
              max="150"
              step="5"
              value={formTargets.fat_g}
              onChange={(e) => handleSliderChange('fat_g', e.target.value)}
              style={{ width: '100%', accentColor: '#0284c7' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
            <button type="submit" className="btn btn-primary">
              💾 Save Nutritional Targets
            </button>
          </div>
        </div>
      </form>

      {/* Model Disclaimer */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
