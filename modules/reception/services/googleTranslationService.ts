import type { InfermedicaQuestion, InfermedicaQuestionItem } from '@/modules/reception/types/infermedica.types';

export const COMMON_MEDICAL_TERMS: Record<string, string> = {
    Yes: 'Có',
    No: 'Không',
    "Don't know": 'Không rõ',
    present: 'Có',
    absent: 'Không',
    unknown: 'Không rõ',
};

const translationMemoryCache = new Map<string, string>();

/**
 * Dịch một đoạn văn bản/nhãn y tế từ Tiếng Anh sang Tiếng Việt
 */
export async function fetchGoogleTranslate(text: string, from = 'en', to = 'vi'): Promise<string> {
    const trimmed = text?.trim() ?? '';
    if (!trimmed) return '';

    // Nếu đã là tiếng Việt thì giữ nguyên
    const isVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(trimmed);
    if (isVietnamese) return trimmed;

    // 1. Kiểm tra từ điển thông dụng
    if (COMMON_MEDICAL_TERMS[trimmed]) {
        return COMMON_MEDICAL_TERMS[trimmed];
    }

    // 2. Kiểm tra cache RAM
    if (translationMemoryCache.has(trimmed.toLowerCase())) {
        return translationMemoryCache.get(trimmed.toLowerCase())!;
    }

    // 3. Kiểm tra localStorage
    if (typeof window !== 'undefined') {
        try {
            const localSaved = localStorage.getItem(`trans_${trimmed.toLowerCase()}`);
            if (localSaved) {
                translationMemoryCache.set(trimmed.toLowerCase(), localSaved);
                return localSaved;
            }
        } catch {
            // Bỏ qua lỗi storage
        }
    }

    // 4. Thử qua Google Chrome Extension API (clients5 - siêu nhanh, không rate-limit)
    try {
        const mirrorUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${from}&tl=${to}&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(mirrorUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            },
        });
        if (res.ok) {
            const data = await res.json();
            let translated = '';
            if (Array.isArray(data) && typeof data[0] === 'string') {
                translated = data[0].trim();
            } else if (typeof data === 'string') {
                translated = data.trim();
            }
            if (translated) {
                translationMemoryCache.set(trimmed.toLowerCase(), translated);
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.setItem(`trans_${trimmed.toLowerCase()}`, translated);
                    } catch {}
                }
                return translated;
            }
        }
    } catch {
        // Fallback sang endpoint tiếp theo
    }

    // 5. Thử qua Google Translate GTX API
    try {
        const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(trimmed)}`;
        const res = await fetch(gtxUrl);
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && Array.isArray(data[0])) {
                const translated = data[0].map((item: any) => item?.[0] || '').join('').trim();
                if (translated) {
                    translationMemoryCache.set(trimmed.toLowerCase(), translated);
                    if (typeof window !== 'undefined') {
                        try {
                            localStorage.setItem(`trans_${trimmed.toLowerCase()}`, translated);
                        } catch {}
                    }
                    return translated;
                }
            }
        }
    } catch (err) {
        console.warn('[Google Translate Fallback Error]:', err);
    }

    return trimmed;
}

export async function translateQuestionWithGoogle(
    question: InfermedicaQuestion,
): Promise<InfermedicaQuestion> {
    if (!question || !question.text) return question;

    try {
        const translatedQuestionText = await fetchGoogleTranslate(question.text);
        const translatedItems: InfermedicaQuestionItem[] = await Promise.all(
            (question.items || []).map(async (item) => {
                const translatedName = await fetchGoogleTranslate(item.name);
                return {
                    ...item,
                    name: translatedName || item.name,
                };
            })
        );

        return {
            ...question,
            text: translatedQuestionText || question.text,
            items: translatedItems,
        };
    } catch (err) {
        console.error('[Google Translation Question Error]:', err);
        return question;
    }
}

export async function translateSymptomLabelsWithGoogle(
    items: Array<{ id: string; label: string }>,
): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!items || items.length === 0) return result;

    await Promise.all(
        items.map(async (item) => {
            if (!item.label) return;
            const translated = await fetchGoogleTranslate(item.label);
            result.set(item.id, translated || item.label);
        })
    );

    return result;
}
