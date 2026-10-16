import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  MEALS: 'foodverse_meals',
  TARGETS: 'foodverse_targets',
  SAVED_RECIPES: 'foodverse_saved_recipes',
  FRESHNESS: 'foodverse_freshness',
  HYGIENE: 'foodverse_hygiene',
};

const DEFAULT_TARGETS = {
  calories: 2200,
  protein_g: 140,
  carbs_g: 220,
  fat_g: 65,
  goal: 'Weight Maintenance & Clean Eating',
  dietaryRestrictions: ['Low Sodium'],
};

// Seed initial realistic demonstration meal so dashboard and meal history show the full UI on first launch
const INITIAL_MEALS = [
  {
    id: 'meal_demo_01',
    dishName: 'Mediterranean Grilled Salmon Bowl',
    mealType: 'Lunch',
    timestamp: new Date().toISOString(),
    imageUrl: '/food_hero.jpg',
    totalCalories: 580,
    protein_g: 42,
    carbs_g: 48,
    fat_g: 22,
    ingredients: [
      { name: 'Grilled Atlantic Salmon', grams: 180, calories: 370, protein: 36, carbs: 0, fat: 22 },
      { name: 'Cooked Quinoa', grams: 120, calories: 144, protein: 5, carbs: 26, fat: 2 },
      { name: 'Steamed Broccoli', grams: 80, calories: 28, protein: 2, carbs: 6, fat: 0 },
      { name: 'Hass Avocado', grams: 45, calories: 72, protein: 1, carbs: 4, fat: 7 },
    ],
    confidenceScore: 0.94,
    notes: 'Identified via Food Verse AI Vision Engine',
  },
];

export function AppProvider({ children }) {
  const [meals, setMeals] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEALS);
      return saved ? JSON.parse(saved) : INITIAL_MEALS;
    } catch {
      return INITIAL_MEALS;
    }
  });

  const [targets, setTargets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TARGETS);
      return saved ? JSON.parse(saved) : DEFAULT_TARGETS;
    } catch {
      return DEFAULT_TARGETS;
    }
  });

  const [savedRecipes, setSavedRecipes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [freshnessChecks, setFreshnessChecks] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FRESHNESS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [hygieneAudits, setHygieneAudits] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HYGIENE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
    } catch (e) {
      console.warn('Failed to persist meals to localStorage', e);
    }
  }, [meals]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TARGETS, JSON.stringify(targets));
    } catch (e) {
      console.warn('Failed to persist targets to localStorage', e);
    }
  }, [targets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(savedRecipes));
    } catch (e) {
      console.warn('Failed to persist saved recipes to localStorage', e);
    }
  }, [savedRecipes]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FRESHNESS, JSON.stringify(freshnessChecks));
    } catch (e) {
      console.warn('Failed to persist freshness checks to localStorage', e);
    }
  }, [freshnessChecks]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HYGIENE, JSON.stringify(hygieneAudits));
    } catch (e) {
      console.warn('Failed to persist hygiene audits to localStorage', e);
    }
  }, [hygieneAudits]);

  // Aggregate daily consumed macros
  const consumedToday = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.totalCalories || 0),
      protein_g: acc.protein_g + (meal.protein_g || 0),
      carbs_g: acc.carbs_g + (meal.carbs_g || 0),
      fat_g: acc.fat_g + (meal.fat_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const addMeal = (newMeal) => {
    const mealWithId = {
      ...newMeal,
      id: newMeal.id || `meal_${Date.now()}`,
      timestamp: newMeal.timestamp || new Date().toISOString(),
    };
    setMeals((prev) => [mealWithId, ...prev]);
  };

  const deleteMeal = (id) => {
    setMeals((prev) => prev.filter((m) => m.id !== id));
  };

  const clearAllMeals = () => {
    setMeals([]);
  };

  const updateTargets = (newTargets) => {
    setTargets((prev) => ({ ...prev, ...newTargets }));
  };

  const saveRecipe = (recipe) => {
    if (!savedRecipes.some((r) => r.id === recipe.id)) {
      setSavedRecipes((prev) => [recipe, ...prev]);
    }
  };

  const removeRecipe = (id) => {
    setSavedRecipes((prev) => prev.filter((r) => r.id !== id));
  };

  const addFreshnessCheck = (check) => {
    setFreshnessChecks((prev) => [{ ...check, id: `fresh_${Date.now()}` }, ...prev]);
  };

  const addHygieneAudit = (audit) => {
    setHygieneAudits((prev) => [{ ...audit, id: `hyg_${Date.now()}` }, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{
        meals,
        targets,
        consumedToday,
        savedRecipes,
        freshnessChecks,
        hygieneAudits,
        addMeal,
        deleteMeal,
        clearAllMeals,
        updateTargets,
        saveRecipe,
        removeRecipe,
        addFreshnessCheck,
        addHygieneAudit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
