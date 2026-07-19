import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Staff, CreateStaffDto, UpdateStaffDto } from '../types/staff.types';
import { staffService } from '../services/staffService';

export interface StaffState {
    staffs: Staff[];
    isLoading: boolean;
    error: string | null;
}

export interface StaffActions {
    fetchStaffs: (token: string) => Promise<void>;
    createStaff: (data: CreateStaffDto, token: string) => Promise<void>;
    updateStaff: (id: string, data: UpdateStaffDto, token: string) => Promise<void>;
    clearError: () => void;
}

type StaffStore = StaffState & StaffActions;

const initialState: StaffState = {
    staffs: [],
    isLoading: false,
    error: null,
};

export const useStaffStore = create<StaffStore>()(
    devtools(
        (set, get) => ({
            ...initialState,

            fetchStaffs: async (token: string) => {
                set({ isLoading: true, error: null }, false, 'fetchStaffs/pending');
                try {
                    const res = await staffService.getStaffs(token);
                    set({ staffs: res.data || [], isLoading: false }, false, 'fetchStaffs/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tải danh sách nhân viên.',
                        isLoading: false,
                    }, false, 'fetchStaffs/failure');
                }
            },

            createStaff: async (data: CreateStaffDto, token: string) => {
                set({ isLoading: true, error: null }, false, 'createStaff/pending');
                try {
                    const res = await staffService.createStaff(data, token);
                    const currentStaffs = get().staffs;
                    set({ staffs: [...currentStaffs, res.data], isLoading: false }, false, 'createStaff/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tạo tài khoản nhân viên mới.',
                        isLoading: false,
                    }, false, 'createStaff/failure');
                    throw err;
                }
            },

            updateStaff: async (id: string, data: UpdateStaffDto, token: string) => {
                set({ isLoading: true, error: null }, false, 'updateStaff/pending');
                try {
                    const res = await staffService.updateStaff(id, data, token);
                    const updatedStaffs = get().staffs.map((s) =>
                        s.staff_id === id ? { ...s, ...res.data } : s
                    );
                    set({ staffs: updatedStaffs, isLoading: false }, false, 'updateStaff/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể cập nhật thông tin nhân viên.',
                        isLoading: false,
                    }, false, 'updateStaff/failure');
                    throw err;
                }
            },

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'StaffStore' }
    )
);
