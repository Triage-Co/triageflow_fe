import { infermedicaService } from '@/modules/reception/services/infermedicaService';
import { receptionService } from '@/modules/reception/services/receptionService';
import type {
    InfermedicaDiagnoseResult,
    InfermedicaEvidence,
    InfermedicaQuestion,
    InfermedicaRecommendedSpecialist,
    InfermedicaSearchItem,
    InfermedicaTriagePayload,
    SymptomTriageSession,
} from '@/modules/reception/types/infermedica.types';
import type { ReceptionSlot, ReceptionSpecialty } from '@/modules/reception/types/reception.types';
import type { Gender } from '@/shared/types/auth.types';
import {
    dobToAge,
    genderToInfermedicaSex,
    getSymptomParseCandidates,
    isEmergencyTriage,
    mentionsToEvidence,
    mergeMentions,
    normalizeRecommendedSpecialist,
    triageLevelLabel,
} from '@/modules/reception/utils/infermedicaMapper';
import { localizeInfermedicaQuestion } from '@/modules/reception/utils/infermedicaInterviewI18n';
import {
    resolveFinalDepartment,
    translateSpecialtyDisplayName,
} from '@/modules/reception/constants/registerDepartments';

export interface SymptomTriageResult {
    session: SymptomTriageSession;
    specialties: ReceptionSpecialty[];
    slots: ReceptionSlot[];
    specialtyId: string;
    /** Khoa được AI chọn — luôn có sau khi phân tích xong */
    departmentId: string;
}

function buildPayload(
    gender: Gender,
    dob: string,
    evidence: InfermedicaEvidence[],
): InfermedicaTriagePayload {
    return {
        sex: genderToInfermedicaSex(gender),
        age: dobToAge(dob),
        evidence,
    };
}

function hasFollowUpQuestion(question?: InfermedicaQuestion): boolean {
    return Boolean(question?.items?.length);
}

function isInterviewComplete(questionsAnswered: number, requiredQuestions: number): boolean {
    return questionsAnswered >= requiredQuestions;
}

async function resolveSymptomEvidence(symptoms: string, age: number): Promise<InfermedicaEvidence[]> {
    const candidates = getSymptomParseCandidates(symptoms);
    let mentions = mergeMentions([]);

    for (const question of candidates) {
        const parseRes = await infermedicaService.parseSymptoms({ question, age });
        mentions = mergeMentions([mentions, parseRes.data?.mentions ?? []]);
    }

    const evidence = mentionsToEvidence(mentions);
    if (evidence.length === 0) {
        throw new Error(
            'Không nhận diện được triệu chứng. Hãy mô tả cụ thể hơn hoặc thêm tiếng Anh (VD: pain in hand, headache and fever).',
        );
    }

    return evidence;
}

function buildPendingSession(params: {
    interviewToken: string;
    evidence: InfermedicaEvidence[];
    question: InfermedicaQuestion;
    questionsAnswered: number;
    requiredQuestions: number;
    isEmergency?: boolean;
    base?: SymptomTriageSession;
}): SymptomTriageSession {
    const { interviewToken, evidence, question, questionsAnswered, requiredQuestions, isEmergency, base } =
        params;
    const localizedQuestion = localizeInfermedicaQuestion(question);
    return {
        interview_token: interviewToken,
        evidence,
        triage_level: null,
        triage_label: null,
        recommended_specialist: null,
        pending_question: localizedQuestion,
        pending_item_index: 0,
        recommended_department_id: base?.recommended_department_id ?? null,
        recommended_department_label: base?.recommended_department_label ?? null,
        is_analyzed: false,
        is_emergency: isEmergency ?? base?.is_emergency ?? false,
        questions_answered: questionsAnswered,
        required_questions: requiredQuestions,
    };
}

function resolveInterviewToken(
    responseToken: string | undefined | null,
    fallbackToken?: string | null,
): string {
    const fromResponse = responseToken?.trim();
    if (fromResponse) return fromResponse;
    return fallbackToken?.trim() ?? '';
}

function isDiagnoseFinished(data?: InfermedicaDiagnoseResult | null): boolean {
    if (!data) return true;
    if (data.should_stop) return true;
    return !hasFollowUpQuestion(data.question);
}

