/**
 * CineBook Index Script (Homepage)
 * --------------------------------
 * Handles movie pagination, filtering, search, and navigation.
 * Added Phase 6: Caching, Advanced Filters, and Favorites (Wishlist).
 */

import { fetchAPI, API_BASE_URL } from './api.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';

let movies = [];
let currentPage = 1;
let nextUrl = null;

// Filters
let activeGenre = 'all';
let activeRating = '0';
let searchQuery = '';
let showFavoritesOnly = false;

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initFavoritesBtn();
  fetchInitialMovies();
  attachEventListeners();
});

/**
 * Initialize Navbar Actions
 */
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
    document.getElementById('openLogin').addEventListener('click', () => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'login' })));
    document.getElementById('openRegister').addEventListener('click', () => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' })));
  }
}

/**
 * Favorites LocalStorage Logic
 */
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
  
  // Re-render to update the heart icons
  renderMovies(movies, false);
}

function initFavoritesBtn() {
  const btn = document.getElementById('favoritesFilterBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      showFavoritesOnly = !showFavoritesOnly;
      btn.style.background = showFavoritesOnly ? '#f84464' : 'transparent';
      btn.style.color = showFavoritesOnly ? '#fff' : '#f84464';
      if (showFavoritesOnly) {
         // Switch off genre and search visual cues
         document.querySelectorAll('.genre-chip:not(#favoritesFilterBtn)').forEach(b => b.classList.remove('active'));
      }
      resetAndFetch();
    });
  }
}

/**
 * Initial Movie Fetch (With Caching!)
 */
async function fetchInitialMovies() {
  try {
    // ⚡ Phase 6 Local Cache enabled with background re-fetch callback
    // Pre-cache 50 movies to ensure robust local filtering offline
    const data = await fetchAPI('/movies/?page=1&page_size=50', {
      useCache: true,
      onCacheUpdate: (updatedData) => {
        movies = updatedData.results || [];
        nextUrl = updatedData.next;
        renderMovies(movies, false);
      }
    });

    movies = data.results || [];
    nextUrl = data.next;

    renderMovies(movies, false);
    renderPagination();
    buildGenreFilters();
    buildRatingFilters();
    
    UI.toggleGlobalLoader(false);
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

/**
 * Build Genre Filters
 */
function buildGenreFilters() {
  const genres = ['All', 'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Thriller'];
  const el = document.getElementById('genreFilters');
  if(!el) return;
  el.innerHTML = genres.map(g =>
    `<button class="genre-chip ${g === 'All' ? 'active' : ''}" data-genre="${g.toLowerCase()}">${g}</button>`
  ).join('');
  
  el.querySelectorAll('.genre-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      showFavoritesOnly = false; // Disable fav mode
      document.getElementById('favoritesFilterBtn').style.background = 'transparent';
      document.getElementById('favoritesFilterBtn').style.color = '#f84464';

      el.querySelectorAll('.genre-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGenre = btn.dataset.genre;
      resetAndFetch();
    });
  });
}

/**
 * Build Rating Filters
 */
function buildRatingFilters() {
  const el = document.getElementById('ratingFilters');
  if (!el) return;
  const btns = el.querySelectorAll('.genre-chip:not(#favoritesFilterBtn)');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
       showFavoritesOnly = false;
       document.getElementById('favoritesFilterBtn').style.background = 'transparent';
       document.getElementById('favoritesFilterBtn').style.color = '#f84464';

       btns.forEach(b => b.classList.remove('active'));
       btn.classList.add('active');
       activeRating = btn.dataset.rating;
       resetAndFetch();
    });
  });
}

/**
 * Render Movie Grid
 */
