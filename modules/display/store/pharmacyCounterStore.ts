import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const STORAGE_KEY = 'triageflow_pharmacy_counter';

interface PharmacyCounterState {
  display_screen_id: string | null;
  setCounter: (display_screen_id: string) => void;
  clear: () => void;
}

export const usePharmacyCounterStore = create<PharmacyCounterState>()(
  persist(
    (set) => ({
      display_screen_id: null,
      setCounter: (display_screen_id) => set({ display_screen_id }),
      clear: () => set({ display_screen_id: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ display_screen_id: state.display_screen_id }),
    },
  ),
);
