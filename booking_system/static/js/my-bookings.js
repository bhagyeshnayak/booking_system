/**
 * CineBook My Bookings Script
 * --------------------------
 * Handles fetching, displaying, and managing (cancel/download) user tickets.
 */

import { fetchAPI } from './api.js';
import * as Auth from './auth.js';
import * as UI from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/';
    return;
  }
  
  initNavbar();
  handlePaymentSuccess();
  loadBookings();
});

function initNavbar() {
  const container = document.getElementById('navActions');
  const user = Auth.getCurrentUser();

  if (Auth.isLoggedIn()) {
    container.innerHTML = `
      <div class="nav-user">
        <a href="/my-bookings/" class="nav-link">My Tickets</a>
        <div class="nav-avatar">${user.username ? user.username[0].toUpperCase() : '?'}</div>
        <span class="nav-username">${user.username || user.email}</span>
        <button class="nav-logout" id="logoutBtn">Logout</button>
      </div>`;
    document.getElementById('logoutBtn').addEventListener('click', () => Auth.logout());
  }
}

function handlePaymentSuccess() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    const modal = document.getElementById('successModal');
    if (modal) {
      modal.classList.add('show');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
}

async function loadBookings() {
  const container = document.getElementById('bookingList');
  container.innerHTML = '<div style="color: #a0a0b0; text-align: center; grid-column: 1/-1;">Opening your ticket wallet... 🍿</div>';

  try {
    const data = await fetchAPI('/my-bookings/');
    const bookings = data.results || data;
    renderBookings(bookings);
  } catch (err) {
    UI.showToast(err.message, 'error');
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${err.message}</p></div>`;
  }
}

function renderBookings(bookings) {
  const container = document.getElementById('bookingList');
  container.innerHTML = '';

  if (!bookings || bookings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No Tickets Found</h3>
        <p>You haven't booked any movies yet.</p>
        <a href="/" class="btn-home">Browse Movies</a>
      </div>
    `;
    return;
  }

  bookings.forEach(b => {
    const date = new Date(b.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const bgImg = b.movie_poster || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80';
    
    let statusClass = 'status-pending';
    if(b.status === 'CONFIRMED') statusClass = 'status-confirmed';
    if(b.status === 'CANCELLED') statusClass = 'status-cancelled';

    const card = document.createElement('div');
    card.className = 'ticket-card';
    card.innerHTML = `
      <div class="ticket-header" style="background-image: url('${bgImg}');">
        <span class="status-badge ${statusClass}">${b.status}</span>
      </div>
      <div class="ticket-body">
        <h3 class="ticket-title">${UI.esc(b.movie_title || 'Movie Title')}</h3>
        <div class="ticket-details">
          <div class="detail-item">
            <span class="detail-label">Date Booked</span>
            <span class="detail-value">${date}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Ticket ID</span>
            <span class="detail-value" style="font-size:0.75rem;">...${b.booking_id.substring(24)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Quantity</span>
            <span class="detail-value">${b.seats} Tickets</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Seats</span>
            <span class="detail-value">${UI.esc(b.seat_numbers || 'Not selected')}</span>
          </div>
        </div>
        <div class="ticket-actions" id="actions-${b.booking_id}"></div>
      </div>
    `;

    const actionsContainer = card.querySelector(`#actions-${b.booking_id}`);
    if (b.status === 'CONFIRMED') {
      const downloadBtn = createActionButton('⏬ Download PDF', 'btn-download', () => downloadPdf(b.booking_id));
      const cancelBtn = createActionButton('Cancel Ticket', 'btn-cancel', () => cancelBooking(b.booking_id));
      cancelBtn.style.background = 'rgba(248,68,100,0.1)';
      cancelBtn.style.color = '#f84464';
      cancelBtn.style.borderColor = 'rgba(248,68,100,0.3)';
      
      actionsContainer.appendChild(downloadBtn);
      actionsContainer.appendChild(cancelBtn);
    } else if (b.status === 'PENDING') {
      const cancelBtn = createActionButton('Cancel Setup', 'btn-cancel', () => cancelBooking(b.booking_id));
      actionsContainer.appendChild(cancelBtn);
    }

    container.appendChild(card);
  });
}

function createActionButton(text, className, onClick) {
  const btn = document.createElement('button');
  btn.className = `btn-action ${className}`;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

async function cancelBooking(id) {
  if (!confirm("⚠️ Are you sure you want to cancel? Cancellations are blocked within 2 hours of showtime!")) return;
  
  try {
    const data = await fetchAPI(`/bookings/${id}/cancel/`, { method: 'POST' });
    UI.showToast(data.message || 'Booking cancelled', 'success');
    loadBookings();
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}

async function downloadPdf(id) {
  try {
    const token = Auth.getAuthToken();
    const res = await fetch(`https://booking-system-i2io.onrender.com/api/bookings/${id}/pdf/`, {
      headers: { "Authorization": "Bearer " + token }
    });
    
    if (!res.ok) throw new Error('Could not download PDF');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ticket_${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    UI.showToast(err.message, 'error');
  }
}
