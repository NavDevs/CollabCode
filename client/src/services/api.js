import axios from 'axios';

// In development the Vite proxy forwards /api → http://localhost:5000/api
// In production use the VITE_API_URL env variable
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  if (window.Clerk && window.Clerk.session) {
    try {
      const token = await window.Clerk.session.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Failed to attach Clerk token:', e);
    }
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // Don't treat room-password prompts as auth failures
      const code = error.response?.data?.code;
      if (code !== 'PASSWORD_REQUIRED') {
        if (window.Clerk) {
          window.Clerk.redirectToSignIn();
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
