import { create } from 'zustand';
import { triageService } from '../services/triageService';
import { getSymptomsForBodyPart, PART_KEY_MAPPING } from '../utils/symptomMapper';
import { commonSymptomDataset } from '../data/commonSymptoms';
import { femaleSymptomDataset } from '../data/femaleSymptoms';
import { maleSymptomDataset } from '../data/maleSymptoms';
import {
    SymptomItem,
    InfermedicaEvidence,
    InfermedicaQuestion,
    InfermedicaRecommendedSpecialist
} from '../types/triage.types';
import { 
    translateQuestionWithGoogle, 
    translateSymptomLabelsWithGoogle 
} from '@/modules/reception/services/googleTranslationService';
import { calculateAgeFromDob } from '../utils/kioskHelpers';

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

export interface QuestionHistoryItem {
    question: InfermedicaQuestion;
    evidenceSnapshot: InfermedicaEvidence[];
    submittedAnswers?: Record<string, 'present' | 'absent' | 'unknown' | undefined>;
}

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
    historyStack: QuestionHistoryItem[];
    restoredAnswers: Record<string, 'present' | 'absent' | 'unknown' | undefined> | null;

    fetchAndMergeSymptoms: (regionId: string, dob?: string) => Promise<void>;
    toggleSymptom: (symptom: SymptomItem) => void;
    addSymptomsBatch: (symptoms: SymptomItem[]) => void;
    removeSymptom: (symptomId: string) => void;
    setSymptomDuration: (duration: string) => void;
    setPainLevel: (level: number) => void;
    setHasEmergency: (emergency: boolean) => void;
    startDiagnosisFlow: () => Promise<void>;
    submitAnswersBatch: (answers: InfermedicaEvidence[], localAnswerMap?: Record<string, 'present' | 'absent' | 'unknown' | undefined>) => Promise<void>;
    goToPreviousQuestion: () => boolean;
    clearRestoredAnswers: () => void;
    clearTriage: () => void;
    resetTriageFlow: () => void;
}

const initialState = {
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
    historyStack: [],
    restoredAnswers: null,
};

