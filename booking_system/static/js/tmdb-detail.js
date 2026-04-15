/**
 * tmdb-detail.js
 * ──────────────
 * JavaScript for the TMDB Movie Detail Page (/movie/tmdb/<id>/).
 *
 * Flow:
 *  1. Read tmdb_id from window.TMDB_ID (set by Django template)
 *  2. Fetch movie detail + videos from /api/tmdb/
 *  3. Render hero, stats, trailer button
 *  4. On "Book Now": call /api/tmdb/ensure-movie/ → get local movie_id
 *     → redirect to existing /movie/<local_id>/ booking page
 *  5. On "Watch Trailer": open YouTube embed modal
 */

import * as Auth from './auth.js';
import { fetchTMDBDetail, fetchTMDBVideos, ensureLocalMovie, openTrailerModal } from './tmdb.js';

const TMDB_ID = parseInt(window.TMDB_ID, 10);

// ── Utilities ─────────────────────────────────────────────────────────────────

const esc = (str) => String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) return;
  t.querySelector('#toastMsg').textContent = msg;
  t.querySelector('.toast-icon').textContent = type === 'error' ? '⚠️' : '✅';
  t.className = `toast ${type === 'error' ? 'error' : ''}`;
  t.classList.remove('hidden');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.add('hidden'), 4500);
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return dateStr; }
}

function starRating(rating) {
  const filled = Math.round(rating / 2); // convert 10-scale to 5-star
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}

// ── Main Init ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();

  if (!TMDB_ID || isNaN(TMDB_ID)) {
    renderError('Invalid movie ID.');
    return;
  }

  try {
    const [movie, videos] = await Promise.all([
      fetchTMDBDetail(TMDB_ID),
      fetchTMDBVideos(TMDB_ID),
    ]);

    renderHero(movie, videos);
    renderStats(movie);
    attachBookNow(movie);
    attachTrailerBtn(videos, movie.title);

  } catch (err) {
    console.error('TMDB detail fetch failed:', err);
    renderError(err.message || 'Could not load movie details. TMDB may be unavailable.');
  }
});

// ── Navbar ────────────────────────────────────────────────────────────────────

function initNavbar() {
  const container = document.getElementById('navActions');
  if (!container) return;
  const user = Auth.getCurrentUser();

  if (Auth.isLoggedIn()) {
    container.innerHTML = `
      <div class="nav-user">
        <div class="nav-avatar">${user.username ? user.username[0].toUpperCase() : '?'}</div>
        <span class="nav-username">${esc(user.username || user.email)}</span>
        <button class="nav-logout" id="logoutBtn">Logout</button>
      </div>`;
    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
  } else {
    container.innerHTML = `
      <button class="nav-btn nav-btn--ghost" id="openAuth">Login / Register</button>`;
    document.getElementById('openAuth').addEventListener('click', () =>
      window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }))
    );
  }
}

// ── Hero Render ───────────────────────────────────────────────────────────────

function renderHero(movie, videos) {
  // Page title
  document.title = `${movie.title} — CineBook`;

  // Backdrop
  const backdrop = document.getElementById('heroBackdrop');
  if (backdrop && movie.backdrop) {
    const img = new Image();
    img.src = movie.backdrop;
    img.onload = () => {
      backdrop.innerHTML = `<img src="${movie.backdrop}" alt="Backdrop">`;
    };
  }

  // Poster
  const heroPoster = document.getElementById('heroPoster');
  if (heroPoster) {
    heroPoster.innerHTML = movie.poster
      ? `<img src="${esc(movie.poster)}" alt="${esc(movie.title)}" onerror="this.parentElement.innerHTML='🎬'">`
      : '🎬';
  }

  // Genre badge
  const genreEl = document.getElementById('heroGenre');
  if (genreEl) genreEl.textContent = movie.genres?.[0] || movie.genre || 'Movie';

  // Title
  const titleEl = document.getElementById('heroTitle');
  if (titleEl) titleEl.textContent = movie.title;

  // Tagline
  const taglineEl = document.getElementById('heroTagline');
  if (taglineEl && movie.tagline) {
    taglineEl.textContent = `"${movie.tagline}"`;
    taglineEl.style.display = 'block';
  }

  // Meta: rating, runtime, release date
  const ratingEl = document.getElementById('heroRating');
  if (ratingEl) ratingEl.innerHTML = `<span class="star">★</span><span class="rating-val">${movie.rating}</span>/10 <span style="color:#5a5a70">(${(movie.vote_count || 0).toLocaleString()} votes)</span>`;

  const runtimeEl = document.getElementById('heroRuntime');
  if (runtimeEl) runtimeEl.textContent = `${movie.runtime} min`;

  const releasedEl = document.getElementById('heroReleaseDate');
  if (releasedEl) releasedEl.textContent = formatDate(movie.release_date);

  // Description
  const descEl = document.getElementById('heroDesc');
  if (descEl) descEl.textContent = movie.overview || 'No overview available.';

  // Show/hide trailer button based on video availability
  const trailerBtn = document.getElementById('trailerBtn');
  if (trailerBtn) {
    if (videos.trailer_key) {
      trailerBtn.classList.remove('hidden');
    } else {
      trailerBtn.classList.add('hidden');
    }
  }
}

