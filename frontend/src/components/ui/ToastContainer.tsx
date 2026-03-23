'use client';

import { useUiStore, type Toast } from '@/stores/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const icons: Record<Toast['type'], React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <AlertCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const borders: Record<Toast['type'], string> = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
};

export default function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const removeToast = useUiStore((s) => s.removeToast);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            className={`bg-zinc-900 border ${borders[toast.type]} rounded-lg p-4 flex items-start gap-3 shadow-xl`}
          >
            {icons[toast.type]}
            <div className="flex-1">
              <p className="text-sm text-zinc-200">{toast.message}</p>
              {typeof toast.progress === 'number' && (
                <div className="mt-3">
                  {toast.progressLabel ? (
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                      <span className="truncate pr-2">{toast.progressLabel}</span>
                      <span className="shrink-0 font-semibold text-zinc-300">{Math.round(toast.progress)}%</span>
                    </div>
                  ) : null}
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-tap-red/80 transition-[width] duration-300 ease-out"
                      style={{ width: `${Math.max(0, Math.min(100, toast.progress))}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
