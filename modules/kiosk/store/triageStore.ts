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
import { calculateAgeFromDob } from '../utils/kioskHelpers';
import { fetchGoogleTranslate } from '@/modules/reception/services/googleTranslationService';

let activeFetchSessionToken = 0;

const INFERMEDICA_SEARCH_KEYWORDS: Record<string, string> = {
    head: 'head',
    'Đầu': 'head',
    'Đầu & Cổ': 'head',
    eye: 'eye',
    'Mắt': 'eye',
    ear: 'ear',
    'Tai': 'ear',
    nose: 'nose',
    'Mũi': 'nose',
    'oral-cavity': 'mouth',
    'oral cavity': 'mouth',
    oralCavity: 'mouth',
    'Khoang miệng': 'mouth',
    'Miệng': 'mouth',
    'neck-or-throat': 'throat',
    'neck or throat': 'throat',
    neckOrThroat: 'throat',
    neckThroat: 'throat',
    'Cổ / Họng': 'throat',
    'Cổ': 'neck',
    'Họng': 'throat',
    'nape-of-neck': 'neck',
    'nape of neck': 'neck',
    'Gáy': 'neck',
    'Gáy & Cổ': 'neck',
    chest: 'chest',
    'Ngực': 'chest',
    'Vùng Ngực': 'chest',
    breast: 'breast',
    'Bầu ngực': 'breast',
    'upper-abdomen': 'stomach',
    'upper abdomen': 'stomach',
    upperAbdomen: 'stomach',
    'Bụng trên': 'stomach',
    'middle-abdomen': 'abdomen',
    'middle abdomen': 'abdomen',
    midAbdomen: 'abdomen',
    'Bụng giữa': 'abdomen',
    'Bụng': 'abdomen',
    'Bụng & Vùng Chậu': 'abdomen',
    'lower-abdomen': 'pelvis',
    'lower abdomen': 'pelvis',
    lowerAbdomen: 'pelvis',
    'Bụng dưới': 'pelvis',
    'upper-arm': 'arm',
    'upper arm': 'arm',
    upperArm: 'arm',
    'Bắp tay': 'arm',
    'Lưng trên & Vai': 'shoulder',
    'Cánh tay trái': 'arm',
    'Cánh tay phải': 'arm',
    'Cánh tay trái (Sau)': 'arm',
    'Cánh tay phải (Sau)': 'arm',
    forearm: 'forearm',
    'Cẳng tay': 'forearm',
    elbow: 'elbow',
    'Khuỷu tay': 'elbow',
    'Khớp khuỷu': 'elbow',
    'Cùi chỏ': 'elbow',
    hand: 'hand',
    'Bàn tay': 'hand',
    genitals: 'genital',
    'Bộ phận sinh dục': 'genital',
    'Sinh dục': 'genital',
    'Vùng Mông': 'buttock',
    thigh: 'thigh',
    'Đùi': 'thigh',
    'Đùi / Chân trái': 'thigh',
    'Đùi / Chân phải': 'thigh',
    'Bắp chân trái (Sau)': 'calf',
    'Bắp chân phải (Sau)': 'calf',
    knee: 'knee',
    'Đầu gối': 'knee',
    'Khớp gối': 'knee',
    'lower-leg': 'leg',
    'lower leg': 'leg',
    lowerLeg: 'leg',
    'Cẳng chân': 'leg',
    'Bắp chân': 'calf',
    foot: 'foot',
    'Bàn chân': 'foot',
    back: 'back',
    'Lưng': 'back',
    'Lưng trên': 'back',
    'lower-back': 'lower back',
    'lower back': 'lower back',
    lowerBack: 'lower back',
    'Lưng dưới': 'lower back',
    'Thắt lưng': 'lower back',
    'Lưng dưới & Thắt lưng': 'lower back',
    buttocks: 'buttock',
    'Mông': 'buttock',
    anus: 'anus',
    'Hậu môn': 'anus',
};

