import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatRelative(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes}min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return formatDateShort(d);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function statusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'accepted':
    case 'accepté':
    case 'active':
      return 'text-green-400';
    case 'refused':
    case 'refusé':
    case 'rejected':
      return 'text-red-400';
    case 'pending':
    case 'en attente':
      return 'text-yellow-400';
    default:
      return 'text-zinc-400';
  }
}

export function statusBg(status: string): string {
  switch (status?.toLowerCase()) {
    case 'accepted':
    case 'accepté':
    case 'active':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'refused':
    case 'refusé':
    case 'rejected':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'pending':
    case 'en attente':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    default:
      return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
  }
}
