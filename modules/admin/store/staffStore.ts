import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Staff, CreateStaffDto, UpdateStaffDto } from '../types/staff.types';
import { staffService } from '../services/staffService';

import { adminService } from '../services/adminService';
import type { StaffAccount } from '../types/staff.types';

function normalizeRoleKey(role?: string): string {
    if (!role) return '';
    return role.trim().toUpperCase().replace(/^ROLE_/, '');
}

export interface StaffState {
    staffs: Staff[];
    isLoading: boolean;
    error: string | null;
}

export interface StaffActions {
    fetchStaffs: (token: string) => Promise<void>;
    createStaff: (data: CreateStaffDto, token: string) => Promise<void>;
    updateStaff: (id: string, data: UpdateStaffDto, token: string) => Promise<void>;
    deleteStaff: (id: string, token: string) => Promise<void>;
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
                    const officialStaffs = Array.isArray(res?.data) ? res.data : [];

                    let mergedStaffs = [...officialStaffs];

                    try {
                        const accRes = await adminService.getAccounts(token);
                        const accounts = Array.isArray(accRes?.data) ? accRes.data : [];

                        const existingEmails = new Set(
                            officialStaffs
                                .map((s) => s.account?.email?.toLowerCase())
                                .filter(Boolean)
                        );

                        const STAFF_ROLES = new Set(['DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_STAFF', 'PHARMACY_STAFF', 'CASHIER', 'ADMIN']);

                        const extraStaffs: Staff[] = accounts
                            .filter((acc) => {
                                const r = normalizeRoleKey(acc.role);
                                return STAFF_ROLES.has(r) && acc.email && !existingEmails.has(acc.email.toLowerCase());
                            })
                            .map((acc) => {
                                const normRole = (normalizeRoleKey(acc.role) || 'NURSE') as StaffAccount['role'];
                                const name = acc.profile?.user_name || acc.user_name || acc.email.split('@')[0];
                                return {
                                    staff_id: acc.id || acc.account_id || `acc-${acc.email}`,
                                    full_name: name,
                                    license_number: null,
                                    experience_years: null,
                                    specialty_id: null,
                                    account: {
                                        avatar: null,
                                        user_name: name,
                                        email: acc.email,
                                        role: normRole,
                                        gender: ((acc.gender || acc.profile?.gender || 'MALE').toUpperCase()) as StaffAccount['gender'],
                                        phone: acc.profile?.phone || '',
                                        is_banned: acc.isBanned || false,
                                    },
                                };
                            });

                        mergedStaffs = [...officialStaffs, ...extraStaffs];
                    } catch {
                        // Fallback to officialStaffs if getAccounts fails
                    }

                    set({ staffs: mergedStaffs, isLoading: false }, false, 'fetchStaffs/success');
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

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'StaffStore' }
    )
);
