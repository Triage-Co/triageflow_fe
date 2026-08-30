import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DisplayScreen } from '@/modules/display/types/display-screen.types';
import {
  readBooleanSetting,
  readNumberSetting,
  readStringSetting,
} from '@/modules/display/types/display-screen.types';

export interface KioskLocationConfig {
  display_screen_id: string | null;
  kioskId: string;
  kioskName: string;
  startRoomId: string;
  startRoomLabel: string;
  startRoomCode: string;
  floorNumber: number;
  enableOtp: boolean;
}

interface KioskConfigStoreState extends KioskLocationConfig {
  hydrateFromScreen: (screen: DisplayScreen) => void;
  setKioskLocation: (
    room: {
      id: string;
      roomCode: string;
      roomLabel: string;
      floorNumber: number;
    },
    kioskName?: string,
  ) => void;
  setKioskName: (name: string) => void;
  setEnableOtp: (enableOtp: boolean) => void;
}

const DEFAULT_START_ROOM_ID = 'ce336956-b026-4979-8094-2c7bf7a5a53a';

const DEFAULT_CONFIG: KioskLocationConfig = {
  display_screen_id: null,
  kioskId: 'KIOSK-01',
  kioskName: 'Kiosk Sảnh Tiếp Đón A',
  startRoomId: DEFAULT_START_ROOM_ID,
  startRoomLabel: 'Sảnh Tiếp Đón A',
  startRoomCode: 'SDA',
  floorNumber: 1,
  enableOtp: true,
};

export const useKioskConfigStore = create<KioskConfigStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFIG,

      hydrateFromScreen: (screen) =>
        set({
          display_screen_id: screen.display_screen_id,
          kioskId: screen.code,
          kioskName: screen.name,
          startRoomId:
            screen.room_id ||
            readStringSetting(screen.settings, 'start_room_id', DEFAULT_START_ROOM_ID) ||
            DEFAULT_START_ROOM_ID,
          startRoomLabel:
            readStringSetting(screen.settings, 'start_room_label', screen.room?.room_name || 'Sảnh Tiếp Đón A'),
          startRoomCode: readStringSetting(screen.settings, 'start_room_code', ''),
          floorNumber: readNumberSetting(screen.settings, 'floor_number', 1),
          enableOtp: readBooleanSetting(screen.settings, 'enable_otp', true),
        }),

      setKioskLocation: (room, kioskName) =>
        set((state) => ({
          startRoomId: room.id,
          startRoomLabel: room.roomLabel,
          startRoomCode: room.roomCode,
          floorNumber: room.floorNumber,
          kioskName: kioskName || state.kioskName,
        })),

      setKioskName: (kioskName) => set({ kioskName }),

      setEnableOtp: (enableOtp) => set({ enableOtp }),
    }),
    {
      name: 'triageflow_kiosk_device_config',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        display_screen_id: state.display_screen_id,
      }),
    },
  ),
);
