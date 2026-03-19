"use client";

import type { LucideIcon } from 'lucide-react';
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  color?: string;
}

export default function StatCard({ label, value, icon: Icon, trend, color = 'text-red-500' }: StatCardProps) {
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  return (
    <div
      className={`rounded-xl p-6 transition group ${
        isLight
          ? "bg-white border border-tap-red/40 hover:border-tap-red/70"
          : "bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <p className={`text-sm ${isLight ? "text-black" : "text-zinc-400"}`}>{label}</p>
        <div className={`p-2 rounded-lg ${isLight ? "bg-black/10" : "bg-zinc-800"} ${color} group-hover:scale-110 transition-transform`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`text-3xl font-bold mb-1 ${isLight ? "text-black" : "text-white"}`}>{value}</p>
      {trend && <p className={`text-xs ${isLight ? "text-black/70" : "text-zinc-500"}`}>{trend}</p>}
    </div>
  );
}
