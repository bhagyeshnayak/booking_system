"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

/* ===================================================
   CineBook — movies.js
   Full frontend logic: auth, movies, booking, OTP
   =================================================== */
var API = 'http://127.0.0.1:8000/api'; // ── STATE ──────────────────────────────────────────

var currentUser = JSON.parse(localStorage.getItem('cinebook_user') || 'null');
var authToken = localStorage.getItem('cinebook_token') || null;
var allMovies = [];
var filteredMovies = [];
var activeGenre = 'all';
var searchQuery = '';
var bookingState = {
  movieId: null,
  totalSeats: 18,
  selected: new Set(),
  seatCount: 1,
  name: '',
  email: '',
  bookingId: null
}; // ── INIT ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  renderNavActions();
  attachNavListeners();
  fetchMovies();
  attachBookingFormEvents();
  attachAuthEvents();
  attachOtpEvents();
  attachScrollEffect();
  loadSeats();
}); // ── SCROLL EFFECT ──────────────────────────────────

function attachScrollEffect() {
  window.addEventListener('scroll', function () {
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 30);
  });
} // ── NAV ─────────────────────────────────────────────


function renderNavActions() {
  var el = document.getElementById('navActions');

  if (currentUser) {
    el.innerHTML = "\n      <div class=\"nav-user\">\n        <div class=\"nav-avatar\">".concat(currentUser.username ? currentUser.username[0].toUpperCase() : '?', "</div>\n        <span class=\"nav-username\">").concat(currentUser.username || currentUser.email, "</span>\n        <button class=\"nav-logout\" id=\"logoutBtn\">Logout</button>\n      </div>");
    document.getElementById('logoutBtn').addEventListener('click', logout);
  } else {
    el.innerHTML = "\n      <button class=\"nav-btn nav-btn--ghost\" id=\"openLogin\">Login</button>\n      <button class=\"nav-btn nav-btn--primary\" id=\"openRegister\">Register</button>";
    document.getElementById('openLogin').addEventListener('click', function () {
      return openAuth('login');
    });
    document.getElementById('openRegister').addEventListener('click', function () {
      return openAuth('register');
    });
  }
}

function attachNavListeners() {
  // Search
  document.getElementById('searchInput').addEventListener('input', function (e) {
    searchQuery = e.target.value.toLowerCase();
    applyFilters();
  });
}

function logout() {
  currentUser = null;
  authToken = null;
  localStorage.removeItem('cinebook_user');
  localStorage.removeItem('cinebook_token');
  renderNavActions();
  showToast('Logged out successfully', false);
} // ── MOVIES ─────────────────────────────────────────


function fetchMovies() {
  var noResults, movies, url, res, data;
  return regeneratorRuntime.async(function fetchMovies$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          // Hide noResults, show loading state
          noResults = document.getElementById('noResults');
          noResults.classList.add('hidden');
          _context.prev = 2;
          movies = [];
          url = "".concat(API, "/movies/?page_size=100");

        case 5:
          if (!url) {
            _context.next = 21;
            break;
          }

          _context.next = 8;
          return regeneratorRuntime.awrap(fetch(url));

        case 8:
          res = _context.sent;

          if (res.ok) {
            _context.next = 11;
            break;
          }

          throw new Error("HTTP ".concat(res.status));

        case 11:
          _context.next = 13;
          return regeneratorRuntime.awrap(res.json());

        case 13:
          data = _context.sent;

          if (!Array.isArray(data)) {
            _context.next = 17;
            break;
          }

          movies = data;
          return _context.abrupt("break", 21);

        case 17:
          movies = movies.concat(data.results || []);
          url = data.next || null;
          _context.next = 5;
          break;

        case 21:
          allMovies = movies;
          filteredMovies = movies;
          buildGenreFilters();
          renderMovies(movies);
          document.getElementById('movieCount').textContent = "".concat(movies.length, " movies"); // Explicitly hide noResults since we have movies

          if (movies.length > 0) {
            noResults.classList.add('hidden');
          } else {
            noResults.classList.remove('hidden');
          }

          _context.next = 34;
          break;

        case 29:
          _context.prev = 29;
          _context.t0 = _context["catch"](2);
          document.getElementById('moviesContainer').innerHTML = "<p style=\"color:#a0a0b0;grid-column:1/-1;text-align:center;padding:60px 0;font-family:Inter,sans-serif\">\u26A0\uFE0F Could not load movies. Make sure the Django server is running on port 8000.</p>";
          noResults.classList.add('hidden');
          console.error('fetchMovies:', _context.t0);

        case 34:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[2, 29]]);
}