async function resolveNextQuestion(params: {
    payload: InfermedicaTriagePayload;
    evidence: InfermedicaEvidence[];
    citizenId: string;
    interviewToken: string;
    diagnoseData?: InfermedicaDiagnoseResult | null;
    isEmergency: boolean;
}): Promise<{
    question: InfermedicaQuestion | null;
    interviewToken: string;
    isEmergency: boolean;
}> {
    const { payload, evidence, citizenId, interviewToken, diagnoseData, isEmergency } = params;
    const fullPayload = { ...payload, evidence };

    if (!isDiagnoseFinished(diagnoseData)) {
        return {
            question: diagnoseData!.question!,
            interviewToken: resolveInterviewToken(diagnoseData?.interview_token, interviewToken),
            isEmergency: isEmergency || (diagnoseData?.has_emergency_evidence ?? false),
        };
    }

    const syncedToken = (
        await infermedicaService.syncInterviewToken(fullPayload, citizenId, interviewToken)
    ).trim();
    const tokenForRetry = syncedToken || interviewToken;

    if (tokenForRetry) {
        const retryRes = await infermedicaService.diagnose(fullPayload, citizenId, tokenForRetry);
        const retryToken = resolveInterviewToken(retryRes.data?.interview_token, tokenForRetry);
        const retryEmergency =
            isEmergency || (retryRes.data?.has_emergency_evidence ?? false);

        if (!isDiagnoseFinished(retryRes.data)) {
            return {
                question: retryRes.data!.question!,
                interviewToken: retryToken,
                isEmergency: retryEmergency,
            };
        }

        return { question: null, interviewToken: retryToken, isEmergency: retryEmergency };
    }

    return { question: null, interviewToken, isEmergency };
}

async function persistDiagnosisForBooking(params: {
    payload: InfermedicaTriagePayload;
    citizenId: string;
    interviewToken: string;
}): Promise<string> {
    const trimmedToken = params.interviewToken.trim();
    if (!trimmedToken) return '';

    try {
        const res = await infermedicaService.diagnose(
            params.payload,
            params.citizenId,
            trimmedToken,
        );
        if (res.status === 'error' || (typeof res.code === 'number' && res.code >= 400)) {
            return trimmedToken;
        }
        return resolveInterviewToken(res.data?.interview_token, trimmedToken);
    } catch {
        return trimmedToken;
    }
}

function resolveRecommendedDepartment(
    recommended: InfermedicaRecommendedSpecialist | null,
    triageLevel: string | null,
    isEmergency: boolean,
    symptoms: string,
) {
    const dept = resolveFinalDepartment({
        recommended,
        triageLevel,
        isEmergency,
        symptoms,
    });
    return {
        departmentId: dept.id,
        departmentLabel: dept.label,
    };
}

