import type {
    InfermedicaDiagnoseResult,
    InfermedicaEvidence,
    InfermedicaMention,
    InfermedicaQuestion,
    InfermedicaQuestionChoice,
    InfermedicaQuestionItem,
    InfermedicaRecommendedSpecialist,
    InfermedicaTriageResult,
} from '@/modules/reception/types/infermedica.types';
import type { Gender } from '@/shared/types/auth.types';

export function dobToAge(dob: string): number {
    if (!dob) return 30;
    const birth = new Date(dob);
    if (Number.isNaN(birth.getTime())) return 30;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age -= 1;
    }
    return age > 0 ? age : 1;
}

export function genderToInfermedicaSex(gender: Gender): string {
    if (gender === 'MALE') return 'male';
    if (gender === 'FEMALE') return 'female';
    return 'male';
}

export function mentionsToEvidence(mentions: InfermedicaMention[]): InfermedicaEvidence[] {
    return mentions
        .filter((m) => m.id)
        .map((m) => ({
            id: m.id,
            choice_id: (m.choice_id as InfermedicaEvidence['choice_id']) || 'present',
        }));
}

/** BE chỉ nhận { id, choice_id } — loại bỏ source và mọi field thừa. */
export function sanitizeEvidenceForApi(evidence: InfermedicaEvidence[]): InfermedicaEvidence[] {
    return evidence
        .filter((item) => Boolean(item?.id?.trim()))
        .map((item) => ({
            id: String(item.id).trim(),
            choice_id: item.choice_id || 'present',
        }));
}

export function normalizeRecommendedSpecialist(
    data: unknown,
): InfermedicaRecommendedSpecialist | null {
    if (!data || typeof data !== 'object') return null;

    const root = data as Record<string, unknown>;
    const raw = (root.recommended_specialist ?? root) as Record<string, unknown>;
    if (!raw || typeof raw !== 'object') return null;

    const name = String(raw.name ?? raw.specialty_name ?? '').trim();
    const specialtyCode = String(raw.specialty_code ?? raw.id ?? '').trim();
    const specialtyId = String(raw.specialty_id ?? specialtyCode).trim();

    if (!name && !specialtyCode && !specialtyId) return null;

    return {
        id: specialtyCode || specialtyId || undefined,
        specialty_id: specialtyId || undefined,
        specialty_code: specialtyCode || undefined,
        name: name || specialtyCode || specialtyId,
    };
}

export function getRecommendedSpecialtyCode(
    specialist: InfermedicaRecommendedSpecialist | null | undefined,
): string {
    if (!specialist) return '';
    return specialist.specialty_code ?? specialist.id ?? specialist.specialty_id ?? '';
}

export function triageLevelLabel(level: string | null | undefined): string | null {
    if (!level) return null;
    const map: Record<string, string> = {
        emergency: 'Khẩn cấp',
        emergency_ambulance: 'Khẩn cấp — cần xe cấp cứu',
        consultation: 'Cần khám bác sĩ',
        consultation_24: 'Cần khám bác sĩ trong 24 giờ',
        consultation_12: 'Cần khám bác sĩ trong 12 giờ',
        self_care: 'Tự chăm sóc tại nhà',
    };
    if (map[level]) return map[level];
    if (level.startsWith('consultation')) return 'Cần khám bác sĩ';
    if (level.startsWith('emergency')) return 'Khẩn cấp';
    if (level.startsWith('self_care')) return 'Tự chăm sóc tại nhà';
    return level;
}

export function isEmergencyTriage(result: InfermedicaTriageResult): boolean {
    if (result.triage_level === 'emergency') return true;
    return result.serious?.some((s) => s.is_emergency) ?? false;
}

const DEFAULT_QUESTION_CHOICES: InfermedicaQuestionChoice[] = [
    { id: 'present', label: 'Yes' },
    { id: 'absent', label: 'No' },
    { id: 'unknown', label: "Don't know" },
];

function normalizeQuestionChoice(raw: unknown): InfermedicaQuestionChoice | null {
    if (!raw || typeof raw !== 'object') return null;
    const choice = raw as Record<string, unknown>;
    const id = String(choice.id ?? choice.choice_id ?? '').trim();
    if (!id) return null;
    const label = String(choice.label ?? choice.name ?? choice.text ?? id).trim();
    return { id, label };
}

function normalizeQuestionItem(raw: unknown): InfermedicaQuestionItem | null {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    const id = String(item.id ?? item.symptom_id ?? item.concept_id ?? '').trim();
    if (!id) return null;
    const name = String(item.name ?? item.text ?? item.common_name ?? item.label ?? '').trim();
    const rawChoices = Array.isArray(item.choices)
        ? item.choices
        : Array.isArray(item.answers)
          ? item.answers
          : [];
    const choices = rawChoices
        .map(normalizeQuestionChoice)
        .filter((choice): choice is InfermedicaQuestionChoice => choice !== null);
    return {
        id,
        name: name || id,
        choices: choices.length > 0 ? choices : DEFAULT_QUESTION_CHOICES,
    };
}

/** Chuẩn hóa câu hỏi phỏng vấn — BE/Infermedica có thể trả items, answers hoặc dạng phẳng. */
export function normalizeDiagnoseQuestion(raw: unknown): InfermedicaQuestion | null {
    if (!raw || typeof raw !== 'object') return null;
    const source = raw as Record<string, unknown>;

    if (source.question && typeof source.question === 'object') {
        return normalizeDiagnoseQuestion(source.question);
    }

    const type = String(source.type ?? 'single');
    const text = String(source.text ?? source.name ?? '').trim();
    const items: InfermedicaQuestionItem[] = [];

    if (Array.isArray(source.items) && source.items.length > 0) {
        for (const item of source.items) {
            const normalized = normalizeQuestionItem(item);
            if (normalized) items.push(normalized);
        }
    } else if (source.id) {
        const normalized = normalizeQuestionItem(source);
        if (normalized) items.push(normalized);
    }

    if (items.length === 0) return null;
    return {
        type,
        text: text || items[0].name,
        items,
    };
}

/** Chuẩn hóa kết quả diagnose — unwrap nested data và question. */
export function normalizeDiagnoseResult(raw: unknown): InfermedicaDiagnoseResult | null {
    if (!raw || typeof raw !== 'object') return null;
    const root = raw as Record<string, unknown>;
    const data =
        root.data && typeof root.data === 'object' && !Array.isArray(root.data)
            ? (root.data as Record<string, unknown>)
            : root;

    const interviewToken = String(
        data.interview_token ?? data.interviewToken ?? root.interview_token ?? '',
    ).trim();
    const question = normalizeDiagnoseQuestion(data.question ?? data.next_question);

    const conditions = Array.isArray(data.conditions) ? data.conditions : undefined;

    return {
        interview_token: interviewToken,
        question: question ?? undefined,
        conditions: conditions as InfermedicaDiagnoseResult['conditions'],
        has_emergency_evidence: Boolean(
            data.has_emergency_evidence ?? data.hasEmergencyEvidence ?? false,
        ),
        should_stop: Boolean(data.should_stop ?? data.shouldStop ?? false),
    };
}

export function hasInterviewQuestion(question?: InfermedicaQuestion | null): boolean {
    return Boolean(question?.items?.some((item) => item.choices.length > 0));
}
