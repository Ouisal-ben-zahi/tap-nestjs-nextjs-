"use client";

import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

export function Skeleton({ className = '' }: { className?: string }) {
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  return <div className={`animate-pulse rounded ${isLight ? "bg-black/10" : "bg-zinc-800"} ${className}`} />;
}

export function StatCardSkeleton() {
  const theme = useDashboardTheme();
  const isLight = theme === "light";
  return (
    <div
      className={`rounded-xl p-6 ${
        isLight ? "card-luxury-light" : "bg-zinc-900/50 border border-zinc-800"
      }`}
    >
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16 mb-2" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}
