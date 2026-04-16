/**
 * tmdb.js
 * ───────
 * Client-side helpers for calling the CineBook TMDB proxy API.
 * These hit /api/tmdb/* (Django server-side) — the TMDB key is NEVER exposed.
 *
 * Exports:
 *   fetchTMDBPopular(page)          → { results, total_pages, page, total_results }
 *   fetchTMDBSearch(query, page)    → { results, total_pages, page, total_results }
 *   fetchTMDBVideos(tmdbId)         → { trailer_key, all_videos }
 *   fetchTMDBDetail(tmdbId)         → { ...movie fields }
 *   ensureLocalMovie(movieData)     → { movie_id, created }  (auth required)
 *   openTrailerModal(youtubeKey, movieTitle)
 *   closeTrailerModal()
 */

import { API_BASE_URL } from './api.js';

const TMDB_API = `${window.location.origin}/api/tmdb`;

// ── Generic fetch helper for TMDB proxy ──────────────────────────────────────

async function tmdbFetch(path, options = {}) {
  const url = `${TMDB_API}${path}`;
  const token = localStorage.getItem('cinebook_token');

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.detail || 'TMDB request failed');
  }

  return data;
}

// ── Public API functions ──────────────────────────────────────────────────────

/**
 * Fetch a page of popular movies from TMDB.
 * @param {number} page
 */
export async function fetchTMDBPopular(page = 1) {
  return tmdbFetch(`/popular/?page=${page}`);
}

/**
 * Search TMDB for movies.
 * @param {string} query - Search term
 * @param {number} page
 */
export async function fetchTMDBSearch(query, page = 1) {
  const encoded = encodeURIComponent(query);
  return tmdbFetch(`/search/?q=${encoded}&page=${page}`);
}

/**
 * Get YouTube trailer key for a TMDB movie.
 * @param {number} tmdbId
 */
export async function fetchTMDBVideos(tmdbId) {
  return tmdbFetch(`/videos/${tmdbId}/`);
}

/**
 * Get full detail of a TMDB movie.
 * @param {number} tmdbId
 */
export async function fetchTMDBDetail(tmdbId) {
  return tmdbFetch(`/detail/${tmdbId}/`);
}

/**
 * POST to ensure a local Movie record exists for a TMDB movie.
 * Used before initiating a booking (bridges TMDB ↔ local booking system).
 * Requires the user to be logged in (JWT token).
 * @param {object} movieData - { tmdb_id, title, poster, overview, rating, genre, release_date, runtime }
 * @returns {{ movie_id: number, created: boolean }}
 */
export async function ensureLocalMovie(movieData) {
  return tmdbFetch('/ensure-movie/', {
    method: 'POST',
    body: JSON.stringify(movieData),
  });
}

// ── Trailer Modal ─────────────────────────────────────────────────────────────

/**
 * Inject the trailer modal into the DOM if it doesn't exist yet.
 * Called at module load time (idempotent).
 */
