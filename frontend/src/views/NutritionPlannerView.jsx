import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import AlertMessage from '../components/common/AlertMessage';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AiDisclaimer from '../components/common/AiDisclaimer';

const PRESET_MEALS = [
  {
    label: '🥘 Pav Bhaji Plate',
    items: [
      { name: 'Pav / Soft Bread Rolls', grams: 120 },
      { name: 'Mixed Vegetable Bhaji Mash', grams: 220 },
      { name: 'Dairy Butter', grams: 25 },
      { name: 'Diced Raw Onions & Lemon', grams: 30 },
    ],
  },
  {
    label: '🍗 Chicken Breast & Rice',
    items: [
      { name: 'Chicken Breast', grams: 160 },
      { name: 'White Rice', grams: 150 },
      { name: 'Steamed Broccoli', grams: 100 },
      { name: 'Olive Oil', grams: 10 },
    ],
  },
  {
    label: '🍳 Power Breakfast',
    items: [
      { name: 'Eggs', grams: 120 },
      { name: 'Rolled Oats', grams: 50 },
      { name: 'Banana', grams: 100 },
      { name: 'Greek Yogurt', grams: 120 },
    ],
  },
  {
    label: '🥗 Mediterranean Salad',
    items: [
      { name: 'Tomato', grams: 120 },
      { name: 'Spinach', grams: 80 },
      { name: 'Avocado', grams: 50 },
      { name: 'Lemon', grams: 20 },
      { name: 'Olive Oil', grams: 15 },
    ],
  },
];

