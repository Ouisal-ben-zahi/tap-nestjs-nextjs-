import axios from 'axios';

const api = axios.create({
  baseURL:
    // Prefer direct backend calls when explicitly configured (avoids dev proxy socket hangups)
    // Example: NEXT_PUBLIC_BACKEND_URL="http://127.0.0.1:3112"
    (process.env.NEXT_PUBLIC_BACKEND_URL
      ? process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '')
      : '/api'),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const { useAuthStore } = require('@/stores/auth');
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const { useAuthStore } = require('@/stores/auth');
      const store = useAuthStore.getState();
      try {
        await store.refreshTokens();
        const newToken = useAuthStore.getState().accessToken;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        store.logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/connexion';
        }
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
