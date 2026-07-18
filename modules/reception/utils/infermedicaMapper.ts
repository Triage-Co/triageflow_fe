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

const VI_TO_ENGLISH_SYMPTOM: Array<{ pattern: RegExp; english: string }> = [
    { pattern: /đau\s*mắt|dau\s*mat|nhức\s*mắt|nhuc\s*mat|mỏi\s*mắt|moi\s*mat|mắt\s*đau|mat\s*dau/i, english: 'eye pain' },
    { pattern: /đau\s*tay|dau\s*tay|đau\s*bàn\s*tay|dau\s*ban\s*tay/i, english: 'pain in hand' },
    { pattern: /đau\s*chân|dau\s*chan|đau\s*bàn\s*chân|dau\s*ban\s*chan/i, english: 'foot pain' },
    { pattern: /đau\s*đầu|dau\s*dau|nhức\s*đầu|nhuc\s*dau/i, english: 'headache' },
    { pattern: /sốt|sot|bị\s*sốt|bi\s*sot/i, english: 'fever' },
    { pattern: /\bho\b|ho\s*khan|ho\s*đờm|ho\s*dom/i, english: 'cough' },
    { pattern: /đau\s*bụng|dau\s*bung|đau\s*dạ\s*dày|dau\s*da\s*day/i, english: 'abdominal pain' },
    { pattern: /đau\s*ngực|dau\s*nguc/i, english: 'chest pain' },
    { pattern: /chóng\s*mặt|chong\s*mat|choáng\s*váng|choang\s*vang/i, english: 'dizziness' },
    { pattern: /mệt\s*mỏi|met\s*moi|\bmệt\b|\bmet\b|kiệt\s*sức|kiet\s*suc/i, english: 'fatigue' },
    { pattern: /buồn\s*nôn|buon\s*non|\bnôn\b|\bnon\b|ói\b|\boi\b/i, english: 'nausea' },
    { pattern: /tiêu\s*chảy|tieu\s*chay/i, english: 'diarrhea' },
    { pattern: /táo\s*bón|tao\s*bon/i, english: 'constipation' },
    { pattern: /đau\s*cổ|dau\s*co/i, english: 'neck pain' },
    { pattern: /đau\s*lưng|dau\s*lung/i, english: 'back pain' },
    { pattern: /đau\s*răng|dau\s*rang/i, english: 'toothache' },
    { pattern: /đau\s*tai|dau\s*tai/i, english: 'ear pain' },
    { pattern: /khó\s*thở|kho\s*tho|thở\s*khó|tho\s*kho/i, english: 'shortness of breath' },
    { pattern: /đau\s*họng|dau\s*hong/i, english: 'sore throat' },
    { pattern: /chảy\s*mũi|chay\s*mui|sổ\s*mũi|so\s*mui/i, english: 'runny nose' },
    { pattern: /phát\s*ban|phat\s*ban|mẩn\s*ngứa|man\s*ngua|ngứa|ngua/i, english: 'skin rash' },
    { pattern: /mất\s*ngủ|mat\s*ngu|khó\s*ngủ|kho\s*ngu/i, english: 'insomnia' },
    { pattern: /đau\s*cơ|dau\s*co|đau\s*nhức\s*cơ|dau\s*nhuc\s*co/i, english: 'muscle pain' },
    { pattern: /khó\s*nuốt|kho\s*nuot/i, english: 'difficulty swallowing' },
];

/** Infermedica parse nhận tiếng Anh tốt hơn — thử thêm bản dịch gợi ý từ tiếng Việt. */
export function getSymptomParseCandidates(symptoms: string): string[] {
    const trimmed = symptoms.trim();
    if (!trimmed) return [];

    const candidates = new Set<string>([trimmed]);
    for (const { pattern, english } of VI_TO_ENGLISH_SYMPTOM) {
        if (pattern.test(trimmed)) candidates.add(english);
    }
    return [...candidates];
}

export function mergeMentions(mentionsList: InfermedicaMention[][]): InfermedicaMention[] {
    const byId = new Map<string, InfermedicaMention>();
    for (const mentions of mentionsList) {
        for (const mention of mentions) {
            if (mention.id) byId.set(mention.id, mention);
        }
    }
    return [...byId.values()];
}

/** BE trả specialty_code (SP_1), không phải id Infermedica (sp_22). */
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