export const symptomTriageService = {
    async searchSymptoms(phrase: string, age: number): Promise<InfermedicaSearchItem[]> {
        if (phrase.trim().length < 2) return [];
        try {
            const res = await infermedicaService.searchSymptoms(phrase, age);
            const data = res.data;
            return Array.isArray(data) ? data : [];
        } catch {
            return [];
        }
    },

    async startAnalysis(params: {
        symptoms: string;
        citizenId: string;
        dob: string;
        gender: Gender;
        accessToken: string;
    }): Promise<SymptomTriageResult> {
        const { symptoms, citizenId, dob, gender, accessToken } = params;
        const age = dobToAge(dob);
        const sex = genderToInfermedicaSex(gender);
        const requiredQuestions = await infermedicaService.getDiagnosisQuestionCount(accessToken);
        const evidence = await resolveSymptomEvidence(symptoms.trim(), age);

        const diagnoseRes = await infermedicaService.diagnose({ sex, age, evidence }, citizenId);
        const interviewToken = resolveInterviewToken(diagnoseRes.data?.interview_token);

        if (requiredQuestions === 0) {
            return finalizeSession({
                sex,
                age,
                evidence,
                interviewToken,
                citizenId,
                accessToken,
                requiredQuestions,
                questionsAnswered: 0,
                isEmergency: diagnoseRes.data?.has_emergency_evidence ?? false,
                symptoms: symptoms.trim(),
            });
        }

        if (!hasFollowUpQuestion(diagnoseRes.data?.question)) {
            throw new Error(
                'Hệ thống AI chưa trả câu hỏi phỏng vấn. Thử mô tả triệu chứng chi tiết hơn (VD: đau tay phải, sưng, sốt kèm theo).',
            );
        }

        return {
            session: buildPendingSession({
                interviewToken,
                evidence,
                question: diagnoseRes.data!.question!,
                questionsAnswered: 0,
                requiredQuestions,
                isEmergency: diagnoseRes.data?.has_emergency_evidence ?? false,
            }),
            specialties: [],
            slots: [],
            specialtyId: '',
            departmentId: '',
        };
    },

    async answerQuestion(params: {
        session: SymptomTriageSession;
        citizenId: string;
        dob: string;
        gender: Gender;
        accessToken: string;
        symptoms: string;
        itemId: string;
        choiceId: string;
    }): Promise<SymptomTriageResult> {
        const { session, citizenId, dob, gender, accessToken, symptoms, itemId, choiceId } = params;
        const evidence: InfermedicaEvidence[] = [
            ...session.evidence,
            { id: itemId, choice_id: choiceId },
        ];
        const itemIndex = session.pending_item_index ?? 0;
        const pendingQuestion = session.pending_question;
        const hasMoreItemsInBatch =
            pendingQuestion != null && itemIndex < pendingQuestion.items.length - 1;

        if (hasMoreItemsInBatch) {
            return {
                session: {
                    ...session,
                    evidence,
                    pending_item_index: itemIndex + 1,
                },
                specialties: [],
                slots: [],
                specialtyId: '',
                departmentId: session.recommended_department_id ?? '',
            };
        }

        const payload = buildPayload(gender, dob, evidence);
        const questionsAnswered = session.questions_answered + 1;
        const requiredQuestions = session.required_questions;

        const diagnoseRes = await infermedicaService.diagnose(
            { ...payload, evidence },
            citizenId,
            session.interview_token || undefined,
        );
        const interviewToken = resolveInterviewToken(
            diagnoseRes.data?.interview_token,
            session.interview_token,
        );
        const isEmergency =
            session.is_emergency || (diagnoseRes.data?.has_emergency_evidence ?? false);

        if (!isInterviewComplete(questionsAnswered, requiredQuestions)) {
            const next = await resolveNextQuestion({
                payload,
                evidence,
                citizenId,
                interviewToken,
                diagnoseData: diagnoseRes.data,
                isEmergency,
            });

            if (next.question) {
                return {
                    session: buildPendingSession({
                        interviewToken: next.interviewToken,
                        evidence,
                        question: next.question,
                        questionsAnswered,
                        requiredQuestions,
                        isEmergency: next.isEmergency,
                        base: session,
                    }),
                    specialties: [],
                    slots: [],
                    specialtyId: '',
                    departmentId: session.recommended_department_id ?? '',
                };
            }

            return finalizeSession({
                sex: payload.sex,
                age: payload.age,
                evidence,
                interviewToken: next.interviewToken,
                citizenId,
                accessToken,
                requiredQuestions,
                questionsAnswered,
                isEmergency: next.isEmergency,
                endedEarly: true,
                symptoms,
            });
        }

        return finalizeSession({
            sex: payload.sex,
            age: payload.age,
            evidence,
            interviewToken,
            citizenId,
            accessToken,
            requiredQuestions,
            questionsAnswered,
            isEmergency,
            symptoms,
        });
    },

    /** Đồng bộ lại diagnoise để BE lưu chuẩn đoán trước khi gọi booking/recommend */
    async persistDiagnosisForBooking(params: {
        citizenId: string;
        dob: string;
        gender: Gender;
        evidence: InfermedicaEvidence[];
        interviewToken: string;
    }): Promise<string> {
        const payload = buildPayload(params.gender, params.dob, params.evidence);
        return persistDiagnosisForBooking({
            payload,
            citizenId: params.citizenId,
            interviewToken: params.interviewToken,
        });
    },
};