export default function NutritionPlannerView() {
  const { nutritionSeedItems, activeConfirmedDish, dishNutritionReference } = useApp();

  // Default to empty array or seeded items from confirmed dish (Requirement 1 & 2: Remove hardcoded salmon demo results)
  const [items, setItems] = useState(() => (nutritionSeedItems && nutritionSeedItems.length > 0 ? nutritionSeedItems : []));

  const [isLoading, setIsLoading] = useState(false);
  const [nutritionData, setNutritionData] = useState(null);
  const [notification, setNotification] = useState(null);

  // Sync with seeded items from Food Analysis or Recipe Generator if updated (Requirement 7)
  const [lastSeed, setLastSeed] = useState(nutritionSeedItems);
  if (nutritionSeedItems !== lastSeed) {
    setLastSeed(nutritionSeedItems);
    setItems(nutritionSeedItems || []);
    setNutritionData(null);
  }

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const copy = [...prev];
      if (field === 'grams') {
        copy[index] = { ...copy[index], grams: Math.max(1, parseFloat(value) || 0) };
      } else {
        copy[index] = { ...copy[index], name: value };
      }
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { name: '', grams: 100 }]);
  };

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyPreset = (preset) => {
    setItems(preset.items);
    setNutritionData(null);
    setNotification(null);
  };

  const handleCalculate = async () => {
    const validItems = items
      .map((item) => ({ name: item.name.trim(), grams: item.grams }))
      .filter((item) => item.name && item.grams > 0);

    if (validItems.length === 0) {
      setNotification({
        type: 'warning',
        message: 'Please add at least one ingredient with a valid name and gram weight.',
      });
      return;
    }

    setIsLoading(true);
    setNotification(null);

    try {
      const response = await api.calculateNutrition({ items: validItems });
      setNutritionData(response);
      setNotification({
        type: 'success',
        message: `Successfully calculated nutrition for ${response.items?.length || validItems.length} ingredients using verified USDA reference benchmarks.`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to calculate nutrition. Please ensure the backend is running.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Macro calorie energy contribution (Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g)
  const totals = nutritionData?.totals;
  const proteinCal = totals ? totals.protein_g * 4 : 0;
  const carbsCal = totals ? totals.carbs_g * 4 : 0;
  const fatCal = totals ? totals.fat_g * 9 : 0;
  const totalMacroCal = proteinCal + carbsCal + fatCal || 1;

  const proteinPct = Math.round((proteinCal / totalMacroCal) * 100);
  const carbsPct = Math.round((carbsCal / totalMacroCal) * 100);
  const fatPct = Math.round((fatCal / totalMacroCal) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div>
        <h2>Basic Nutrition Information</h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Accurate caloric and macronutrient calculation grounded in verified USDA FoodData Central reference benchmarks.
        </p>
      </div>

      {activeConfirmedDish && (
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--green-primary)',
            background: 'var(--bg-accent-subtle, #f0fdf4)',
            borderColor: 'var(--green-border, #86efac)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--green-deep, #14532d)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Confirmed Food Dish from Image Analysis
              </span>
              <h3 style={{ color: 'var(--green-deep, #14532d)', marginTop: '0.2rem', fontSize: '1.25rem' }}>
                🍽️ {activeConfirmedDish}
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted, #4b5563)', marginTop: '0.2rem', maxWidth: '650px' }}>
                Serving-Size Assumption: Standard plate serving (~350g). Nutritional values are approximate culinary baselines, not exact chemical measurements extracted from an image.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCalculate}
              disabled={isLoading || items.length === 0}
            >
              {isLoading ? 'Calculating...' : '⚡ Calculate Itemized Breakdown'}
            </button>
          </div>

          {dishNutritionReference ? (
            <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(22, 101, 52, 0.15)' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--green-deep, #14532d)', marginBottom: '0.5rem' }}>
                Approximate Reference Values (Typical Standard Serving):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--green-border, #86efac)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-dim)' }}>APPROX. ENERGY</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--green-deep, #14532d)' }}>
                    ~{dishNutritionReference.estimated_calories || 490} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>kcal</span>
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--green-border, #86efac)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-dim)' }}>APPROX. PROTEIN</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--orange-primary)' }}>
                    ~{dishNutritionReference.protein_g} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>g</span>
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--green-border, #86efac)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-dim)' }}>APPROX. CARBS</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    ~{dishNutritionReference.carbs_g} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>g</span>
                  </div>
                </div>
                <div style={{ background: '#ffffff', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--green-border, #86efac)' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-dim)' }}>APPROX. FAT</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    ~{dishNutritionReference.fat_g} <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>g</span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.65rem', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Basis: {dishNutritionReference.basis || 'Approximate reference benchmark for standard serving'}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.84rem' }}>
              ⚠️ Pre-calculated reference data is unavailable for &quot;{activeConfirmedDish}&quot;. Use the itemized ingredient portion calculator below to compute grounded USDA values.
            </div>
          )}
        </div>
      )}

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Preset Quick Actions */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--green-deep)' }}>Quick Meal Presets</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Select a benchmark dish or construct your own custom ingredient portion list below.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
          {PRESET_MEALS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleApplyPreset(preset)}
              style={{ fontWeight: '600' }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ingredient Input Table Card */}
      <div className="card">
        <div className="card-header-clean">
          <div>
            <h3>Ingredients & Portion Weights</h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Enter ingredient names and gram weights to query nutritional reference values.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleAddItem}
          >
            + Add Ingredient
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem 1rem' }}>
            <div className="empty-state-icon" aria-hidden="true">🥗</div>
            <h4>No Ingredients in List</h4>
            <p>Click &quot;+ Add Ingredient&quot; or choose a preset above to begin calculating nutrition.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.65rem 0.75rem' }}>#</th>
                  <th style={{ padding: '0.65rem 0.75rem' }}>Ingredient Name</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '180px' }}>Weight (grams)</th>
                  <th style={{ padding: '0.65rem 0.75rem', width: '80px', textAlign: 'center' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                        placeholder="e.g. Pav / Soft Bread Rolls, Potatoes, Peas, Butter, Rice"
                        style={{
                          width: '100%',
                          padding: '0.45rem 0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-light)',
                          fontFamily: 'inherit',
                          fontSize: '0.9rem',
                        }}
                      />
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          step="5"
                          value={item.grams}
                          onChange={(e) => handleItemChange(index, 'grams', e.target.value)}
                          style={{
                            width: '100px',
                            padding: '0.45rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-light)',
                            fontFamily: 'inherit',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                          }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>g</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveItem(index)}
                        title="Remove ingredient"
                        aria-label={`Remove ${item.name || 'ingredient'}`}
                        style={{ padding: '0.25rem 0.6rem' }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleCalculate}
            disabled={isLoading || items.length === 0}
            style={{ minWidth: '220px' }}
          >
            {isLoading ? 'Calculating...' : '⚡ Calculate Nutrition (POST /api/v1/nutrition/calculate)'}
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="card">
          <LoadingIndicator
            message="Calculating Grounded Nutrition..."
            subtext="Querying USDA reference density tables and calculating caloric and macronutrient breakdown."
          />
        </div>
      )}

      {/* Nutrition Calculation Results */}
      {nutritionData && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Grand Totals Card */}
          <div className="card" style={{ borderColor: 'var(--green-border)', background: 'var(--bg-accent-subtle)' }}>
            <div className="card-header-clean" style={{ borderColor: 'var(--green-border)' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--green-deep)', textTransform: 'uppercase' }}>
                  Meal Nutrition Overview (Approximate Estimation)
                </span>
                <h3 style={{ color: 'var(--green-deep)' }}>Calculated Energy &amp; Macronutrient Totals</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Serving-Size Assumption: Values are approximate totals based on entered gram weights and USDA reference densities. Image analysis does not produce lab-grade measurements.
                </p>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  background: '#ffffff',
                  color: 'var(--green-deep)',
                  border: '1px solid var(--green-border)',
                }}
              >
                {nutritionData.calibrated_against || 'USDA Reference Calibrated'}
              </span>
            </div>

            {/* 4 KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
              <div style={{ background: '#ffffff', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>TOTAL ENERGY</span>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--green-deep)', marginTop: '0.2rem' }}>
                  {nutritionData.totals.calories} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>kcal</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cumulative meal calories</div>
              </div>

              <div style={{ background: '#ffffff', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>TOTAL PROTEIN</span>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--orange-primary)', marginTop: '0.2rem' }}>
                  {nutritionData.totals.protein_g} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>g</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{proteinCal} kcal ({proteinPct}%)</div>
              </div>

              <div style={{ background: '#ffffff', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>TOTAL CARBOHYDRATES</span>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {nutritionData.totals.carbs_g} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>g</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{carbsCal} kcal ({carbsPct}%)</div>
              </div>

              <div style={{ background: '#ffffff', padding: '1.15rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--green-border)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-dim)' }}>TOTAL FATS</span>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.2rem' }}>
                  {nutritionData.totals.fat_g} <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>g</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fatCal} kcal ({fatPct}%)</div>
              </div>
            </div>

            {/* Macro Energy Distribution Bar */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(22, 101, 52, 0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.4rem' }}>
                <span>Macro Caloric Ratio:</span>
                <span>
                  Protein: {proteinPct}% • Carbs: {carbsPct}% • Fat: {fatPct}%
                </span>
              </div>
              <div style={{ height: '10px', display: 'flex', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ width: `${proteinPct}%`, background: 'var(--orange-primary)' }} title={`Protein: ${proteinPct}%`} />
                <div style={{ width: `${carbsPct}%`, background: 'var(--green-medium)' }} title={`Carbs: ${carbsPct}%`} />
                <div style={{ width: `${fatPct}%`, background: '#0284c7' }} title={`Fat: ${fatPct}%`} />
              </div>
            </div>
          </div>

          {/* Itemized Breakdown Table */}
          <div className="card">
            <div className="card-header-clean">
              <div>
                <h3>Ingredient Nutritional Breakdown (Approximate)</h3>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  Detailed density values per portion weight.
                </p>
              </div>
            </div>

            {nutritionData.items.some((i) => !i.is_benchmark_match) && (
              <div style={{ marginBottom: '1rem', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.82rem' }}>
                ℹ️ Note: Some ingredient items were not found in standard USDA benchmark tables and used a generic baseline estimate.
              </div>
            )}

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Ingredient</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Portion</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Calories</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Protein</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Carbs</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Fat</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Reference Benchmark</th>
                  </tr>
                </thead>
                <tbody>
                  {nutritionData.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: '600' }}>{item.name}</td>
                      <td style={{ padding: '0.75rem' }}>{item.grams}g</td>
                      <td style={{ padding: '0.75rem', fontWeight: '700', color: 'var(--green-deep)' }}>
                        {item.calories} kcal
                      </td>
                      <td style={{ padding: '0.75rem', color: 'var(--orange-primary)', fontWeight: '600' }}>
                        {item.protein_g}g
                      </td>
                      <td style={{ padding: '0.75rem' }}>{item.carbs_g}g</td>
                      <td style={{ padding: '0.75rem' }}>{item.fat_g}g</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            background: item.is_benchmark_match ? 'var(--color-success-bg)' : 'var(--bg-subtle)',
                            color: item.is_benchmark_match ? 'var(--color-success)' : 'var(--text-muted)',
                            fontWeight: '700',
                            border: '1px solid currentColor',
                          }}
                        >
                          {item.is_benchmark_match ? '✓ USDA Match' : '• Generic Baseline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Model Disclaimer */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
