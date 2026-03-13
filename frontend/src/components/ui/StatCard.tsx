import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  color?: string;
}

export default function StatCard({ label, value, icon: Icon, trend, color = 'text-red-500' }: StatCardProps) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-zinc-400">{label}</p>
        <div className={`p-2 rounded-lg bg-zinc-800 ${color} group-hover:scale-110 transition-transform`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      {trend && <p className="text-xs text-zinc-500">{trend}</p>}
    </div>
  );
}
