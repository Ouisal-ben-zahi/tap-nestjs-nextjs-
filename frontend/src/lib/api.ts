import axios from 'axios';
import { nestResponseDetail } from '@/lib/api-error';

/** Évite « Invalid URL » si l’URL du backend est du type 127.0.0.1:3112 sans http(s). */
function resolveApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!raw || !String(raw).trim()) {
    return '/api';
  }
  let u = String(raw).trim().replace(/\/$/, '');
  if (u.startsWith('/')) {
    return u;
  }
  if (!/^https?:\/\//i.test(u)) {
    u = `http://${u}`;
  }
  return u;
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
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
    // Enrichit le message Axios (souvent « Request failed with status code 400 ») avec le détail Nest.
    if (axios.isAxiosError(error) && error.response?.data) {
      const nestMsg = nestResponseDetail(error.response.data);
      if (nestMsg) {
        error.message = `${error.message} (${nestMsg})`;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
