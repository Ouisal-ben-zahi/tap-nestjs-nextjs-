import { FileText, Download, ExternalLink, Trash2 } from 'lucide-react';
import { formatFileSize, formatDate } from '@/lib/utils';

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
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition group">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-red-500/10 text-red-400">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            {size != null && <span className="text-xs text-zinc-500">{formatFileSize(size)}</span>}
            {size != null && dateStr && <span className="text-xs text-zinc-600">•</span>}
            {dateStr && <span className="text-xs text-zinc-500">{formatDate(dateStr)}</span>}
            {type && (
              <>
                <span className="text-xs text-zinc-600">•</span>
                <span className="text-xs text-zinc-400 uppercase">{type}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
          <a
            href={href}
            download
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <Download className="w-4 h-4" />
          </a>
          {onDelete && path && (
            <button
              onClick={() => onDelete(path)}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
