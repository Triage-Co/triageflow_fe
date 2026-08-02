import React from 'react';
import { useKioskStore } from '../store/kioskStore';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC = () => {
  const isLoading = useKioskStore((state) => state.isLoading);
  const loadingMessage = useKioskStore((state) => state.loadingMessage);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/40 backdrop-blur-md flex items-center justify-center animate-in fade-in-0 duration-200">
      <div className="bg-white/95 rounded-[32px] p-8 shadow-2xl border border-white/40 flex flex-col items-center gap-4 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#155DFC]">
          <Loader2 className="w-9 h-9 animate-spin" />
        </div>
        <div className="space-y-1">
          <h4 className="text-lg font-extrabold text-[#1E2939] tracking-tight">{loadingMessage}</h4>
          <p className="text-xs font-semibold text-neutral-400">Vui lòng chờ trong giây lát...</p>
        </div>
      </div>
    </div>
  );
};
