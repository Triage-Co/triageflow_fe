'use client';

import { useCallback, useRef } from 'react';

const TAP_WINDOW_MS = 2500;
const TAP_THRESHOLD = 5;

export function useFiveTap(onUnlock: () => void) {
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTimeRef.current > TAP_WINDOW_MS) {
      tapCountRef.current = 1;
    } else {
      tapCountRef.current += 1;
    }
    lastTapTimeRef.current = now;
    if (tapCountRef.current >= TAP_THRESHOLD) {
      tapCountRef.current = 0;
      onUnlock();
    }
  }, [onUnlock]);

  return handleTap;
}
