import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';
import LoadingIndicator from '../components/common/LoadingIndicator';
import AlertMessage from '../components/common/AlertMessage';
import AiDisclaimer from '../components/common/AiDisclaimer';

const STAPLE_SUGGESTIONS = [
  'Olive Oil', 'Garlic', 'Onion', 'Eggs', 'Lemon', 'Black Pepper', 'Sea Salt', 'Rice', 'Soy Sauce', 'Spinach'
];

const PROTOTYPE_RECIPES = [
  {
    id: 'recipe_demo_01',
    title: 'Crispy Pan-Seared Salmon with Herb Quinoa & Greens',
    matchPercentage: 95,
    difficulty: 'Easy',
    prepTimeMin: 10,
    cookTimeMin: 15,
    servings: 2,
    caloriesPerServing: 480,
    proteinG: 38,
    carbsG: 32,
    fatG: 22,
    ingredientsUsed: ['Salmon Fillet', 'Quinoa', 'Broccoli', 'Lemon', 'Olive Oil', 'Garlic'],
    staplesNeeded: ['Salt & Pepper'],
    substitutions: [
      { original: 'Quinoa', substitute: 'Brown Rice or Cauliflower Rice' },
      { original: 'Broccoli', substitute: 'Asparagus or Green Beans' },
    ],
    instructions: [
      'Pat salmon dry with paper towels; season skin and flesh generously with salt, pepper, and minced garlic.',
      'Heat 1 tbsp olive oil in a non-stick pan over medium-high heat until shimmering.',
      'Place salmon skin-side down and cook undisturbed for 4 minutes until the skin is golden and crispy.',
      'Flip gently and sear for an additional 3 minutes. Squeeze fresh lemon juice over the top.',
      'Steam broccoli florets for 3 minutes until bright green and tender-crisp.',
      'Plate warm quinoa, nestle salmon on top, surround with broccoli, and garnish with fresh herbs.',
    ],
  },
  {
    id: 'recipe_demo_02',
    title: '15-Minute Lemon Garlic Salmon Rice Bowl',
    matchPercentage: 90,
    difficulty: 'Quick & Simple',
    prepTimeMin: 5,
    cookTimeMin: 10,
    servings: 1,
    caloriesPerServing: 520,
    proteinG: 34,
    carbsG: 45,
    fatG: 18,
    ingredientsUsed: ['Salmon', 'Garlic', 'Rice', 'Lemon', 'Olive Oil'],
    staplesNeeded: ['Black Pepper', 'Soy Sauce'],
    substitutions: [
      { original: 'Soy Sauce', substitute: 'Tamari or Coconut Aminos' },
    ],
    instructions: [
      'Cube salmon into bite-sized pieces and toss with minced garlic, lemon juice, and a dash of pepper.',
      'Sear salmon cubes in olive oil for 4 minutes until caramelized on all sides.',
      'Fluff pre-cooked rice and drizzle lightly with soy sauce and lemon zest.',
      'Top rice with glazed salmon cubes and serve immediately.',
    ],
  },
];

