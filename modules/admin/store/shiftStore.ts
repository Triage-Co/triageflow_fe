import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Shift, CreateShiftDto } from '../types/shift.types';
import { shiftService } from '../services/shiftService';

export interface ShiftState {
    shifts: Shift[];
    isLoading: boolean;
    error: string | null;
}

export interface ShiftActions {
    fetchShifts: (token: string) => Promise<void>;
    createShift: (data: CreateShiftDto, token: string) => Promise<void>;
    deleteShift: (id: string, token: string) => Promise<void>;
    clearError: () => void;
}

type ShiftStore = ShiftState & ShiftActions;

const initialState: ShiftState = {
    shifts: [],
    isLoading: false,
    error: null,
};

export const useShiftStore = create<ShiftStore>()(
    devtools(
        (set, get) => ({
            ...initialState,

            fetchShifts: async (token: string) => {
                set({ isLoading: true, error: null }, false, 'fetchShifts/pending');
                try {
                    const res = await shiftService.getShifts(token);
                    set({ shifts: res.data || [], isLoading: false }, false, 'fetchShifts/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tải danh sách ca trực.',
                        isLoading: false,
                    }, false, 'fetchShifts/failure');
                }
            },

            createShift: async (data: CreateShiftDto, token: string) => {
                set({ isLoading: true, error: null }, false, 'createShift/pending');
                try {
                    const res = await shiftService.createShift(data, token);
                    const current = get().shifts;
                    set({ shifts: [...current, res.data], isLoading: false }, false, 'createShift/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tạo ca trực mới.',
                        isLoading: false,
                    }, false, 'createShift/failure');
                    throw err;
                }
            },

            deleteShift: async (id: string, token: string) => {
                set({ isLoading: true, error: null }, false, 'deleteShift/pending');
                try {
                    await shiftService.deleteShift(id, token);
                    const updated = get().shifts.filter((s) => s.shift_id !== id);
                    set({ shifts: updated, isLoading: false }, false, 'deleteShift/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể xóa ca trực.',
                        isLoading: false,
                    }, false, 'deleteShift/failure');
                    throw err;
                }
            },

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'ShiftStore' }
    )
);
