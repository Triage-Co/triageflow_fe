import type { InfermedicaQuestion, InfermedicaQuestionItem } from '@/modules/reception/types/infermedica.types';

const translationCache = new Map<string, InfermedicaQuestion>();
const symptomLabelCache = new Map<string, string>();

export const COMMON_MEDICAL_TERMS: Record<string, string> = {
    'Yes': 'Có',
    'No': 'Không',
    "Don't know": 'Không rõ',
    'unknown': 'Không rõ',
    'present': 'Có',
    'absent': 'Không',
    'male': 'Nam',
    'female': 'Nữ',
};

/**
 * Dịch thuật miễn phí qua Google Translate Free Endpoint (Không cần API Key)
 */
export async function fetchGoogleTranslate(text: string, from = 'en', to = 'vi'): Promise<string> {
    if (!text || !text.trim()) return '';
    const trimmed = text.trim();

    // Tra cứu từ điển thông dụng trước
    if (COMMON_MEDICAL_TERMS[trimmed]) {
        return COMMON_MEDICAL_TERMS[trimmed];
    }

    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Google Translate status ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
            const translated = data[0].map((item: any) => item?.[0] || '').join('').trim();
            return translated || trimmed;
        }
        return trimmed;
    } catch (err) {
        console.warn('[Google Translate Fallback Error]:', err);
        return trimmed;
    }
}

/**
 * Dịch câu hỏi phỏng vấn Y khoa Infermedica từ Tiếng Anh sang Tiếng Việt bằng Google Translate
 */
export async function translateQuestionWithGoogle(
    question: InfermedicaQuestion,
): Promise<InfermedicaQuestion> {
    if (!question || !question.text) return question;

    const cacheKey = JSON.stringify({
        text: question.text,
        items: question.items?.map((i) => i.name) || [],
    });

    if (translationCache.has(cacheKey)) {
        return translationCache.get(cacheKey)!;
    }

    try {
        // Dịch tiêu đề câu hỏi
        const translatedQuestionText = await fetchGoogleTranslate(question.text);

        // Dịch song song các mục/lựa chọn trong câu hỏi
        const translatedItems: InfermedicaQuestionItem[] = await Promise.all(
            (question.items || []).map(async (item) => {
                const translatedName = await fetchGoogleTranslate(item.name);
                return {
                    ...item,
                    name: translatedName || item.name,
                };
            })
        );

        const translatedQuestion: InfermedicaQuestion = {
            ...question,
            text: translatedQuestionText || question.text,
            items: translatedItems,
        };

        translationCache.set(cacheKey, translatedQuestion);
        return translatedQuestion;
    } catch (err) {
        console.error('[Google Translation Question Error]:', err);
        return question;
    }
}

/**
 * Dịch danh sách các nhãn triệu chứng y khoa từ Tiếng Anh sang Tiếng Việt bằng Google Translate
 */
export async function translateSymptomLabelsWithGoogle(
    items: { id: string; label: string }[],
): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!items || items.length === 0) return result;

    const needTranslate: { id: string; label: string }[] = [];
    items.forEach((item) => {
        if (!item.label) return;
        const cached = symptomLabelCache.get(item.id);
        if (cached) {
            result.set(item.id, cached);
        } else {
            if (typeof window !== 'undefined') {
                try {
                    const localSaved = localStorage.getItem(`symptom_vn_${item.id}`);
                    if (localSaved) {
                        symptomLabelCache.set(item.id, localSaved);
                        result.set(item.id, localSaved);
                        return;
                    }
                } catch {
                    // Ignore storage access errors
                }
            }
            needTranslate.push(item);
        }
    });

    if (needTranslate.length === 0) {
        return result;
    }

    try {
        await Promise.all(
            needTranslate.map(async (item) => {
                const translated = await fetchGoogleTranslate(item.label);
                if (translated) {
                    symptomLabelCache.set(item.id, translated);
                    result.set(item.id, translated);
                    if (typeof window !== 'undefined') {
                        try {
                            localStorage.setItem(`symptom_vn_${item.id}`, translated);
                        } catch {
                            // Ignore storage error
                        }
                    }
                } else {
                    result.set(item.id, item.label);
                }
            })
        );
        return result;
    } catch (err) {
        console.error('[Google Translation Symptom Labels Error]:', err);
        needTranslate.forEach((item) => result.set(item.id, item.label));
        return result;
    }
}
