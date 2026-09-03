import type { InfermedicaQuestion } from '@/modules/reception/types/infermedica.types';

/**
 * FE không còn gọi Google Translate — BE/Infermedica đã trả tiếng Việt.
 * Các hàm giữ signature cũ nhưng chỉ passthrough.
 */

export const COMMON_MEDICAL_TERMS: Record<string, string> = {
    Yes: 'Có',
    No: 'Không',
    "Don't know": 'Không rõ',
    present: 'Có',
    absent: 'Không',
    unknown: 'Không rõ',
};

export async function fetchGoogleTranslate(text: string, _from = 'en', _to = 'vi'): Promise<string> {
    const trimmed = text?.trim() ?? '';
    if (!trimmed) return '';
    return COMMON_MEDICAL_TERMS[trimmed] ?? trimmed;
}

export async function translateQuestionWithGoogle(
    question: InfermedicaQuestion,
): Promise<InfermedicaQuestion> {
    return question;
}

export async function translateSymptomLabelsWithGoogle(
    items: Array<{ id: string; label: string }>,
): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    items.forEach((item) => {
        result.set(item.id, item.label);
    });
    return result;
}
