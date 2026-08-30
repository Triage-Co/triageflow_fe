import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface KioskLocationConfig {
  kioskId: string;
  kioskName: string;
  startRoomId: string;
  startRoomLabel: string;
  startRoomCode: string;
  floorNumber: number;
  adminPin: string;
  enableOtp: boolean;
}

interface KioskConfigStoreState extends KioskLocationConfig {
  setKioskLocation: (room: {
    id: string;
    roomCode: string;
    roomLabel: string;
    floorNumber: number;
  }, kioskName?: string) => void;
  setKioskName: (name: string) => void;
  setAdminPin: (pin: string) => void;
  setEnableOtp: (enableOtp: boolean) => void;
  resetConfig: () => void;
}

const DEFAULT_CONFIG: KioskLocationConfig = {
  kioskId: 'KIOSK-01',
  kioskName: 'Kiosk Sảnh Tiếp Đón A',
  startRoomId: 'ce336956-b026-4979-8094-2c7bf7a5a53a',
  startRoomLabel: 'Sảnh Tiếp Đón A',
  startRoomCode: 'SDA',
  floorNumber: 1,
  adminPin: '123456',
  enableOtp: true,
};

export const useKioskConfigStore = create<KioskConfigStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFIG,

      setKioskLocation: (room, kioskName) =>
        set((state) => ({
          startRoomId: room.id,
          startRoomLabel: room.roomLabel,
          startRoomCode: room.roomCode,
          floorNumber: room.floorNumber,
          kioskName: kioskName || state.kioskName,
        })),

      setKioskName: (kioskName) => set({ kioskName }),

      setAdminPin: (adminPin) => set({ adminPin }),

      setEnableOtp: (enableOtp) => set({ enableOtp }),

      resetConfig: () => set({ ...DEFAULT_CONFIG }),
    }),
    {
      name: 'triageflow_kiosk_device_config',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
