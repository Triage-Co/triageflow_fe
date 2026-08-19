'use client';

import React, { useState } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { Home, RotateCcw, X, AlertTriangle } from 'lucide-react';

export const KioskSessionResetButton: React.FC = () => {
  const currentView = useKioskStore((state) => state.currentView);
  const goHome = useKioskStore((state) => state.goHome);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Không hiển thị ở trang chủ
  if (currentView === 'home') return null;

  const handleConfirmReset = () => {
    setIsConfirmOpen(false);
    goHome();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        className="group flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-white/90 hover:bg-rose-50 active:scale-95 border border-neutral-200/90 hover:border-rose-200 shadow-md hover:shadow-lg text-neutral-600 hover:text-rose-600 font-black text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer"
        title="Hủy phiên làm việc và quay về trang chủ"
      >
        <RotateCcw className="w-4 h-4 text-neutral-500 group-hover:text-rose-500 group-hover:-rotate-90 transition-transform duration-300" />
      </button>

      {/* Confirmation Dialog */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 select-none">
          <div className="bg-white rounded-[32px] border border-neutral-100 shadow-2xl w-full max-w-md p-6 sm:p-8 text-center space-y-5 animate-in zoom-in-95 duration-200">

            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mx-auto flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-[#1E2939] tracking-tight">
                Hủy phiên khám hiện tại?
              </h3>
              <p className="text-xs sm:text-sm text-neutral-500 font-semibold leading-relaxed">
                Mọi thông tin đang nhập và dữ liệu phiên làm việc này sẽ được xóa để đảm bảo an toàn cho người dùng tiếp theo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="h-12 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-95 text-neutral-700 font-black text-xs sm:text-sm transition-all flex items-center justify-center cursor-pointer"
              >
                Tiếp tục phiên
              </button>

              <button
                type="button"
                onClick={handleConfirmReset}
                className="h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-rose-500/25"
              >
                <Home className="w-4 h-4" />
                <span>Về trang chủ</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
