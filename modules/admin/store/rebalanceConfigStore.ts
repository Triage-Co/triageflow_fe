import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { queueAdminService } from '../services/queueAdminService';
import type { RebalanceConfig } from '../types/queueRule.types';

export interface RebalanceConfigState {
    config: RebalanceConfig | null;
    isLoading: boolean;
    isSaving: boolean;
    error: string | null;
}

export interface RebalanceConfigActions {
    fetchConfig: (token: string) => Promise<void>;
    setEnabled: (enabled: boolean, token: string) => Promise<void>;
    clearError: () => void;
}

type RebalanceConfigStore = RebalanceConfigState & RebalanceConfigActions;

const initialState: RebalanceConfigState = {
    config: null,
    isLoading: false,
    isSaving: false,
    error: null,
};

export const useRebalanceConfigStore = create<RebalanceConfigStore>()(
    devtools(
        (set) => ({
            ...initialState,

            fetchConfig: async (token: string) => {
                set({ isLoading: true, error: null }, false, 'fetchConfig/pending');
                try {
                    const res = await queueAdminService.getRebalanceConfig(token);
                    set(
                        { config: res.data, isLoading: false },
                        false,
                        'fetchConfig/success',
                    );
                } catch (err) {
                    set(
                        {
                            error:
                                err instanceof Error
                                    ? err.message
                                    : 'Không thể tải cấu hình tự sắp xếp hàng chờ.',
                            isLoading: false,
                        },
                        false,
                        'fetchConfig/failure',
                    );
                }
            },

            setEnabled: async (enabled: boolean, token: string) => {
                set({ isSaving: true, error: null }, false, 'setEnabled/pending');
                try {
                    const res = await queueAdminService.updateRebalanceConfig(
                        { enabled },
                        token,
                    );
                    set(
                        { config: res.data, isSaving: false },
                        false,
                        'setEnabled/success',
                    );
                } catch (err) {
                    set(
                        {
                            error:
                                err instanceof Error
                                    ? err.message
                                    : 'Không thể cập nhật cấu hình tự sắp xếp hàng chờ.',
                            isSaving: false,
                        },
                        false,
                        'setEnabled/failure',
                    );
                    throw err;
                }
            },

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'rebalance-config-store' },
    ),
);
