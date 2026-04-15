/**
 * CineBook Index Script (Homepage) — v5 with TMDB Integration
 * ─────────────────────────────────────────────────────────────
 * - Default source: TMDB live popular movies
 * - Toggle to Local DB movies via source toggle buttons
 * - TMDB search via /api/tmdb/search/ (live, no local cache needed)
 * - Local search via /api/movies/?search= (original behavior)
 * - Trailer button on each TMDB movie card
 * - Book Now: TMDB cards → /movie/tmdb/<id>/  |  Local → /movie/<id>/
 */

import { fetchAPI } from './api.js';
import { fetchTMDBPopular, fetchTMDBSearch, fetchTMDBVideos, openTrailerModal } from './tmdb.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';

// ── State ─────────────────────────────────────────────────────────────────────

let movies        = [];
let currentSource = 'tmdb';   // 'tmdb' | 'local'
let currentPage   = 1;
let tmdbTotalPages = 1;
let nextUrl       = null;     // used in local mode

let activeGenre   = 'all';
let activeRating  = '0';
let searchQuery   = '';
let showFavoritesOnly = false;

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initFavoritesBtn();
  initSourceToggle();
  loadMovies();
  attachSearchListener();
  buildGenreFilters();
  buildRatingFilters();
});

// ── Source Toggle ─────────────────────────────────────────────────────────────

function initSourceToggle() {
  const tmdbBtn  = document.getElementById('srcTMDB');
  const localBtn = document.getElementById('srcLocal');
  if (!tmdbBtn || !localBtn) return;

  tmdbBtn.addEventListener('click', () => {
    if (currentSource === 'tmdb') return;
    currentSource = 'tmdb';
    tmdbBtn.classList.add('active');
    localBtn.classList.remove('active');
    updateSectionTitle();
    searchQuery = '';
    const si = document.getElementById('searchInput');
    if (si) si.value = '';
    resetAndLoad();
  });

  localBtn.addEventListener('click', () => {
    if (currentSource === 'local') return;
    currentSource = 'local';
    localBtn.classList.add('active');
    tmdbBtn.classList.remove('active');
    updateSectionTitle();
    searchQuery = '';
    const si = document.getElementById('searchInput');
    if (si) si.value = '';
    resetAndLoad();
  });
}

function updateSectionTitle() {
  const el = document.getElementById('sectionTitle');
  if (!el) return;
  el.textContent = currentSource === 'tmdb' ? '🎭 Popular on TMDB' : '🗄️ Now Showing (Local)';
}

// ── Main Movie Loader ─────────────────────────────────────────────────────────

async function loadMovies() {
  showSkeletons();
  try {
    if (currentSource === 'tmdb') {
      await loadTMDB(1, false);
    } else {
      await loadLocal();
    }
  } catch (err) {
    UI.showToast(err.message || 'Failed to load movies.', 'error');
    hideSkeletons();
  }
  UI.toggleGlobalLoader(false);
}

function resetAndLoad() {
  currentPage = 1;
  tmdbTotalPages = 1;
  nextUrl = null;
  movies = [];
  document.getElementById('moviesContainer').innerHTML = '';
  loadMovies();
}

// ── TMDB Mode ─────────────────────────────────────────────────────────────────

async function loadTMDB(page = 1, append = false) {
  try {
    let data;
    if (searchQuery.trim()) {
      data = await fetchTMDBSearch(searchQuery.trim(), page);
    } else {
      data = await fetchTMDBPopular(page);
    }

    const results = data.results || [];
    tmdbTotalPages = data.total_pages || 1;
    currentPage = data.page || 1;

    if (append) {
      movies = movies.concat(results);
    } else {
      movies = results;
    }

    renderMoviesTMDB(results, append);
    renderTMDBPagination();

    document.getElementById('movieCount').textContent =
      `${data.total_results?.toLocaleString() || results.length} movies`;

    if (results.length === 0 && !append) {
      document.getElementById('noResults').classList.remove('hidden');
    } else {
      document.getElementById('noResults').classList.add('hidden');
    }
  } catch (err) {
    if (!append) {
      UI.showToast('TMDB unavailable. Switching to local movies.', 'error');
      currentSource = 'local';
      updateSectionTitle();
      await loadLocal();
    } else {
      UI.showToast(err.message, 'error');
    }
  }
}

