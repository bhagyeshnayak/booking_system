/* ===================================================
   CineBook — movies.js
   Full frontend logic: auth, movies, booking, OTP
   =================================================== */

const API = 'http://127.0.0.1:8000/api';

// ── STATE ──────────────────────────────────────────
let currentUser = JSON.parse(localStorage.getItem('cinebook_user') || 'null');
let authToken   = localStorage.getItem('cinebook_token') || null;

let allMovies      = [];
let filteredMovies = [];
let activeGenre    = 'all';
let searchQuery    = '';

let bookingState = {
  movieId:    null,
  totalSeats: 18,
  selected:   new Set(),
  seatCount:  1,
  name:       '',
  email:      '',
  bookingId:  null,
};

// ── INIT ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderNavActions();
  attachNavListeners();
  fetchMovies();
  attachBookingFormEvents();
  attachAuthEvents();
  attachOtpEvents();
  attachScrollEffect();
});

// ── SCROLL EFFECT ──────────────────────────────────
function attachScrollEffect() {
  window.addEventListener('scroll', () => {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 30);
  });
}

// ── NAV ─────────────────────────────────────────────
function renderNavActions() {
  const el = document.getElementById('navActions');
  if (currentUser) {
    el.innerHTML = `
      <div class="nav-user">
        <a href="/my-bookings/" style="color:#f84464; font-weight:bold; margin-right:15px; text-decoration:none;">My Tickets</a>
        <div class="nav-avatar">${currentUser.username ? currentUser.username[0].toUpperCase() : '?'}</div>
        <span class="nav-username">${currentUser.username || currentUser.email}</span>
        <button class="nav-logout" id="logoutBtn">Logout</button>
      </div>`;
    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    el.innerHTML = `
      <button class="nav-btn nav-btn--ghost" id="openLogin">Login</button>
      <button class="nav-btn nav-btn--primary" id="openRegister">Register</button>`;
    document.getElementById('openLogin').addEventListener('click', () => openAuth('login'));
    document.getElementById('openRegister').addEventListener('click', () => openAuth('register'));
  }
}

function attachNavListeners() {
  // Search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    applyFilters();
  });
}

function logout() {
  currentUser = null; authToken = null;
  localStorage.removeItem('cinebook_user');
  localStorage.removeItem('cinebook_token');
  renderNavActions();
  showToast('Logged out successfully', false);
}

// ── MOVIES ─────────────────────────────────────────
async function fetchMovies() {
  // Hide noResults, show loading state
  const noResults = document.getElementById('noResults');
  noResults.classList.add('hidden');

  try {
    let movies = [];
    let url = `${API}/movies/?page_size=100`;
    while (url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) { movies = data; break; }
      movies = movies.concat(data.results || []);
      url = data.next || null;
    }
    allMovies       = movies;
    filteredMovies  = movies;
    buildGenreFilters();
    renderMovies(movies);
    document.getElementById('movieCount').textContent = `${movies.length} movies`;
    // Explicitly hide noResults since we have movies
    if (movies.length > 0) {
      noResults.classList.add('hidden');
    } else {
      noResults.classList.remove('hidden');
    }
  } catch (err) {
    document.getElementById('moviesContainer').innerHTML =
      `<p style="color:#a0a0b0;grid-column:1/-1;text-align:center;padding:60px 0;font-family:Inter,sans-serif">⚠️ Could not load movies. Make sure the Django server is running on port 8000.</p>`;
    noResults.classList.add('hidden');
    console.error('fetchMovies:', err);
  }
}