function buildGenreFilters() {
  var genres = ['All'].concat(_toConsumableArray(new Set(allMovies.map(function (m) {
    return m.genre;
  }).filter(Boolean))));
  var el = document.getElementById('genreFilters');
  el.innerHTML = genres.map(function (g) {
    return "<button class=\"genre-chip ".concat(g === 'All' ? 'active' : '', "\" data-genre=\"").concat(g.toLowerCase(), "\">").concat(g, "</button>");
  }).join('');
  el.querySelectorAll('.genre-chip').forEach(function (btn) {
    return btn.addEventListener('click', function () {
      el.querySelectorAll('.genre-chip').forEach(function (b) {
        return b.classList.remove('active');
      });
      btn.classList.add('active');
      activeGenre = btn.dataset.genre;
      applyFilters();
    });
  });
}

function applyFilters() {
  filteredMovies = allMovies.filter(function (m) {
    var matchGenre = activeGenre === 'all' || (m.genre || '').toLowerCase() === activeGenre;
    var matchSearch = !searchQuery || (m.title || '').toLowerCase().includes(searchQuery) || (m.description || '').toLowerCase().includes(searchQuery);
    return matchGenre && matchSearch;
  });
  document.getElementById('movieCount').textContent = "".concat(filteredMovies.length, " movies");
  renderMovies(filteredMovies);
  document.getElementById('noResults').classList.toggle('hidden', filteredMovies.length > 0);
}