const resolveInfermedicaKeyword = (regionId: string, gender: 'male' | 'female'): string => {
    if (!regionId) return 'general';
    const trimmed = regionId.trim();

    if (trimmed === 'genitals' || trimmed === 'Bộ phận sinh dục' || trimmed === 'Sinh dục') {
        return gender === 'female' ? 'vagina' : 'penis';
    }

    if (INFERMEDICA_SEARCH_KEYWORDS[trimmed]) {
        return INFERMEDICA_SEARCH_KEYWORDS[trimmed];
    }

    const mapped = PART_KEY_MAPPING[trimmed];
    if (mapped && mapped.length > 0) {
        for (const k of mapped) {
            if (INFERMEDICA_SEARCH_KEYWORDS[k]) return INFERMEDICA_SEARCH_KEYWORDS[k];
        }
    }

    return trimmed.replace(/[-_]/g, ' ');
};

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

    cancelFetchSymptoms: () => void;
    fetchAndMergeSymptoms: (regionId: string, dob?: string) => Promise<void>;
    toggleSymptom: (symptom: SymptomItem) => void;
    parseAndAddSymptoms: (text: string) => Promise<{ addedCount: number }>;
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

    cancelFetchSymptoms: () => {
        activeFetchSessionToken++;
        set({ isApiLoading: false });
    },

    fetchAndMergeSymptoms: async (regionId: string, dob?: string) => {
        const currentSession = ++activeFetchSessionToken;

        const { useKioskStore } = await import('./kioskStore');
        const { useAuthStore } = await import('./authStore');

        const selectedGender = useKioskStore.getState().selectedGender;
        const gender = selectedGender === 'female' ? 'female' : 'male';

        // BƯỚC 1: Lấy ngay triệu chứng có sẵn từ data logic cũ và hiển thị tức thì
        const localSymptoms = getSymptomsForBodyPart(regionId, gender);
        set({ currentRegionSymptoms: localSymptoms });

        const searchKeyword = resolveInfermedicaKeyword(regionId, gender);
        const authDob = useAuthStore.getState().patientInfo?.dob;
        const patientAge = calculateAgeFromDob(dob || authDob);

        // BƯỚC 2: Gọi API tìm thêm triệu chứng từ Infermedica
        set({ isApiLoading: true });
        try {
            const response = await triageService.searchSymptoms(searchKeyword, patientAge);

            // Nếu người dùng đã ngưng xem hoặc bấm đổi sang vùng khác: DỪNG NGAY
            if (currentSession !== activeFetchSessionToken) return;

            if (response && response.status === 'success' && Array.isArray(response.data)) {
                const currentGenderDataset = gender === 'female' ? femaleSymptomDataset : maleSymptomDataset;
                const oppositeGenderDataset = gender === 'female' ? maleSymptomDataset : femaleSymptomDataset;

                // BƯỚC 3: Duyệt từng triệu chứng tiếng Anh, dịch từng từ 1 và đưa dần vào khung
                for (const apiItem of response.data) {
                    // Kiểm tra session trước mỗi bước xử lý
                    if (currentSession !== activeFetchSessionToken) return;
                    if (!apiItem?.id || !apiItem?.label) continue;

                    const apiIdTarget = cleanId(apiItem.id);

                    // Bỏ qua nếu thuộc tập triệu chứng của giới tính đối diện
                    if (findSymptomInDataset(oppositeGenderDataset, apiIdTarget)) continue;

                    // Bỏ qua nếu triệu chứng đã có sẵn trong danh sách hiển thị
                    if (get().currentRegionSymptoms.some((it) => cleanId(it.id) === apiIdTarget)) continue;

                    // Kiểm tra xem triệu chứng này đã có tiếng Việt trong từ điển tĩnh chưa
                    const localInCurrent = findSymptomInDataset(currentGenderDataset, apiIdTarget);
                    const localInCommon = findSymptomInDataset(commonSymptomDataset, apiIdTarget);
                    const matchedLocal = localInCurrent || localInCommon;

                    let translatedVn = matchedLocal?.labelVn;

                    // Nếu chưa có tiếng Việt trong từ điển tĩnh -> Dịch từ tiếng Anh sang tiếng Việt
                    if (!translatedVn) {
                        try {
                            const trans = await fetchGoogleTranslate(apiItem.label);
                            if (trans && trans.trim().toLowerCase() !== apiItem.label.trim().toLowerCase()) {
                                // Viết hoa chữ cái đầu
                                translatedVn = trans.trim().charAt(0).toUpperCase() + trans.trim().slice(1);
                            }
                        } catch (err) {
                            console.warn(`Lỗi dịch triệu chứng [${apiItem.label}]:`, err);
                        }
                    }

                    // Kiểm tra lại session sau khi await dịch xong
                    if (currentSession !== activeFetchSessionToken) return;

                    const finalLabelVn = translatedVn || apiItem.label;

                    const newSymptom: SymptomItem = {
                        id: apiItem.id,
                        labelVn: finalLabelVn,
                        labelEn: apiItem.label,
                        categoryNameVn: 'Mở rộng từ Hệ thống',
                    };

                    // ĐƯA TỪNG TỪ 1 VÀO KHUNG TRIỆU CHỨNG NGAY LẬP TỨC
                    set((state) => {
                        if (currentSession !== activeFetchSessionToken) return state;
                        if (state.currentRegionSymptoms.some((it) => cleanId(it.id) === apiIdTarget)) {
                            return state;
                        }
                        return {
                            currentRegionSymptoms: [...state.currentRegionSymptoms, newSymptom],
                        };
                    });
                }
            }
        } catch (error) {
            console.error('Lỗi khi gọi searchSymptoms:', error);
        } finally {
            if (currentSession === activeFetchSessionToken) {
                set({ isApiLoading: false });
            }
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
                    set({ currentQuestion: question });
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

    parseAndAddSymptoms: async (text: string) => {
        const rawInput = text?.trim();
        if (!rawInput) return { addedCount: 0 };

        const { useKioskStore } = await import('./kioskStore');
        const { useAuthStore } = await import('./authStore');
        const kioskState = useKioskStore.getState();
        const authState = useAuthStore.getState();

        const selectedGender = kioskState.selectedGender;
        const gender = selectedGender === 'female' ? 'female' : 'male';
        const dob = authState.patientInfo?.dob;
        const age = calculateAgeFromDob(dob);

        set({ isApiLoading: true });
        try {
            const res = await triageService.parseSymptoms({
                question: rawInput,
                age,
                sex: gender
            });

            const rawMentions = res?.data?.mentions || (res as any)?.mentions || [];
            const validMentions = Array.isArray(rawMentions)
                ? rawMentions.filter((m: any) => m?.id && String(m.id).startsWith('s_'))
                : [];

            if (validMentions.length === 0) {
                return { addedCount: 0 };
            }

            const current = get().selectedSymptoms;
            const existingIds = new Set(current.map(s => s.id));

            let addedCount = 0;
            const newItems: SymptomItem[] = [];

            validMentions.forEach((m: any) => {
                if (!existingIds.has(m.id)) {
                    existingIds.add(m.id);
                    const viName = m.common_name || m.name || m.orth || m.id;
                    newItems.push({
                        id: m.id,
                        labelVn: viName,
                        labelEn: m.name || viName,
                        categoryNameVn: "Mô tả AI",
                    });
                    addedCount++;
                }
            });

            if (newItems.length > 0) {
                set({ selectedSymptoms: [...current, ...newItems] });
            }

            return { addedCount };
        } catch (error) {
            console.error("Lỗi khi parse triệu chứng ở Kiosk:", error);
            return { addedCount: 0 };
        } finally {
            set({ isApiLoading: false });
        }
    },

    addSymptomsBatch: (symptoms) => set({ selectedSymptoms: symptoms }),

    removeSymptom: (symptomId) => set((s) => ({
        selectedSymptoms: s.selectedSymptoms.filter(s => s.id !== symptomId)
    })),

    setSymptomDuration: (duration) => set({ symptomDuration: duration }),
    setPainLevel: (level) => set({ painLevel: level }),
    setHasEmergency: (emergency) => set({ hasEmergency: emergency })
}));