"use client";

import { Inbox } from 'lucide-react';
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className={`mb-4 ${isLight ? "text-black/40" : "text-zinc-600"}`}>
        {icon || <Inbox className="w-12 h-12" />}
      </div>
      <h3 className={`text-lg font-medium mb-2 ${isLight ? "text-black" : "text-zinc-300"}`}>{title}</h3>
      {description && (
        <p className={`text-sm mb-4 max-w-md ${isLight ? "text-black/70" : "text-zinc-500"}`}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
