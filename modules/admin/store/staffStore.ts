import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Staff, CreateStaffDto, UpdateStaffDto, QueryStaffParams } from '../types/staff.types';
import type { BanDuration } from '../types/admin.types';
import { staffService } from '../services/staffService';
import { adminService } from '../services/adminService';

export interface StaffState {
    staffs: Staff[];
    isLoading: boolean;
    error: string | null;
}

export interface StaffActions {
    fetchStaffs: (token: string, params?: QueryStaffParams) => Promise<void>;
    createStaff: (data: CreateStaffDto, token: string) => Promise<void>;
    updateStaff: (id: string, data: UpdateStaffDto, token: string) => Promise<void>;
    deleteStaff: (id: string, token: string) => Promise<void>;
    banStaff: (accountId: string, duration: BanDuration, token: string) => Promise<void>;
    unbanStaff: (accountId: string, token: string) => Promise<void>;
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

            fetchStaffs: async (token: string, params: QueryStaffParams = {}) => {
                set({ isLoading: true, error: null }, false, 'fetchStaffs/pending');
                try {
                    const res = await staffService.getStaffs(token, params);
                    const officialStaffs = Array.isArray(res?.data) ? res.data : [];
                    set({ staffs: officialStaffs, isLoading: false }, false, 'fetchStaffs/success');
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

            deleteStaff: async (id: string, token: string) => {
                set({ isLoading: true, error: null }, false, 'deleteStaff/pending');
                try {
                    await staffService.deleteStaff(id, token);
                    const updatedStaffs = get().staffs.filter((s) => s.staff_id !== id);
                    set({ staffs: updatedStaffs, isLoading: false }, false, 'deleteStaff/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể xóa nhân viên khỏi hệ thống.',
                        isLoading: false,
                    }, false, 'deleteStaff/failure');
                    throw err;
                }
            },

            banStaff: async (accountId: string, duration: BanDuration, token: string) => {
                await adminService.banAccount(accountId, duration, token);
                const updatedStaffs = get().staffs.map((s) =>
                    s.staff_id === accountId
                        ? { ...s, account: { ...s.account, is_banned: true } }
                        : s
                );
                set({ staffs: updatedStaffs }, false, 'banStaff/success');
            },

            unbanStaff: async (accountId: string, token: string) => {
                await adminService.unbanAccount(accountId, token);
                const updatedStaffs = get().staffs.map((s) =>
                    s.staff_id === accountId
                        ? { ...s, account: { ...s.account, is_banned: false } }
                        : s
                );
                set({ staffs: updatedStaffs }, false, 'unbanStaff/success');
            },

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'StaffStore' }
    )
);
