import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Flow } from '../types/process.types';
import { processService } from '../services/processService';

export interface ProcessState {
    flows: Flow[];
    isLoading: boolean;
    error: string | null;
}

export interface ProcessActions {
    fetchFlows: (token: string) => Promise<void>;
    clearError: () => void;
}

type ProcessStore = ProcessState & ProcessActions;

const initialState: ProcessState = {
    flows: [],
    isLoading: false,
    error: null,
};

export const useProcessStore = create<ProcessStore>()(
    devtools(
        (set) => ({
            ...initialState,

            fetchFlows: async (token: string) => {
                set({ isLoading: true, error: null }, false, 'fetchFlows/pending');
                try {
                    const res = await processService.getFlows(token);
                    if (res && res.data) {
                        set({ flows: res.data, isLoading: false }, false, 'fetchFlows/success');
                    } else {
                        set({ flows: [], isLoading: false }, false, 'fetchFlows/empty');
                    }
                } catch (err) {
                    set({
                        error: err instanceof Error ? err.message : 'Không thể tải quy trình công việc.',
                        isLoading: false,
                    }, false, 'fetchFlows/failure');
                }
            },

            clearError: () => set({ error: null }, false, 'clearError'),
        }),
        { name: 'ProcessStore' }
    )
);
