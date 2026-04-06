/**
 * CineBook UI Components
 * ----------------------
 * Reusable UI elements like toasts, loaders, and formatting.
 */

/**
 * Toast Notifications
 */
let toastTimer = null;
export function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = toast.querySelector('.toast-icon');

  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;
  
  // Icon and Style mapping
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
  toastIcon.textContent = icons[type] || '🔔';
  
  toast.className = `toast ${type}`;
  toast.classList.remove('hidden');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 4000);
}

/**
 * Global Loader (Cold Start)
 */
export function toggleGlobalLoader(show, text = 'Loading...') {
  let loader = document.getElementById('globalLoader');
  
  if (!loader && show) {
    loader = document.createElement('div');
    loader.id = 'globalLoader';
    loader.className = 'global-loader';
    loader.innerHTML = `
      <div class="modern-spinner"></div>
      <p class="loader-text">${text}</p>
    `;
    document.body.appendChild(loader);
  }

  if (loader) {
    if (show) {
      loader.querySelector('.loader-text').textContent = text;
      loader.classList.remove('fade-out');
    } else {
      loader.classList.add('fade-out');
    }
  }
}

/**
 * Format Movie Details
 */
export function getMovieEmoji(genre) {
  const map = {
    'action': '💥', 'adventure': '🗺️', 'comedy': '😂', 'drama': '🎭',
    'horror': '👻', 'romance': '❤️', 'sci-fi': '🚀', 'thriller': '🔪',
    'animation': '🎨', 'fantasy': '🧙', 'crime': '🕵️', 'mystery': '🔍',
    'western': '🤠'
  };
  return map[(genre || '').toLowerCase()] || '🎬';
}

/**
 * Escape HTML
 */
export function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Listen for API Cold Start events
window.addEventListener('api-status', (e) => {
  const { msg, type } = e.detail;
  if (type === 'info') {
    toggleGlobalLoader(true, msg);
  }
});
