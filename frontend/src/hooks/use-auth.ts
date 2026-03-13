'use client';

import { useAuthStore } from '@/stores/auth';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const logout = useAuthStore((s) => s.logout);

  return {
    user,
    isLoading,
    isHydrated,
    isAuthenticated: !!user,
    isCandidat: user?.role === 'candidat',
    isRecruteur: user?.role === 'recruteur',
    logout,
  };
}
