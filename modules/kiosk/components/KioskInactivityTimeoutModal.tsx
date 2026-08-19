'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useKioskStore } from '../store/kioskStore';
import { Clock, RotateCcw, ArrowRight, ShieldAlert } from 'lucide-react';

const INACTIVITY_TIMEOUT_MS = 45 * 1000; // 45 giây không tương tác
const WARNING_COUNTDOWN_SECONDS = 10; // 10 giây cảnh báo đếm ngược

export const KioskInactivityTimeoutModal: React.FC = () => {
  const currentView = useKioskStore((state) => state.currentView);
  const goHome = useKioskStore((state) => state.goHome);

  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_COUNTDOWN_SECONDS);

  const lastActivityRef = useRef<number>(Date.now());

  // 1. Lắng nghe tương tác người dùng để cập nhật mốc thời gian hoạt động cuối cùng
  useEffect(() => {
    if (currentView === 'home') {
      setIsWarningOpen(false);
      return;
    }

    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      // Chỉ cập nhật thời gian nếu modal cảnh báo chưa mở
      if (!isWarningOpen) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ['pointerdown', 'touchstart', 'mousemove', 'keydown', 'scroll', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Bộ kiểm tra thời gian không hoạt động chạy mỗi giây
    const checkInterval = setInterval(() => {
      const liveView = useKioskStore.getState().currentView;
      if (liveView !== 'home' && !isWarningOpen) {
        const inactiveDuration = Date.now() - lastActivityRef.current;
        if (inactiveDuration >= INACTIVITY_TIMEOUT_MS) {
          setIsWarningOpen(true);
        }
      }
    }, 1000);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(checkInterval);
    };
  }, [currentView, isWarningOpen]);

  // 2. Quản lý đồng hồ đếm ngược 10 giây khi modal cảnh báo mở ra
  useEffect(() => {
    if (!isWarningOpen) {
      setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);
      return;
    }

    setSecondsRemaining(WARNING_COUNTDOWN_SECONDS);

    const countdownTimer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          // Tránh cập nhật state chéo trong render phase của React
          setTimeout(() => {
            setIsWarningOpen(false);
            goHome();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(countdownTimer);
    };
  }, [isWarningOpen, goHome]);

  const handleContinue = () => {
    setIsWarningOpen(false);
    lastActivityRef.current = Date.now();
  };

  const handleResetNow = () => {
    setIsWarningOpen(false);
    goHome();
  };

  if (!isWarningOpen || currentView === 'home') return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-slate-900/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="bg-white rounded-[36px] border border-neutral-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-center p-6 sm:p-8 space-y-6">
        
        {/* Animated Warning Icon with Pulse */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping duration-1000" />
          <div className="relative w-18 h-18 rounded-full bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center shadow-lg">
            <Clock className="w-9 h-9 animate-pulse" />
          </div>
        </div>

        {/* Title and Countdown Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Cảnh báo bảo mật phiên khám</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-[#1E2939] tracking-tight">
            Bạn có còn đang thao tác không?
          </h3>

          <p className="text-xs sm:text-sm text-neutral-500 font-semibold max-w-sm mx-auto leading-relaxed">
            Hệ thống sẽ tự động xóa dữ liệu và quay về trang chủ sau{' '}
            <span className="text-2xl font-black text-rose-600 font-mono px-1">
              {secondsRemaining}s
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetNow}
            className="h-14 rounded-2xl bg-neutral-100 hover:bg-rose-50 active:scale-95 text-neutral-700 hover:text-rose-600 font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer border border-neutral-200"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Kết thúc & Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleContinue}
            className="h-14 rounded-2xl bg-[#155DFC] hover:bg-blue-700 active:scale-95 text-white font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/25"
          >
            <span>Tôi vẫn đang thao tác</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
