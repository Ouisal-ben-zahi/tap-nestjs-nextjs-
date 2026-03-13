import { create } from 'zustand';
import type { User, ProfileRole, AuthTokens, LoginDto, SendVerificationDto, VerifyAndRegisterDto, RequestPasswordResetDto, ResetPasswordDto } from '@/types/auth';
import axios from 'axios';

const API_BASE = '/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  login: (dto: LoginDto) => Promise<AuthTokens>;
  sendVerification: (dto: SendVerificationDto) => Promise<{ email: string; message: string }>;
  verifyAndRegister: (dto: VerifyAndRegisterDto) => Promise<AuthTokens>;
  requestPasswordReset: (dto: RequestPasswordResetDto) => Promise<{ email: string; message: string }>;
  resetPassword: (dto: ResetPasswordDto) => Promise<{ email: string; message: string }>;
  logout: () => void;
  refreshTokens: () => Promise<void>;
  hydrate: () => Promise<void>;
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tap_rt');
}

function setRefreshToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('tap_rt', token);
  } else {
    localStorage.removeItem('tap_rt');
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: true,
  isHydrated: false,

  login: async (dto) => {
    const { data } = await axios.post<AuthTokens>(`${API_BASE}/auth/login`, dto);
    set({ user: data.user, accessToken: data.accessToken });
    setRefreshToken(data.refreshToken);
    return data;
  },

  sendVerification: async (dto) => {
    const { data } = await axios.post(`${API_BASE}/auth/send-verification`, dto);
    return data;
  },

  verifyAndRegister: async (dto) => {
    const { data } = await axios.post<AuthTokens>(`${API_BASE}/auth/verify-and-register`, dto);
    set({ user: data.user, accessToken: data.accessToken });
    setRefreshToken(data.refreshToken);
    return data;
  },

  requestPasswordReset: async (dto) => {
    const { data } = await axios.post(`${API_BASE}/auth/request-password-reset`, dto);
    return data;
  },

  resetPassword: async (dto) => {
    const { data } = await axios.post(`${API_BASE}/auth/reset-password`, dto);
    return data;
  },

  logout: () => {
    set({ user: null, accessToken: null });
    setRefreshToken(null);
  },

  refreshTokens: async () => {
    const rt = getRefreshToken();
    if (!rt) throw new Error('No refresh token');
    const { data } = await axios.post<AuthTokens>(`${API_BASE}/auth/refresh`, { refreshToken: rt });
    set({ user: data.user, accessToken: data.accessToken });
    setRefreshToken(data.refreshToken);
  },

  hydrate: async () => {
    const rt = getRefreshToken();
    if (!rt) {
      set({ isLoading: false, isHydrated: true });
      return;
    }
    try {
      const { data } = await axios.post<AuthTokens>(`${API_BASE}/auth/refresh`, { refreshToken: rt });
      set({ user: data.user, accessToken: data.accessToken, isLoading: false, isHydrated: true });
      setRefreshToken(data.refreshToken);
    } catch {
      setRefreshToken(null);
      set({ user: null, accessToken: null, isLoading: false, isHydrated: true });
    }
  },
}));