function renderMovies(movieList, append = false) {
  const container = document.getElementById('moviesContainer');
  if (!append) container.innerHTML = '';

  let listToRender = movieList;

  // Local filtering if "Favorites" mode is on
  if (showFavoritesOnly) {
    const favs = getFavorites();
    // In a real huge app this would be an API call /movies/?ids=..., but local works perfectly for our scale
    listToRender = listToRender.filter(m => favs.includes(m.id));
  }

  if (listToRender.length === 0 && !append) {
    document.getElementById('noResults').classList.remove('hidden');
    document.getElementById('movieCount').textContent = '0 movies';
    return;
  }
  document.getElementById('noResults').classList.add('hidden');

  const favs = getFavorites();

  const html = listToRender.map(m => {
    const isFav = favs.includes(m.id);
    return `
      <div class="movie-card" id="movie-card-${m.id}">
        <div class="fav-btn ${isFav ? 'active' : ''}" data-id="${m.id}" title="Add to Favorites">${isFav ? '❤️' : '🤍'}</div>
        <a href="/movie/${m.id}/">
          <div class="card-poster-wrapper">
            <img class="card-poster" src="${UI.esc(m.poster || '')}" alt="${UI.esc(m.title)}" loading="lazy" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
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
  document.getElementById('movieCount').textContent = `${document.querySelectorAll('.movie-card').length} movies`;

  // Attach favorite listeners
  container.querySelectorAll('.fav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleFavorite(parseInt(btn.dataset.id));
    });
  });
}

/**
 * Pagination Button
 */
function renderPagination() {
  let wrapper = document.getElementById('paginationWrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'paginationWrapper';
    wrapper.className = 'pagination-wrapper';
    document.querySelector('.movies-section').appendChild(wrapper);
  }

  // Hide pagination if in favorites mode (assuming all favs are loaded for now)
  if (nextUrl && !showFavoritesOnly) {
    wrapper.innerHTML = `
      <button class="btn-load-more" id="loadMoreBtn">
        Load More Movies 🍿
      </button>`;
    document.getElementById('loadMoreBtn').addEventListener('click', loadMore);
  } else {
    wrapper.innerHTML = '';
  }
}

async function loadMore() {
  if (!nextUrl) return;
  const btn = document.getElementById('loadMoreBtn');
  btn.disabled = true;
  btn.textContent = 'Opening credits...';

  try {
    const data = await fetchAPI(nextUrl);
    // Append to underlying logic list too
    movies = movies.concat(data.results);
    
    renderMovies(data.results, true);
    nextUrl = data.next;
    renderPagination();
  } catch (err) {
    UI.showToast(err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Filter and Search Logic
 */
async function resetAndFetch() {
  currentPage = 1;
  const url = new URL(`${API_BASE_URL}/movies/`);
  url.searchParams.append('page', 1);
  url.searchParams.append('page_size', 50); // Get more so local favorites filter works better
  
  if (!showFavoritesOnly) {
    if (activeGenre !== 'all') url.searchParams.append('genre', activeGenre);
    if (activeRating !== '0') url.searchParams.append('min_rating', activeRating);
    if (searchQuery) url.searchParams.append('search', searchQuery);
  }

  try {
    const data = await fetchAPI(url.toString(), {
      useCache: true,
      onCacheUpdate: (updatedData) => {
        movies = updatedData.results;
        nextUrl = updatedData.next;
        renderMovies(movies, false);
      }
    });
    
    movies = data.results;
    nextUrl = data.next;
    renderMovies(movies, false);
    renderPagination();
  } catch (err) {
    console.warn("Backend unavailable, falling back to local memory filtering!");
    let cachedSource = JSON.parse(localStorage.getItem(`cinebook_cache_${API_BASE_URL}/movies/?page=1&page_size=50`) || '{"results":[]}');
    let localList = cachedSource.results || cachedSource;

    if (!showFavoritesOnly) {
      if (activeGenre !== 'all') {
        localList = localList.filter(m => (m.genre || '').toLowerCase() === activeGenre);
      }
      if (activeRating !== '0') {
        localList = localList.filter(m => parseFloat(m.rating || 0) >= parseFloat(activeRating));
      }
      if (searchQuery) {
        localList = localList.filter(m => (m.title || '').toLowerCase().includes(searchQuery));
      }
    }
    
    renderMovies(localList, false);
    const pw = document.getElementById('paginationWrapper');
    if(pw) pw.innerHTML = '';
    UI.showToast('Backend filtering unavailable. Using local memory cache. ⚡', 'info');
  }
}

function attachEventListeners() {
  // Global search (debounced 300ms)
  let debouncer;
  const searchInput = document.getElementById('searchInput');
  if(searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debouncer);
      searchQuery = e.target.value.toLowerCase();
      // Disable favorite mode on search
      if (showFavoritesOnly && searchQuery) {
        showFavoritesOnly = false;
        document.getElementById('favoritesFilterBtn').style.background = 'transparent';
        document.getElementById('favoritesFilterBtn').style.color = '#f84464';
      }
      debouncer = setTimeout(resetAndFetch, 300);
    });
  }

  // Auth event listeners
  window.addEventListener('auth-change', initNavbar);
}