async function resolveRecommendedSpecialist(params: {
    payload: InfermedicaTriagePayload;
    citizenId: string;
    interviewToken: string;
    accessToken: string;
}): Promise<{
    recommended: ReturnType<typeof normalizeRecommendedSpecialist>;
    routingNote: string | null;
    resolvedToken: string;
}> {
    const { payload, citizenId, interviewToken, accessToken } = params;
    const trimmedToken = interviewToken.trim();

    if (!trimmedToken) {
        return {
            recommended: null,
            routingNote: null,
            resolvedToken: '',
        };
    }

    async function tryRecommend(token: string) {
        const recommendRes = await infermedicaService.recommendSpecialist(
            payload,
            token,
            accessToken,
        );
        return normalizeRecommendedSpecialist(recommendRes.data);
    }

    // Thử token hiện tại, sau đó luôn đồng bộ qua diagnoise và thử lại.
    try {
        const recommended = await tryRecommend(trimmedToken);
        if (recommended) {
            return { recommended, routingNote: null, resolvedToken: trimmedToken };
        }
    } catch {
        /* đồng bộ rồi thử lại */
    }

    const syncedToken = (
        await infermedicaService.syncInterviewToken(payload, citizenId, trimmedToken)
    ).trim();
    const tokenForRetry = syncedToken || trimmedToken;

    try {
        const recommended = await tryRecommend(tokenForRetry);
        if (recommended) {
            return { recommended, routingNote: null, resolvedToken: tokenForRetry };
        }
    } catch {
        /* không gợi ý được */
    }

    return {
        recommended: null,
        routingNote: null,
        resolvedToken: tokenForRetry,
    };
}

async function finalizeSession(params: {
    sex: string;
    age: number;
    evidence: InfermedicaEvidence[];
    interviewToken: string;
    citizenId: string;
    accessToken: string;
    requiredQuestions: number;
    questionsAnswered: number;
    isEmergency?: boolean;
    endedEarly?: boolean;
    symptoms: string;
}): Promise<SymptomTriageResult> {
    const {
        sex,
        age,
        evidence,
        interviewToken,
        citizenId,
        accessToken,
        requiredQuestions,
        questionsAnswered,
        isEmergency,
        symptoms,
    } = params;
    const payload = { sex, age, evidence };

    const bookingToken = await persistDiagnosisForBooking({
        payload,
        citizenId,
        interviewToken,
    });
    const tokenForRecommend = bookingToken || interviewToken;

    const triageRes = await infermedicaService.getTriageLevel(payload);

    const { recommended, routingNote, resolvedToken } = await resolveRecommendedSpecialist({
        payload,
        citizenId,
        interviewToken: tokenForRecommend,
        accessToken,
    });

    const triageLevel = triageRes.data?.triage_level ?? null;
    const emergency = isEmergency || isEmergencyTriage(triageRes.data ?? { triage_level: triageLevel ?? '' });

    let specialtyRoutingNote = routingNote;

    const { departmentId, departmentLabel } = resolveRecommendedDepartment(
        recommended,
        triageLevel,
        emergency,
        symptoms,
    );
    const displayRecommended = recommended
        ? {
              ...recommended,
              name: departmentLabel ?? translateSpecialtyDisplayName(recommended.name),
          }
        : null;

    let specialties: ReceptionSpecialty[] = [];
    try {
        specialties = await receptionService.getSpecialties(accessToken);
    } catch {
        specialtyRoutingNote =
            specialtyRoutingNote ?? 'Không tải được danh sách bác sĩ — vui lòng chọn chuyên khoa thủ công.';
    }

    return {
        session: {
            interview_token: bookingToken || resolvedToken || interviewToken,
            evidence,
            triage_level: triageLevel,
            triage_label: triageLevelLabel(triageLevel),
            recommended_specialist: displayRecommended,
            pending_question: null,
            pending_item_index: 0,
            recommended_department_id: departmentId,
            recommended_department_label: departmentLabel,
            is_analyzed: true,
            is_emergency: emergency,
            questions_answered: questionsAnswered,
            required_questions: requiredQuestions,
            routing_note: specialtyRoutingNote,
        },
        specialties,
        slots: [],
        specialtyId: '',
        departmentId,
    };
}
