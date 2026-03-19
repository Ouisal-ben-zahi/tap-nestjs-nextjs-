"use client";

import { FileText, Download, ExternalLink, Trash2 } from 'lucide-react';
import { formatFileSize, formatDate } from '@/lib/utils';
import { useDashboardTheme } from "@/hooks/use-dashboard-theme";

interface FileCardProps {
  name: string;
  url?: string;
  publicUrl?: string;
  path?: string;
  size: number | null;
  created_at?: string;
  updatedAt?: string | null;
  type?: string;
  onDelete?: (path: string) => void;
}

export default function FileCard({ name, url, publicUrl, path, size, created_at, updatedAt, type, onDelete }: FileCardProps) {
  const href = url || publicUrl || '#';
  const dateStr = created_at || updatedAt;
  const theme = useDashboardTheme();
  const isLight = theme === "light";

  return (
    <div
      className={`rounded-xl p-4 transition group ${
        isLight
          ? "bg-white border border-tap-red/40 hover:border-tap-red/70"
          : "bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isLight ? "text-black" : "text-zinc-200"}`}>{name}</p>
          <div className="flex items-center gap-2 mt-1">
            {size != null && (
              <span className={`text-xs ${isLight ? "text-black/70" : "text-zinc-500"}`}>{formatFileSize(size)}</span>
            )}
            {size != null && dateStr && (
              <span className={`text-xs ${isLight ? "text-black/40" : "text-zinc-600"}`}>•</span>
            )}
            {dateStr && (
              <span className={`text-xs ${isLight ? "text-black/70" : "text-zinc-500"}`}>{formatDate(dateStr)}</span>
            )}
            {type && (
              <>
                <span className={`text-xs ${isLight ? "text-black/40" : "text-zinc-600"}`}>•</span>
                <span className={`text-xs uppercase ${isLight ? "text-black/80" : "text-zinc-400"}`}>{type}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-1.5 rounded-lg transition ${
              isLight ? "hover:bg-black/5 text-black/60 hover:text-black" : "hover:bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={href}
            download
            className={`p-1.5 rounded-lg transition ${
              isLight ? "hover:bg-black/5 text-black/60 hover:text-black" : "hover:bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Download className="w-4 h-4" />
          </a>
          {onDelete && path && (
            <button
              onClick={() => onDelete(path)}
              className={`p-1.5 rounded-lg transition ${
                isLight
                  ? "hover:bg-red-500/5 text-black/60 hover:text-red-500"
                  : "hover:bg-red-500/10 text-zinc-400 hover:text-red-400"
              }`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
