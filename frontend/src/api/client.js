/**
 * StockFlow Reusable API Client
 *
 * Configured to use environment variable VITE_API_BASE_URL (defaults to http://localhost:5000/api)
 * Automatically includes credentials (HTTP-only cookies) in all requests.
 */

/**
 * Dynamically resolves the API base URL.
 * If accessed via localhost, routes to http://localhost:5000/api.
 * If accessed via network IP (e.g. http://192.168.1.5:5173), dynamically routes API calls
 * to the matching host (e.g. http://192.168.1.5:5000/api) so that other devices on the
 * Wi-Fi/LAN (smartphones, tablets, laptops) can communicate with the backend.
 */
function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const configured = import.meta.env.VITE_API_BASE_URL;

    if (configured) {
      try {
        const url = new URL(configured);
        // If configured URL is localhost but the user accessed via a LAN IP or custom host:
        if (
          (url.hostname === 'localhost' || url.hostname === '127.0.0.1') &&
          hostname !== 'localhost' &&
          hostname !== '127.0.0.1'
        ) {
          url.hostname = hostname;
          return url.toString().replace(/\/$/, '');
        }
        return configured.replace(/\/$/, '');
      } catch {
        // Fallback below
      }
    }

    return `http://${hostname}:5000/api`;
  }

  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
}

/**
 * Custom Error class to encapsulate API error details and status code
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Generic request wrapper around fetch
 */
async function request(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    // Required to send and receive HTTP-only cookies cross-origin
    credentials: 'include',
  };

  // Stringify body if an object was passed
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    console.error('Network request failed:', networkError);
    throw new ApiError(
      'Unable to connect to the StockFlow server. Please check your network connection or ensure the backend is running.',
      0
    );
  }

  // Parse JSON response safely
  let responseData = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch (parseError) {
      console.warn('Failed to parse JSON response body:', parseError);
    }
  }

  // Handle HTTP error responses
  if (!response.ok) {
    const errorMessage =
      responseData?.error ||
      responseData?.message ||
      `Request failed with status ${response.status} (${response.statusText})`;

    throw new ApiError(errorMessage, response.status, responseData);
  }

  return responseData;
}

export const api = {
  // Auth APIs
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getCurrentUser: () => request('/auth/me', { method: 'GET' }),

  // Product APIs
  getProducts: (search = '') => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/products${query}`, { method: 'GET' });
  },
  getProductById: (id) => request(`/products/${id}`, { method: 'GET' }),
  createProduct: (payload) => request('/products', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: payload }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Dashboard API
  getDashboard: () => request('/dashboard', { method: 'GET' }),

  // Settings APIs
  getSettings: () => request('/settings', { method: 'GET' }),
  updateSettings: (payload) => request('/settings', { method: 'PUT', body: payload }),
};

export default api;
