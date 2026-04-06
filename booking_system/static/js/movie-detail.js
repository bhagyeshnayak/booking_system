/**
 * CineBook Movie Detail Script
 * ----------------------------
 * Handles single movie details, reviews, and seat selection.
 */

import { fetchAPI, apiState } from './api.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';

const MOVIE_ID = window.MOVIE_ID; // Passed from Django template
const TICKET_PRICE = 250;

let movie = null;
let selectedSeats = new Set();
let availableScreenings = [];
let selectedScreeningId = null;

document.addEventListener('DOMContentLoaded', () => {
  initPage();
  attachEventListeners();
});

async function initPage() {
  try {
    // 1. Fetch Movie Data
    movie = await fetchAPI(`/movies/${MOVIE_ID}/`);
    renderHero(movie);
    renderInfo(movie);
    
    // 2. Fetch Screenings (New Logic)
    await loadScreenings();
    
    // 3. Status updates
    updateAuthUI();
    
    // 4. Analytics
    trackAnalytics('views');
    
    UI.toggleGlobalLoader(false);
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

/**
 * Render Hero Section
 */
function renderHero(m) {
  const emoji = UI.getMovieEmoji(m.genre);
  
  // Backdrop & Poster
  const backdrop = document.getElementById('heroBackdrop');
  const poster = document.getElementById('heroPoster');
  
  if (m.poster) {
    backdrop.innerHTML = `<img src="${m.poster}" alt="${m.title}" referrerpolicy="no-referrer"><span class="hero-backdrop-emoji">${emoji}</span>`;
    poster.innerHTML = `<img src="${m.poster}" alt="${m.title}" referrerpolicy="no-referrer">`;
  } else {
    backdrop.querySelector('.hero-backdrop-emoji').textContent = emoji;
    poster.textContent = emoji;
  }

  // Hero Info
  document.querySelector('.hero-info').innerHTML = `
    <span class="hero-genre-badge">${UI.esc(m.genre || 'Movie')}</span>
    <h1 class="hero-title">${UI.esc(m.title)}</h1>
    <div class="hero-meta">
      ${m.rating ? `<span class="star">★</span><span class="rating-val">${m.rating}</span><span class="sep">•</span>` : ''}
      ${m.duration ? `<span>${m.duration} min</span><span class="sep">•</span>` : ''}
      <span>${UI.esc(m.genre || '')}</span>
    </div>
    <p class="hero-desc">${UI.esc(m.description || '')}</p>
    <div class="hero-actions">
      <button class="btn-book-hero" id="heroBookBtn">🎟️ Select Seats</button>
      <button class="btn-back" onclick="history.back()">← Back</button>
    </div>
  `;

  document.getElementById('heroBookBtn').addEventListener('click', () => {
    document.getElementById('sidebarBooking').scrollIntoView({ behavior: 'smooth' });
  });
}

/**
 * Render Detailed Info
 */
function renderInfo(m) {
  const detailContainer = document.getElementById('detailInfo');
  detailContainer.innerHTML = `
    <div class="info-card">
      <h3>Movie Stats</h3>
      <div class="stats-grid">
        <div class="stat">
          <span class="stat-label">Genre</span>
          <span class="stat-value accent">${UI.esc(m.genre || '—')}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Duration</span>
          <span class="stat-value">${m.duration ? m.duration + ' min' : '—'}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Rating</span>
          <span class="stat-value gold">★ ${m.rating || '—'}</span>
        </div>
      </div>
    </div>
    <div class="info-card">
      <h3>Synopsis</h3>
      <p class="modal-desc" style="color: #a0a0b0;">${UI.esc(m.description || 'No summary available.')}</p>
    </div>
  `;
}

/**
 * Handle Screenings & Seats
 */
async function loadScreenings() {
  try {
    const screenings = await fetchAPI(`/movies/${MOVIE_ID}/screenings/`);
    availableScreenings = screenings.results || screenings;
    
    if (availableScreenings.length > 0) {
      selectedScreeningId = availableScreenings[0].id;
      await loadSeats(selectedScreeningId);
    } else {
      // Fallback for old movies without screenings
      await loadSeats();
    }
  } catch (err) {
    console.error('Screenings fetch failed:', err);
  }
}

async function loadSeats(screeningId = null) {
  const container = document.getElementById('seatMap');
  container.innerHTML = '<div class="loader-text">Loading seat arrangement...</div>';

  try {
    const endpoint = screeningId 
      ? `/screenings/${screeningId}/seats/` 
      : `/movies/${MOVIE_ID}/seats/`;
      
    const data = await fetchAPI(endpoint);
    const seats = data.results || data;
    renderSeatMap(seats);
  } catch (err) {
    container.innerHTML = `<div class="error">Failed to load seats: ${err.message}</div>`;
  }
}

function renderSeatMap(seats) {
  const container = document.getElementById('seatMap');
  container.innerHTML = '';
  
  if (!seats || seats.length === 0) {
    container.innerHTML = '<div class="loader-text">No seats available for this showing.</div>';
    return;
  }

  // Group by Row
  const rows = {};
  seats.forEach(s => {
    const r = s.seat_number.charAt(0);
    if (!rows[r]) rows[r] = [];
    rows[r].push(s);
  });

  Object.keys(rows).sort().forEach(r => {
    const rowEl = document.createElement('div');
    rowEl.className = 'seat-row-letters';
    rowEl.innerHTML = `<div class="row-label">${r}</div>`;
    
    rows[r].sort((a,b) => parseInt(a.seat_number.substring(1)) - parseInt(b.seat_number.substring(1)));
    
    rows[r].forEach(seat => {
      const box = document.createElement('div');
      box.className = `seat-box ${seat.is_booked ? 'booked' : 'available'}`;
      box.dataset.seat = seat.seat_number;
      box.textContent = seat.seat_number;
      
      if (!seat.is_booked) {
        box.addEventListener('click', () => toggleSeat(box, seat.seat_number));
      }
      rowEl.appendChild(box);
    });
    container.appendChild(rowEl);
  });
}

function toggleSeat(el, num) {
  if (selectedSeats.has(num)) {
    selectedSeats.delete(num);
    el.classList.remove('selected');
  } else {
    if (selectedSeats.size >= 10) {
      UI.showToast('You can select up to 10 seats.', 'error');
      return;
    }
    selectedSeats.add(num);
    el.classList.add('selected');
  }
  updatePriceUI();
}

function updatePriceUI() {
  const count = selectedSeats.size;
  const total = count * TICKET_PRICE;
  document.getElementById('totalPrice').textContent = `₹${total}`;
  
  const btn = document.getElementById('confirmBtn');
  btn.disabled = count === 0;
  btn.innerHTML = count > 0 ? `🎟️ Book ${count} Ticket${count > 1 ? 's' : ''}` : '🎟️ Select Seats to Book';
}

/**
 * Booking Submission
 */
async function handleBooking(e) {
  e.preventDefault();
  
  if (!Auth.isLoggedIn()) {
    window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }));
    UI.showToast('Please login to book tickets', 'info');
    return;
  }

  if (selectedSeats.size === 0) {
    UI.showToast('Select at least one seat', 'error');
    return;
  }

  const btn = document.getElementById('confirmBtn');
  btn.disabled = true;
  btn.textContent = 'Preparing Secure Checkout...';

  try {
    const payload = {
      movie: MOVIE_ID,
      screening: selectedScreeningId,
      name: document.getElementById('bookName').value,
      email: document.getElementById('bookEmail').value,
      seats: selectedSeats.size,
      seat_numbers: Array.from(selectedSeats).join(',')
    };

    const data = await fetchAPI('/bookings/create-checkout-session/', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (data.checkout_url) {
      trackAnalytics('books', selectedSeats.size);
      UI.showToast('Redirecting to Stripe Payments...', 'success');
      window.location.href = data.checkout_url;
    } else {
      throw new Error('Failed to generate checkout link');
    }
  } catch (err) {
    UI.showToast(err.message, 'error');
    btn.disabled = false;
    updatePriceUI();
  }
}

/**
 * Helpers & Analytics
 */
function trackAnalytics(type, count = 1) {
  try {
    const stats = JSON.parse(localStorage.getItem('cinebook_analytics') || '{"views":{},"books":{}}');
    if (!stats[type]) stats[type] = {};
    stats[type][MOVIE_ID] = (stats[type][MOVIE_ID] || 0) + count;
    localStorage.setItem('cinebook_analytics', JSON.stringify(stats));
  } catch (e) { console.error('Analytics error', e); }
}

function updateAuthUI() {
  const user = Auth.getCurrentUser();
  const authGate = document.getElementById('authGate');
  const bookingForm = document.getElementById('bookingForm');

  if (user) {
    authGate.classList.add('hidden');
    document.getElementById('bookName').value = user.username || '';
    document.getElementById('bookEmail').value = user.email || '';
  } else {
    authGate.classList.remove('hidden');
    document.getElementById('loginLink').onclick = () => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }));
    document.getElementById('registerLink').onclick = () => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }));
  }
}

function attachEventListeners() {
  document.getElementById('bookingForm').addEventListener('submit', handleBooking);
  window.addEventListener('auth-change', updateAuthUI);
}
