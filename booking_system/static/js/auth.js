/**
 * CineBook Authentication Module
 * ------------------------------
 * Manages user session, JWT storage, and auth requests.
 */

import { fetchAPI } from './api.js';

/**
 * State and Getters
 */
export const getAuthToken = () => localStorage.getItem('cinebook_token');
export const getCurrentUser = () => JSON.parse(localStorage.getItem('cinebook_user') || 'null');
export const isLoggedIn = () => !!getAuthToken();

/**
 * Login function
 * @param {string} email 
 * @param {string} password 
 */
export async function login(email, password) {
  try {
    const data = await fetchAPI('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    // Handle token format (some APIs use 'access', some 'token', etc.)
    const token = data.access || data.token;
    const user = {
      email,
      username: data.username || email.split('@')[0],
      is_email_verified: true // Assuming success means verified
    };

    saveSession(token, user);
    return user;
  } catch (error) {
    throw error;
  }
}

/**
 * Register function
 * @param {object} userData { username, email, password }
 */
export async function register(userData) {
  return await fetchAPI('/auth/register/', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

/**
 * Verify OTP for Email or Booking
 * @param {string} email 
 * @param {string} otp 
 * @param {string} bookingId (Optional)
 */
export async function verifyOTP(email, otp, bookingId = null) {
  const endpoint = bookingId 
    ? `/bookings/${bookingId}/verify-otp/` 
    : '/auth/verify-email/';
    
  const payload = bookingId ? { otp } : { email, otp };

  return await fetchAPI(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Logout
 */
export function logout() {
  localStorage.removeItem('cinebook_token');
  localStorage.removeItem('cinebook_user');
  window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: false } }));
  window.location.href = '/';
}

/**
 * Save to localStorage and notify UI
 */
function saveSession(token, user) {
  localStorage.setItem('cinebook_token', token);
  localStorage.setItem('cinebook_user', JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('auth-change', { detail: { loggedIn: true, user } }));
}

// Global listener for session expiry
window.addEventListener('session-expired', () => {
  logout();
});
