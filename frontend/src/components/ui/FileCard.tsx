"use client";

import {
  Download,
  ExternalLink,
  Trash2,
  UserPlus,
  ScanSearch,
  Rocket,
  Building2,
  Target,
  FileText,
  FileSpreadsheet,
} from 'lucide-react';
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
  const extension = (name.split(".").pop() || "file").toUpperCase();
  const ext = extension.toLowerCase();
  const lowerName = name.toLowerCase();
  const lowerType = (type || "").toLowerCase();

  const iconConfig = (() => {
    // 1) Context métier prioritaire
    if (lowerName.includes("talent") || lowerType.includes("talent")) {
      return { Icon: Building2, iconClass: isLight ? "text-tap-red" : "text-tap-red" };
    }
    if (lowerName.includes("portfolio") || lowerType.includes("portfolio")) {
      return { Icon: Rocket, iconClass: isLight ? "text-tap-red" : "text-tap-red" };
    }
    if (lowerName.includes("cv") || lowerName.includes("resume")) {
      return { Icon: ScanSearch, iconClass: isLight ? "text-tap-red" : "text-tap-red" };
    }

    // 2) Fallback par extension de fichier
    if (ext === "pdf") {
      return { Icon: FileText, iconClass: isLight ? "text-tap-red" : "text-tap-red" };
    }
    if (ext === "doc" || ext === "docx" || ext === "odt" || ext === "rtf" || ext === "txt") {
      return { Icon: FileText, iconClass: isLight ? "text-tap-red" : "text-tap-red" };
    }
    if (ext === "xls" || ext === "xlsx" || ext === "csv") {
      return { Icon: FileSpreadsheet, iconClass: isLight ? "text-tap-red" : "text-tap-red" };
    }
    if (ext === "ppt" || ext === "pptx") {
      return { Icon: Target, iconClass: isLight ? "text-tap-red" : "text-tap-red" };
    }
    if (ext === "zip" || ext === "rar" || ext === "7z") {
      return { Icon: Building2, iconClass: isLight ? "text-tap-red" : "text-tap-red" };
    }

    // 3) Défaut
    return { Icon: UserPlus, iconClass: isLight ? "text-tap-red" : "text-tap-red" };
  })();
  const Icon = iconConfig.Icon;
  const canOpen = href !== "#";

  return (
    <div
      className={`rounded-2xl p-4 transition-all duration-300 group ${
        isLight
          ? "bg-white border border-black/10 hover:border-black/20 hover:shadow-[0_10px_22px_rgba(0,0,0,0.08)]"
          : "bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.16] hover:shadow-[0_12px_26px_rgba(0,0,0,0.32)]"
      } ${canOpen ? "cursor-pointer" : ""}`}
      onClick={() => {
        if (!canOpen) return;
        window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2.5 rounded-full border ${
          isLight ? "bg-black/[0.03] border-black/10" : "bg-white/[0.04] border-white/[0.08]"
        }`}>
          <Icon className={`w-4 h-4 ${iconConfig.iconClass}`} strokeWidth={1.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isLight ? "text-black" : "text-zinc-200"}`}>{name}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
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
        <div className="flex gap-1 shrink-0">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-full border transition ${
              isLight
                ? "border-black/10 hover:bg-black/5 text-black/60 hover:text-black"
                : "border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={href}
            download
            onClick={(e) => e.stopPropagation()}
            className={`p-1.5 rounded-full border transition ${
              isLight
                ? "border-black/10 hover:bg-black/5 text-black/60 hover:text-black"
                : "border-white/[0.14] hover:bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Download className="w-4 h-4" />
          </a>
          {onDelete && path && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const confirmed = window.confirm("Confirmer la suppression de ce fichier ?");
                if (!confirmed) return;
                onDelete(path);
              }}
              className={`p-1.5 rounded-full border transition ${
                isLight
                  ? "border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  : "border-red-400/30 bg-red-500/15 text-red-400 hover:bg-red-500/25"
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