function renderMoviesTMDB(movieList, append = false) {
  const container = document.getElementById('moviesContainer');
  if (!append) container.innerHTML = '';
  if (!movieList.length && !append) return;

  const html = movieList.map(m => {
    const rating   = m.rating || 0;
    const year     = m.release_date ? m.release_date.slice(0, 4) : '';
    const genre    = m.genre || 'Movie';
    const poster   = m.poster || '';
    const title    = m.title || 'Unknown';
    const tmdbId   = m.tmdb_id;
    const overview = (m.overview || '').slice(0, 120) + ((m.overview?.length > 120) ? '…' : '');

    return `
      <div class="movie-card tmdb-card" id="tmdb-card-${tmdbId}" data-tmdb-id="${tmdbId}">
        <!-- TMDB badge -->
        <div style="position:absolute;top:10px;left:10px;z-index:2;
          background:linear-gradient(135deg,#032541,#01b4e4);
          padding:3px 8px;border-radius:5px;font-size:0.65rem;font-weight:800;color:#fff;">
          TMDB
        </div>

        <a href="/movie/tmdb/${tmdbId}/">
          <div class="card-poster-wrapper">
            ${poster
              ? `<img class="card-poster" src="${UI.esc(poster)}" alt="${UI.esc(title)}" loading="lazy"
                      onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                 <div class="card-poster-placeholder hidden">${UI.getMovieEmoji(genre)}</div>`
              : `<div class="card-poster-placeholder" style="display:flex">${UI.getMovieEmoji(genre)}</div>`
            }
          </div>
        </a>

        <div class="card-body">
          <div class="card-title">${UI.esc(title)}</div>
          <div class="card-meta">
            <span class="card-genre">${UI.esc(genre.split(',')[0])}</span>
            <span class="card-rating">★ ${rating.toFixed(1)}/10</span>
          </div>
          ${year ? `<div style="font-size:0.75rem;color:#5a5a70;margin-top:2px;">${year}</div>` : ''}
          <p class="card-desc">${UI.esc(overview)}</p>
        </div>

        <div class="card-footer" style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="/movie/tmdb/${tmdbId}/" class="btn-book-card" style="flex:1;text-align:center;">
            🎟️ Book Now
          </a>
          <button class="btn-trailer-card" data-tmdb-id="${tmdbId}" data-title="${UI.esc(title)}"
            title="Watch Trailer"
            style="padding:10px 14px;border-radius:50px;font-size:0.8rem;font-weight:600;
                   background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                   color:#f0f0f0;cursor:pointer;transition:all 0.2s;white-space:nowrap;">
            ▶ Trailer
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.insertAdjacentHTML('beforeend', html);

  // Attach trailer button listeners
  container.querySelectorAll('.btn-trailer-card').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id    = parseInt(btn.dataset.tmdbId);
      const title = btn.dataset.title;
      btn.textContent = '⏳';
      btn.disabled = true;
      try {
        const data = await fetchTMDBVideos(id);
        if (data.trailer_key) {
          openTrailerModal(data.trailer_key, title);
        } else {
          UI.showToast('No trailer available for this movie.', 'error');
        }
      } catch {
        UI.showToast('Could not load trailer. Try again.', 'error');
      } finally {
        btn.textContent = '▶ Trailer';
        btn.disabled = false;
      }
    });
  });
}

function renderTMDBPagination() {
  let wrapper = document.getElementById('paginationWrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'paginationWrapper';
    wrapper.className = 'pagination-wrapper';
    document.querySelector('.movies-section').appendChild(wrapper);
  }

  if (currentPage < tmdbTotalPages) {
    wrapper.innerHTML = `
      <button class="btn-load-more" id="loadMoreBtn">
        Load More Movies 🍿
      </button>`;
    document.getElementById('loadMoreBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadMoreBtn');
      btn.disabled = true;
      btn.textContent = 'Opening credits...';
      await loadTMDB(currentPage + 1, true);
    });
  } else {
    wrapper.innerHTML = '';
  }
}

// ── Local DB Mode ─────────────────────────────────────────────────────────────

async function loadLocal(append = false) {
  const params = new URLSearchParams();
  params.append('page', currentPage);
  params.append('page_size', 50);
  if (activeGenre !== 'all') params.append('genre', activeGenre);
  if (activeRating !== '0')  params.append('min_rating', activeRating);
  if (searchQuery)           params.append('search', searchQuery);

  try {
    const data = await fetchAPI(`/movies/?${params.toString()}`, {
      useCache: !searchQuery, // Cache only non-search results
      onCacheUpdate: (upd) => {
        movies = upd.results || [];
        nextUrl = upd.next;
        renderMoviesLocal(movies, false);
      }
    });

    const results = data.results || [];
    if (append) {
      movies = movies.concat(results);
    } else {
      movies = results;
    }
    nextUrl = data.next;

    renderMoviesLocal(results, append);
    renderLocalPagination();

    document.getElementById('movieCount').textContent = `${movies.length} movies`;
    document.getElementById('noResults').classList.toggle('hidden', results.length > 0 || append);

  } catch (err) {
    UI.showToast(err.message || 'Failed to load local movies.', 'error');
  }
}

function renderMoviesLocal(movieList, append = false) {
  const container = document.getElementById('moviesContainer');
  if (!append) container.innerHTML = '';
  if (!movieList.length && !append) return;

  const favs = getFavorites();
  const html = movieList.map(m => {
    const isFav = favs.includes(m.id);
    return `
      <div class="movie-card" id="movie-card-${m.id}">
        <div class="fav-btn ${isFav ? 'active' : ''}" data-id="${m.id}" title="Add to Favorites">
          ${isFav ? '❤️' : '🤍'}
        </div>
        <a href="/movie/${m.id}/">
          <div class="card-poster-wrapper">
            <img class="card-poster" src="${UI.esc(m.poster || '')}" alt="${UI.esc(m.title)}" loading="lazy"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
            <div class="card-poster-placeholder hidden">${UI.getMovieEmoji(m.genre)}</div>
          </div>
        </a>
        <div class="card-body">
          <div class="card-title">${UI.esc(m.title)}</div>
          <div class="card-meta">
            <span class="card-genre">${UI.esc(m.genre || '')}</span>
            <span class="card-rating">★ ${m.rating}</span>
          </div>
          <p class="card-desc">${UI.esc(m.description || '')}</p>
        </div>
        <div class="card-footer">
          <span class="card-duration">${m.duration || 120} min</span>
          <a href="/movie/${m.id}/" class="btn-book-card">Book Now</a>
        </div>
      </div>
    `;
  }).join('');

  container.insertAdjacentHTML('beforeend', html);

  // Favorites listeners
  container.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFavorite(parseInt(btn.dataset.id));
    });
  });
}

function renderLocalPagination() {
  let wrapper = document.getElementById('paginationWrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'paginationWrapper';
    wrapper.className = 'pagination-wrapper';
    document.querySelector('.movies-section').appendChild(wrapper);
  }

  if (nextUrl && !showFavoritesOnly) {
    wrapper.innerHTML = `
      <button class="btn-load-more" id="loadMoreBtn">Load More Movies 🍿</button>`;
    document.getElementById('loadMoreBtn').addEventListener('click', async () => {
      const btn = document.getElementById('loadMoreBtn');
      btn.disabled = true;
      btn.textContent = 'Opening credits...';
      try {
        const data = await fetchAPI(nextUrl);
        movies = movies.concat(data.results);
        renderMoviesLocal(data.results, true);
        nextUrl = data.next;
        renderLocalPagination();
      } catch (err) {
        UI.showToast(err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  } else {
    wrapper.innerHTML = '';
  }
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function showSkeletons() {
  const container = document.getElementById('moviesContainer');
  container.innerHTML = Array(8).fill(
    '<div class="movie-card skeleton"></div>'
  ).join('');
}

function hideSkeletons() {
  const container = document.getElementById('moviesContainer');
  container.querySelectorAll('.skeleton').forEach(s => s.remove());
}

// ── Favorites ─────────────────────────────────────────────────────────────────

function getFavorites() {
  return JSON.parse(localStorage.getItem('cinebook_favorites') || '[]');
}

function toggleFavorite(movieId) {
  let favs = getFavorites();
  if (favs.includes(movieId)) {
    favs = favs.filter(id => id !== movieId);
    UI.showToast('Removed from favorites 🤍', 'info');
  } else {
    favs.push(movieId);
    UI.showToast('Added to favorites ❤️', 'success');
  }
  localStorage.setItem('cinebook_favorites', JSON.stringify(favs));
  if (currentSource === 'local') renderMoviesLocal(movies, false);
}

function initFavoritesBtn() {
  const btn = document.getElementById('favoritesFilterBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (currentSource !== 'local') {
      // Switch to local for favorites
      currentSource = 'local';
      document.getElementById('srcLocal').classList.add('active');
      document.getElementById('srcTMDB').classList.remove('active');
      updateSectionTitle();
    }
    showFavoritesOnly = !showFavoritesOnly;
    btn.style.background = showFavoritesOnly ? '#f84464' : 'transparent';
    btn.style.color = showFavoritesOnly ? '#fff' : '#f84464';
    resetAndLoad();
  });
}

// ── Genre / Rating Filters ────────────────────────────────────────────────────

function buildGenreFilters() {
  const genres = ['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller', 'Animation', 'Romance'];
  const el = document.getElementById('genreFilters');
  if (!el) return;

  el.innerHTML = genres.map(g =>
    `<button class="genre-chip ${g === 'All' ? 'active' : ''}" data-genre="${g.toLowerCase()}">${g}</button>`
  ).join('');

  el.querySelectorAll('.genre-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      showFavoritesOnly = false;
      const favBtn = document.getElementById('favoritesFilterBtn');
      if (favBtn) { favBtn.style.background = 'transparent'; favBtn.style.color = '#f84464'; }

      el.querySelectorAll('.genre-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGenre = btn.dataset.genre;

      // Genre filter: switch to TMDB search or local filter
      if (currentSource === 'tmdb') {
        // TMDB doesn't support genre filter directly in popular, use search mode
        searchQuery = activeGenre === 'all' ? '' : activeGenre;
        const si = document.getElementById('searchInput');
        if (si) si.value = searchQuery;
      }
      resetAndLoad();
    });
  });
}

function buildRatingFilters() {
  const el = document.getElementById('ratingFilters');
  if (!el) return;
  const btns = el.querySelectorAll('.genre-chip:not(#favoritesFilterBtn)');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      showFavoritesOnly = false;
      const favBtn = document.getElementById('favoritesFilterBtn');
      if (favBtn) { favBtn.style.background = 'transparent'; favBtn.style.color = '#f84464'; }
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeRating = btn.dataset.rating;
      resetAndLoad();
    });
  });
}

// ── Search ────────────────────────────────────────────────────────────────────

function attachSearchListener() {
  let debouncer;
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    clearTimeout(debouncer);
    searchQuery = e.target.value.trim();

    if (showFavoritesOnly && searchQuery) {
      showFavoritesOnly = false;
      const fb = document.getElementById('favoritesFilterBtn');
      if (fb) { fb.style.background = 'transparent'; fb.style.color = '#f84464'; }
    }

    debouncer = setTimeout(() => {
      currentPage = 1;
      movies = [];
      document.getElementById('moviesContainer').innerHTML = '';
      if (currentSource === 'tmdb') {
        loadTMDB(1, false);
      } else {
        loadLocal(false);
      }
    }, 350);
  });
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function initNavbar() {
  const container = document.getElementById('navActions');
  const user = Auth.getCurrentUser();

  if (Auth.isLoggedIn()) {
    container.innerHTML = `
      <div class="nav-user">
        <div class="nav-avatar">${user.username ? user.username[0].toUpperCase() : '?'}</div>
        <span class="nav-username">${user.username || user.email}</span>
        <button class="nav-logout" id="logoutBtn">Logout</button>
      </div>`;
    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
  } else {
    container.innerHTML = `
      <button class="nav-btn nav-btn--ghost" id="openLogin">Login</button>
      <button class="nav-btn nav-btn--primary" id="openRegister">Register</button>`;
    document.getElementById('openLogin').addEventListener('click',
      () => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' })));
    document.getElementById('openRegister').addEventListener('click',
      () => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' })));
  }
}

window.addEventListener('auth-change', initNavbar);
