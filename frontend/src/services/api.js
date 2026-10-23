import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.detail || error.message || 'An unexpected error occurred.';

    // 401/403 — token invalid/expired/forbidden: clear auth and redirect
    if (error.response && (status === 401 || status === 403)) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-error'));
      // Only redirect if not already on login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
      return Promise.reject(error);
    }

    // For all other errors, emit a custom event for the toast system
    const event = new CustomEvent('api_error', { detail: message });
    window.dispatchEvent(event);

    return Promise.reject(error);
  }
);

export default api;