function renderMovies(movies) {
  var container = document.getElementById('moviesContainer');

  if (!movies.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = movies.map(function (movie) {
    return movieCardHTML(movie);
  }).join('');
  container.querySelectorAll('.btn-book-card').forEach(function (btn) {
    return btn.addEventListener('click', function () {
      return openBookingModal(Number(btn.dataset.id));
    });
  });
}

function movieCardHTML(m) {
  var emoji = getMovieEmoji(m.genre);
  var rating = m.rating ? "<span class=\"card-rating\">".concat(m.rating, "</span>") : '';
  var duration = m.duration ? "<span>".concat(m.duration, " min</span>") : '';
  var genre = m.genre ? "<span class=\"card-genre\">".concat(m.genre, "</span>") : '';
  var posterEl = m.poster ? "<a href=\"/movie/".concat(m.id, "/\"><img class=\"card-poster\" src=\"").concat(escHtml(m.poster), "\" alt=\"").concat(escHtml(m.title), "\" loading=\"lazy\"></a>") : "<a href=\"/movie/".concat(m.id, "/\"><div class=\"card-poster-placeholder\">").concat(emoji, "</div></a>");
  return "\n    <div class=\"movie-card\" id=\"movie-card-".concat(m.id, "\">\n      ").concat(posterEl, "\n      <div class=\"card-body\">\n        <a href=\"/movie/").concat(m.id, "/\" style=\"color:inherit;text-decoration:none\">\n          <div class=\"card-title\">").concat(escHtml(m.title), "</div>\n        </a>\n        <div class=\"card-meta\">\n          ").concat(genre, "\n          ").concat(rating, "\n          ").concat(duration, "\n        </div>\n        <p class=\"card-desc\">").concat(escHtml(m.description || ''), "</p>\n      </div>\n      <div class=\"card-footer\">\n        <span class=\"card-duration\">").concat(m.duration ? m.duration + ' min' : '', "</span>\n        <a href=\"/movie/").concat(m.id, "/\" class=\"btn-book-card\" id=\"book-btn-").concat(m.id, "\">Book Ticket</a>\n      </div>\n    </div>");
} // ── BOOKING MODAL ───────────────────────────────────


function openBookingModal(movieId) {
  var movie = allMovies.find(function (m) {
    return m.id === movieId;
  });
  if (!movie) return; // Reset state

  bookingState.movieId = movieId;
  bookingState.selected = new Set();
  bookingState.seatCount = 1;
  document.getElementById('seatCount').textContent = '1';
  document.getElementById('selectedSeats').value = '1'; // Populate modal

  document.getElementById('modalTitle').textContent = movie.title;
  document.getElementById('modalGenre').textContent = movie.genre || '';
  document.getElementById('modalDuration').textContent = movie.duration ? "".concat(movie.duration, " min") : '';
  document.getElementById('modalRating').textContent = movie.rating ? "\u2605 ".concat(movie.rating) : '';
  document.getElementById('modalDesc').textContent = movie.description || ''; // Poster strip

  var strip = document.getElementById('modalPosterStrip');

  if (movie.poster) {
    strip.innerHTML = "<img src=\"".concat(escHtml(movie.poster), "\" alt=\"").concat(escHtml(movie.title), "\"><span class=\"strip-emoji\">").concat(getMovieEmoji(movie.genre), "</span>");
  } else {
    strip.innerHTML = "<span class=\"strip-emoji\">".concat(getMovieEmoji(movie.genre), "</span>");
    strip.style.background = "linear-gradient(135deg, #1a1a2a, var(--bg-3))";
  }

  renderSeatsGrid(); // Pre-fill name/email if logged in

  if (currentUser) {
    document.getElementById('bookEmail').value = currentUser.email || '';
    document.getElementById('bookName').value = currentUser.username || '';
  } else {
    document.getElementById('bookEmail').value = '';
    document.getElementById('bookName').value = '';
  }

  document.getElementById('selectedMovieId').value = movieId;
  openModal('bookingModal');
}

function renderSeatsGrid() {
  var grid = document.getElementById('seatsGrid');
  grid.innerHTML = '';

  var _loop = function _loop(i) {
    var seat = document.createElement('button');
    seat.type = 'button';
    seat.className = 'seat';
    seat.textContent = i;
    seat.dataset.seat = i;
    seat.addEventListener('click', function () {
      return toggleSeat(seat, i);
    });
    grid.appendChild(seat);
  };

  for (var i = 1; i <= bookingState.totalSeats; i++) {
    _loop(i);
  }
}

function toggleSeat(el, num) {
  if (el.classList.contains('booked')) return;

  if (el.classList.contains('selected')) {
    el.classList.remove('selected');
    bookingState.selected["delete"](num);
  } else {
    if (bookingState.selected.size >= bookingState.seatCount) {
      showToast("You can only select ".concat(bookingState.seatCount, " seat(s)"), true);
      return;
    }

    el.classList.add('selected');
    bookingState.selected.add(num);
  }
}

function attachBookingFormEvents() {
  document.getElementById('seatDown').addEventListener('click', function () {
    if (bookingState.seatCount <= 1) return;
    bookingState.seatCount--;
    document.getElementById('seatCount').textContent = bookingState.seatCount;
    document.getElementById('selectedSeats').value = bookingState.seatCount; // deselect extras

    if (bookingState.selected.size > bookingState.seatCount) {
      var arr = _toConsumableArray(bookingState.selected);

      arr.slice(bookingState.seatCount).forEach(function (n) {
        bookingState.selected["delete"](n);
        var el = document.querySelector(".seat[data-seat=\"".concat(n, "\"]"));
        if (el) el.classList.remove('selected');
      });
    }
  });
  document.getElementById('seatUp').addEventListener('click', function () {
    if (bookingState.seatCount >= bookingState.totalSeats) return;
    bookingState.seatCount++;
    document.getElementById('seatCount').textContent = bookingState.seatCount;
    document.getElementById('selectedSeats').value = bookingState.seatCount;
  });
  document.getElementById('closeModal').addEventListener('click', function () {
    return closeModal('bookingModal');
  });
  document.getElementById('bookingModal').addEventListener('click', function (e) {
    if (e.target === document.getElementById('bookingModal')) closeModal('bookingModal');
  });
  document.getElementById('bookingForm').addEventListener('submit', handleBooking);
}

function handleBooking(e) {
  var name, email, seats, btn, loader, res, data;
  return regeneratorRuntime.async(function handleBooking$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          e.preventDefault();

          if (currentUser) {
            _context2.next = 6;
            break;
          }

          closeModal('bookingModal');
          openAuth('login');
          showToast('Please login to book tickets', true);
          return _context2.abrupt("return");

        case 6:
          name = document.getElementById('bookName').value.trim();
          email = document.getElementById('bookEmail').value.trim();
          seats = bookingState.seatCount;

          if (!(!name || !email)) {
            _context2.next = 12;
            break;
          }

          showToast('Please fill in all fields', true);
          return _context2.abrupt("return");

        case 12:
          btn = document.getElementById('submitBooking');
          loader = document.getElementById('btnLoader');
          btn.disabled = true;
          btn.querySelector('.btn-text').textContent = 'Booking…';
          loader.classList.remove('hidden');
          _context2.prev = 17;
          _context2.next = 20;
          return regeneratorRuntime.awrap(fetch("".concat(API, "/bookings/"), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': "Bearer ".concat(authToken)
            },
            body: JSON.stringify({
              movie: bookingState.movieId,
              name: name,
              email: email,
              seats: seats
            })
          }));

        case 20:
          res = _context2.sent;
          _context2.next = 23;
          return regeneratorRuntime.awrap(res.json());

        case 23:
          data = _context2.sent;

          if (res.ok) {
            _context2.next = 26;
            break;
          }

          throw new Error(JSON.stringify(data));

        case 26:
          bookingState.bookingId = data.booking_id;
          bookingState.name = name;
          bookingState.email = email;
          closeModal('bookingModal');
          document.getElementById('otpEmailDisplay').textContent = email;
          openModal('otpModal');
          _context2.next = 38;
          break;

        case 34:
          _context2.prev = 34;
          _context2.t0 = _context2["catch"](17);
          console.error('booking error:', _context2.t0);
          showToast('Booking failed. Please try again.', true);

        case 38:
          _context2.prev = 38;
          btn.disabled = false;
          btn.querySelector('.btn-text').textContent = 'Confirm Booking';
          loader.classList.add('hidden');
          return _context2.finish(38);

        case 43:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[17, 34, 38, 43]]);
} // ── OTP ─────────────────────────────────────────────


