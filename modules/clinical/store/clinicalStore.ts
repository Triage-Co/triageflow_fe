import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Patient } from '@/modules/clinical/types/clinical.types';

export interface PatientTab {
    id: string;
    name: string;
    stt?: string;
}

interface PatientTabsState {
    openTabs: PatientTab[];
    patientDataMap: Record<string, Patient>;
    openTab: (tab: PatientTab) => void;
    closeTab: (id: string) => void;
    setPatientData: (id: string, data: Patient) => void;
    getPatientData: (id: string) => Patient | undefined;
    clearAll: () => void;
}

export const usePatientTabsStore = create<PatientTabsState>()(
    persist(
        (set, get) => ({
            openTabs: [],
            patientDataMap: {},

            openTab: (tab) => {
                const { openTabs } = get();
                const exists = openTabs.some((t) => t.id === tab.id);
                if (!exists) {
                    set({ openTabs: [...openTabs, tab] });
                } else {
                    const idx = openTabs.findIndex((t) => t.id === tab.id);
                    if (idx >= 0 && (openTabs[idx].name !== tab.name || openTabs[idx].stt !== tab.stt)) {
                        const updated = [...openTabs];
                        updated[idx] = { ...updated[idx], ...tab };
                        set({ openTabs: updated });
                    }
                }
            },

            closeTab: (id) => {
                const { openTabs, patientDataMap } = get();
                const newTabs = openTabs.filter((t) => t.id !== id);
                
                // Clean up patient data when tab is closed to save storage space
                const newMap = { ...patientDataMap };
                delete newMap[id];

                set({
                    openTabs: newTabs,
                    patientDataMap: newMap,
                });
            },

            setPatientData: (id, data) => {
                set((state) => ({
                    patientDataMap: {
                        ...state.patientDataMap,
                        [id]: data,
                    },
                }));
            },

            getPatientData: (id) => {
                return get().patientDataMap[id];
            },

            clearAll: () => {
                set({ openTabs: [], patientDataMap: {} });
            },
        }),
        {
            name: 'emr_patient_tabs_persist', // Local storage key
        }
    )
);
