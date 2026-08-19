'use client';

import React, { useState, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export const KioskFullscreenButton: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => { });
    } else {
      document
        .exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(() => { });
    }
  };

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      className="p-2 sm:px-3 sm:py-2.5 rounded-full bg-white/90 hover:bg-neutral-100 active:scale-95 border border-neutral-200/90 shadow-md hover:shadow-lg text-neutral-600 hover:text-[#155DFC] font-black text-xs sm:text-sm backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
      title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Bật toàn màn hình Kiosk'}
    >
      {isFullscreen ? (
        <>
          <Minimize2 className="w-4 h-4 text-neutral-600" />
        </>
      ) : (
        <>
          <Maximize2 className="w-4 h-4 text-neutral-600" />
        </>
      )}
    </button>
  );
};
