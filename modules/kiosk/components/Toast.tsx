import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Toast: React.FC = () => {
  const toasts = useKioskStore((state) => state.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-2xl shadow-xl border text-sm font-semibold animate-in fade-in-0 slide-in-from-top-5 duration-300 backdrop-blur-md select-none pointer-events-auto",
            toast.type === 'success' && "bg-emerald-50/95 border-emerald-200/80 text-emerald-900 shadow-emerald-500/10",
            toast.type === 'error' && "bg-rose-50/95 border-rose-200/80 text-rose-900 shadow-rose-500/10",
            toast.type === 'info' && "bg-indigo-50/95 border-indigo-200/80 text-indigo-900 shadow-indigo-500/10"
          )}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />}
          <span className="flex-1 leading-snug">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