function attachOtpEvents() {
  // Auto‑advance on digit input
  document.querySelectorAll('.otp-digit').forEach(function (input, i, inputs) {
    input.addEventListener('input', function () {
      input.value = input.value.replace(/\D/, '');
      if (input.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus();
    });
  });
  document.getElementById('verifyOtpBtn').addEventListener('click', handleOtp);
}

function handleOtp() {
  var digits, errEl, res, data;
  return regeneratorRuntime.async(function handleOtp$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          digits = _toConsumableArray(document.querySelectorAll('.otp-digit')).map(function (i) {
            return i.value;
          }).join('');

          if (!(digits.length < 6)) {
            _context3.next = 4;
            break;
          }

          showToast('Enter all 6 digits', true);
          return _context3.abrupt("return");

        case 4:
          errEl = document.getElementById('otpError');
          errEl.classList.add('hidden');
          _context3.prev = 6;
          _context3.next = 9;
          return regeneratorRuntime.awrap(fetch("".concat(API, "/bookings/").concat(bookingState.bookingId, "/verify-otp/"), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': "Bearer ".concat(authToken)
            },
            body: JSON.stringify({
              otp: digits
            })
          }));

        case 9:
          res = _context3.sent;
          _context3.next = 12;
          return regeneratorRuntime.awrap(res.json());

        case 12:
          data = _context3.sent;

          if (res.ok) {
            _context3.next = 17;
            break;
          }

          errEl.textContent = data.error || 'Invalid OTP';
          errEl.classList.remove('hidden');
          return _context3.abrupt("return");

        case 17:
          closeModal('otpModal');
          showToast('🎉 Booking confirmed! Enjoy your movie!', false);
          document.querySelectorAll('.otp-digit').forEach(function (i) {
            return i.value = '';
          });
          _context3.next = 26;
          break;

        case 22:
          _context3.prev = 22;
          _context3.t0 = _context3["catch"](6);
          errEl.textContent = 'Something went wrong. Try again.';
          errEl.classList.remove('hidden');

        case 26:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[6, 22]]);
} // ── AUTH ─────────────────────────────────────────────


function openAuth(tab) {
  openModal('authModal');
  switchAuthTab(tab);
}

function attachAuthEvents() {
  document.getElementById('tabLogin').addEventListener('click', function () {
    return switchAuthTab('login');
  });
  document.getElementById('tabRegister').addEventListener('click', function () {
    return switchAuthTab('register');
  });
  document.getElementById('closeAuth').addEventListener('click', function () {
    return closeModal('authModal');
  });
  document.getElementById('authModal').addEventListener('click', function (e) {
    if (e.target === document.getElementById('authModal')) closeModal('authModal');
  });
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('registerForm').addEventListener('submit', handleRegister);
}

function switchAuthTab(tab) {
  var isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
  document.getElementById('registerForm').classList.toggle('hidden', isLogin);
}