function buildGenreFilters() {
  const genres = ['All', ...new Set(allMovies.map(m => m.genre).filter(Boolean))];
  const el = document.getElementById('genreFilters');
  el.innerHTML = genres.map(g =>
    `<button class="genre-chip ${g === 'All' ? 'active' : ''}" data-genre="${g.toLowerCase()}">${g}</button>`
  ).join('');
  el.querySelectorAll('.genre-chip').forEach(btn =>
    btn.addEventListener('click', () => {
      el.querySelectorAll('.genre-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGenre = btn.dataset.genre;
      applyFilters();
    })
  );
}

function applyFilters() {
  filteredMovies = allMovies.filter(m => {
    const matchGenre  = activeGenre === 'all' || (m.genre || '').toLowerCase() === activeGenre;
    const matchSearch = !searchQuery ||
      (m.title || '').toLowerCase().includes(searchQuery) ||
      (m.description || '').toLowerCase().includes(searchQuery);
    return matchGenre && matchSearch;
  });
  document.getElementById('movieCount').textContent = `${filteredMovies.length} movies`;
  renderMovies(filteredMovies);
  document.getElementById('noResults').classList.toggle('hidden', filteredMovies.length > 0);
}

function renderMovies(movies) {
  const container = document.getElementById('moviesContainer');
  if (!movies.length) { container.innerHTML = ''; return; }
  container.innerHTML = movies.map(movie => movieCardHTML(movie)).join('');
  container.querySelectorAll('.btn-book-card').forEach(btn =>
    btn.addEventListener('click', () => openBookingModal(Number(btn.dataset.id)))
  );
}

function movieCardHTML(m) {
  const emoji   = getMovieEmoji(m.genre);
  const rating  = m.rating ? `<span class="card-rating">${m.rating}</span>` : '';
  const duration = m.duration ? `<span>${m.duration} min</span>` : '';
  const genre   = m.genre ? `<span class="card-genre">${m.genre}</span>` : '';

  const posterEl = m.poster
    ? `<a href="/movie/${m.id}/"><img class="card-poster" src="${escHtml(m.poster)}" alt="${escHtml(m.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null; this.outerHTML='<div class=&quot;card-poster-placeholder&quot;>${emoji}</div>';"></a>`
    : `<a href="/movie/${m.id}/"><div class="card-poster-placeholder">${emoji}</div></a>`;

  return `
    <div class="movie-card" id="movie-card-${m.id}">
      ${posterEl}
      <div class="card-body">
        <a href="/movie/${m.id}/" style="color:inherit;text-decoration:none">
          <div class="card-title">${escHtml(m.title)}</div>
        </a>
        <div class="card-meta">
          ${genre}
          ${rating}
          ${duration}
        </div>
        <p class="card-desc">${escHtml(m.description || '')}</p>
      </div>
      <div class="card-footer">
        <span class="card-duration">${m.duration ? m.duration + ' min' : ''}</span>
        <a href="/movie/${m.id}/" class="btn-book-card" id="book-btn-${m.id}">Book Ticket</a>
      </div>
    </div>`;
}

// ── BOOKING MODAL ───────────────────────────────────
function openBookingModal(movieId) {
  const movie = allMovies.find(m => m.id === movieId);
  if (!movie) return;

  // Reset state
  bookingState.movieId   = movieId;
  bookingState.selected  = new Set();
  bookingState.seatCount = 1;
  document.getElementById('seatCount').textContent = '1';
  document.getElementById('selectedSeats').value = '1';

  // Populate modal
  document.getElementById('modalTitle').textContent    = movie.title;
  document.getElementById('modalGenre').textContent    = movie.genre || '';
  document.getElementById('modalDuration').textContent = movie.duration ? `${movie.duration} min` : '';
  document.getElementById('modalRating').textContent   = movie.rating ? `★ ${movie.rating}` : '';
  document.getElementById('modalDesc').textContent     = movie.description || '';

  // Poster strip
  const strip = document.getElementById('modalPosterStrip');
  if (movie.poster) {
    strip.innerHTML = `<img src="${escHtml(movie.poster)}" alt="${escHtml(movie.title)}" referrerpolicy="no-referrer" onerror="this.style.display='none';"><span class="strip-emoji">${getMovieEmoji(movie.genre)}</span>`;
  } else {
    strip.innerHTML = `<span class="strip-emoji">${getMovieEmoji(movie.genre)}</span>`;
    strip.style.background = `linear-gradient(135deg, #1a1a2a, var(--bg-3))`;
  }

  renderSeatsGrid();

  // Pre-fill name/email if logged in
  if (currentUser) {
    document.getElementById('bookEmail').value = currentUser.email || '';
    document.getElementById('bookName').value  = currentUser.username || '';
  } else {
    document.getElementById('bookEmail').value = '';
    document.getElementById('bookName').value  = '';
  }

  document.getElementById('selectedMovieId').value = movieId;
  openModal('bookingModal');
}

function renderSeatsGrid() {
  const grid = document.getElementById('seatsGrid');
  grid.innerHTML = '';
  for (let i = 1; i <= bookingState.totalSeats; i++) {
    const seat = document.createElement('button');
    seat.type = 'button';
    seat.className = 'seat';
    seat.textContent = i;
    seat.dataset.seat = i;
    seat.addEventListener('click', () => toggleSeat(seat, i));
    grid.appendChild(seat);
  }
}

function toggleSeat(el, num) {
  if (el.classList.contains('booked')) return;
  if (el.classList.contains('selected')) {
    el.classList.remove('selected');
    bookingState.selected.delete(num);
  } else {
    if (bookingState.selected.size >= bookingState.seatCount) {
      showToast(`You can only select ${bookingState.seatCount} seat(s)`, true);
      return;
    }
    el.classList.add('selected');
    bookingState.selected.add(num);
  }
}

function attachBookingFormEvents() {
  document.getElementById('seatDown').addEventListener('click', () => {
    if (bookingState.seatCount <= 1) return;
    bookingState.seatCount--;
    document.getElementById('seatCount').textContent = bookingState.seatCount;
    document.getElementById('selectedSeats').value = bookingState.seatCount;
    // deselect extras
    if (bookingState.selected.size > bookingState.seatCount) {
      const arr = [...bookingState.selected];
      arr.slice(bookingState.seatCount).forEach(n => {
        bookingState.selected.delete(n);
        const el = document.querySelector(`.seat[data-seat="${n}"]`);
        if (el) el.classList.remove('selected');
      });
    }
  });

  document.getElementById('seatUp').addEventListener('click', () => {
    if (bookingState.seatCount >= bookingState.totalSeats) return;
    bookingState.seatCount++;
    document.getElementById('seatCount').textContent = bookingState.seatCount;
    document.getElementById('selectedSeats').value = bookingState.seatCount;
  });

  document.getElementById('closeModal').addEventListener('click', () => closeModal('bookingModal'));
  document.getElementById('bookingModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('bookingModal')) closeModal('bookingModal');
  });

  document.getElementById('bookingForm').addEventListener('submit', handleBooking);
}

