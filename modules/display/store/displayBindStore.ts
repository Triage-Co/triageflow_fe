import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DisplayBindState, DisplayScreenKind } from '../types/display-screen.types';

interface DisplayBindStore extends DisplayBindState {
  bind: (display_screen_id: string, kind: DisplayScreenKind) => void;
  clear: () => void;
}

const EMPTY: DisplayBindState = {
  display_screen_id: '',
  kind: 'KIOSK',
};

export const useDisplayBindStore = create<DisplayBindStore>()(
  persist(
    (set) => ({
      ...EMPTY,
      bind: (display_screen_id, kind) => set({ display_screen_id, kind }),
      clear: () => set({ ...EMPTY }),
    }),
    {
      name: 'triageflow_display_bind',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        display_screen_id: state.display_screen_id,
        kind: state.kind,
      }),
    },
  ),
);

export function readBoundScreenId(kind: DisplayScreenKind): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('triageflow_display_bind');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: DisplayBindState };
    if (parsed.state?.kind === kind && parsed.state.display_screen_id) {
      return parsed.state.display_screen_id;
    }
  } catch {
    // ignore
  }
  return null;
}
