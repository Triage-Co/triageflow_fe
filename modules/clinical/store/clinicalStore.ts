import { create } from 'zustand';

export interface PatientTab {
    id: string;
    name: string;
}

interface PatientTabsState {
    openTabs: PatientTab[];
    openTab: (tab: PatientTab) => void;
    closeTab: (id: string) => void;
    isOpen: (id: string) => boolean;
}

export const usePatientTabsStore = create<PatientTabsState>((set, get) => ({
    openTabs: [],

    openTab: (tab) => {
        const { openTabs } = get();
        const exists = openTabs.some((t) => t.id === tab.id);
        if (!exists) {
            set({ openTabs: [...openTabs, tab] });
        }
    },

    closeTab: (id) => {
        set((state) => ({
            openTabs: state.openTabs.filter((t) => t.id !== id),
        }));
    },

    isOpen: (id) => get().openTabs.some((t) => t.id === id),
}));
