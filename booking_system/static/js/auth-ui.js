/**
 * CineBook Global Auth UI
 * -----------------------
 * Handles login, register, and OTP modals for all pages.
 */

import * as Auth from './auth.js';
import * as UI from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  attachAuthListeners();
});

function attachAuthListeners() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const verifyBtn = document.getElementById('verifyOtpBtn');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPassword').value;
      const errEl = document.getElementById('loginError');
      
      try {
        await Auth.login(email, pass);
        closeModal('authModal');
        UI.showToast('Successfully signed in! 🎬');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const userData = {
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
      };
      const errEl = document.getElementById('registerError');

      try {
        await Auth.register(userData);
        UI.showToast('Registration successful! Check your email for OTP.', 'info');
        localStorage.setItem('pending_verification_email', userData.email);
        switchAuthTab('login'); // Pre-set for after verification
        closeModal('authModal');
        openModal('otpModal');
        document.getElementById('otpEmailDisplay').textContent = userData.email;
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  }

  if (verifyBtn) {
    verifyBtn.addEventListener('click', async () => {
      const otp = [...document.querySelectorAll('.otp-digit')].map(i => i.value).join('');
      const email = localStorage.getItem('pending_verification_email');
      const errEl = document.getElementById('otpError');

      try {
        await Auth.verifyOTP(email, otp);
        closeModal('otpModal');
        UI.showToast('Email verified! You can now log in.');
        openModal('authModal');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  }

  // Handle Tab Switching
  document.getElementById('tabLogin')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tabRegister')?.addEventListener('click', () => switchAuthTab('register'));

  // Close buttons
  document.getElementById('closeAuth')?.addEventListener('click', () => closeModal('authModal'));
  document.getElementById('closeOtp')?.addEventListener('click', () => closeModal('otpModal'));

  // Global "Open Auth" listener
  window.addEventListener('open-auth', (e) => {
    openModal('authModal');
    switchAuthTab(e.detail || 'login');
  });

  // Phase 6: Global Security Session Handler
  window.addEventListener('session-expired', () => {
    UI.showToast('Session expired. Please log in again.', 'error');
    if (window.location.pathname !== '/') {
      setTimeout(() => window.location.href = '/', 1500);
    } else {
      openModal('authModal');
      switchAuthTab('login');
      // Force UI update to show login state
      window.dispatchEvent(new Event('auth-change'));
    }
  });
}

function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
  document.body.style.overflow = '';
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabLogin')?.classList.toggle('active', isLogin);
  document.getElementById('tabRegister')?.classList.toggle('active', !isLogin);
  document.getElementById('loginForm')?.classList.toggle('hidden', !isLogin);
  document.getElementById('registerForm')?.classList.toggle('hidden', isLogin);
}