async function handleBooking(e) {
  e.preventDefault();

  if (!currentUser) {
    closeModal('bookingModal');
    openAuth('login');
    showToast('Please login to book tickets', true);
    return;
  }

  const name  = document.getElementById('bookName').value.trim();
  const email = document.getElementById('bookEmail').value.trim();
  const seats = bookingState.seatCount;

  if (!name || !email) { showToast('Please fill in all fields', true); return; }

  const btn    = document.getElementById('submitBooking');
  const loader = document.getElementById('btnLoader');
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Booking…';
  loader.classList.remove('hidden');

  try {
    const res = await fetch(`${API}/bookings/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        movie: bookingState.movieId,
        name,
        email,
        seats,
      }),
    });
    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      logout();
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));

    bookingState.bookingId = data.booking_id;
    bookingState.name  = name;
    bookingState.email = email;

    closeModal('bookingModal');
    document.getElementById('otpEmailDisplay').textContent = email;
    openModal('otpModal');

  } catch (err) {
    console.error('booking error:', err);
    showToast('Booking failed. Please try again.', true);
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Confirm Booking';
    loader.classList.add('hidden');
  }
}

// ── OTP ─────────────────────────────────────────────
function attachOtpEvents() {
  // Auto‑advance on digit input
  document.querySelectorAll('.otp-digit').forEach((input, i, inputs) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/, '');
      if (input.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus();
    });
  });

  document.getElementById('verifyOtpBtn').addEventListener('click', handleOtp);
}

async function handleOtp() {
  const digits = [...document.querySelectorAll('.otp-digit')].map(i => i.value).join('');
  if (digits.length < 6) { showToast('Enter all 6 digits', true); return; }

  const errEl = document.getElementById('otpError');
  errEl.classList.add('hidden');

  try {
    const res = await fetch(`${API}/bookings/${bookingState.bookingId}/verify-otp/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ otp: digits }),
    });
    if (res.status === 401) {
      alert("Session expired. Please log in again.");
      logout();
      window.location.href = '/';
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || 'Invalid OTP';
      errEl.classList.remove('hidden');
      return;
    }
    closeModal('otpModal');
    showToast('🎉 Booking confirmed! Enjoy your movie!', false);
    document.querySelectorAll('.otp-digit').forEach(i => i.value = '');
  } catch (err) {
    errEl.textContent = 'Something went wrong. Try again.';
    errEl.classList.remove('hidden');
  }
}

// ── AUTH ─────────────────────────────────────────────
function openAuth(tab) {
  openModal('authModal');
  switchAuthTab(tab);
}

function attachAuthEvents() {
  document.getElementById('tabLogin').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tabRegister').addEventListener('click', () => switchAuthTab('register'));
  document.getElementById('closeAuth').addEventListener('click', () => closeModal('authModal'));
  document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('authModal')) closeModal('authModal');
  });

  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
  document.getElementById('registerForm').classList.toggle('hidden', isLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl    = document.getElementById('loginError');
  errEl.classList.add('hidden');

  try {
    const res  = await fetch(`${API}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || data.error || 'Login failed');

    authToken   = data.access || data.token;
    currentUser = { email, username: data.username || email.split('@')[0] };
    localStorage.setItem('cinebook_token', authToken);
    localStorage.setItem('cinebook_user', JSON.stringify(currentUser));

    closeModal('authModal');
    renderNavActions();
    showToast(`Welcome back, ${currentUser.username}! 🎬`, false);
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('regUsername').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const errEl    = document.getElementById('registerError');
  errEl.classList.add('hidden');

  try {
    const res  = await fetch(`${API}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = Object.values(data).flat().join(' ');
      throw new Error(msg || 'Registration failed');
    }
    showToast('Account created! Please login.', false);
    switchAuthTab('login');
    document.getElementById('loginEmail').value = email;
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

// ── MODAL HELPERS ────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
}

// ── TOAST ────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toast').querySelector('.toast-icon').textContent = isError ? '⚠️' : '✅';
  toast.classList.toggle('error', isError);
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

// ── UTILS ─────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getMovieEmoji(genre) {
  const map = {
    'action':   '💥',
    'adventure':'🗺️',
    'comedy':   '😂',
    'drama':    '🎭',
    'horror':   '👻',
    'romance':  '❤️',
    'sci-fi':   '🚀',
    'thriller': '🔪',
    'animation':'🎨',
    'fantasy':  '🧙',
    'crime':    '🕵️',
    'mystery':  '🔍',
    'musical':  '🎵',
    'western':  '🤠',
  };
  return map[(genre || '').toLowerCase()] || '🎬';
}