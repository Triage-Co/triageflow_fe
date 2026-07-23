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
    hasInterviewQuestion,
    isEmergencyTriage,
    mentionsToEvidence,
    mergeMentions,
    normalizeDiagnoseQuestion,
    normalizeRecommendedSpecialist,
    sanitizeEvidenceForApi,
    triageLevelLabel,
} from '@/modules/reception/utils/infermedicaMapper';
import {
    getQuestionType,
    isGroupMultipleQuestion,
    localizeInfermedicaQuestion,
    localizeInfermedicaQuestionAsync,
} from '@/modules/reception/utils/infermedicaInterviewI18n';
import {
    resolveFinalDepartment,
    translateSpecialtyDisplayName,
} from '@/modules/reception/constants/registerDepartments';

/**
 * Luồng chuẩn 5 API Infermedica (Swagger):
 *
 * 1. GET  /search              — gợi ý triệu chứng khi gõ (tuỳ chọn)
 * 2. POST /parse               — text triệu chứng → evidence[] (mentions)
 * 3. POST /diagnoise           — hỏi chẩn đoán lặp:
 *      - lần 1: không có interview_token
 *      - từ câu 2: BẮT BUỘC gửi interview_token (query)
 *      - body luôn: { sex, age, evidence[] } (evidence tích lũy)
 *      - dừng khi: should_stop | hết question | đủ số câu config
 * 4. POST /triage              — mức độ (emergency / consultation / self_care…)
 * 5. POST /recommend_specialist — khoa khám (query: interview_token)
 *
 * patient_anwser chỉ là side-effect BE khi gọi /diagnoise (CCCD) —
 * không phải input để AI chọn chuyên khoa.
 */

export interface SymptomTriageResult {
    session: SymptomTriageSession;
    specialties: ReceptionSpecialty[];
    slots: ReceptionSlot[];
    specialtyId: string;
    departmentId: string;
}

export interface TriageDebugEntry {
    at: string;
    stage: string;
    data: unknown;
}

export type TriageDebugLogger = (stage: string, data: unknown) => void;

function buildPayload(
    gender: Gender,
    dob: string,
    evidence: InfermedicaEvidence[],
): InfermedicaTriagePayload {
    return {
        sex: genderToInfermedicaSex(gender),
        age: dobToAge(dob),
        evidence: sanitizeEvidenceForApi(evidence),
    };
}

function normalizeQuestion(raw?: InfermedicaQuestion | null): InfermedicaQuestion | null {
    if (!raw) return null;
    return normalizeDiagnoseQuestion(raw) ?? raw;
}

function resolveInterviewToken(
    responseToken: string | undefined | null,
    fallbackToken?: string | null,
): string {
    const fromResponse = responseToken?.trim();
    if (fromResponse) return fromResponse;
    return fallbackToken?.trim() ?? '';
}

function tokenPreview(token: string | null | undefined): string | null {
    const t = token?.trim();
    return t ? `${t.slice(0, 24)}…` : null;
}

/**
 * Swagger: interview_token "Nhập từ câu hỏi số 2".
 * - Diagnose #1 (start): không gửi token
 * - Từ lần trả lời câu 1 trở đi (để lấy câu 2+): gửi token đã nhận
 */
function tokenForAnswerDiagnose(sessionToken: string): string | undefined {
    return sessionToken.trim() || undefined;
}

function shouldContinueInterview(
    diagnose: InfermedicaDiagnoseResult | null | undefined,
    questionsAnswered: number,
    requiredQuestions: number,
): InfermedicaQuestion | null {
    if (!diagnose) return null;
    if (diagnose.should_stop) return null;
    if (questionsAnswered >= requiredQuestions && requiredQuestions > 0) return null;
    const question = normalizeQuestion(diagnose.question);
    if (!question || !hasInterviewQuestion(question)) return null;
    return question;
}