export const useTriageStore = create<TriageStoreState>((set, get) => ({
    ...initialState,

    clearTriage: () => {
        set(initialState);
    },
    resetTriageFlow: () => {
        get().clearTriage();
    },

    goToPreviousQuestion: () => {
        const history = get().historyStack;
        if (history.length === 0) {
            return false;
        }
        const newHistory = [...history];
        const lastStep = newHistory.pop()!;

        set({
            historyStack: newHistory,
            currentQuestion: lastStep.question,
            accumulatedEvidence: lastStep.evidenceSnapshot,
            restoredAnswers: lastStep.submittedAnswers || null,
            recommendedSpecialists: [],
        });
        return true;
    },

    clearRestoredAnswers: () => set({ restoredAnswers: null }),

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

        const mappedKeys = PART_KEY_MAPPING[regionId];
        const primaryKey = mappedKeys?.[0];

        let englishPhrase = '';
        if (primaryKey && allDatasets[primaryKey]) {
            englishPhrase = allDatasets[primaryKey].nameEn;
        } else {
            const normalizedRegion = regionId.toLowerCase().replace(/[-_]/g, '');
            const foundKey = Object.keys(allDatasets).find((key) =>
                key.toLowerCase() === regionId.toLowerCase() ||
                key.toLowerCase() === normalizedRegion ||
                allDatasets[key].nameVn?.toLowerCase() === regionId.toLowerCase() ||
                allDatasets[key].nameEn?.toLowerCase() === regionId.toLowerCase()
            );
            englishPhrase = foundKey ? allDatasets[foundKey].nameEn : regionId.replace(/[-_]/g, ' ');
        }

        const patientAge = calculateAgeFromDob(dob);

        set({ isApiLoading: true });
        try {
            const response = await triageService.searchSymptoms(englishPhrase, patientAge);

            if (response && response.status === 'success' && Array.isArray(response.data)) {
                const currentGenderDataset = gender === 'female' ? femaleSymptomDataset : maleSymptomDataset;
                const oppositeGenderDataset = gender === 'female' ? maleSymptomDataset : femaleSymptomDataset;

                const candidateItems: { apiItem: any; matchedLocal: any }[] = [];
                const needsTranslationItems: { id: string; label: string }[] = [];

                response.data.forEach((apiItem) => {
                    if (!apiItem.id) return;
                    const apiIdTarget = cleanId(apiItem.id);

                    const isInOppositeGender = findSymptomInDataset(oppositeGenderDataset, apiIdTarget);
                    if (isInOppositeGender) return;

                    const isIdExisted = get().currentRegionSymptoms.some((localItem) => cleanId(localItem.id) === apiIdTarget);

                    if (!isIdExisted) {
                        const localSymptomInCurrentGender = findSymptomInDataset(currentGenderDataset, apiIdTarget);
                        const localSymptomInCommon = findSymptomInDataset(commonSymptomDataset, apiIdTarget);
                        const matchedLocal = localSymptomInCurrentGender || localSymptomInCommon;

                        candidateItems.push({ apiItem, matchedLocal });
                        if (!matchedLocal) {
                            needsTranslationItems.push({ id: apiItem.id, label: apiItem.label });
                        }
                    }
                });

                // Dịch tự động các triệu chứng mới chưa có trong từ điển tĩnh
                let translationMap = new Map<string, string>();
                if (needsTranslationItems.length > 0) {
                    translationMap = await translateSymptomLabelsWithGoogle(needsTranslationItems);
                }

                if (candidateItems.length > 0) {
                    const mergedList = [...get().currentRegionSymptoms];
                    candidateItems.forEach(({ apiItem, matchedLocal }) => {
                        const apiIdTarget = cleanId(apiItem.id);
                        if (!mergedList.some((item) => cleanId(item.id) === apiIdTarget)) {
                            const translatedVn = matchedLocal
                                ? matchedLocal.labelVn
                                : translationMap.get(apiItem.id) || apiItem.label;

                            mergedList.push({
                                id: apiItem.id,
                                labelVn: translatedVn,
                                labelEn: matchedLocal ? matchedLocal.labelEn : apiItem.label,
                                categoryNameVn: "Mở rộng từ Hệ thống"
                            });
                        }
                    });

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

        set({ isApiLoading: true, historyStack: [], restoredAnswers: null });

        const initialEvidence: InfermedicaEvidence[] = get().selectedSymptoms.map(item => ({
            id: item.id,
            choice_id: 'present' as const
        }));

        const realCitizenId = authState.citizenId || authState.patientInfo?.idNumber;
        if (!realCitizenId) {
            console.error("Không tìm thấy thông tin định danh CCCD/CMND.");
            set({ isApiLoading: false });
            return;
        }

        const patientAge = calculateAgeFromDob(authState.patientInfo?.dob);

        const payload = {
            sex: kioskState.selectedGender === 'female' ? 'female' : 'male',
            age: patientAge,
            evidence: initialEvidence
        };

        try {
            const res = await triageService.diagnose(payload, realCitizenId);

            if (res && res.status === 'success' && res.data) {
                const { question, interview_token, should_stop } = res.data;
                set({ interviewToken: interview_token });

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
                    let finalQuestion = question;
                    try {
                        finalQuestion = await translateQuestionWithGoogle(question as any) as any;
                    } catch (err: any) {
                        console.error("Translation error:", err);
                    }
                    set({ currentQuestion: finalQuestion });
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
     * LƯỢT HỎI KẾ TIẾP: Nhận mảng evidence cộng dồn hàng loạt & lưu snapshot lịch sử
     */
    submitAnswersBatch: async (answers, localAnswerMap) => {
        const { useKioskStore } = await import('./kioskStore');
        const { useAuthStore } = await import('./authStore');

        const kioskState = useKioskStore.getState();
        const authState = useAuthStore.getState();
        const token = get().interviewToken;

        if (!token) return;

        // Lưu snapshot câu hỏi hiện tại và mảng evidence trước khi cộng dồn
        const currentQ = get().currentQuestion;
        const currentEvidence = get().accumulatedEvidence;
        if (currentQ) {
            const snapshot: QuestionHistoryItem = {
                question: currentQ,
                evidenceSnapshot: [...currentEvidence],
                submittedAnswers: localAnswerMap
            };
            set({ historyStack: [...get().historyStack, snapshot] });
        }

        set({ isApiLoading: true, restoredAnswers: null });
        const updatedEvidence = [...currentEvidence, ...answers];
        set({ accumulatedEvidence: updatedEvidence });

        const patientAge = calculateAgeFromDob(authState.patientInfo?.dob);

        const payload = {
            sex: kioskState.selectedGender === 'female' ? 'female' : 'male',
            age: patientAge,
            evidence: updatedEvidence
        };

        const realCitizenId = authState.citizenId || authState.patientInfo?.idNumber;

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
                    let finalQuestion = question;
                    try {
                        finalQuestion = await translateQuestionWithGoogle(question as any) as any;
                    } catch (err: any) {
                        console.error("Translation error:", err);
                    }
                    set({ currentQuestion: finalQuestion });
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