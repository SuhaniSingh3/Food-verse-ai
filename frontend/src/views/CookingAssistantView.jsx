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

export default function CookingAssistantView({ setActiveView, initialTab = 'generator' }) {
  const {
    toggleFavorite,
    isFavoriteRecipe,
    savedRecipes = [],
    pantrySeedItems,
    activeConfirmedDish,
    setNutritionSeedItems,
  } = useApp();

  // Tab state between Recipe Generator and Favorite Recipes
  const [activeTab, setActiveTab] = useState(initialTab || 'generator');
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  const [favoritesSearch, setFavoritesSearch] = useState('');

  // Keep activeTab synchronized with initialTab navigation prop cleanly
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // User Inputs (Default to empty - Requirement 1: Remove hardcoded demo salmon results)
  const [ingredients, setIngredients] = useState(() => (pantrySeedItems && pantrySeedItems.length > 0 ? pantrySeedItems : []));
  const [inputValue, setInputValue] = useState('');
  const [cuisine, setCuisine] = useState(activeConfirmedDish ? 'Indian' : 'Any');
  const [dietaryPreference, setDietaryPreference] = useState('Standard');
  const [allergies, setAllergies] = useState([]);
  const [customAvoidInput, setCustomAvoidInput] = useState('');
  const [servings, setServings] = useState(2);
  const [maxCookTime, setMaxCookTime] = useState(30);
  const [skillLevel, setSkillLevel] = useState('Beginner');

  // Synchronize with pantry items seeded from Food Analyzer or reset if cleared (Requirement 7)
  const [lastSeed, setLastSeed] = useState(pantrySeedItems);
  if (pantrySeedItems !== lastSeed) {
    setLastSeed(pantrySeedItems);
    setIngredients(pantrySeedItems || []);
    if (activeConfirmedDish) {
      setCuisine('Indian');
    }
  }

  // Request & UI states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState(null);
  const [notification, setNotification] = useState(null);
  const [copiedRecipeId, setCopiedRecipeId] = useState(null);
  const [activeServingsMap, setActiveServingsMap] = useState({});

  // Interactive Ingredients Checklist state (Requirements 1, 2, 4, 5, 6)
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);
  const [checkedIngredients, setCheckedIngredients] = useState({});

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
        message: 'Please add at least one pantry ingredient or confirm a dish in Food Vision to synthesize recipes.',
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
      dish_name: activeConfirmedDish || undefined,
      ingredients,
      cuisine: (cuisine && cuisine !== 'Any') ? cuisine : (activeConfirmedDish ? 'Indian' : 'Any'),
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
      if (recipesList.length > 0) {
        setSelectedRecipeId(recipesList[0].id || recipesList[0].title);
        setCheckedIngredients({});
      }

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

  // Helper to compute scaled quantity for a specific ingredient safely
  const getScaledAmount = (recipe, ingredient, currentServings) => {
    if (!ingredient || typeof ingredient !== 'object') return '';
    if (ingredient.amount === undefined || ingredient.amount === null || isNaN(ingredient.amount)) {
      return '';
    }
    const baseServings = recipe.base_servings || recipe.servings || 1;
    const ratio = currentServings / (baseServings || 1);
    const scaled = Math.round(ingredient.amount * ratio * 10) / 10;
    return scaled % 1 === 0 ? Math.round(scaled) : scaled;
  };

  // 5. Copy Recipe to Clipboard (Safely handles missing fields - Requirement 8)
  const handleCopyRecipe = async (recipe) => {
    if (!recipe) return;
    const recipeId = recipe.id || recipe.title || 'recipe_item';
    const currentServings = activeServingsMap[recipeId] || recipe.servings || 2;
    const rawIngs = Array.isArray(recipe.ingredient_quantities)
      ? recipe.ingredient_quantities
      : Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    const ingredientsFormatted = rawIngs.length > 0
      ? rawIngs
          .map((ing) => {
            if (typeof ing === 'string') return `• ${ing}`;
            const amt = getScaledAmount(recipe, ing, currentServings);
            const note = ing.notes ? ` (${ing.notes})` : '';
            return `• ${amt !== '' ? amt + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name || ing.item || 'Ingredient'}${note}`;
          })
          .join('\n')
      : '• No ingredient details available';

    const rawSteps = Array.isArray(recipe.preparation_steps)
      ? recipe.preparation_steps
      : Array.isArray(recipe.instructions)
        ? recipe.instructions
        : Array.isArray(recipe.steps)
          ? recipe.steps
          : [];

    const instructionsFormatted = rawSteps.length > 0
      ? rawSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')
      : 'No step-by-step instructions available.';

    const substitutionsFormatted =
      Array.isArray(recipe.substitutions) && recipe.substitutions.length > 0
        ? '\n\nSUGGESTED SUBSTITUTIONS:\n' +
          recipe.substitutions.map((sub) => `- ${sub.original}: ${sub.substitute}`).join('\n')
        : '';

    const timingDetails = [];
    if (recipe.prep_time_minutes) timingDetails.push(`Prep: ${recipe.prep_time_minutes}m`);
    if (recipe.cook_time_minutes) timingDetails.push(`Cook: ${recipe.cook_time_minutes}m`);
    const timingStr = timingDetails.length > 0 ? ` | ${timingDetails.join(' | ')}` : '';

    const recipeText = `
=== ${recipe.title || 'Untitled Recipe'} ===
${recipe.cuisine ? `Cuisine: ${recipe.cuisine} | ` : ''}Servings: ${currentServings}${timingStr}
${recipe.description ? `Description: ${recipe.description}\n` : ''}
INGREDIENTS (${currentServings} Servings):
${ingredientsFormatted}

STEP-BY-STEP INSTRUCTIONS:
${instructionsFormatted}${substitutionsFormatted}
${recipe.allergen_advisory ? `\nADVISORY:\n${recipe.allergen_advisory}\n` : ''}
Food Verse AI Smart Cooking Assistant
`.trim();

    try {
      await navigator.clipboard.writeText(recipeText);
      setCopiedRecipeId(recipeId);
      setTimeout(() => setCopiedRecipeId(null), 3000);
      setNotification({
        type: 'success',
        message: `"${recipe.title || 'Recipe'}" copied to clipboard in clean recipe format!`,
      });
    } catch {
      setNotification({
        type: 'error',
        message: 'Could not access clipboard. Please copy manually.',
      });
    }
  };

  // 6. Add/Remove Favorites Toggle (Requirements 1, 2, 5)
  const handleToggleFavorite = (recipe) => {
    if (!recipe) return;
    const isFav = isFavoriteRecipe(recipe);
    toggleFavorite(recipe);
    if (isFav) {
      setNotification({
        type: 'info',
        message: `Removed "${recipe.title || 'Recipe'}" from Favorites.`,
      });
    } else {
      setNotification({
        type: 'success',
        message: `Saved "${recipe.title || 'Recipe'}" to Favorites!`,
      });
    }
  };

  // 7. Calculate Grounded Nutrition in Nutrition Planner
  const handleCheckRecipeNutrition = (recipe) => {
    if (!recipe) return;
    const recipeId = recipe.id || recipe.title || 'recipe_item';
    const currentServings = activeServingsMap[recipeId] || recipe.servings || 1;
    const rawIngs = Array.isArray(recipe.ingredient_quantities)
      ? recipe.ingredient_quantities
      : Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    const nutritionPayload = rawIngs.map((ing) => {
      if (typeof ing === 'string') {
        return { name: ing, grams: 100 };
      }
      const amt = getScaledAmount(recipe, ing, currentServings);
      const isGrams = ing.unit && ing.unit.toLowerCase() === 'g';
      const grams = isGrams ? amt : Math.round(Number(amt || 1) * 50);
      return {
        name: ing.name || ing.item || 'Ingredient',
        grams: Math.max(10, grams || 100),
      };
    }).filter((item) => item.name);

    if (setNutritionSeedItems && nutritionPayload.length > 0) {
      setNutritionSeedItems(nutritionPayload);
    }
    if (setActiveView) {
      setActiveView('nutrition');
    }
  };

  // Active recipes list for the current tab & selected recipe tracking
  const activeRecipeList = activeTab === 'favorites' ? savedRecipes : (generatedRecipes || []);
  const effectiveSelectedRecipeId =
    selectedRecipeId ||
    (activeRecipeList.length > 0 ? (activeRecipeList[0].id || activeRecipeList[0].title || 'recipe_0') : null);

  const handleSelectRecipe = (newRecipeId) => {
    if (effectiveSelectedRecipeId !== newRecipeId) {
      setSelectedRecipeId(newRecipeId);
      setCheckedIngredients({}); // Reset checklist when opening a different recipe (Requirement 6)
    }
  };

  const handleToggleIngredient = (recipeId, index) => {
    if (effectiveSelectedRecipeId !== recipeId) {
      // If clicking on a different recipe, switch active recipe and reset prior checklist
      setSelectedRecipeId(recipeId);
      setCheckedIngredients({ [index]: true });
    } else {
      setCheckedIngredients((prev) => {
        const next = { ...prev };
        if (next[index]) {
          delete next[index];
        } else {
          next[index] = true;
        }
        return next;
      });
    }
  };

  const handleResetChecklist = () => {
    setCheckedIngredients({});
  };

  // 8. Reusable Recipe Card Component (Handles missing details defensively - Requirement 8)
  const renderRecipeCard = (recipe, _isSavedView = false) => {
    if (!recipe) return null;
    const recipeId = recipe.id || recipe.title || 'recipe_item';
    const isSelected = effectiveSelectedRecipeId === recipeId;
    const isFav = isFavoriteRecipe(recipe);
    const currentServings = activeServingsMap[recipeId] || recipe.servings || recipe.base_servings || 2;
    const isCopied = copiedRecipeId === recipeId;
    const hasAllergenWarning = Array.isArray(recipe.allergens_flagged) && recipe.allergens_flagged.length > 0;

    const rawIngs = Array.isArray(recipe.ingredient_quantities)
      ? recipe.ingredient_quantities
      : Array.isArray(recipe.ingredients)
        ? recipe.ingredients
        : [];

    const totalCount = rawIngs.length;
    const completedCount = isSelected && totalCount > 0
      ? rawIngs.filter((_, idx) => !!checkedIngredients[idx]).length
      : 0;

    const rawSteps = Array.isArray(recipe.preparation_steps)
      ? recipe.preparation_steps
      : Array.isArray(recipe.instructions)
        ? recipe.instructions
        : Array.isArray(recipe.steps)
          ? recipe.steps
          : [];

    return (
      <div
        key={recipeId}
        className="card"
        style={{
          borderLeft: hasAllergenWarning ? '4px solid var(--orange-primary)' : '4px solid var(--green-primary)',
          boxShadow: isSelected ? '0 0 0 2px var(--green-primary, #10b981), var(--shadow-md)' : undefined,
          transition: 'box-shadow 0.2s ease',
        }}
      >
        {/* Header & Badges */}
        <div className="card-header-clean" style={{ alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.35rem', color: 'var(--green-deep)', margin: 0 }}>
                {recipe.title || 'Untitled Recipe'}
              </h3>
              {isSelected && (
                <span
                  className="ai-pill-tag"
                  style={{
                    background: 'var(--color-success-bg, #ecfdf5)',
                    color: 'var(--color-success, #059669)',
                    borderColor: 'var(--green-border, #10b981)',
                    fontWeight: '700',
                    fontSize: '0.74rem',
                  }}
                  title="Currently active recipe with interactive ingredients checklist"
                >
                  ⭐ Selected Recipe
                </span>
              )}
              {recipe.cuisine && (
                <span className="ai-pill-tag">
                  {recipe.cuisine}{recipe.difficulty ? ` • ${recipe.difficulty}` : ''}
                </span>
              )}
              {!recipe.cuisine && recipe.difficulty && (
                <span className="ai-pill-tag">{recipe.difficulty}</span>
              )}
              {Array.isArray(recipe.dietary_tags) && recipe.dietary_tags.map((tag) => (
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

            {recipe.description && (
              <p style={{ marginTop: '0.45rem', color: 'var(--text-body)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {recipe.description}
              </p>
            )}

            {/* Timing details */}
            {(recipe.prep_time_minutes !== undefined || recipe.cook_time_minutes !== undefined) && (
              <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.65rem', fontSize: '0.84rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                {recipe.prep_time_minutes !== undefined && <span>⏱️ <strong>Prep:</strong> {recipe.prep_time_minutes}m</span>}
                {recipe.cook_time_minutes !== undefined && <span>🔥 <strong>Cook:</strong> {recipe.cook_time_minutes}m</span>}
                {recipe.prep_time_minutes !== undefined && recipe.cook_time_minutes !== undefined && (
                  <span>⏳ <strong>Total:</strong> {recipe.prep_time_minutes + recipe.cook_time_minutes}m</span>
                )}
              </div>
            )}

            {recipe.savedAt && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                ❤️ Saved on {new Date(recipe.savedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {!isSelected && activeRecipeList.length > 1 && (
                <button
                  type="button"
                  id={`select-recipe-card-btn-${recipeId}`}
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSelectRecipe(recipeId)}
                  title="Select this recipe to activate its interactive ingredients checklist"
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  👉 Select Recipe
                </button>
              )}

              {/* Requirement 1: Favorite button with heart icon */}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleToggleFavorite(recipe)}
                aria-label={isFav ? `Remove ${recipe.title || 'recipe'} from Favorites` : `Save ${recipe.title || 'recipe'} to Favorites`}
                title={isFav ? 'Remove from Favorites' : 'Add to Favorites'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderRadius: 'var(--radius-full)',
                  borderColor: isFav ? '#fca5a5' : 'var(--border-light)',
                  background: isFav ? '#fff1f2' : '#ffffff',
                  color: isFav ? '#e11d48' : 'var(--text-body)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1 }}>{isFav ? '❤️' : '🤍'}</span>
                <span>{isFav ? 'Favorited' : 'Favorite'}</span>
              </button>
            </div>

            {/* Nutritional estimates pill */}
            {recipe.estimated_calories_per_serving !== undefined && recipe.estimated_calories_per_serving !== null && (
              <div style={{ textAlign: 'right', background: 'var(--bg-subtle)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontWeight: '800', color: 'var(--green-deep)', fontSize: '1.05rem' }}>
                  {recipe.estimated_calories_per_serving} kcal
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700' }}>
                  PER SERVING
                </div>
                {(recipe.protein_g !== undefined || recipe.carbs_g !== undefined || recipe.fat_g !== undefined) && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {recipe.protein_g !== undefined ? `${recipe.protein_g}g P` : ''}
                    {recipe.carbs_g !== undefined ? ` • ${recipe.carbs_g}g C` : ''}
                    {recipe.fat_g !== undefined ? ` • ${recipe.fat_g}g F` : ''}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Allergen Flag Alert */}
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
              onClick={() => handleScaleServings(recipeId, currentServings - 1)}
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
              aria-label="Decrease servings"
            >
              -
            </button>
            <span style={{ fontWeight: '800', minWidth: '40px', textAlign: 'center', color: 'var(--green-deep)' }}>
              {currentServings} {currentServings === 1 ? 'serving' : 'servings'}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleScaleServings(recipeId, currentServings + 1)}
              style={{ padding: '0.2rem 0.6rem', fontSize: '0.85rem' }}
              aria-label="Increase servings"
            >
              +
            </button>
          </div>
        </div>

        {/* Ingredients & Substitutions 2-Col Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.25rem' }}>
          {/* Ingredient Quantities & Interactive Checklist */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
              <h4 style={{ fontSize: '0.92rem', margin: 0, color: 'var(--green-deep)' }}>
                🥕 Ingredients {isSelected ? '& Checklist' : ''} ({currentServings} Servings):
              </h4>
              {isSelected && rawIngs.length > 0 && (
                <button
                  type="button"
                  id={`reset-checklist-btn-${recipeId}`}
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetChecklist();
                  }}
                  disabled={completedCount === 0}
                  title={completedCount === 0 ? 'No checked ingredients to reset' : 'Uncheck all ingredients for the current recipe'}
                  style={{ fontSize: '0.78rem', padding: '0.2rem 0.65rem' }}
                >
                  🔄 Reset Checklist
                </button>
              )}
              {!isSelected && activeRecipeList.length > 1 && (
                <button
                  type="button"
                  id={`select-checklist-btn-${recipeId}`}
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSelectRecipe(recipeId)}
                  style={{ fontSize: '0.76rem', padding: '0.15rem 0.55rem' }}
                  title="Select this recipe to activate its checklist"
                >
                  👉 Select Checklist
                </button>
              )}
            </div>

            {/* Checklist Progress Bar (Requirements 3 & 4) */}
            {isSelected && rawIngs.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-subtle, #f8fafc)',
                  border: '1px solid var(--border-light, #e2e8f0)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.55rem 0.85rem',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                    {completedCount} of {totalCount} ingredients completed.
                  </span>
                  <span
                    style={{
                      fontWeight: '700',
                      color: completedCount === totalCount ? 'var(--color-success, #059669)' : 'var(--green-deep)',
                    }}
                  >
                    {Math.round((completedCount / totalCount) * 100)}%
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: '#e2e8f0',
                    borderRadius: 'var(--radius-full, 999px)',
                    marginTop: '0.4rem',
                    overflow: 'hidden',
                  }}
                  role="progressbar"
                  aria-valuenow={completedCount}
                  aria-valuemin={0}
                  aria-valuemax={totalCount}
                  aria-label={`${completedCount} of ${totalCount} ingredients completed.`}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${(completedCount / totalCount) * 100}%`,
                      background: completedCount === totalCount ? 'var(--green-deep, #047857)' : 'var(--green-primary, #10b981)',
                      borderRadius: 'var(--radius-full, 999px)',
                      transition: 'width 0.25s ease',
                    }}
                  />
                </div>
              </div>
            )}

            {rawIngs.length > 0 ? (
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.45rem', padding: 0, margin: 0 }}>
                {rawIngs.map((ing, idx) => {
                  const isStr = typeof ing === 'string';
                  const ingName = isStr ? ing : (ing.name || ing.item || 'Ingredient');
                  const ingNotes = !isStr && ing.notes ? ing.notes : null;
                  const scaledAmount = isStr ? '' : getScaledAmount(recipe, ing, currentServings);
                  const ingUnit = !isStr && ing.unit ? ing.unit : '';
                  const isChecked = isSelected && !!checkedIngredients[idx];

                  return (
                    <li
                      key={idx}
                      onClick={() => handleToggleIngredient(recipeId, idx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.88rem',
                        padding: '0.4rem 0.65rem',
                        background: isChecked ? 'var(--bg-subtle, #f8fafc)' : '#ffffff',
                        borderRadius: 'var(--radius-sm)',
                        border: isChecked ? '1px solid var(--border-light, #e2e8f0)' : '1px solid var(--border-subtle, #edf2f7)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: 0 }}>
                        <input
                          type="checkbox"
                          id={`ing-checkbox-${recipeId}-${idx}`}
                          checked={isChecked}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleIngredient(recipeId, idx);
                          }}
                          aria-label={`Mark ${ingName} as ${isChecked ? 'unprepared' : 'collected or prepared'}`}
                          style={{
                            width: '17px',
                            height: '17px',
                            accentColor: 'var(--green-primary, #10b981)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: isChecked ? '500' : '600',
                            color: isChecked ? 'var(--text-muted, #64748b)' : 'var(--text-main)',
                            textDecoration: isChecked ? 'line-through' : 'none',
                            transition: 'color 0.15s ease, text-decoration 0.15s ease',
                          }}
                        >
                          {ingName}
                          {ingNotes && (
                            <span
                              style={{
                                fontWeight: '400',
                                color: 'var(--text-dim)',
                                fontSize: '0.8rem',
                                marginLeft: '0.35rem',
                                textDecoration: 'none',
                              }}
                            >
                              ({ingNotes})
                            </span>
                          )}
                        </span>
                        {isChecked && (
                          <span
                            className="ai-pill-tag"
                            style={{
                              background: 'var(--color-success-bg, #ecfdf5)',
                              color: 'var(--color-success, #059669)',
                              borderColor: 'var(--green-border, #10b981)',
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.45rem',
                            }}
                          >
                            ✓ Prepared
                          </span>
                        )}
                      </div>
                      {(scaledAmount !== '' || ingUnit) && (
                        <span
                          style={{
                            fontWeight: '700',
                            color: isChecked ? 'var(--text-muted)' : 'var(--green-primary)',
                            whiteSpace: 'nowrap',
                            marginLeft: '0.75rem',
                            textDecoration: isChecked ? 'line-through' : 'none',
                          }}
                        >
                          {scaledAmount} {ingUnit}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No ingredient details available for this recipe.
              </p>
            )}
          </div>

          {/* Suggested Substitutions */}
          <div>
            <h4 style={{ fontSize: '0.92rem', marginBottom: '0.65rem', color: 'var(--orange-primary)' }}>
              🔄 Suggested Substitutions:
            </h4>
            {Array.isArray(recipe.substitutions) && recipe.substitutions.length > 0 ? (
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
          {rawSteps.length > 0 ? (
            <ol style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-body)' }}>
              {rawSteps.map((step, idx) => (
                <li key={idx} style={{ marginBottom: '0.45rem' }}>
                  {step}
                </li>
              ))}
            </ol>
          ) : (
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No preparation steps available for this recipe.
            </p>
          )}
        </div>

        {/* Mandatory Health & Allergen Advisory */}
        {recipe.allergen_advisory && (
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
        )}

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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleCopyRecipe(recipe)}
            >
              {isCopied ? '✓ Copied to Clipboard!' : '📋 Copy Formatted Recipe'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleCheckRecipeNutrition(recipe)}
              title="Calculate grounded nutrition for these ingredients"
            >
              🥗 Calculate Recipe Nutrition
            </button>
          </div>

          {/* Bottom Favorite button with heart icon (Requirement 1 & 2) */}
          <button
            type="button"
            className={`btn ${isFav ? 'btn-secondary' : 'btn-primary'} btn-sm`}
            onClick={() => handleToggleFavorite(recipe)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              borderColor: isFav ? '#fca5a5' : undefined,
              background: isFav ? '#fff1f2' : undefined,
              color: isFav ? '#e11d48' : undefined,
            }}
          >
            <span>{isFav ? '❤️' : '🤍'}</span>
            <span>{isFav ? 'Remove from Favorites' : 'Add to Favorites'}</span>
          </button>
        </div>
      </div>
    );
  };

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

      {/* View Switcher: Recipe Generator vs. Favorite Recipes */}
      <div
        style={{
          display: 'flex',
          gap: '0.65rem',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '0.85rem',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className={`btn ${activeTab === 'generator' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('generator')}
          style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1.15rem' }}
        >
          👨‍🍳 Recipe Generator
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'favorites' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
          onClick={() => setActiveTab('favorites')}
          style={{
            borderRadius: 'var(--radius-full)',
            padding: '0.5rem 1.15rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span>❤️ Favorite Recipes</span>
          <span
            style={{
              background: activeTab === 'favorites' ? 'rgba(255,255,255,0.25)' : 'var(--bg-accent-subtle)',
              color: activeTab === 'favorites' ? '#ffffff' : 'var(--green-deep)',
              fontSize: '0.75rem',
              padding: '0.1rem 0.55rem',
              borderRadius: 'var(--radius-full)',
              fontWeight: '700',
            }}
          >
            {savedRecipes.length}
          </span>
        </button>

        {activeTab === 'generator' && savedRecipes.length > 0 && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setActiveTab('favorites')}
            style={{
              marginLeft: 'auto',
              fontSize: '0.82rem',
              color: '#e11d48',
              borderColor: '#fecdd3',
              background: '#fff1f2',
            }}
          >
            ❤️ View Saved Favorites ({savedRecipes.length}) ➔
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

      {/* TAB 1: RECIPE GENERATOR */}
      {activeTab === 'generator' && (
        <>
          {activeConfirmedDish && (
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-accent-subtle, #f0fdf4)',
              border: '1px solid var(--green-border, #86efac)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--green-deep, #14532d)', fontWeight: '700' }}>
                  Confirmed Dish from Image Analysis:
                </div>
                <h3 style={{ margin: '0.2rem 0', color: 'var(--green-deep, #14532d)', fontSize: '1.2rem' }}>
                  🍽️ {activeConfirmedDish}
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #4b5563)' }}>
                  Pantry ingredients seeded from verified dish components. Click below to synthesize authentic recipes from the local catalogue.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? 'Synthesizing...' : `⚡ Cook ${activeConfirmedDish}`}
              </button>
            </div>
          )}

      {/* Main Pantry & Constraint Formulation Card */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem', color: 'var(--green-deep)' }}>1. What Ingredients Do You Have at Home?</h3>

        {/* Input box */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Type an ingredient (e.g., Potatoes, Tomatoes, Onions, Rice, Garlic) and press Enter"
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

          {/* Recipe Switcher Tabs (Requirements 1 & 6) */}
          {generatedRecipes.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                flexWrap: 'wrap',
                padding: '0.75rem 1rem',
                background: 'var(--bg-subtle, #f8fafc)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light, #e2e8f0)',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--green-deep)' }}>
                🍳 Selected Recipe:
              </span>
              {generatedRecipes.map((r, i) => {
                const rId = r.id || r.title || `rec_${i}`;
                const isCurrent = rId === effectiveSelectedRecipeId;
                return (
                  <button
                    key={rId}
                    type="button"
                    id={`recipe-tab-${i}`}
                    className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleSelectRecipe(rId)}
                  >
                    {isCurrent ? '⭐ ' : ''}{i + 1}. {r.title || 'Recipe'}
                  </button>
                );
              })}
            </div>
          )}

          {generatedRecipes.map((recipe) => renderRecipeCard(recipe))}
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
        </>
      )}

      {/* TAB 2: FAVORITE RECIPES SECTION (Requirements 2, 3, 5, 7, 8, 9) */}
      {activeTab === 'favorites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div className="card" style={{ background: '#ffffff' }}>
            <div className="card-header-clean" style={{ flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--green-deep)' }}>
                  Favorite Recipes ({savedRecipes.length})
                </h3>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                  Your saved collection of personalized recipes. Persisted in browser localStorage and isolated from analysis history.
                </p>
              </div>

              {savedRecipes.length > 2 && (
                <div style={{ minWidth: '220px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Search saved favorites..."
                    value={favoritesSearch}
                    onChange={(e) => setFavoritesSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.86rem',
                    }}
                    aria-label="Search favorite recipes"
                  />
                </div>
              )}
            </div>

            {/* Friendly Empty State (Requirement 7) */}
            {savedRecipes.length === 0 ? (
              <div className="empty-state" style={{ margin: '1rem 0' }}>
                <div className="empty-state-icon" aria-hidden="true">❤️</div>
                <h3>No Favorite Recipes Saved Yet</h3>
                <p>
                  You haven't saved any recipes to your favorites. Generate personalized recipes with the Recipe Generator, then click the heart icon (🤍 Favorite) on any recipe to save it here for quick access.
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setActiveTab('generator')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <span>👨‍🍳</span>
                  <span>Go to Recipe Generator</span>
                </button>
              </div>
            ) : (
              (() => {
                const filteredFavorites = savedRecipes.filter((r) => {
                  if (!favoritesSearch) return true;
                  const q = favoritesSearch.toLowerCase();
                  return (
                    (r.title && r.title.toLowerCase().includes(q)) ||
                    (r.cuisine && r.cuisine.toLowerCase().includes(q))
                  );
                });

                if (filteredFavorites.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                      <p>No favorite recipes match "{favoritesSearch}".</p>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setFavoritesSearch('')}
                        style={{ marginTop: '0.5rem' }}
                      >
                        Clear Search
                      </button>
                    </div>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1rem' }}>
                    {filteredFavorites.length > 1 && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          flexWrap: 'wrap',
                          padding: '0.75rem 1rem',
                          background: 'var(--bg-subtle, #f8fafc)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-light, #e2e8f0)',
                        }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--green-deep)' }}>
                          ❤️ Selected Favorite Recipe:
                        </span>
                        {filteredFavorites.map((r, i) => {
                          const rId = r.id || r.title || `fav_${i}`;
                          const isCurrent = rId === effectiveSelectedRecipeId;
                          return (
                            <button
                              key={rId}
                              type="button"
                              id={`favorite-recipe-tab-${i}`}
                              className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => handleSelectRecipe(rId)}
                            >
                              {isCurrent ? '⭐ ' : ''}{i + 1}. {r.title || 'Recipe'}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {filteredFavorites.map((recipe) => renderRecipeCard(recipe, true))}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* Universal Culinary & Nutritional Disclaimer */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
