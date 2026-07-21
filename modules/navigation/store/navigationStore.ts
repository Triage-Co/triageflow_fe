import { create } from 'zustand';

interface NavigationState {
  activeFloor: number;
  setActiveFloor: (floor: number) => void;
  highlightedRoomId: string | null;
  setHighlightedRoom: (id: string | null) => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeFloor: 1,
  setActiveFloor: (floor) => set({ activeFloor: floor }),
  highlightedRoomId: null,
  setHighlightedRoom: (id) => set({ highlightedRoomId: id }),
}));
