"use client";

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Une erreur est survenue', onRetry }: ErrorStateProps) {
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
      <p className={`${isLight ? "text-black/70" : "text-zinc-400"} mb-4`}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
            isLight
              ? "bg-white border border-tap-red/40 text-black hover:border-tap-red/70"
              : "bg-zinc-800 hover:bg-zinc-700 text-white"
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      )}
    </div>
  );
}
