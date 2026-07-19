import { create } from 'zustand';
import { triageService } from '../services/triageService';
import { getSymptomsForBodyPart } from '../utils/symptomMapper';
import { commonSymptomDataset } from '../data/commonSymptoms';
import { femaleSymptomDataset } from '../data/femaleSymptoms';
import { maleSymptomDataset } from '../data/maleSymptoms';
import {
    SymptomItem,
    InfermedicaEvidence,
    InfermedicaQuestion,
    InfermedicaRecommendedSpecialist
} from '../types/triage.types';

const compileGlobalStaticSymptomMap = (): Record<string, string> => {
    const map: Record<string, string> = {};
    const datasets = [commonSymptomDataset, femaleSymptomDataset, maleSymptomDataset];

    datasets.forEach(dataset => {
        Object.values(dataset).forEach((zone: any) => {
            if (zone.symptoms && Array.isArray(zone.symptoms)) {
                zone.symptoms.forEach((s: any) => {
                    if (s.labelVn) map[s.labelVn.trim().toLowerCase()] = s.id;
                    if (s.labelEn) map[s.labelEn.trim().toLowerCase()] = s.id;
                });
            }
        });
    });
    return map;
};

const GLOBAL_STATIC_SYMPTOM_MAP = compileGlobalStaticSymptomMap();

interface TriageStoreState {
    currentRegionSymptoms: SymptomItem[];
    isApiLoading: boolean;
    selectedSymptoms: SymptomItem[];
    symptomLabelToIdMap: Record<string, string>;
    symptomDuration: string;
    painLevel: number;
    hasEmergency: boolean;

    accumulatedEvidence: InfermedicaEvidence[];
    interviewToken: string | null;
    currentQuestion: InfermedicaQuestion | null;
    recommendedSpecialists: InfermedicaRecommendedSpecialist[];

    fetchAndMergeSymptoms: (regionId: string, dob?: string) => Promise<void>;
    toggleSymptom: (symptom: SymptomItem) => void;
    addSymptomsBatch: (symptoms: SymptomItem[]) => void;
    removeSymptom: (symptomId: string) => void;
    setSymptomDuration: (duration: string) => void;
    setPainLevel: (level: number) => void;
    setHasEmergency: (emergency: boolean) => void;
    startDiagnosisFlow: () => Promise<void>;
    // ĐỔI: Chuyển sang nhận một mảng danh sách câu trả lời cùng lúc
    submitAnswersBatch: (answers: InfermedicaEvidence[]) => Promise<void>;
    clearTriage: () => void;
}

