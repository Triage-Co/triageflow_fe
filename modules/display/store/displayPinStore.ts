import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { displayScreenService } from '../services/displayScreenService';

interface DisplayPinState {
  accessToken: string | null;
  expiresAt: number | null;
  setToken: (token: string, expiresInSec: number) => void;
  clear: () => void;
  verifyPin: (pin: string) => Promise<void>;
  hasValidToken: () => boolean;
}

export const useDisplayPinStore = create<DisplayPinState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      expiresAt: null,
      setToken: (token, expiresInSec) =>
        set({
          accessToken: token,
          expiresAt: Date.now() + expiresInSec * 1000,
        }),
      clear: () => set({ accessToken: null, expiresAt: null }),
      hasValidToken: () => {
        const { accessToken, expiresAt } = get();
        return Boolean(accessToken && expiresAt && expiresAt > Date.now() + 5_000);
      },
      verifyPin: async (pin: string) => {
        const result = await displayScreenService.verifyPin(pin);
        get().setToken(result.access_token, result.expires_in);
      },
    }),
    {
      name: 'triageflow_display_pin',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
