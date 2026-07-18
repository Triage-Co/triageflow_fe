import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Account, BanDuration } from '../types/admin.types';
import { adminService } from '../services/adminService';

export interface AdminState {
    accounts: Account[];
    isLoading: boolean;
    error: string | null;
}

export interface AdminActions {
    fetchAccounts: (token: string) => Promise<void>;
    banAccount: (id: string, duration: BanDuration, token: string) => Promise<void>;
    unbanAccount: (id: string, token: string) => Promise<void>;
    clearError: () => void;
}

type AdminStore = AdminState & AdminActions;

const initialState: AdminState = {
    accounts: [],
    isLoading: false,
    error: null,
};

export const useAdminStore = create<AdminStore>()(
    devtools(
        (set, get) => ({
            ...initialState,

            fetchAccounts: async (token: string) => {
                set({ isLoading: true, error: null }, false, 'fetchAccounts/pending');
                try {
                    const res = await adminService.getAccounts(token);
                    set({ accounts: res.data || [], isLoading: false }, false, 'fetchAccounts/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tải danh sách người dùng.',
                        isLoading: false,
                    }, false, 'fetchAccounts/failure');
                }
            },

            banAccount: async (id: string, duration: BanDuration, token: string) => {
                set({ isLoading: true, error: null }, false, 'banAccount/pending');
                try {
                    await adminService.banAccount(id, duration, token);
                    // Update state locally
                    const updatedAccounts = get().accounts.map((acc) =>
                        acc.id === id ? { ...acc, isBanned: true } : acc
                    );
                    set({ accounts: updatedAccounts, isLoading: false }, false, 'banAccount/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể vô hiệu hóa tài khoản.',
                        isLoading: false,
                    }, false, 'banAccount/failure');
                    throw err;
                }
            },

            unbanAccount: async (id: string, token: string) => {
                set({ isLoading: true, error: null }, false, 'unbanAccount/pending');
                try {
                    await adminService.unbanAccount(id, token);
                    // Update state locally
                    const updatedAccounts = get().accounts.map((acc) =>
                        acc.id === id ? { ...acc, isBanned: false } : acc
                    );
                    set({ accounts: updatedAccounts, isLoading: false }, false, 'unbanAccount/success');
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể kích hoạt tài khoản.',
                        isLoading: false,
                    }, false, 'unbanAccount/failure');
                    throw err;
                }
            },

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'AdminStore' }
    )
);
