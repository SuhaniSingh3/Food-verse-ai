/**
 * Food Verse AI — Centralized Reusable API Client
 * Manages HTTP communication with the FastAPI backend service.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(message, status = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Low-level HTTP request dispatcher with standardized error parsing.
 *
 * @param {string} endpoint - API path, e.g. '/api/health'
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {Promise<any>}
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const headers = { ...options.headers };

  // Set default Accept header
  if (!headers['Accept']) {
    headers['Accept'] = 'application/json';
  }

  // Auto-set Content-Type for JSON payloads if not using FormData
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Attempt to parse JSON response body
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (typeof data === 'object' && data?.detail) ||
        (typeof data === 'object' && data?.message) ||
        `HTTP Error ${response.status}: ${response.statusText}`;

      throw new ApiError(errorMessage, response.status, data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network failures, CORS issues, or server unreachable
    throw new ApiError(
      `Failed to connect to backend service at ${API_BASE_URL}. Ensure the server is running.`,
      0,
      { originalError: error.message }
    );
  }
}

export const api = {
  /**
   * Perform health check against /api/health
   */
  async checkHealth() {
    return request('/api/health');
  },

  /**
   * Fetch root API welcome message
   */
  async getRoot() {
    return request('/');
  },

  /**
   * Generic GET request
   */
  async get(endpoint) {
    return request(endpoint, { method: 'GET' });
  },

  /**
   * Generic POST request with JSON payload
   */
  async post(endpoint, body) {
    return request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Multipart/form-data POST for file/image uploads
   */
  async postFormData(endpoint, formData) {
    return request(endpoint, {
      method: 'POST',
      body: formData,
    });
  },
};

export default api;
