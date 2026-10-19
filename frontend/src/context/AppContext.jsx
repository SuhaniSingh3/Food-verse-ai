import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  MEALS: 'foodverse_meals',
  SAVED_RECIPES: 'foodverse_saved_recipes',
};

export function AppProvider({ children }) {
  // Shared state connecting Food Vision, Recipe Generator, and Nutrition Planner
  // Defaults to empty (Requirement 1: Remove hardcoded demo salmon results from normal application flow)
  const [pantrySeedItems, setPantrySeedItems] = useState([]);
  const [nutritionSeedItems, setNutritionSeedItems] = useState([]);
  const [activeConfirmedDish, setActiveConfirmedDish] = useState(null);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState(null);
  const [dishNutritionReference, setDishNutritionReference] = useState(null);

  // Analysis & Meal History state backed strictly by its own localStorage key (Requirement 10)
  const [meals, setMeals] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MEALS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (meals && meals.length > 0) {
        localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
      } else {
        localStorage.removeItem(STORAGE_KEYS.MEALS);
      }
    } catch (e) {
      console.warn('Failed to persist meals to localStorage', e);
    }
  }, [meals]);

  const [savedRecipes, setSavedRecipes] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SAVED_RECIPES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(savedRecipes));
    } catch (e) {
      console.warn('Failed to persist saved recipes to localStorage', e);
    }
  }, [savedRecipes]);

  // History CRUD operations
  const addMeal = (newMeal) => {
    const mealWithId = {
      ...newMeal,
      id: newMeal.id || `meal_${Date.now()}`,
      timestamp: newMeal.timestamp || new Date().toISOString(),
    };
    setMeals((prev) => {
      const updated = [mealWithId, ...prev.filter((m) => m.id !== mealWithId.id)];
      try {
        localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save meal to localStorage', e);
      }
      return updated;
    });
  };

  const deleteMeal = (id) => {
    setMeals((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      try {
        if (updated.length > 0) {
          localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(updated));
        } else {
          localStorage.removeItem(STORAGE_KEYS.MEALS);
        }
      } catch (e) {
        console.warn('Failed to update meals in localStorage', e);
      }
      return updated;
    });
  };

  // Requirement 4 & 10: Clear only the specific history key, do not clear all localStorage
  const clearAllMeals = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.MEALS);
      localStorage.removeItem('foodverse_analysis_history');
    } catch (e) {
      console.warn('Failed to clear meals from localStorage', e);
    }
    setMeals([]);
  };

  // Reset lifecycle to prevent stale state across uploads (Requirement 7)
  const clearAnalysisState = () => {
    setCurrentAnalysisResult(null);
    setActiveConfirmedDish(null);
    setDishNutritionReference(null);
    setPantrySeedItems([]);
    setNutritionSeedItems([]);
  };

  const setConfirmedDishData = (dishName, ingredients, nutritionItems, nutritionSummary) => {
    setActiveConfirmedDish(dishName);
    if (ingredients) setPantrySeedItems(ingredients);
    if (nutritionItems) setNutritionSeedItems(nutritionItems);
    if (nutritionSummary) setDishNutritionReference(nutritionSummary);
  };

  const isFavoriteRecipe = (recipeOrId) => {
    if (!recipeOrId) return false;
    const targetId = typeof recipeOrId === 'string' ? recipeOrId : recipeOrId.id;
    const targetTitle = typeof recipeOrId === 'object' && recipeOrId.title ? recipeOrId.title.trim().toLowerCase() : null;

    return savedRecipes.some((r) => {
      if (targetId && r.id && r.id === targetId) return true;
      if (targetTitle && r.title && r.title.trim().toLowerCase() === targetTitle) return true;
      return false;
    });
  };

  const saveRecipe = (recipe) => {
    if (!recipe) return false;
    if (isFavoriteRecipe(recipe)) {
      return false; // Prevent duplicates (Requirement 5)
    }

    const recipeId = recipe.id || `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const recipeToSave = {
      ...recipe,
      id: recipeId,
      savedAt: recipe.savedAt || new Date().toISOString(),
    };

    setSavedRecipes((prev) => {
      if (prev.some((r) => (recipeToSave.id && r.id === recipeToSave.id) || (recipeToSave.title && r.title && r.title.trim().toLowerCase() === recipeToSave.title.trim().toLowerCase()))) {
        return prev;
      }
      const updated = [recipeToSave, ...prev];
      try {
        localStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to persist saved recipes to localStorage', e);
      }
      return updated;
    });
    return true;
  };

  const removeRecipe = (idOrRecipe) => {
    if (!idOrRecipe) return;
    const targetId = typeof idOrRecipe === 'string' ? idOrRecipe : idOrRecipe.id;
    const targetTitle = typeof idOrRecipe === 'object' && idOrRecipe.title ? idOrRecipe.title.trim().toLowerCase() : null;

    setSavedRecipes((prev) => {
      const updated = prev.filter((r) => {
        if (targetId && r.id && r.id === targetId) return false;
        if (targetTitle && r.title && r.title.trim().toLowerCase() === targetTitle) return false;
        return true;
      });
      try {
        localStorage.setItem(STORAGE_KEYS.SAVED_RECIPES, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to update saved recipes in localStorage', e);
      }
      return updated;
    });
  };

  const toggleFavorite = (recipe) => {
    if (!recipe) return false;
    if (isFavoriteRecipe(recipe)) {
      removeRecipe(recipe);
      return false;
    } else {
      saveRecipe(recipe);
      return true;
    }
  };

  return (
    <AppContext.Provider
      value={{
        pantrySeedItems,
        setPantrySeedItems,
        nutritionSeedItems,
        setNutritionSeedItems,
        activeConfirmedDish,
        setActiveConfirmedDish,
        currentAnalysisResult,
        setCurrentAnalysisResult,
        dishNutritionReference,
        setDishNutritionReference,
        clearAnalysisState,
        setConfirmedDishData,
        savedRecipes,
        saveRecipe,
        removeRecipe,
        toggleFavorite,
        isFavoriteRecipe,
        meals,
        addMeal,
        deleteMeal,
        clearAllMeals,
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