export const useTriageStore = create<TriageStoreState>((set, get) => ({
    currentRegionSymptoms: [],
    isApiLoading: false,
    selectedSymptoms: [],
    symptomLabelToIdMap: {},
    symptomDuration: '',
    painLevel: 0,
    hasEmergency: false,

    accumulatedEvidence: [],
    interviewToken: null,
    currentQuestion: null,
    recommendedSpecialists: [],

    clearTriage: () => {
        set({
            currentRegionSymptoms: [],
            selectedSymptoms: [],
            symptomLabelToIdMap: {},
            symptomDuration: '',
            painLevel: 0,
            hasEmergency: false,
            accumulatedEvidence: [],
            interviewToken: null,
            currentQuestion: null,
            recommendedSpecialists: []
        });
    },

    fetchAndMergeSymptoms: async (regionId: string, dob?: string) => {
        const { useKioskStore } = await import('./kioskStore');
        const selectedGender = useKioskStore.getState().selectedGender;
        const gender = selectedGender === 'female' ? 'female' : 'male';

        const localSymptoms = getSymptomsForBodyPart(regionId, gender);
        set({ currentRegionSymptoms: localSymptoms });

        const allDatasets: Record<string, any> = {
            ...commonSymptomDataset,
            ...femaleSymptomDataset,
            ...maleSymptomDataset
        };

        const foundKey = Object.keys(allDatasets).find((key) =>
            key.toLowerCase() === regionId.toLowerCase() ||
            allDatasets[key].nameVn.toLowerCase() === regionId.toLowerCase() ||
            allDatasets[key].nameEn.toLowerCase() === regionId.toLowerCase()
        );

        const englishPhrase = foundKey ? foundKey : regionId;

        let patientAge = 30;
        if (dob) {
            const dobParts = dob.split('/');
            if (dobParts.length === 3) {
                const parsedYear = parseInt(dobParts[2], 10);
                if (!isNaN(parsedYear)) patientAge = 2026 - parsedYear;
            }
        }

        set({ isApiLoading: true });
        try {
            const response = await triageService.searchSymptoms(englishPhrase, patientAge);

            if (response && response.status === 'success' && Array.isArray(response.data)) {
                const mergedList = [...get().currentRegionSymptoms];
                let hasNewUpdates = false;

                const cleanId = (id: string | number | undefined): string => {
                    if (!id) return '';
                    return String(id).replace(/^s_/i, '').trim().toLowerCase();
                };

                const findSymptomInDataset = (dataset: Record<string, any>, targetId: string) => {
                    for (const zone of Object.values(dataset)) {
                        if (zone.symptoms && Array.isArray(zone.symptoms)) {
                            const found = zone.symptoms.find((s: any) => cleanId(s.id) === targetId);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const currentGenderDataset = gender === 'female' ? femaleSymptomDataset : maleSymptomDataset;
                const oppositeGenderDataset = gender === 'female' ? maleSymptomDataset : femaleSymptomDataset;

                response.data.forEach((apiItem) => {
                    if (!apiItem.id) return;
                    const apiIdTarget = cleanId(apiItem.id);

                    const isInOppositeGender = findSymptomInDataset(oppositeGenderDataset, apiIdTarget);
                    if (isInOppositeGender) return;

                    const isIdExisted = mergedList.some((localItem) => cleanId(localItem.id) === apiIdTarget);

                    if (!isIdExisted) {
                        const localSymptomInCurrentGender = findSymptomInDataset(currentGenderDataset, apiIdTarget);
                        const localSymptomInCommon = findSymptomInDataset(commonSymptomDataset, apiIdTarget);
                        const matchedLocal = localSymptomInCurrentGender || localSymptomInCommon;

                        mergedList.push({
                            id: apiItem.id,
                            labelVn: matchedLocal ? matchedLocal.labelVn : apiItem.label,
                            labelEn: matchedLocal ? matchedLocal.labelEn : apiItem.label,
                            categoryNameVn: "Mở rộng từ Hệ thống"
                        });
                        hasNewUpdates = true;
                    }
                });

                if (hasNewUpdates) {
                    set({ currentRegionSymptoms: mergedList });
                }
            }
        } catch (error) {
            console.error("Lỗi khi gọi searchSymptoms:", error);
        } finally {
            set({ isApiLoading: false });
        }
    },

    startDiagnosisFlow: async () => {
        const { useKioskStore } = await import('./kioskStore');
        const { useAuthStore } = await import('./authStore');

        const kioskState = useKioskStore.getState();
        const authState = useAuthStore.getState();

        set({ isApiLoading: true });

        const realCitizenId = authState.citizenId || kioskState.patientInfo?.idNumber;

        if (!realCitizenId) {
            console.error("Không tìm thấy thông tin định danh CCCD/CMND.");
            set({ isApiLoading: false });
            return;
        }

        const initialEvidence: InfermedicaEvidence[] = get().selectedSymptoms.map(item => ({
            id: item.id,
            choice_id: 'present' as const
        }));

        set({ accumulatedEvidence: initialEvidence });

        let patientAge = 30;
        const dob = kioskState.patientInfo?.dob;
        if (dob) {
            const dobParts = dob.split('/');
            if (dobParts.length === 3) {
                const parsedYear = parseInt(dobParts[2], 10);
                if (!isNaN(parsedYear)) patientAge = 2026 - parsedYear;
            }
        }

        const payload = {
            sex: kioskState.selectedGender === 'female' ? 'female' : 'male',
            age: patientAge,
            evidence: initialEvidence
        };

        try {
            const res = await triageService.diagnose(payload, realCitizenId);

            if (res && res.status === 'success' && res.data) {
                const { question, interview_token, should_stop } = res.data;
                set({ interviewToken: interview_token, currentQuestion: question });

                if (should_stop === true || !question) {
                    const finalRes = await triageService.recommendSpecialist(payload, interview_token);
                    const specData = (finalRes?.data as any)?.recommended_specialist;
                    if (specData) {
                        set({
                            recommendedSpecialists: [{
                                id: specData.specialty_id || 'spec-priority',
                                specialty_code: specData.specialty_code || '',
                                name: specData.name || 'Chuyên khoa Khuyến nghị'
                            }],
                            currentQuestion: null
                        });
                    } else {
                        set({ recommendedSpecialists: [], currentQuestion: null });
                    }
                    kioskState.setAIRegisterStep('ai_result');
                } else {
                    kioskState.setAIRegisterStep('quiz_detail');
                }
            }
        } catch (error) {
            console.error("Lỗi khi chạy startDiagnosisFlow:", error);
        } finally {
            set({ isApiLoading: false });
        }
    },

    /**
     * LƯỢT HỎI KẾ TIẾP: Nhận mảng evidence cộng dồn hàng loạt
     */
    submitAnswersBatch: async (answers) => {
        const { useKioskStore } = await import('./kioskStore');
        const { useAuthStore } = await import('./authStore');

        const kioskState = useKioskStore.getState();
        const authState = useAuthStore.getState();
        const token = get().interviewToken;

        if (!token) return;

        set({ isApiLoading: true });

        // Cộng dồn toàn bộ mảng câu trả lời mới vào kho dữ liệu cũ[cite: 1, 2]
        const updatedEvidence = [...get().accumulatedEvidence, ...answers];
        set({ accumulatedEvidence: updatedEvidence });

        let patientAge = 30;
        const dob = kioskState.patientInfo?.dob;
        if (dob) {
            const dobParts = dob.split('/');
            if (dobParts.length === 3) {
                const parsedYear = parseInt(dobParts[2], 10);
                if (!isNaN(parsedYear)) patientAge = 2026 - parsedYear;
            }
        }

        const payload = {
            sex: kioskState.selectedGender === 'female' ? 'female' : 'male',
            age: patientAge,
            evidence: updatedEvidence
        };

        const realCitizenId = authState.citizenId || kioskState.patientInfo?.idNumber;

        if (!realCitizenId) {
            set({ isApiLoading: false });
            return;
        }

        try {
            const res = await triageService.diagnose(payload, realCitizenId, token);

            if (res && res.status === 'success' && res.data) {
                const { question, should_stop } = res.data;

                if (should_stop === true || !question) {
                    const finalRes = await triageService.recommendSpecialist(payload, token);
                    const specData = (finalRes?.data as any)?.recommended_specialist;
                    if (specData) {
                        set({
                            recommendedSpecialists: [{
                                id: specData.specialty_id || 'spec-priority',
                                specialty_code: specData.specialty_code || '',
                                name: specData.name || 'Chuyên khoa Khuyến nghị'
                            }],
                            currentQuestion: null
                        });
                    } else {
                        set({ recommendedSpecialists: [], currentQuestion: null });
                    }
                    kioskState.setAIRegisterStep('ai_result');
                } else {
                    set({ currentQuestion: question });
                }
            }
        } catch (error) {
            console.error("Lỗi khi chạy submitAnswersBatch:", error);
        } finally {
            set({ isApiLoading: false });
        }
    },

    toggleSymptom: (symptom) => {
        const current = get().selectedSymptoms;
        const isIncluded = current.some(s => s.id === symptom.id);
        const next = isIncluded
            ? current.filter(s => s.id !== symptom.id)
            : [...current, symptom];
        set({ selectedSymptoms: next });
    },

    addSymptomsBatch: (symptoms) => set({ selectedSymptoms: symptoms }),

    removeSymptom: (symptomId) => set((s) => ({
        selectedSymptoms: s.selectedSymptoms.filter(s => s.id !== symptomId)
    })),

    setSymptomDuration: (duration) => set({ symptomDuration: duration }),
    setPainLevel: (level) => set({ painLevel: level }),
    setHasEmergency: (emergency) => set({ hasEmergency: emergency })
}));