async function resolveSymptomEvidence(
    symptoms: string,
    age: number,
    onDebug?: TriageDebugLogger,
): Promise<InfermedicaEvidence[]> {
    const candidates = getSymptomParseCandidates(symptoms);
    let mentions = mergeMentions([]);

    onDebug?.('parse.start', { candidates });

    for (const question of candidates) {
        try {
            const parseRes = await infermedicaService.parseSymptoms({ question, age });
            mentions = mergeMentions([mentions, parseRes.data?.mentions ?? []]);
            onDebug?.('parse.response', {
                question,
                mention_count: parseRes.data?.mentions?.length ?? 0,
                obvious: parseRes.data?.obvious ?? null,
            });
        } catch (err) {
            onDebug?.('parse.error', {
                question,
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }

    let evidence = sanitizeEvidenceForApi(mentionsToEvidence(mentions));

    if (evidence.length === 0) {
        onDebug?.('search.fallback.start', { candidates: [...candidates].reverse() });
        for (const phrase of [...candidates].reverse()) {
            try {
                const searchRes = await infermedicaService.searchSymptoms(phrase, age);
                const items = Array.isArray(searchRes.data) ? searchRes.data : [];
                const top = items.find((item) => item.id?.trim());
                if (top?.id) {
                    evidence = sanitizeEvidenceForApi([{ id: top.id, choice_id: 'present' }]);
                    onDebug?.('search.fallback.hit', { phrase, id: top.id, label: top.label });
                    break;
                }
            } catch {
                /* thử phrase khác */
            }
        }
    }

    if (evidence.length === 0) {
        throw new Error(
            'Không nhận diện được triệu chứng. Hãy mô tả cụ thể hơn (VD: đau đầu, sốt) hoặc thêm tiếng Anh (headache, fever).',
        );
    }

    onDebug?.('evidence.ready', { evidence });
    return evidence;
}

async function ensurePatientForTriage(params: {
    citizenId: string;
    fullName: string;
    dob: string;
    gender: Gender;
    accessToken: string;
    insuranceId?: string;
    phone?: string;
    email?: string;
    knownPatientId?: string | null;
    onDebug?: TriageDebugLogger;
}): Promise<string> {
    const fullName = params.fullName.trim();
    if (!fullName) {
        throw new Error('Hãy nhập họ tên bệnh nhân ở bước 1 trước khi phân tích AI.');
    }
    if (!params.citizenId.trim() || params.citizenId.replace(/\D/g, '').length < 9) {
        throw new Error('Hãy nhập CCCD hợp lệ ở bước 1 trước khi phân tích AI.');
    }
    if (!params.dob) {
        throw new Error('Hãy nhập ngày sinh ở bước 1 trước khi phân tích AI.');
    }
    return receptionService.ensurePatientProfileForTriage(
        {
            citizen_id: params.citizenId.trim(),
            full_name: fullName,
            dob: params.dob,
            gender: params.gender,
            medical_coverage_id: params.insuranceId,
            phone: params.phone,
            email: params.email,
            known_patient_id: params.knownPatientId,
        },
        params.accessToken,
        params.onDebug,
    );
}

async function buildPendingSession(params: {
    interviewToken: string;
    evidence: InfermedicaEvidence[];
    question: InfermedicaQuestion;
    questionsAnswered: number;
    requiredQuestions: number;
    isEmergency?: boolean;
    base?: SymptomTriageSession;
}): Promise<SymptomTriageSession> {
    const { interviewToken, evidence, question, questionsAnswered, requiredQuestions, isEmergency, base } =
        params;
    const localizedQuestion = await localizeInfermedicaQuestionAsync(question);
    return {
        interview_token: interviewToken,
        evidence: sanitizeEvidenceForApi(evidence),
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

async function callDiagnose(params: {
    payload: InfermedicaTriagePayload;
    citizenId: string;
    interviewToken?: string;
    accessToken: string;
    onDebug?: TriageDebugLogger;
    stage?: string;
}): Promise<InfermedicaDiagnoseResult> {
    const { payload, citizenId, interviewToken, accessToken, onDebug, stage = 'diagnose' } = params;
    onDebug?.(`${stage}.request`, {
        endpoint: '/api/infermedica/diagnoise',
        citizen_id: citizenId,
        interview_token: tokenPreview(interviewToken),
        has_interview_token: Boolean(interviewToken?.trim()),
        evidence_count: payload.evidence.length,
        body: payload,
    });

    const res = await infermedicaService.diagnose(
        payload,
        citizenId,
        interviewToken,
        accessToken,
    );

    onDebug?.(`${stage}.response`, {
        code: res.code,
        status: res.status,
        message: res.message,
        should_stop: res.data?.should_stop ?? null,
        has_question: hasInterviewQuestion(res.data?.question),
        interview_token: tokenPreview(res.data?.interview_token),
        question_type: res.data?.question?.type ?? null,
        question_text: res.data?.question?.text ?? null,
        conditions_top: (res.data?.conditions ?? []).slice(0, 3),
    });

    return res.data!;
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

    /**
     * Bước đầu: parse/search → diagnose lần 1 (không bắt buộc token) → câu hỏi 1.
     */
    async startAnalysis(params: {
        symptoms: string;
        citizenId: string;
        fullName: string;
        dob: string;
        gender: Gender;
        accessToken: string;
        insuranceId?: string;
        phone?: string;
        email?: string;
        knownPatientId?: string | null;
        onDebug?: TriageDebugLogger;
    }): Promise<SymptomTriageResult> {
        const {
            symptoms,
            citizenId,
            fullName,
            dob,
            gender,
            accessToken,
            insuranceId,
            phone,
            email,
            knownPatientId,
            onDebug,
        } = params;

        onDebug?.('flow.start', {
            note: 'parse → diagnose#1 → (loop diagnose) → triage → recommend_specialist',
            citizen_id: citizenId,
            known_patient_id: knownPatientId ?? null,
            symptoms,
        });

        await ensurePatientForTriage({
            citizenId,
            fullName,
            dob,
            gender,
            accessToken,
            insuranceId,
            phone,
            email,
            knownPatientId,
            onDebug,
        });

        const citizenIdForApi = citizenId.replace(/\D/g, '');
        const age = dobToAge(dob);
        const sex = genderToInfermedicaSex(gender);
        const requiredQuestions = await infermedicaService.getDiagnosisQuestionCount(accessToken);
        onDebug?.('config.question-count', { requiredQuestions });

        const evidence = await resolveSymptomEvidence(symptoms.trim(), age, onDebug);
        const payload = { sex, age, evidence };

        // Diagnose #1 — chưa có interview_token
        const diagnose = await callDiagnose({
            payload,
            citizenId: citizenIdForApi,
            interviewToken: undefined,
            accessToken,
            onDebug,
            stage: 'diagnose.q1',
        });

        const interviewToken = resolveInterviewToken(diagnose.interview_token);
        const isEmergency = diagnose.has_emergency_evidence ?? false;

        if (requiredQuestions === 0) {
            return finalizeSession({
                payload,
                interviewToken,
                citizenId: citizenIdForApi,
                accessToken,
                requiredQuestions,
                questionsAnswered: 0,
                isEmergency,
                symptoms: symptoms.trim(),
                onDebug,
            });
        }

        const question = shouldContinueInterview(diagnose, 0, requiredQuestions);
        if (!question) {
            // AI không hỏi thêm — kết thúc sớm bằng triage + recommend
            if (interviewToken) {
                return finalizeSession({
                    payload,
                    interviewToken,
                    citizenId: citizenIdForApi,
                    accessToken,
                    requiredQuestions,
                    questionsAnswered: 0,
                    isEmergency,
                    symptoms: symptoms.trim(),
                    onDebug,
                });
            }
            throw new Error(
                'Hệ thống AI chưa trả câu hỏi phỏng vấn. Thử mô tả triệu chứng chi tiết hơn (VD: đau tay phải, sưng, sốt kèm theo).',
            );
        }

        onDebug?.('interview.pending', {
            questions_answered: 0,
            required: requiredQuestions,
            interview_token: tokenPreview(interviewToken),
            question_type: question.type,
        });

        return {
            session: await buildPendingSession({
                interviewToken,
                evidence,
                question,
                questionsAnswered: 0,
                requiredQuestions,
                isEmergency,
            }),
            specialties: [],
            slots: [],
            specialtyId: '',
            departmentId: '',
        };
    },

    /**
     * Trả lời 1 lựa chọn → cộng evidence → diagnose tiếp (có token từ câu 2).
     * group_multiple: gom đủ item trong batch rồi mới gọi diagnose.
     */
    async answerQuestion(params: {
        session: SymptomTriageSession;
        citizenId: string;
        fullName: string;
        dob: string;
        gender: Gender;
        accessToken: string;
        symptoms: string;
        insuranceId?: string;
        phone?: string;
        email?: string;
        knownPatientId?: string | null;
        onDebug?: TriageDebugLogger;
        itemId: string;
        choiceId: string;
    }): Promise<SymptomTriageResult> {
        const {
            session,
            citizenId,
            fullName,
            dob,
            gender,
            accessToken,
            symptoms,
            insuranceId,
            phone,
            email,
            knownPatientId,
            onDebug,
            itemId,
            choiceId,
        } = params;

        const pendingQuestion = session.pending_question;
        const questionType = pendingQuestion ? getQuestionType(pendingQuestion) : 'single';
        // group_single: user chọn 1 item → gửi item đó với choice_id=present
        const resolvedChoiceId = questionType === 'group_single' ? 'present' : choiceId;

        const evidence: InfermedicaEvidence[] = sanitizeEvidenceForApi([
            ...session.evidence,
            { id: itemId, choice_id: resolvedChoiceId },
        ]);

        onDebug?.('answer.apply', {
            question_type: questionType,
            item_id: itemId,
            choice_id: resolvedChoiceId,
            evidence_count: evidence.length,
            questions_answered_before: session.questions_answered,
            interview_token: tokenPreview(session.interview_token),
        });

        // group_multiple: trả lời từng item trên UI, chưa gọi API
        const itemIndex = session.pending_item_index ?? 0;
        const hasMoreItemsInBatch =
            pendingQuestion != null &&
            isGroupMultipleQuestion(pendingQuestion) &&
            itemIndex < pendingQuestion.items.length - 1;

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

        await ensurePatientForTriage({
            citizenId,
            fullName,
            dob,
            gender,
            accessToken,
            insuranceId,
            phone,
            email,
            knownPatientId,
            onDebug,
        });

        const citizenIdForApi = citizenId.replace(/\D/g, '');
        const payload = buildPayload(gender, dob, evidence);
        const questionsAnswered = session.questions_answered + 1;
        const requiredQuestions = session.required_questions;

        // Trả lời câu 1 → lấy câu 2: bắt đầu gửi interview_token (Swagger)
        const tokenToSend = tokenForAnswerDiagnose(session.interview_token);

        if (session.questions_answered >= 1 && !tokenToSend) {
            throw new Error(
                'Thiếu interview_token cho câu hỏi tiếp theo. Hãy bấm Phân tích AI lại từ đầu.',
            );
        }

        const diagnose = await callDiagnose({
            payload,
            citizenId: citizenIdForApi,
            interviewToken: tokenToSend,
            accessToken,
            onDebug,
            stage: `diagnose.q${questionsAnswered + 1}`,
        });

        const interviewToken = resolveInterviewToken(
            diagnose.interview_token,
            session.interview_token,
        );
        const isEmergency =
            session.is_emergency || (diagnose.has_emergency_evidence ?? false);

        const nextQuestion = shouldContinueInterview(
            diagnose,
            questionsAnswered,
            requiredQuestions,
        );

        if (nextQuestion) {
            onDebug?.('interview.continue', {
                questions_answered: questionsAnswered,
                required: requiredQuestions,
                interview_token: tokenPreview(interviewToken),
                next_type: nextQuestion.type,
            });
            return {
                session: await buildPendingSession({
                    interviewToken,
                    evidence,
                    question: nextQuestion,
                    questionsAnswered,
                    requiredQuestions,
                    isEmergency,
                    base: session,
                }),
                specialties: [],
                slots: [],
                specialtyId: '',
                departmentId: session.recommended_department_id ?? '',
            };
        }

        onDebug?.('interview.done', {
            questions_answered: questionsAnswered,
            required: requiredQuestions,
            should_stop: diagnose.should_stop ?? null,
            interview_token: tokenPreview(interviewToken),
        });

        return finalizeSession({
            payload,
            interviewToken,
            citizenId: citizenIdForApi,
            accessToken,
            requiredQuestions,
            questionsAnswered,
            isEmergency,
            symptoms,
            onDebug,
        });
    },

    /** Đồng bộ lại diagnoise trước booking (giữ token mới nhất). */
    async persistDiagnosisForBooking(params: {
        citizenId: string;
        dob: string;
        gender: Gender;
        evidence: InfermedicaEvidence[];
        interviewToken: string;
    }): Promise<string> {
        const payload = buildPayload(params.gender, params.dob, params.evidence);
        const trimmed = params.interviewToken.trim();
        if (!trimmed) return '';
        try {
            const res = await infermedicaService.diagnose(
                payload,
                params.citizenId.replace(/\D/g, ''),
                trimmed,
            );
            return resolveInterviewToken(res.data?.interview_token, trimmed);
        } catch {
            return trimmed;
        }
    },
};

async function resolveRecommendedSpecialist(params: {
    payload: InfermedicaTriagePayload;
    interviewToken: string;
    accessToken: string;
    onDebug?: TriageDebugLogger;
}): Promise<{
    recommended: ReturnType<typeof normalizeRecommendedSpecialist>;
    resolvedToken: string;
}> {
    const { payload, interviewToken, accessToken, onDebug } = params;
    const trimmedToken = interviewToken.trim();
    if (!trimmedToken) {
        onDebug?.('recommend.skip', { reason: 'missing interview_token' });
        return { recommended: null, resolvedToken: '' };
    }

    onDebug?.('recommend.request', {
        endpoint: '/api/infermedica/recommend_specialist',
        interview_token: tokenPreview(trimmedToken),
        evidence_count: payload.evidence.length,
    });

    try {
        const recommendRes = await infermedicaService.recommendSpecialist(
            payload,
            trimmedToken,
            accessToken,
        );
        const recommended = normalizeRecommendedSpecialist(recommendRes.data);
        onDebug?.('recommend.response', { recommended });
        return { recommended, resolvedToken: trimmedToken };
    } catch (err) {
        onDebug?.('recommend.error', {
            message: err instanceof Error ? err.message : String(err),
        });
        return { recommended: null, resolvedToken: trimmedToken };
    }
}

async function finalizeSession(params: {
    payload: InfermedicaTriagePayload;
    interviewToken: string;
    citizenId: string;
    accessToken: string;
    requiredQuestions: number;
    questionsAnswered: number;
    isEmergency?: boolean;
    symptoms: string;
    onDebug?: TriageDebugLogger;
}): Promise<SymptomTriageResult> {
    const {
        payload,
        interviewToken,
        accessToken,
        requiredQuestions,
        questionsAnswered,
        isEmergency,
        symptoms,
        onDebug,
    } = params;

    onDebug?.('finalize.start', {
        evidence_count: payload.evidence.length,
        interview_token: tokenPreview(interviewToken),
        questions_answered: questionsAnswered,
    });

    // 4) triage — mức độ ưu tiên
    onDebug?.('triage.request', {
        endpoint: '/api/infermedica/triage',
        body: payload,
    });
    const triageRes = await infermedicaService.getTriageLevel(payload, accessToken);
    const triageLevel = triageRes.data?.triage_level ?? null;
    onDebug?.('triage.response', {
        triage_level: triageLevel,
        root_cause: triageRes.data?.root_cause ?? null,
    });

    // 5) recommend_specialist — cần interview_token
    const { recommended, resolvedToken } = await resolveRecommendedSpecialist({
        payload,
        interviewToken,
        accessToken,
        onDebug,
    });

    const emergency =
        isEmergency || isEmergencyTriage(triageRes.data ?? { triage_level: triageLevel ?? '' });

    const dept = resolveFinalDepartment({
        recommended,
        triageLevel,
        isEmergency: emergency,
        symptoms,
    });

    const displayRecommended = recommended
        ? {
              ...recommended,
              name: dept.label ?? translateSpecialtyDisplayName(recommended.name),
          }
        : null;

    let routingNote: string | null = null;

    if (!recommended && !routingNote) {
        routingNote = 'AI chưa gợi ý được chuyên khoa — đã chọn khoa theo mức độ / triệu chứng.';
    }

    onDebug?.('finalize.done', {
        department_id: dept.id,
        department_label: dept.label,
        triage_level: triageLevel,
        recommended: displayRecommended,
    });

    return {
        session: {
            interview_token: resolvedToken || interviewToken,
            evidence: payload.evidence,
            triage_level: triageLevel,
            triage_label: triageLevelLabel(triageLevel),
            recommended_specialist: displayRecommended,
            pending_question: null,
            pending_item_index: 0,
            recommended_department_id: dept.id,
            recommended_department_label: dept.label,
            is_analyzed: true,
            is_emergency: emergency,
            questions_answered: questionsAnswered,
            required_questions: requiredQuestions,
            routing_note: routingNote,
        },
        specialties: [],
        slots: [],
        specialtyId: '',
        departmentId: dept.id,
    };
}