function ensureTrailerModal() {
  if (document.getElementById('trailerModal')) return;

  const modal = document.createElement('div');
  modal.id = 'trailerModal';
  modal.className = 'trailer-modal-overlay hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Movie Trailer');

  modal.innerHTML = `
    <div class="trailer-modal-inner">
      <div class="trailer-modal-header">
        <span class="trailer-modal-title" id="trailerMovieTitle">Watch Trailer</span>
        <button class="trailer-modal-close" id="trailerClose" aria-label="Close trailer">✕</button>
      </div>
      <div class="trailer-iframe-wrapper">
        <iframe
          id="trailerIframe"
          width="100%"
          height="100%"
          frameborder="0"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin"
          title="Movie Trailer"
          src="">
        </iframe>
        <div id="trailerError" class="trailer-error hidden">
          <div>
            <h3 style="margin-top:0;">Trailer Not Available</h3>
            <p style="color:#a0a0b0; font-size: 0.9rem;">We couldn't find an official YouTube trailer for this movie.</p>
          </div>
        </div>
      </div>
      <p class="trailer-yt-note">
        🎬 Official trailer via YouTube · TMDB · No illegal streaming &nbsp;|&nbsp;
        <a id="trailerYtLink" href="#" target="_blank" rel="noopener noreferrer"
           style="color:#f84464;text-decoration:none;font-weight:600;">
          ▶ Open on YouTube
        </a>
      </p>
    </div>
  `;

  document.body.appendChild(modal);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeTrailerModal();
  });

  // Close button
  document.getElementById('trailerClose').addEventListener('click', closeTrailerModal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTrailerModal();
  });

  // Inject trailer modal CSS if not already present
  if (!document.getElementById('trailerModalStyle')) {
    const style = document.createElement('style');
    style.id = 'trailerModalStyle';
    style.textContent = `
      .trailer-modal-overlay {
        position: fixed; inset: 0; z-index: 2000;
        background: rgba(0,0,0,0.92);
        backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        padding: 20px;
        animation: fadeIn 0.25s ease;
      }
      .trailer-modal-overlay.hidden { display: none !important; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

      .trailer-modal-inner {
        width: 100%; max-width: 900px;
        background: #141416;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 30px 80px rgba(0,0,0,0.8);
        animation: slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1);
      }
      @keyframes slideUp { from { transform: translateY(30px) scale(0.97); opacity: 0; } to { transform: none; opacity: 1; } }

      .trailer-modal-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 18px 24px;
        border-bottom: 1px solid rgba(255,255,255,0.07);
      }
      .trailer-modal-title {
        font-size: 1rem; font-weight: 700; color: #f0f0f0;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80%;
      }
      .trailer-modal-close {
        background: rgba(255,255,255,0.07);
        border: none; color: #a0a0b0; font-size: 1.1rem;
        width: 34px; height: 34px; border-radius: 50%;
        cursor: pointer; transition: all 0.2s;
        display: flex; align-items: center; justify-content: center;
      }
      .trailer-modal-close:hover { background: rgba(248,68,100,0.3); color: #fff; }

      .trailer-iframe-wrapper {
        position: relative; padding-bottom: 56.25%; /* 16:9 */
        height: 0; overflow: hidden; background: #000;
      }
      .trailer-iframe-wrapper iframe {
        position: absolute; top: 0; left: 0;
        width: 100%; height: 100%;
      }
      .trailer-error {
        position: absolute; inset: 0; 
        display: flex; align-items: center; justify-content: center;
        text-align: center; color: #fff;
        background: #141416;
      }
      .trailer-error.hidden { display: none !important; }

      .trailer-yt-note {
        text-align: center; font-size: 0.78rem; color: #5a5a70;
        padding: 12px 24px; margin: 0;
      }

      /* Trailer button styles */
      .btn-trailer {
        display: inline-flex; align-items: center; gap: 8px;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.14);
        color: #f0f0f0; font-weight: 600; font-size: 0.85rem;
        padding: 10px 20px; border-radius: 50px;
        cursor: pointer; transition: all 0.2s;
        font-family: 'Inter', sans-serif; letter-spacing: 0.2px;
      }
      .btn-trailer:hover {
        background: rgba(255,0,0,0.2); border-color: rgba(255,0,0,0.4); color: #fff;
      }
      .btn-trailer.loading { opacity: 0.6; pointer-events: none; }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Open the trailer modal with a YouTube video.
 * @param {string} youtubeKey - YouTube video ID (e.g. "dQw4w9WgXcQ")
 * @param {string} movieTitle - Shown in the modal header
 */
export function openTrailerModal(youtubeKey, movieTitle = 'Watch Trailer') {
  ensureTrailerModal();

  const modal   = document.getElementById('trailerModal');
  const iframe  = document.getElementById('trailerIframe');
  const errorEl = document.getElementById('trailerError');
  const titleEl = document.getElementById('trailerMovieTitle');

  titleEl.textContent = `🎬 ${movieTitle} — Trailer`;
  
  if (!youtubeKey) {
    // If there is no YouTube Key available (no trailer found on TMDB)
    iframe.classList.add('hidden');
    errorEl.classList.remove('hidden');
    iframe.src = ''; 
  } else {
    // Show Iframe, Hide Error
    iframe.classList.remove('hidden');
    errorEl.classList.add('hidden');
    
    // KEY FIX: Use youtube-nocookie.com instead of youtube.com
    // This bypasses Error 153 on HTTP localhost AND privacy/referrer restrictions.
    // youtube-nocookie.com is YouTube's official privacy-enhanced embed domain.
    iframe.src = `https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&rel=0&modestbranding=1`;
    
    // Update the "open in YouTube" fallback link
    const ytLink = document.getElementById('trailerYtLink');
    if (ytLink) {
      ytLink.href = `https://www.youtube.com/watch?v=${youtubeKey}`;
    }
  }

  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/**
 * Close the trailer modal and stop playback.
 */
export function closeTrailerModal() {
  const modal  = document.getElementById('trailerModal');
  const iframe = document.getElementById('trailerIframe');
  if (!modal) return;

  // Clear src to stop YouTube video playback
  if (iframe) iframe.src = '';
  modal.classList.add('hidden');
  document.body.style.overflow = '';
}
