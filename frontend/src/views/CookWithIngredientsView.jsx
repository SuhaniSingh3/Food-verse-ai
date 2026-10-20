import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AlertMessage from '../components/common/AlertMessage';

const QUICK_STAPLES = [
  'Potatoes',
  'Onions',
  'Tomatoes',
  'Garlic',
  'Rice',
  'Pasta',
  'Eggs',
  'Chickpeas',
  'Spinach',
  'Butter',
  'Ginger',
  'Bread',
];

const DIETARY_OPTIONS = [
  { id: 'no_restriction', label: 'No Restriction', icon: '🍽️', desc: 'All recipes' },
  { id: 'vegetarian', label: 'Vegetarian', icon: '🥦', desc: 'No meat or seafood' },
  { id: 'vegan', label: 'Vegan', icon: '🌱', desc: 'Zero animal products (no dairy, eggs, meat)' },
];

const COOK_TIME_OPTIONS = [
  { value: '', label: 'Any Cooking Time' },
  { value: 15, label: '⚡ Quick (≤ 15 mins)' },
  { value: 30, label: '⏱️ Moderate (≤ 30 mins)' },
  { value: 45, label: '🍲 Standard (≤ 45 mins)' },
  { value: 60, label: '⏰ Extended (≤ 60 mins)' },
];

