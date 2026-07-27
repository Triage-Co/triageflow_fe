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
    updateShift: (id: string, data: Partial<CreateShiftDto>, token: string) => Promise<void>;
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
                        error: err instanceof Error ? err.message : 'Không thể tải danh sách ca trực từ DB.',
                        isLoading: false,
                    }, false, 'fetchShifts/failure');
                }
            },

            createShift: async (data: CreateShiftDto, token: string) => {
                set({ isLoading: true, error: null }, false, 'createShift/pending');
                
                // Swagger API spec format: "date": "YYYY-MM-DD"
                const dateOnly = data.date ? data.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
                const payload: CreateShiftDto = {
                    staff_id: data.staff_id,
                    room_id: data.room_id,
                    date: dateOnly,
                    start_time: data.start_time,
                    end_time: data.end_time,
                };

                try {
                    const res = await shiftService.createShift(payload, token);
                    const newShift = res?.data || {
                        shift_id: `shift-${Date.now()}`,
                        ...payload,
                    };
                    const current = get().shifts;
                    set({ shifts: [newShift, ...current], isLoading: false }, false, 'createShift/success');
                    // Refresh from Backend Database
                    await get().fetchShifts(token);
                } catch (err) {
                    set(
                        {
                            error: err instanceof Error ? err.message : 'Không thể lưu ca trực vào cơ sở dữ liệu.',
                            isLoading: false,
                        },
                        false,
                        'createShift/failure'
                    );
                    throw err;
                }
            },

            updateShift: async (id: string, data: Partial<CreateShiftDto>, token: string) => {
                set({ isLoading: true, error: null }, false, 'updateShift/pending');
                try {
                    const res = await shiftService.updateShift(id, data, token);
                    const current = get().shifts;
                    const updated = current.map((s) => (s.shift_id === id ? { ...s, ...res.data } : s));
                    set({ shifts: updated, isLoading: false }, false, 'updateShift/success');
                    await get().fetchShifts(token);
                } catch (err) {
                    set(
                        {
                            error: err instanceof Error ? err.message : 'Không thể cập nhật ca trực trong cơ sở dữ liệu.',
                            isLoading: false,
                        },
                        false,
                        'updateShift/failure'
                    );
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
                    set(
                        {
                            error: err instanceof Error ? err.message : 'Không thể xóa ca trực khỏi cơ sở dữ liệu.',
                            isLoading: false,
                        },
                        false,
                        'deleteShift/failure'
                    );
                    throw err;
                }
            },

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'ShiftStore' }
    )
);