function handleLogin(e) {
  var email, password, errEl, res, data;
  return regeneratorRuntime.async(function handleLogin$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          e.preventDefault();
          email = document.getElementById('loginEmail').value.trim();
          password = document.getElementById('loginPassword').value;
          errEl = document.getElementById('loginError');
          errEl.classList.add('hidden');
          _context4.prev = 5;
          _context4.next = 8;
          return regeneratorRuntime.awrap(fetch("".concat(API, "/auth/login/"), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: email,
              password: password
            })
          }));

        case 8:
          res = _context4.sent;
          _context4.next = 11;
          return regeneratorRuntime.awrap(res.json());

        case 11:
          data = _context4.sent;

          if (res.ok) {
            _context4.next = 14;
            break;
          }

          throw new Error(data.detail || data.error || 'Login failed');

        case 14:
          authToken = data.access || data.token;
          currentUser = {
            email: email,
            username: data.username || email.split('@')[0]
          };
          localStorage.setItem('cinebook_token', authToken);
          localStorage.setItem('cinebook_user', JSON.stringify(currentUser));
          closeModal('authModal');
          renderNavActions();
          showToast("Welcome back, ".concat(currentUser.username, "! \uD83C\uDFAC"), false);
          _context4.next = 27;
          break;

        case 23:
          _context4.prev = 23;
          _context4.t0 = _context4["catch"](5);
          errEl.textContent = _context4.t0.message;
          errEl.classList.remove('hidden');

        case 27:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[5, 23]]);
}

function handleRegister(e) {
  var username, email, password, errEl, res, data, msg;
  return regeneratorRuntime.async(function handleRegister$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          e.preventDefault();
          username = document.getElementById('regUsername').value.trim();
          email = document.getElementById('regEmail').value.trim();
          password = document.getElementById('regPassword').value;
          errEl = document.getElementById('registerError');
          errEl.classList.add('hidden');
          _context5.prev = 6;
          _context5.next = 9;
          return regeneratorRuntime.awrap(fetch("".concat(API, "/auth/register/"), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: username,
              email: email,
              password: password
            })
          }));

        case 9:
          res = _context5.sent;
          _context5.next = 12;
          return regeneratorRuntime.awrap(res.json());

        case 12:
          data = _context5.sent;

          if (res.ok) {
            _context5.next = 16;
            break;
          }

          msg = Object.values(data).flat().join(' ');
          throw new Error(msg || 'Registration failed');

        case 16:
          showToast('Account created! Please login.', false);
          switchAuthTab('login');
          document.getElementById('loginEmail').value = email;
          _context5.next = 25;
          break;

        case 21:
          _context5.prev = 21;
          _context5.t0 = _context5["catch"](6);
          errEl.textContent = _context5.t0.message;
          errEl.classList.remove('hidden');

        case 25:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[6, 21]]);
} // ── MODAL HELPERS ────────────────────────────────────


function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  document.body.style.overflow = '';
} // ── TOAST ────────────────────────────────────────────


var toastTimer = null;

function showToast(msg) {
  var isError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toast').querySelector('.toast-icon').textContent = isError ? '⚠️' : '✅';
  toast.classList.toggle('error', isError);
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    return toast.classList.add('hidden');
  }, 4000);
}

function loadSeats() {
  var res, seats, grid;
  return regeneratorRuntime.async(function loadSeats$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.next = 2;
          return regeneratorRuntime.awrap(fetch("".concat(API, "/movies/").concat(MOVIE_ID, "/seats/")));

        case 2:
          res = _context6.sent;
          _context6.next = 5;
          return regeneratorRuntime.awrap(res.json());

        case 5:
          seats = _context6.sent;
          grid = document.getElementById("seatGrid");
          grid.innerHTML = "";
          seats.forEach(function (seat) {
            var div = document.createElement("div");
            div.className = "seat";

            if (seat.is_booked) {
              div.classList.add("booked");
            }

            div.textContent = seat.seat_number;

            div.onclick = function () {
              if (div.classList.contains("booked")) return;
              div.classList.toggle("selected");
            };

            grid.appendChild(div);
          });

        case 9:
        case "end":
          return _context6.stop();
      }
    }
  });
} // ── UTILS ─────────────────────────────────────────────


function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getMovieEmoji(genre) {
  var map = {
    'action': '💥',
    'adventure': '🗺️',
    'comedy': '😂',
    'drama': '🎭',
    'horror': '👻',
    'romance': '❤️',
    'sci-fi': '🚀',
    'thriller': '🔪',
    'animation': '🎨',
    'fantasy': '🧙',
    'crime': '🕵️',
    'mystery': '🔍',
    'musical': '🎵',
    'western': '🤠'
  };
  return map[(genre || '').toLowerCase()] || '🎬';
}