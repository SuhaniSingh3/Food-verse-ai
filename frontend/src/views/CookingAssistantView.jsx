import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AlertMessage from '../components/common/AlertMessage';
import AiDisclaimer from '../components/common/AiDisclaimer';

const STAPLE_SUGGESTIONS = [
  'Olive Oil', 'Garlic', 'Onion', 'Eggs', 'Lemon', 'Black Pepper', 'Sea Salt', 'Rice', 'Soy Sauce', 'Spinach', 'Tomato', 'Pasta'
];

const COMMON_ALLERGENS = [
  'Peanuts', 'Tree Nuts', 'Dairy', 'Gluten', 'Shellfish', 'Eggs', 'Soy', 'Sesame'
];

export default function CookingAssistantView() {
  const { saveRecipe, savedRecipes } = useApp();

  // User Inputs
  const [ingredients, setIngredients] = useState(['Salmon', 'Quinoa', 'Broccoli', 'Lemon', 'Garlic']);
  const [inputValue, setInputValue] = useState('');
  const [cuisine, setCuisine] = useState('Mediterranean');
  const [dietaryPreference, setDietaryPreference] = useState('Standard');
  const [allergies, setAllergies] = useState([]);
  const [customAvoidInput, setCustomAvoidInput] = useState('');
  const [servings, setServings] = useState(2);
  const [maxCookTime, setMaxCookTime] = useState(30);
  const [skillLevel, setSkillLevel] = useState('Beginner');

  // Request & UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState(null);
  const [notification, setNotification] = useState(null);
  const [copiedRecipeId, setCopiedRecipeId] = useState(null);
  const [activeServingsMap, setActiveServingsMap] = useState({});

  // 1. Pantry Ingredient Management
  const handleAddIngredient = (item) => {
    const trimmed = item.trim();
    if (trimmed && !ingredients.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
      setIngredients((prev) => [...prev, trimmed]);
      setInputValue('');
    }
  };

  const handleRemoveIngredient = (itemToRemove) => {
    setIngredients((prev) => prev.filter((i) => i !== itemToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIngredient(inputValue);
    }
  };

  // 2. Allergen & Avoidance Selection
  const toggleAllergen = (allergen) => {
    setAllergies((prev) =>
      prev.includes(allergen) ? prev.filter((a) => a !== allergen) : [...prev, allergen]
    );
  };

  const handleAddCustomAvoid = () => {
    const trimmed = customAvoidInput.trim();
    if (trimmed && !allergies.some((a) => a.toLowerCase() === trimmed.toLowerCase())) {
      setAllergies((prev) => [...prev, trimmed]);
      setCustomAvoidInput('');
    }
  };

  // 3. Recipe Generation API Dispatch
  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      setNotification({
        type: 'warning',
        message: 'Please add at least one pantry ingredient to synthesize recipes.',
      });
      return;
    }

    if (servings < 1 || servings > 12) {
      setNotification({
        type: 'warning',
        message: 'Servings must be between 1 and 12.',
      });
      return;
    }

    setIsGenerating(true);
    setNotification(null);

    const payload = {
      ingredients,
      cuisine,
      dietary_preference: dietaryPreference,
      allergies_and_avoid: allergies,
      servings,
      max_cook_time_minutes: maxCookTime,
      skill_level: skillLevel,
    };

    try {
      const result = await api.generateRecipes(payload);
      const recipesList = result.recipes || [];
      setGeneratedRecipes(recipesList);

      // Initialize local serving maps for interactive scaling
      const initialMap = {};
      recipesList.forEach((r) => {
        initialMap[r.id] = r.servings || servings;
      });
      setActiveServingsMap(initialMap);

      setNotification({
        type: 'success',
        message: `Successfully synthesized ${recipesList.length} customized recipes via ${result.provider_metadata?.provider || 'AI Provider'}!`,
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: err.message || 'Failed to synthesize recipes. Check backend connection.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Client-side Interactive Serving Scaler
  const handleScaleServings = (recipeId, newServings) => {
    const validServings = Math.max(1, Math.min(24, parseInt(newServings, 10) || 1));
    setActiveServingsMap((prev) => ({
      ...prev,
      [recipeId]: validServings,
    }));
  };

  // Helper to compute scaled quantity for a specific ingredient
  const getScaledAmount = (recipe, ingredient, currentServings) => {
    const baseServings = recipe.base_servings || recipe.servings || 1;
    const ratio = currentServings / baseServings;
    const scaled = Math.round(ingredient.amount * ratio * 10) / 10;
    return scaled % 1 === 0 ? Math.round(scaled) : scaled;
  };

  // 5. Copy Recipe to Clipboard
  const handleCopyRecipe = async (recipe) => {
    const currentServings = activeServingsMap[recipe.id] || recipe.servings;
    const ingredientsFormatted = recipe.ingredient_quantities
      .map((ing) => {
        const amt = getScaledAmount(recipe, ing, currentServings);
        const note = ing.notes ? ` (${ing.notes})` : '';
        return `• ${amt} ${ing.unit} ${ing.name}${note}`;
      })
      .join('\n');

    const instructionsFormatted = recipe.preparation_steps
      .map((step, idx) => `${idx + 1}. ${step}`)
      .join('\n');

    const substitutionsFormatted =
      recipe.substitutions && recipe.substitutions.length > 0
        ? '\n\nSUGGESTED SUBSTITUTIONS:\n' +
          recipe.substitutions.map((sub) => `- ${sub.original}: ${sub.substitute}`).join('\n')
        : '';

    const recipeText = `
=== ${recipe.title} ===
Cuisine: ${recipe.cuisine} | Servings: ${currentServings} | Prep: ${recipe.prep_time_minutes}m | Cook: ${recipe.cook_time_minutes}m
Description: ${recipe.description}

INGREDIENTS (${currentServings} Servings):
${ingredientsFormatted}

STEP-BY-STEP INSTRUCTIONS:
${instructionsFormatted}${substitutionsFormatted}

ADVISORY:
${recipe.allergen_advisory}
Generated by Food Verse AI Smart Cooking Assistant
`.trim();

    try {
      await navigator.clipboard.writeText(recipeText);
      setCopiedRecipeId(recipe.id);
      setTimeout(() => setCopiedRecipeId(null), 3000);
      setNotification({
        type: 'success',
        message: `"${recipe.title}" copied to clipboard in clean recipe format!`,
      });
    } catch {
      setNotification({
        type: 'error',
        message: 'Could not access clipboard. Please copy manually.',
      });
    }
  };

  const handleSaveRecipe = (recipe) => {
    saveRecipe(recipe);
    setNotification({
      type: 'success',
      message: `"${recipe.title}" saved to your personal recipe box!`,
    });
  };

  const isAlreadySaved = (recipeId) => savedRecipes.some((r) => r.id === recipeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Page Header */}
      <div>
        <h2>Smart Cooking Assistant & Recipe Synthesis</h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Transform whatever you have in your kitchen into tailored, portion-scaled recipes.
          Includes strict allergen avoidance audits and dynamic serving quantity recalculation.
        </p>
      </div>

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Main Pantry & Constraint Formulation Card */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', color: 'var(--green-deep)' }}>1. What Ingredients Do You Have at Home?</h3>

        {/* Input box */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Type an ingredient (e.g., Chicken breast, Rice, Salmon, Avocado, Broccoli) and press Enter"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              fontFamily: 'inherit',
              fontSize: '0.92rem',
            }}
            aria-label="New ingredient input"
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleAddIngredient(inputValue)}
          >
            + Add Ingredient
          </button>
        </div>

        {/* Active ingredient chips */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {ingredients.map((item) => (
            <span
              key={item}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-accent-subtle)',
                color: 'var(--green-deep)',
                border: '1px solid var(--green-border)',
                fontWeight: '600',
                fontSize: '0.85rem',
              }}
            >
              🥗 {item}
              <button
                type="button"
                onClick={() => handleRemoveIngredient(item)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--green-deep)',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  lineHeight: 1,
                }}
                aria-label={`Remove ${item}`}
              >
                ✕
              </button>
            </span>
          ))}
          {ingredients.length === 0 && (
            <span style={{ color: 'var(--color-error)', fontStyle: 'italic', fontSize: '0.88rem' }}>
              ⚠️ At least 1 ingredient is required to synthesize recipes.
            </span>
          )}
        </div>

        {/* Quick staple suggestions */}
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          <span style={{ fontWeight: '600', marginRight: '0.5rem' }}>Quick Add Common Staples:</span>
          {STAPLE_SUGGESTIONS.map((staple) => (
            <button
              key={staple}
              type="button"
              onClick={() => handleAddIngredient(staple)}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.2rem 0.55rem',
                margin: '0.2rem',
                fontSize: '0.78rem',
                cursor: 'pointer',
                color: 'var(--text-body)',
              }}
            >
              + {staple}
            </button>
          ))}
        </div>

        {/* Allergy & Avoidance Section */}
        <div style={{ paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', color: 'var(--orange-primary)' }}>
              2. Strict Allergies & Ingredients to Avoid
            </h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              (Model will strictly prohibit these items and check for cross-contact)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {COMMON_ALLERGENS.map((allergen) => {
              const isSelected = allergies.includes(allergen);
              return (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => toggleAllergen(allergen)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    border: isSelected ? '1px solid var(--orange-primary)' : '1px solid var(--border-light)',
                    background: isSelected ? 'var(--bg-orange-subtle)' : '#ffffff',
                    color: isSelected ? 'var(--orange-primary)' : 'var(--text-body)',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSelected ? `✕ Prohibit ${allergen}` : `+ ${allergen}`}
                </button>
              );
            })}
          </div>

          {/* Custom Avoidance Input */}
          <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '450px' }}>
            <input
              type="text"
              placeholder="Avoid specific ingredient (e.g. Cilantro, Mushroom, Pork)"
              value={customAvoidInput}
              onChange={(e) => setCustomAvoidInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomAvoid();
                }
              }}
              style={{
                flex: 1,
                padding: '0.45rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem',
              }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddCustomAvoid}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Cooking Constraints Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            alignItems: 'end',
          }}
        >
          {/* Cuisine Preference */}
          <div>
            <label htmlFor="cuisine-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              CUISINE PREFERENCE
            </label>
            <select
              id="cuisine-select"
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                background: '#ffffff',
              }}
            >
              <option value="Any">Any Cuisine</option>
              <option value="Mediterranean">Mediterranean</option>
              <option value="Italian">Italian</option>
              <option value="Mexican">Mexican</option>
              <option value="Indian">Indian</option>
              <option value="Asian">Asian Fusion</option>
              <option value="Japanese">Japanese</option>
              <option value="American">American</option>
              <option value="Middle Eastern">Middle Eastern</option>
            </select>
          </div>

          {/* Vegetarian / Dietary Focus */}
          <div>
            <label htmlFor="dietary-filter" style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              DIETARY FOCUS
            </label>
            <select
              id="dietary-filter"
              value={dietaryPreference}
              onChange={(e) => setDietaryPreference(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                background: '#ffffff',
              }}
            >
              <option value="Standard">Standard / Omnivore</option>
              <option value="Vegetarian">Vegetarian (No meat/fish)</option>
              <option value="Vegan">Vegan (Plant-only)</option>
              <option value="Pescatarian">Pescatarian (Fish allowed)</option>
              <option value="High-Protein">High-Protein Focus</option>
              <option value="Keto">Keto / Low-Carb</option>
              <option value="Gluten-Free">Gluten-Free Focus</option>
            </select>
          </div>

          {/* Number of Servings */}
          <div>
            <label htmlFor="servings-input" style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              TARGET SERVINGS: <span style={{ color: 'var(--green-deep)' }}>{servings}</span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                style={{ padding: '0.35rem 0.75rem' }}
                aria-label="Decrease servings"
              >
                -
              </button>
              <input
                id="servings-input"
                type="number"
                min="1"
                max="12"
                value={servings}
                onChange={(e) => setServings(Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)))}
                style={{
                  width: '60px',
                  textAlign: 'center',
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  fontWeight: '700',
                }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setServings((s) => Math.min(12, s + 1))}
                style={{ padding: '0.35rem 0.75rem' }}
                aria-label="Increase servings"
              >
                +
              </button>
            </div>
          </div>

          {/* Desired Cooking Time */}
          <div>
            <label htmlFor="cook-time-slider" style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              MAX COOK TIME: <span style={{ color: 'var(--green-deep)' }}>{maxCookTime}m</span>
            </label>
            <input
              id="cook-time-slider"
              type="range"
              min="10"
              max="90"
              step="5"
              value={maxCookTime}
              onChange={(e) => setMaxCookTime(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--green-primary)' }}
            />
          </div>

          {/* Cooking Skill Level */}
          <div>
            <label htmlFor="skill-select" style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              SKILL LEVEL
            </label>
            <select
              id="skill-select"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                background: '#ffffff',
              }}
            >
              <option value="Beginner">Beginner (Simple techniques)</option>
              <option value="Intermediate">Intermediate (Moderate skill)</option>
              <option value="Advanced">Advanced (Chef-level)</option>
            </select>
          </div>

          {/* Action Button */}
          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              className="btn btn-orange"
              onClick={handleGenerate}
              disabled={isGenerating || ingredients.length === 0}
              style={{ width: '100%', padding: '0.75rem 1rem' }}
            >
              {isGenerating ? 'Synthesizing Recipes...' : '⚡ Generate Recipes (POST)'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="card">
          <LoadingIndicator
            message="Synthesizing Zero-Waste Recipes with AI..."
            subtext="Enforcing allergen restrictions, portioning ingredients, and formulating step-by-step cooking steps."
          />
        </div>
      )}

      {/* Generated Recipes Grid */}
      {generatedRecipes && !isGenerating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ color: 'var(--green-deep)' }}>
              Synthesized Recipes ({generatedRecipes.length} Candidates)
            </h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleGenerate}
            >
              🔄 Re-Generate Recipes
            </button>
          </div>

          {generatedRecipes.map((recipe) => {
            const alreadySaved = isAlreadySaved(recipe.id);
            const currentServings = activeServingsMap[recipe.id] || recipe.servings;
            const isCopied = copiedRecipeId === recipe.id;
            const hasAllergenWarning = recipe.allergens_flagged && recipe.allergens_flagged.length > 0;

            return (
              <div
                key={recipe.id}
                className="card"
                style={{
                  borderLeft: hasAllergenWarning ? '4px solid var(--orange-primary)' : '4px solid var(--green-primary)',
                }}
              >
                {/* Header & Badges */}
                <div className="card-header-clean">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1.35rem', color: 'var(--green-deep)' }}>{recipe.title}</h3>
                      <span className="ai-pill-tag">
                        {recipe.cuisine} • {recipe.difficulty}
                      </span>
                      {recipe.dietary_tags && recipe.dietary_tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.15rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--bg-accent-subtle)',
                            color: 'var(--green-deep)',
                          }}
                        >
                          ✓ {tag}
                        </span>
                      ))}
                    </div>

                    <p style={{ marginTop: '0.45rem', color: 'var(--text-body)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                      {recipe.description}
                    </p>

                    <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.65rem', fontSize: '0.84rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span>⏱️ <strong>Prep:</strong> {recipe.prep_time_minutes}m</span>
                      <span>🔥 <strong>Cook:</strong> {recipe.cook_time_minutes}m</span>
                      <span>⏳ <strong>Total:</strong> {recipe.prep_time_minutes + recipe.cook_time_minutes}m</span>
                    </div>
                  </div>

                  {/* Nutritional estimates pill */}
                  {recipe.estimated_calories_per_serving && (
                    <div style={{ textAlign: 'right', background: 'var(--bg-subtle)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontWeight: '800', color: 'var(--green-deep)', fontSize: '1.1rem' }}>
                        {recipe.estimated_calories_per_serving} kcal
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '700' }}>
                        PER SERVING
                      </div>
                      {recipe.protein_g !== undefined && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {recipe.protein_g}g P • {recipe.carbs_g}g C • {recipe.fat_g}g F
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Allergen Flag Alert (if conflict detected) */}
                {hasAllergenWarning && (
                  <div
                    style={{
                      margin: '1rem 0',
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-orange-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--orange-border)',
                      fontSize: '0.86rem',
                      color: '#7c2d12',
                    }}
                  >
                    <strong>⚠️ Allergen Caution:</strong>
                    <ul style={{ marginTop: '0.25rem', paddingLeft: '1.25rem' }}>
                      {recipe.allergens_flagged.map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Interactive Portion Scaler Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-subtle)',
                    padding: '0.65rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    margin: '1rem 0',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                    <strong>⚖️ Scale Servings for this Recipe:</strong>
                    <span style={{ color: 'var(--text-muted)' }}>(Ingredient quantities adjust automatically)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleScaleServings(recipe.id, currentServings - 1)}
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
                    >
                      -
                    </button>
                    <span style={{ fontWeight: '800', minWidth: '40px', textAlign: 'center', color: 'var(--green-deep)' }}>
                      {currentServings} {currentServings === 1 ? 'serving' : 'servings'}
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleScaleServings(recipe.id, currentServings + 1)}
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Ingredients & Substitutions 2-Col Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.25rem' }}>
                  {/* Ingredient Quantities */}
                  <div>
                    <h4 style={{ fontSize: '0.92rem', marginBottom: '0.65rem', color: 'var(--green-deep)' }}>
                      🥕 Ingredient Quantities ({currentServings} Servings):
                    </h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {recipe.ingredient_quantities.map((ing, idx) => {
                        const scaledAmount = getScaledAmount(recipe, ing, currentServings);
                        return (
                          <li
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              justifyContent: 'space-between',
                              fontSize: '0.88rem',
                              padding: '0.35rem 0.5rem',
                              background: '#ffffff',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                              {ing.name}
                              {ing.notes && (
                                <span style={{ fontWeight: '400', color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '0.35rem' }}>
                                  ({ing.notes})
                                </span>
                              )}
                            </span>
                            <span style={{ fontWeight: '700', color: 'var(--green-primary)', whiteSpace: 'nowrap', marginLeft: '0.75rem' }}>
                              {scaledAmount} {ing.unit}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Suggested Substitutions */}
                  <div>
                    <h4 style={{ fontSize: '0.92rem', marginBottom: '0.65rem', color: 'var(--orange-primary)' }}>
                      🔄 Suggested Substitutions:
                    </h4>
                    {recipe.substitutions && recipe.substitutions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {recipe.substitutions.map((sub, i) => (
                          <div
                            key={i}
                            style={{
                              padding: '0.55rem 0.75rem',
                              background: 'var(--bg-orange-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--orange-border)',
                              fontSize: '0.84rem',
                            }}
                          >
                            <div style={{ fontWeight: '700', color: '#9a3412' }}>
                              Swap: {sub.original} ➔ {sub.substitute}
                            </div>
                            {sub.notes && (
                              <div style={{ color: 'var(--text-body)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                                {sub.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        All ingredients are standard pantry staples; no mandatory substitutions needed.
                      </p>
                    )}
                  </div>
                </div>

                {/* Step-by-Step Instructions */}
                <div>
                  <h4 style={{ fontSize: '0.92rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
                    👨‍🍳 Step-by-Step Preparation Steps:
                  </h4>
                  <ol style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-body)' }}>
                    {recipe.preparation_steps.map((step, idx) => (
                      <li key={idx} style={{ marginBottom: '0.45rem' }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Mandatory Allergen & Medical Disclaimer */}
                <div
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.65rem 0.85rem',
                    background: '#f8fafc',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #e2e8f0',
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Health Advisory:</strong> {recipe.allergen_advisory}
                </div>

                {/* Action Row */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1.25rem',
                    paddingTop: '1rem',
                    borderTop: '1px solid var(--border-subtle)',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleCopyRecipe(recipe)}
                  >
                    {isCopied ? '✓ Copied to Clipboard!' : '📋 Copy Formatted Recipe'}
                  </button>

                  <button
                    type="button"
                    className={`btn ${alreadySaved ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    onClick={() => handleSaveRecipe(recipe)}
                    disabled={alreadySaved}
                  >
                    {alreadySaved ? '✓ Saved in Recipe Box' : '⭐ Save Recipe to Profile'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State when no recipes generated yet */}
      {!generatedRecipes && !isGenerating && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">👨‍🍳</div>
          <h3>Zero-Waste Culinary Assistant</h3>
          <p>
            Add the ingredients currently in your kitchen above and click <strong>Generate Recipes</strong> to synthesize personalized recipes with portion scaling and allergen protection.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerate}
          >
            ⚡ Generate Recipes from Current Pantry
          </button>
        </div>
      )}

      {/* Universal Culinary & Nutritional Disclaimer */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
