import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { HospitalRoom, CreateRoomDto, UpdateRoomDto } from '../types/room.types';
import { roomService } from '../services/roomService';

export interface RoomState {
    rooms: HospitalRoom[];
    isLoading: boolean;
    error: string | null;
}

export interface RoomActions {
    fetchRooms: (token: string) => Promise<void>;
    createRoom: (data: CreateRoomDto, token: string) => Promise<void>;
    updateRoom: (id: string, data: UpdateRoomDto, token: string) => Promise<void>;
    deleteRoom: (id: string, token: string) => Promise<void>;
    clearError: () => void;
}

type RoomStore = RoomState & RoomActions;

const initialState: RoomState = {
    rooms: [],
    isLoading: false,
    error: null,
};

export const useRoomStore = create<RoomStore>()(
    devtools(
        (set, get) => ({
            ...initialState,

            fetchRooms: async (token: string) => {
                set({ isLoading: true, error: null }, false, 'fetchRooms/pending');
                try {
                    const res = await roomService.getRooms(token);
                    set({ rooms: res.data || [], isLoading: false }, false, 'fetchRooms/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tải danh sách phòng bệnh.',
                        isLoading: false,
                    }, false, 'fetchRooms/failure');
                }
            },

            createRoom: async (data: CreateRoomDto, token: string) => {
                set({ isLoading: true, error: null }, false, 'createRoom/pending');
                try {
                    const res = await roomService.createRoom(data, token);
                    const currentRooms = get().rooms;
                    set({ rooms: [...currentRooms, res.data], isLoading: false }, false, 'createRoom/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tạo phòng bệnh mới.',
                        isLoading: false,
                    }, false, 'createRoom/failure');
                    throw err;
                }
            },

            updateRoom: async (id: string, data: UpdateRoomDto, token: string) => {
                set({ isLoading: true, error: null }, false, 'updateRoom/pending');
                try {
                    const res = await roomService.updateRoom(id, data, token);
                    const updatedRooms = get().rooms.map((r) =>
                        r.room_id === id ? { ...r, ...res.data } : r
                    );
                    set({ rooms: updatedRooms, isLoading: false }, false, 'updateRoom/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể cập nhật phòng bệnh.',
                        isLoading: false,
                    }, false, 'updateRoom/failure');
                    throw err;
                }
            },

            deleteRoom: async (id: string, token: string) => {
                set({ isLoading: true, error: null }, false, 'deleteRoom/pending');
                try {
                    await roomService.deleteRoom(id, token);
                    const updatedRooms = get().rooms.filter((r) => r.room_id !== id);
                    set({ rooms: updatedRooms, isLoading: false }, false, 'deleteRoom/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể xóa phòng bệnh.',
                        isLoading: false,
                    }, false, 'deleteRoom/failure');
                    throw err;
                }
            },

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'RoomStore' }
    )
);
