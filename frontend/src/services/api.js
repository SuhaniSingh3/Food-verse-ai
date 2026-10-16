/**
 * Food Verse AI — Centralized Reusable API Client
 *
 * Requirements:
 * - Reads backend base URL from VITE_API_BASE_URL (defaults to http://localhost:8000).
 * - Centralizes HTTP requests with timeouts (AbortController), network error parsing, and status normalization.
 * - Supports multipart/form-data for image uploads.
 * - Distinguishes 404/501 (Not Implemented / Endpoint Unavailable) from ordinary errors.
 * - Zero exposure of AI provider keys: all AI inference is proxied through FastAPI.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 25000; // 25s timeout for vision & model requests

export class ApiError extends Error {
  constructor(message, status = null, details = null, isTimeout = false, isUnavailable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.isTimeout = isTimeout;
    this.isUnavailable = isUnavailable;
  }
}

/**
 * Low-level HTTP dispatcher with timeout management, multipart handling, and error parsing.
 *
 * @param {string} endpoint - API route path
 * @param {RequestInit & { timeoutMs?: number }} [options={}] - Fetch configuration
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = { ...options.headers };
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  // Set default Accept header
  if (!headers['Accept']) {
    headers['Accept'] = 'application/json';
  }

  // Auto-set Content-Type for JSON payloads if not using FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Timeout control via AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Parse JSON or text response
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const isUnavailable = response.status === 404 || response.status === 501;
      let errorMessage;

      if (isUnavailable) {
        errorMessage = `Endpoint '${endpoint}' is currently unavailable (HTTP ${response.status}). This feature is scheduled for upcoming phase implementation.`;
      } else {
        errorMessage =
          (typeof data === 'object' && data?.detail) ||
          (typeof data === 'object' && data?.message) ||
          `HTTP Error ${response.status}: ${response.statusText}`;
      }

      throw new ApiError(errorMessage, response.status, data, false, isUnavailable);
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError(
        `Request to ${endpoint} timed out after ${timeoutMs}ms. The server took too long to respond.`,
        408,
        null,
        true,
        false
      );
    }

    // Network failures, CORS policy violations, or server down
    throw new ApiError(
      `Unable to reach backend service at ${API_BASE_URL}. Ensure the FastAPI server is running on port 8000.`,
      0,
      { originalError: error.message },
      false,
      false
    );
  }
}

export const api = {
  /**
   * Health Check & Diagnostics
   */
  async checkHealth(options = {}) {
    return request('/api/health', { method: 'GET', ...options });
  },

  /**
   * Root service welcome
   */
  async getRoot(options = {}) {
    return request('/', { method: 'GET', ...options });
  },

  /**
   * Food Image Recognition & Ingredient Decomposition (Core - P0)
   * Sends multipart/form-data containing the food photo.
   *
   * @param {FormData} formData - Contains 'file' (image binary) and optional 'meal_type'
   */
  async analyzeFoodImage(formData, options = {}) {
    return request('/api/v1/vision/analyze', {
      method: 'POST',
      body: formData,
      ...options,
    });
  },

  /**
   * Smart Cooking Assistant & Recipe Synthesis (Core - P0)
   * Generates tailored zero-waste recipes from available ingredients.
   *
   * @param {{ ingredients: string[], dietary_preferences?: string[], max_cook_time_minutes?: number }} payload
   */
  async generateRecipes(payload, options = {}) {
    return request('/api/v1/recipes/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...options,
    });
  },

  /**
   * Save a generated recipe to user profile
   */
  async saveRecipe(recipe, options = {}) {
    return request('/api/v1/recipes/save', {
      method: 'POST',
      body: JSON.stringify(recipe),
      ...options,
    });
  },

  /**
   * Retrieve saved user recipes
   */
  async getSavedRecipes(options = {}) {
    return request('/api/v1/recipes', { method: 'GET', ...options });
  },

  /**
   * Personalized Nutrition Planner (Core - P0)
   * Calibrates nutrient totals against standard reference benchmarks.
   *
   * @param {{ ingredients: Array<{ name: string, grams: number }> }} payload
   */
  async calculateNutrition(payload, options = {}) {
    return request('/api/v1/nutrition/calculate', {
      method: 'POST',
      body: JSON.stringify(payload),
      ...options,
    });
  },

  /**
   * Get user nutritional profile and targets
   */
  async getNutritionProfile(options = {}) {
    return request('/api/v1/nutrition/profile', { method: 'GET', ...options });
  },

  /**
   * Update user nutritional profile and daily budget targets
   */
  async updateNutritionProfile(payload, options = {}) {
    return request('/api/v1/nutrition/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
      ...options,
    });
  },

  /**
   * Meal History & Logs (Core - P1)
   */
  async getMealHistory(params = {}, options = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/api/v1/meals?${query}` : '/api/v1/meals';
    return request(endpoint, { method: 'GET', ...options });
  },

  /**
   * Log a new meal entry
   */
  async logMeal(mealPayload, options = {}) {
    return request('/api/v1/meals', {
      method: 'POST',
      body: JSON.stringify(mealPayload),
      ...options,
    });
  },

  /**
   * Delete a meal from history
   */
  async deleteMeal(mealId, options = {}) {
    return request(`/api/v1/meals/${mealId}`, {
      method: 'DELETE',
      ...options,
    });
  },

  /**
   * Produce Freshness & Spoilage Analysis (Optional - P2)
   * Sends multipart/form-data containing the produce photo.
   *
   * @param {FormData} formData - Contains 'file' (image binary)
   */
  async analyzeFreshness(formData, options = {}) {
    return request('/api/v1/optional/freshness', {
      method: 'POST',
      body: formData,
      ...options,
    });
  },

  /**
   * Restaurant & Kitchen Hygiene Audit Screener (Optional - P2)
   * Sends multipart/form-data containing kitchen photo.
   *
   * @param {FormData} formData - Contains 'file' (image binary)
   */
  async auditHygiene(formData, options = {}) {
    return request('/api/v1/optional/hygiene', {
      method: 'POST',
      body: formData,
      ...options,
    });
  },
};

export default api;
