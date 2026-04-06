/**
 * CineBook API Client
 * -------------------
 * Provides a robust fetch wrapper with automatic JWT handling
 * and retry logic for Render "cold starts" (503/504 errors).
 * Added Phase 6 Caching (stale-while-revalidate).
 */

const API_BASE_URL = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') 
  ? '/api' 
  : 'https://booking-system-i2io.onrender.com/api';

/**
 * Global API state
 */
export const apiState = {
  isLoading: false,
  isWakingUp: false,
};

/**
 * The core fetch wrapper
 * @param {string} endpoint - The API endpoint (e.g., '/movies/')
 * @param {object} options - Fetch options (method, body, headers, useCache, onCacheUpdate)
 * @param {number} retries - Number of retries left for cold start
 */
export async function fetchAPI(endpoint, options = {}, retries = 3) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `cinebook_cache_${url}`;
  
  // 1. Prepare Headers
  const token = localStorage.getItem('cinebook_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  // 2. Cache Interception (stale-while-revalidate)
  if (method === 'GET' && options.useCache) {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      // Execute background fetch
      setTimeout(() => {
        doNetworkFetch(url, options, headers, retries, cacheKey, true)
          .catch(e => console.warn("Background fetch failed:", e));
      }, 0);
      
      return JSON.parse(cachedData);
    }
  }

  // 3. Normal Fetch
  apiState.isLoading = true;
  try {
    return await doNetworkFetch(url, options, headers, retries, cacheKey, false);
  } finally {
    apiState.isLoading = false;
  }
}

/**
 * Internal Network Fetch function
 */
async function doNetworkFetch(url, options, headers, retries, cacheKey, isBackground) {
  try {
    const response = await fetch(url, { ...options, headers });

    // Handle Cold Start (Render 503/504)
    if ((response.status === 503 || response.status === 504) && retries > 0) {
      if (!isBackground) {
        console.warn(`Backend is waking up... Retrying in 3s (${retries} left)`);
        apiState.isWakingUp = true;
        notifyUI('Waking up the projectionist... please wait 🍿', 'info');
      }
      await new Promise(resolve => setTimeout(resolve, 3000));
      return doNetworkFetch(url, options, headers, retries - 1, cacheKey, isBackground);
    }

    if (!isBackground) apiState.isWakingUp = false;

    // Handle Token Expiration (401)
    if (response.status === 401 && localStorage.getItem('cinebook_token')) {
      handleSessionExpiry();
      throw new Error('Session expired. Please log in again.');
    }

    // Parse JSON
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.detail || data.error || (typeof data === 'object' ? Object.values(data).flat().join(' ') : 'Request failed');
      throw new Error(errorMsg);
    }

    // Caching Logic
    if ((options.method || 'GET').toUpperCase() === 'GET' && options.useCache) {
      const oldCache = localStorage.getItem(cacheKey);
      const newDataStr = JSON.stringify(data);
      if (oldCache !== newDataStr) {
        localStorage.setItem(cacheKey, newDataStr);
        if (isBackground && options.onCacheUpdate) {
          options.onCacheUpdate(data);
        }
      }
    }

    return data;

  } catch (error) {
    if (!isBackground) {
      console.error(`API Error [${url}]:`, error.message);
    }
    throw error;
  }
}

/**
 * UI Notifier
 */
function notifyUI(msg, type) {
  const event = new CustomEvent('api-status', { detail: { msg, type } });
  window.dispatchEvent(event);
}

/**
 * Logout and redirect on 401
 */
function handleSessionExpiry() {
  localStorage.removeItem('cinebook_token');
  localStorage.removeItem('cinebook_user');
  window.dispatchEvent(new Event('session-expired'));
}
