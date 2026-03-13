'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';

export default function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