export default function CookingAssistantView() {
  const { saveRecipe, savedRecipes } = useApp();
  const [ingredients, setIngredients] = useState(['Salmon', 'Quinoa', 'Broccoli', 'Lemon', 'Garlic']);
  const [inputValue, setInputValue] = useState('');
  const [dietaryPreference, setDietaryPreference] = useState('High-Protein');
  const [maxCookTime, setMaxCookTime] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipes, setGeneratedRecipes] = useState(null);
  const [endpointUnavailable, setEndpointUnavailable] = useState(null);
  const [notification, setNotification] = useState(null);

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

  const handleGenerate = async () => {
    if (ingredients.length === 0) {
      setNotification({
        type: 'warning',
        message: 'Please add at least one pantry ingredient to generate tailored recipes.',
      });
      return;
    }

    setIsGenerating(true);
    setEndpointUnavailable(null);
    setNotification(null);

    const payload = {
      ingredients,
      dietary_preferences: [dietaryPreference],
      max_cook_time_minutes: maxCookTime,
    };

    try {
      // Dispatches real HTTP POST to FastAPI backend
      const result = await api.generateRecipes(payload);
      setGeneratedRecipes(result.recipes || []);
      setNotification({
        type: 'success',
        message: `Generated recipes from backend API!`,
      });
    } catch (err) {
      if (err.isUnavailable) {
        setEndpointUnavailable({
          endpoint: '/api/v1/recipes/generate',
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
      setIsGenerating(false);
    }
  };

  const handleLoadPrototypeRecipes = () => {
    setEndpointUnavailable(null);
    setGeneratedRecipes(PROTOTYPE_RECIPES);
    setNotification({
      type: 'info',
      message: 'Displaying prototype recipes matching your selected pantry ingredients.',
    });
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
      {/* Header */}
      <div>
        <h2>Smart Cooking Assistant & Recipe Generator</h2>
        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>
          Dispatches ingredient lists to FastAPI backend. Synthesizes zero-waste recipes tailored to your pantry.
        </p>
      </div>

      {notification && (
        <AlertMessage
          type={notification.type}
          message={notification.message}
          onDismiss={() => setNotification(null)}
        />
      )}

      {/* Pantry Builder Card */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Available Pantry Ingredients</h3>

        {/* Input box */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Type an ingredient (e.g., Chicken breast, Rice, Avocado) and press Enter"
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
            + Add
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
                  fontSize: '0.9rem',
                  lineHeight: 1,
                }}
                aria-label={`Remove ${item}`}
              >
                ✕
              </button>
            </span>
          ))}
          {ingredients.length === 0 && (
            <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontSize: '0.88rem' }}>
              No ingredients added yet. Add some items or click the suggestions below.
            </span>
          )}
        </div>

        {/* Quick staple suggestions */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          <span style={{ fontWeight: '600', marginRight: '0.5rem' }}>Common Staples:</span>
          {STAPLE_SUGGESTIONS.map((staple) => (
            <button
              key={staple}
              type="button"
              onClick={() => handleAddIngredient(staple)}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.15rem 0.45rem',
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

        {/* Cooking Constraints Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-subtle)',
            alignItems: 'center',
          }}
        >
          <div>
            <label htmlFor="dietary-filter" style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              DIETARY PREFERENCE
            </label>
            <select
              id="dietary-filter"
              value={dietaryPreference}
              onChange={(e) => setDietaryPreference(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontFamily: 'inherit',
                fontSize: '0.88rem',
                background: '#ffffff',
              }}
            >
              <option value="Standard">Standard / Balanced</option>
              <option value="High-Protein">High-Protein Focus</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Keto">Keto / Low-Carb</option>
              <option value="Gluten-Free">Gluten-Free</option>
            </select>
          </div>

          <div>
            <label htmlFor="cook-time-slider" style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              MAX COOK TIME: <span style={{ color: 'var(--green-deep)' }}>{maxCookTime} mins</span>
            </label>
            <input
              id="cook-time-slider"
              type="range"
              min="10"
              max="60"
              step="5"
              value={maxCookTime}
              onChange={(e) => setMaxCookTime(parseInt(e.target.value, 10))}
              style={{ width: '100%', accentColor: 'var(--green-primary)' }}
            />
          </div>

          <div style={{ textAlign: 'right' }}>
            <button
              type="button"
              className="btn btn-orange"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{ width: '100%' }}
            >
              {isGenerating ? 'Contacting API...' : '⚡ Generate Recipes (HTTP POST)'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isGenerating && (
        <div className="card">
          <LoadingIndicator
            message="Transmitting Recipe Request to Backend..."
            subtext="Endpoint: POST /api/v1/recipes/generate. Synthesizing zero-waste instructions."
          />
        </div>
      )}

      {/* Endpoint Unavailable Notice */}
      {endpointUnavailable && !isGenerating && (
        <div className="card" style={{ borderColor: 'var(--orange-border)', background: 'var(--bg-orange-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <span style={{ fontSize: '1.75rem' }} aria-hidden="true">🚧</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--orange-primary)', marginBottom: '0.35rem' }}>
                Backend Recipe Endpoint Under Development (HTTP {endpointUnavailable.status || 404})
              </h3>
              <p style={{ color: '#9a3412', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1rem' }}>
                The HTTP request reached the backend server, but route <code>{endpointUnavailable.endpoint}</code> is scheduled for Phase 3 implementation in the project roadmap.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleLoadPrototypeRecipes}
              >
                💡 Preview Prototype Recipe Generator UI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Recipes List */}
      {generatedRecipes && !isGenerating && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {generatedRecipes.map((recipe) => {
            const alreadySaved = isAlreadySaved(recipe.id);
            return (
              <div key={recipe.id} className="card">
                <div className="card-header-clean">
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h3>{recipe.title}</h3>
                      <span className="ai-pill-tag" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--green-border)' }}>
                        ✓ {recipe.matchPercentage}% Pantry Match
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      <span>⏱️ Prep: {recipe.prepTimeMin}m • Cook: {recipe.cookTimeMin}m</span>
                      <span>📊 Difficulty: {recipe.difficulty}</span>
                      <span>👥 {recipe.servings} Servings</span>
                    </div>
                  </div>

                  {/* Nutritional pill */}
                  <div style={{ textAlign: 'right', background: 'var(--bg-subtle)', padding: '0.5rem 0.85rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: '800', color: 'var(--green-deep)' }}>
                      {recipe.caloriesPerServing} kcal
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {recipe.proteinG}g P • {recipe.carbsG}g C • {recipe.fatG}g F
                    </div>
                  </div>
                </div>

                {/* Ingredients & Substitutions */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--green-deep)' }}>
                      ✓ Ingredients Used from Your Pantry:
                    </h4>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {recipe.ingredientsUsed.map((ing) => (
                        <span key={ing} style={{ fontSize: '0.8rem', background: 'var(--bg-subtle)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '0.4rem', color: 'var(--orange-primary)' }}>
                      🔄 Suggested Substitutions:
                    </h4>
                    <ul style={{ listStyle: 'none', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {recipe.substitutions.map((sub, i) => (
                        <li key={i}>
                          <strong>{sub.original}:</strong> {sub.substitute}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <h4 style={{ fontSize: '0.92rem', marginBottom: '0.65rem' }}>Step-by-Step Instructions:</h4>
                  <ol style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--text-body)' }}>
                    {recipe.instructions.map((step, idx) => (
                      <li key={idx} style={{ marginBottom: '0.35rem' }}>{step}</li>
                    ))}
                  </ol>
                </div>

                {/* Card Action */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    className={`btn ${alreadySaved ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                    onClick={() => handleSaveRecipe(recipe)}
                    disabled={alreadySaved}
                  >
                    {alreadySaved ? '✓ Saved in Recipe Box' : '⭐ Save This Recipe'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Honest Empty State */}
      {!generatedRecipes && !isGenerating && !endpointUnavailable && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">👨‍🍳</div>
          <h3>Zero-Waste Culinary Assistant</h3>
          <p>
            Add the ingredients currently in your kitchen above and click <strong>Generate Recipes</strong> to synthesize personalized recipes with step-by-step guidance.
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleGenerate}
          >
            ⚡ Test Recipe Dispatch to Backend
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <AiDisclaimer category="nutritional" />
    </div>
  );
}