export default function CookWithIngredientsView({ setActiveView }) {
  const { toggleFavorite, isFavoriteRecipe, pantrySeedItems = [] } = useApp();

  // Ingredient list state
  const [ingredients, setIngredients] = useState(() => (pantrySeedItems.length > 0 ? pantrySeedItems : []));
  const [inputValue, setInputValue] = useState('');
  const [dietaryPreference, setDietaryPreference] = useState('no_restriction');
  const [maxCookTime, setMaxCookTime] = useState('');

  // Search & Async state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [validationWarning, setValidationWarning] = useState(null);
  const [searchResults, setSearchResults] = useState(null);

  // Detail Modal state
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Add ingredient
  const handleAddIngredient = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (ingredients.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setValidationWarning(`"${trimmed}" is already in your ingredients list.`);
      return;
    }
    setIngredients((prev) => [...prev, trimmed]);
    setInputValue('');
    setValidationWarning(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddIngredient(inputValue);
    }
  };

  // Remove individual ingredient
  const handleRemoveIngredient = (toRemove) => {
    setIngredients((prev) => prev.filter((item) => item !== toRemove));
  };

  // Clear all ingredients
  const handleClearAll = () => {
    setIngredients([]);
    setSearchResults(null);
    setValidationWarning(null);
    setErrorMessage(null);
  };

  // Execute recipe search
  const handleSearchRecipes = async () => {
    if (ingredients.length === 0) {
      setValidationWarning('Please add at least one ingredient to search for matching recipes.');
      return;
    }

    setValidationWarning(null);
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const payload = {
        ingredients,
        dietary_preference: dietaryPreference,
        max_cook_time_minutes: maxCookTime ? Number(maxCookTime) : undefined,
      };

      const response = await api.cookWithIngredients(payload);
      setSearchResults(response);
    } catch (err) {
      console.error('Pantry recipe matching error:', err);
      setErrorMessage(
        err.message || 'Unable to retrieve matching recipes from the server. Please check your network and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cook-with-ingredients-view" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Header */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #14532d 0%, #15803d 100%)',
          color: '#ffffff',
          padding: '2.25rem 2rem',
          border: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '2rem' }}>🥘</span>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
            }}
          >
            Pantry-to-Plate Matcher
          </span>
        </div>
        <h2 style={{ color: '#ffffff', fontSize: '1.75rem', marginBottom: '0.5rem' }}>
          Cook With Ingredients You Have
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.9)', maxWidth: '680px', fontSize: '0.96rem' }}>
          Tell us what items you have on hand in your fridge or pantry. We’ll match them against real, tested recipes,
          calculate ingredient coverage, list what you’re missing, and suggest smart substitutions.
        </p>
      </div>

      {/* Input & Filters Card */}
      <div className="card" style={{ padding: '2rem' }}>
        <div className="card-header-clean">
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>1. Enter Your Available Ingredients</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Type single items or select from common staples below.
            </p>
          </div>
          {ingredients.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleClearAll}
              id="clear-all-ingredients-btn"
            >
              🗑️ Clear All ({ingredients.length})
            </button>
          )}
        </div>

        {/* Text Input Row */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            id="pantry-ingredient-input"
            className="input-text"
            placeholder="Type an ingredient (e.g. Potato, Onion, Rice, Eggs, Pasta)..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              minWidth: '240px',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-light)',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            className="btn btn-primary"
            id="add-ingredient-btn"
            onClick={() => handleAddIngredient(inputValue)}
            disabled={!inputValue.trim()}
          >
            + Add Ingredient
          </button>
        </div>

        {/* Quick Add Staples */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Quick Add Staples:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {QUICK_STAPLES.map((staple) => {
              const alreadyAdded = ingredients.some((i) => i.toLowerCase() === staple.toLowerCase());
              return (
                <button
                  key={staple}
                  type="button"
                  className="staple-chip-btn"
                  onClick={() => handleAddIngredient(staple)}
                  disabled={alreadyAdded}
                  style={{
                    background: alreadyAdded ? 'var(--bg-subtle)' : '#ffffff',
                    border: `1px solid ${alreadyAdded ? 'var(--border-subtle)' : 'var(--border-light)'}`,
                    color: alreadyAdded ? 'var(--text-dim)' : 'var(--text-body)',
                    borderRadius: 'var(--radius-full)',
                    padding: '0.3rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: alreadyAdded ? 'default' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <span>{alreadyAdded ? '✓' : '+'}</span>
                  <span>{staple}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Visible Ingredients List */}
        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1.75rem',
            minHeight: '68px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}
          >
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
              Your Pantry List ({ingredients.length})
            </span>
            {ingredients.length === 0 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                No ingredients added yet. Add some above to begin!
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }} id="pantry-tags-container">
            {ingredients.map((ing) => (
              <span
                key={ing}
                className="ingredient-tag"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: '#ffffff',
                  border: '1px solid var(--green-border)',
                  color: 'var(--green-deep)',
                  fontWeight: '600',
                  fontSize: '0.86rem',
                  padding: '0.35rem 0.85rem',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <span>{ing}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(ing)}
                  aria-label={`Remove ${ing}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-dim)',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 0.15rem',
                  }}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Filters Grid: Dietary Preference & Cook Time */}
        <div className="grid-cols-2" style={{ marginBottom: '1.75rem' }}>
          {/* Dietary Filter */}
          <div>
            <label
              htmlFor="dietary-preference-select"
              style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.4rem' }}
            >
              Dietary Preference
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {DIETARY_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.65rem 0.95rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${dietaryPreference === opt.id ? 'var(--green-primary)' : 'var(--border-light)'}`,
                    background: dietaryPreference === opt.id ? 'var(--bg-accent-subtle)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <input
                    type="radio"
                    name="dietary_preference"
                    value={opt.id}
                    checked={dietaryPreference === opt.id}
                    onChange={(e) => setDietaryPreference(e.target.value)}
                    style={{ accentColor: 'var(--green-primary)' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      <span style={{ marginRight: '0.35rem' }}>{opt.icon}</span>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Maximum Cooking Time Filter */}
          <div>
            <label
              htmlFor="max-cook-time-select"
              style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.4rem' }}
            >
              Maximum Cooking Time (Optional)
            </label>
            <select
              id="max-cook-time-select"
              value={maxCookTime}
              onChange={(e) => setMaxCookTime(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-light)',
                fontSize: '0.92rem',
                fontFamily: 'inherit',
                background: '#ffffff',
                marginBottom: '1rem',
              }}
            >
              {COOK_TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div
              style={{
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.95rem 1rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: 'var(--text-main)' }}>💡 How Matching Works:</strong>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.35rem' }}>
                <li>Recipes are ranked by % of ingredients you already have.</li>
                <li>Vegan &amp; Vegetarian diets are strictly audited (no hidden meat or animal fats).</li>
                <li>If an item is missing, we highlight supported kitchen substitutions.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Validation Warning */}
        {validationWarning && (
          <AlertMessage
            type="warning"
            message={validationWarning}
            onDismiss={() => setValidationWarning(null)}
          />
        )}

        {/* Error Alert */}
        {errorMessage && (
          <AlertMessage
            type="error"
            title="Search Request Failed"
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* Primary Search Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', alignItems: 'center' }}>
          {searchResults && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Found {searchResults.total_matched} recipes
            </span>
          )}
          <button
            type="button"
            className="btn btn-orange"
            id="find-recipes-btn"
            onClick={handleSearchRecipes}
            disabled={isLoading || ingredients.length === 0}
            style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
          >
            {isLoading ? 'Searching...' : '🔍 Find Recipes'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <LoadingIndicator
          message="Analyzing pantry ingredients against recipe catalogue..."
          subtext="Applying dietary restrictions and ranking recipes by ingredient coverage"
        />
      )}

      {/* Empty Result State */}
      {searchResults && searchResults.recipes.length === 0 && !isLoading && (
        <div className="empty-state" id="empty-recipes-state">
          <div className="empty-state-icon">🥣</div>
          <h3>No Recipes Matched</h3>
          <p>{searchResults.message}</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                ['Rice', 'Tomatoes', 'Onions', 'Garlic'].forEach(handleAddIngredient);
              }}
            >
              + Add Common Staples
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setDietaryPreference('no_restriction');
                setMaxCookTime('');
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Matching Results List */}
      {searchResults && searchResults.recipes.length > 0 && !isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Results Summary Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '0.5rem 0.25rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.35rem' }}>
                Matching Recipes ({searchResults.total_matched})
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {searchResults.message}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span className="health-status-badge">
                Dietary: <strong style={{ textTransform: 'capitalize' }}>{searchResults.dietary_preference}</strong>
              </span>
              {searchResults.max_cook_time_minutes && (
                <span className="health-status-badge">
                  Max Time: <strong>≤ {searchResults.max_cook_time_minutes}m</strong>
                </span>
              )}
            </div>
          </div>

          {/* Recipe Cards Grid */}
          <div className="grid-cols-2" id="matched-recipes-grid">
            {searchResults.recipes.map((matchItem) => {
              const { recipe, match_percentage, available_ingredients, missing_ingredients, can_make_now, supported_substitutions } = matchItem;
              const isFav = isFavoriteRecipe(recipe.id || recipe.title);

              return (
                <div
                  key={recipe.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderTop: can_make_now ? '4px solid var(--green-primary)' : '1px solid var(--border-light)',
                  }}
                >
                  <div>
                    {/* Top Row: Match Badge & Favorite Button */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        marginBottom: '0.85rem',
                      }}
                    >
                      {/* Match Badge */}
                      {can_make_now ? (
                        <span
                          style={{
                            background: 'var(--color-success-bg)',
                            color: 'var(--color-success)',
                            border: '1px solid var(--green-border)',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.7rem',
                            borderRadius: 'var(--radius-full)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          🌟 100% Match • Ready to Cook!
                        </span>
                      ) : (
                        <span
                          style={{
                            background: match_percentage >= 50 ? 'var(--bg-orange-subtle)' : 'var(--bg-subtle)',
                            color: match_percentage >= 50 ? 'var(--orange-primary)' : 'var(--text-muted)',
                            border: `1px solid ${match_percentage >= 50 ? 'var(--orange-border)' : 'var(--border-light)'}`,
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            padding: '0.25rem 0.7rem',
                            borderRadius: 'var(--radius-full)',
                          }}
                        >
                          {match_percentage}% Match ({available_ingredients.length} of {matchItem.total_recipe_ingredients_count} items)
                        </span>
                      )}

                      {/* Favorite Button */}
                      <button
                        type="button"
                        onClick={() => toggleFavorite(recipe)}
                        aria-label={isFav ? 'Remove from favorites' : 'Save to favorites'}
                        style={{
                          background: isFav ? '#fee2e2' : 'transparent',
                          border: `1px solid ${isFav ? '#fca5a5' : 'var(--border-light)'}`,
                          borderRadius: '50%',
                          width: '34px',
                          height: '34px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1rem',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        {isFav ? '❤️' : '🤍'}
                      </button>
                    </div>

                    {/* Title & Cuisine */}
                    <div style={{ marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          color: 'var(--green-primary)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {recipe.cuisine}
                      </span>
                      <h4 style={{ fontSize: '1.18rem', marginTop: '0.15rem' }}>{recipe.title}</h4>
                    </div>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '0.86rem',
                        color: 'var(--text-body)',
                        marginBottom: '1rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {recipe.description}
                    </p>

                    {/* Meta Tags: Prep/Cook Time, Calories, Servings */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          background: 'var(--bg-subtle)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: '600',
                          color: 'var(--text-muted)',
                        }}
                      >
                        ⏱️ {recipe.cook_time_minutes}m cook • {recipe.prep_time_minutes}m prep
                      </span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          background: 'var(--bg-subtle)',
                          padding: '0.2rem 0.55rem',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: '600',
                          color: 'var(--text-muted)',
                        }}
                      >
                        👥 {recipe.servings} servings
                      </span>
                      {recipe.estimated_calories_per_serving && (
                        <span
                          style={{
                            fontSize: '0.74rem',
                            background: 'var(--bg-subtle)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                            color: 'var(--text-muted)',
                          }}
                        >
                          🔥 Est. ~{recipe.estimated_calories_per_serving} kcal/serving
                        </span>
                      )}
                    </div>

                    {/* Available Ingredients */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          color: 'var(--green-deep)',
                          marginBottom: '0.35rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                        }}
                      >
                        <span>✅ You Have ({available_ingredients.length}):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {available_ingredients.map((ing) => (
                          <span
                            key={ing}
                            style={{
                              fontSize: '0.75rem',
                              background: 'var(--color-success-bg)',
                              color: 'var(--color-success)',
                              border: '1px solid #bbf7d0',
                              padding: '0.15rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: '500',
                            }}
                          >
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Missing Ingredients (if any) */}
                    {missing_ingredients.length > 0 && (
                      <div style={{ marginBottom: '0.85rem' }}>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            color: 'var(--color-warning)',
                            marginBottom: '0.35rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          <span>⚠️ Missing ({missing_ingredients.length}):</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {missing_ingredients.map((ing) => (
                            <span
                              key={ing}
                              style={{
                                fontSize: '0.75rem',
                                background: 'var(--color-warning-bg)',
                                color: 'var(--color-warning)',
                                border: '1px solid #fde68a',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: '500',
                              }}
                            >
                              {ing}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Supported Substitutions (if available) */}
                    {supported_substitutions && supported_substitutions.length > 0 && (
                      <div
                        style={{
                          background: 'var(--bg-orange-subtle)',
                          border: '1px solid var(--orange-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.65rem 0.85rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            color: 'var(--orange-primary)',
                            marginBottom: '0.25rem',
                          }}
                        >
                          💡 Supported Substitution:
                        </div>
                        {supported_substitutions.slice(0, 2).map((sub, idx) => (
                          <div key={idx} style={{ fontSize: '0.76rem', color: '#9a3412', lineHeight: 1.4 }}>
                            <strong>{sub.original}:</strong> Use <em>{sub.substitute}</em>
                            {sub.notes ? ` (${sub.notes})` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Open Complete Recipe Details Button */}
                  <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => setSelectedMatch(matchItem)}
                    >
                      📖 View Recipe &amp; Instructions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedMatch && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recipe-modal-title"
          onClick={() => setSelectedMatch(null)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '680px', maxHeight: '88vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '1rem',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: 'var(--green-primary)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {selectedMatch.recipe.cuisine} • {selectedMatch.recipe.difficulty}
                </span>
                <h3 id="recipe-modal-title" style={{ fontSize: '1.45rem', marginTop: '0.15rem' }}>
                  {selectedMatch.recipe.title}
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedMatch(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Match Status Bar in Modal */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: selectedMatch.can_make_now ? 'var(--color-success-bg)' : 'var(--bg-subtle)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                border: `1px solid ${selectedMatch.can_make_now ? 'var(--green-border)' : 'var(--border-light)'}`,
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                {selectedMatch.can_make_now ? (
                  <span style={{ color: 'var(--color-success)' }}>
                    ✅ All ingredients on hand! Ready to cook.
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-body)' }}>
                    📊 {selectedMatch.match_percentage}% ingredient coverage ({selectedMatch.missing_ingredients.length} items missing)
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ⏱️ Cook: {selectedMatch.recipe.cook_time_minutes}m • Prep: {selectedMatch.recipe.prep_time_minutes}m
              </div>
            </div>

            {/* Description */}
            <p style={{ fontSize: '0.9rem', color: 'var(--text-body)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              {selectedMatch.recipe.description}
            </p>

            {/* Macro Stats */}
            {selectedMatch.recipe.estimated_calories_per_serving && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.75rem',
                  textAlign: 'center',
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>CALORIES</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    {selectedMatch.recipe.estimated_calories_per_serving}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>PROTEIN</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--green-primary)' }}>
                    {selectedMatch.recipe.protein_g}g
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>CARBS</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--orange-primary)' }}>
                    {selectedMatch.recipe.carbs_g}g
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '600' }}>FAT</div>
                  <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#b45309' }}>
                    {selectedMatch.recipe.fat_g}g
                  </div>
                </div>
              </div>
            )}
            {selectedMatch.recipe.estimated_calories_per_serving && (
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  marginTop: '-0.85rem',
                  marginBottom: '1.25rem',
                  fontStyle: 'italic',
                }}
              >
                * Nutritional values are culinary estimates per serving based on standard recipe portions, not verified laboratory nutrition facts.
              </div>
            )}

            {/* Ingredients Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>
                Required Ingredients ({selectedMatch.recipe.ingredient_quantities?.length || 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {selectedMatch.recipe.ingredient_quantities?.map((item, idx) => {
                  // Use authoritative backend match state
                  const isAvailable = Boolean(item.is_available);

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        background: isAvailable ? 'var(--color-success-bg)' : 'var(--bg-subtle)',
                        border: `1px solid ${isAvailable ? '#bbf7d0' : 'var(--border-subtle)'}`,
                        fontSize: '0.88rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>{isAvailable ? '✅' : '⚪'}</span>
                        <span style={{ fontWeight: '600', color: isAvailable ? 'var(--green-deep)' : 'var(--text-main)' }}>
                          {item.name}
                        </span>
                        {item.notes && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({item.notes})</span>
                        )}
                        {isAvailable && item.matched_by && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--green-primary)',
                              background: 'rgba(22, 101, 52, 0.08)',
                              padding: '0.1rem 0.45rem',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: '600',
                            }}
                          >
                            ✓ Matched by your {item.matched_by}
                          </span>
                        )}
                        {!isAvailable && item.available_components?.length > 0 && (
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--color-warning)',
                              background: 'var(--color-warning-bg)',
                              border: '1px solid #fde68a',
                              padding: '0.1rem 0.45rem',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            Partial: you have {item.available_components.join(', ')}; missing {item.missing_components.join(', ')}
                          </span>
                        )}
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {item.amount} {item.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step-by-Step Cooking Instructions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Step-by-Step Instructions</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {selectedMatch.recipe.preparation_steps?.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      gap: '0.85rem',
                      alignItems: 'flex-start',
                      fontSize: '0.88rem',
                      lineHeight: 1.55,
                    }}
                  >
                    <span
                      style={{
                        background: 'var(--green-deep)',
                        color: '#ffffff',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        flexShrink: 0,
                        marginTop: '0.15rem',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ color: 'var(--text-body)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Substitutions in Modal */}
            {selectedMatch.recipe.substitutions?.length > 0 && (
              <div
                style={{
                  background: 'var(--bg-orange-subtle)',
                  border: '1px solid var(--orange-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <h4 style={{ fontSize: '0.92rem', color: 'var(--orange-primary)', marginBottom: '0.5rem' }}>
                  💡 Culinary Substitutions Catalogue
                </h4>
                {selectedMatch.recipe.substitutions.map((sub, idx) => (
                  <div key={idx} style={{ fontSize: '0.82rem', color: '#9a3412', marginBottom: '0.25rem' }}>
                    <strong>{sub.original}:</strong> Substitute with {sub.substitute}
                    {sub.notes ? ` — ${sub.notes}` : ''}
                  </div>
                ))}
              </div>
            )}

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedMatch(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  toggleFavorite(selectedMatch.recipe);
                }}
              >
                {isFavoriteRecipe(selectedMatch.recipe.id || selectedMatch.recipe.title)
                  ? '❤️ Saved in Favorites'
                  : '🤍 Save to Favorites'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