// ── Stats Section ─────────────────────────────────────────────────────────────

function renderStats(movie) {
  const statsEl = document.getElementById('statsGrid');
  if (!statsEl) return;

  const genreList = Array.isArray(movie.genres) ? movie.genres.join(', ') : (movie.genre || 'N/A');

  statsEl.innerHTML = `
    <div class="stat">
      <span class="stat-label">Rating</span>
      <span class="stat-value gold">${starRating(movie.rating)} (${movie.rating}/10)</span>
    </div>
    <div class="stat">
      <span class="stat-label">Votes</span>
      <span class="stat-value">${(movie.vote_count || 0).toLocaleString()}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Runtime</span>
      <span class="stat-value">${movie.runtime || 'N/A'} min</span>
    </div>
    <div class="stat">
      <span class="stat-label">Released</span>
      <span class="stat-value">${formatDate(movie.release_date)}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Genre</span>
      <span class="stat-value">${esc(genreList)}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Status</span>
      <span class="stat-value accent">${esc(movie.status || 'N/A')}</span>
    </div>
  `;
}

// ── Trailer Button ────────────────────────────────────────────────────────────

function attachTrailerBtn(videos, movieTitle) {
  // Both the hero button and a secondary one in the info section
  document.querySelectorAll('.trigger-trailer').forEach(btn => {
    if (!videos.trailer_key) {
      btn.setAttribute('disabled', true);
      btn.textContent = '🎬 No Trailer Available';
      return;
    }

    btn.addEventListener('click', () => {
      openTrailerModal(videos.trailer_key, movieTitle);
    });
  });
}

// ── Book Now ─────────────────────────────────────────────────────────────────

function attachBookNow(movie) {
  document.querySelectorAll('.trigger-book-now').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Require login
      if (!Auth.isLoggedIn()) {
        showToast('Please login to book tickets! 🎟️', 'error');
        window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' }));
        return;
      }

      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<span class="btn-spinner">⏳</span> Loading...';

      try {
        // Bridge: create/fetch a local Movie record for this TMDB movie
        const result = await ensureLocalMovie({
          tmdb_id:      movie.tmdb_id,
          title:        movie.title,
          poster:       movie.poster,
          overview:     movie.overview,
          rating:       movie.rating,
          genre:        movie.genre,
          release_date: movie.release_date,
          runtime:      movie.runtime,
        });

        // Redirect to the existing local movie booking page
        window.location.href = `/movie/${result.movie_id}/`;

      } catch (err) {
        showToast(err.message || 'Booking setup failed. Please try again.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });
  });
}

// ── Error State ───────────────────────────────────────────────────────────────

function renderError(msg) {
  const hero = document.getElementById('heroSection');
  if (hero) {
    hero.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:40px;">
        <div style="font-size:4rem">😵</div>
        <h2 style="color:#f0f0f0">Movie Not Found</h2>
        <p style="color:#a0a0b0;text-align:center;max-width:400px">${esc(msg)}</p>
        <a href="/" class="btn-back" style="color:#f0f0f0;text-decoration:none;padding:12px 24px;border:1px solid rgba(255,255,255,0.15);border-radius:50px;">← Back to Home</a>
      </div>`;
  }
}
