'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { displayScreenService } from '../services/displayScreenService';
import { useDisplayBindStore } from '../store/displayBindStore';
import type { DisplayScreen, DisplayScreenKind } from '../types/display-screen.types';
import { DISPLAY_ROUTE_BY_KIND } from '../types/display-screen.types';

interface UseDisplayScreenOptions {
  screenId?: string;
  expectedKind?: DisplayScreenKind;
  selectorPath?: string;
}

export function useDisplayScreen({
  screenId,
  expectedKind,
  selectorPath,
}: UseDisplayScreenOptions) {
  const router = useRouter();
  const bind = useDisplayBindStore((s) => s.bind);
  const [screen, setScreen] = useState<DisplayScreen | null>(null);
  const [loading, setLoading] = useState(Boolean(screenId));
  const [error, setError] = useState<string | null>(null);

  const fallbackPath =
    selectorPath ?? (expectedKind ? DISPLAY_ROUTE_BY_KIND[expectedKind] : '/display/room');

  const load = useCallback(async () => {
    if (!screenId) {
      setScreen(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await displayScreenService.getById(screenId);
      if (expectedKind && data.kind !== expectedKind) {
        router.replace(fallbackPath);
        return;
      }
      if (data.status === 'DISABLED') {
        router.replace(fallbackPath);
        return;
      }
      setScreen(data);
      bind(data.display_screen_id, data.kind);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không tải được màn hình';
      setError(message);
      setScreen(null);
    } finally {
      setLoading(false);
    }
  }, [bind, expectedKind, fallbackPath, router, screenId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!screenId) return;
    const timer = window.setInterval(() => {
      void displayScreenService
        .getById(screenId)
        .then((data) => {
          if (data.status === 'DISABLED') {
            router.replace(fallbackPath);
          } else {
            setScreen(data);
          }
        })
        .catch(() => undefined);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [fallbackPath, router, screenId]);

  return { screen, loading, error, reload: load };
}
