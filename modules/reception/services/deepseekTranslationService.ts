import type { InfermedicaQuestion, InfermedicaQuestionItem } from '@/modules/reception/types/infermedica.types';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * System Prompt chuẩn hóa thuật ngữ Y khoa chuyên ngành cho DeepSeek AI
 */
export const DEEPSEEK_MEDICAL_SYSTEM_PROMPT = `
Bạn là Bác sĩ Chuyên khoa Trực tiếp nhận & Phân loại Bệnh nhân (Clinical Triage Specialist & Medical Interpreter) tại bệnh viện đa khoa, có kinh nghiệm chuyên sâu về thuật ngữ Y học Lâm sàng.

Nhiệm vụ của bạn: Dịch các câu hỏi sàng lọc triệu chứng y khoa và lựa chọn đáp án từ Tiếng Anh sang Tiếng Việt.

YÊU CẦU QUAN TRỌNG:
1. THUẬT NGỮ Y HỌC LÂM SÀNG CHUẨN: Sử dụng từ ngữ y khoa Việt Nam chuẩn xác và phổ biến tại các bệnh viện (Ví dụ: Dyspnea -> Khó thở, Chest pain -> Đau ngực / Đau thắt ngực, Palpitations -> Hồi hộp đánh trống ngực, Syncope -> Mất ý thức tạm thời / Ngất, Paresthesia -> Tê bì cảm giác, Nausea -> Buồn nôn, Vertigo -> Chóng mặt nhói đầu, Abdominal distension -> Chướng bụng, Jaundice -> Vàng da).
2. DỄ HIỂU VỚI BỆNH NHÂN: Diễn đạt câu hỏi thân thiện, rõ ràng, lịch sự giúp bệnh nhân dễ hiểu và tự đánh giá chính xác tình trạng cơ thể.
3. GIỮ NGUYÊN ĐỊNH DẠNG JSON: Trả về kết quả đúng cấu trúc JSON được yêu cầu, không thêm bất kỳ văn bản bọc ngoài hay ký tự Markdown.
`;

const translationCache = new Map<string, InfermedicaQuestion>();

function getApiKey(): string | null {
    return (
        process.env.DEEPSEEK_API_KEY ||
        process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY ||
        'sk-4f3454aa8b2f45dba6f3a50a6b974309'
    );
}

/**
 * Dịch câu hỏi phỏng vấn Y khoa Infermedica từ Tiếng Anh sang Tiếng Việt chuẩn y khoa bằng DeepSeek AI
 */
export async function translateQuestionWithDeepSeek(
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

    const apiKey = getApiKey();
    if (!apiKey) {
        return question;
    }

    const payload = {
        model: 'deepseek-chat',
        messages: [
            {
                role: 'system',
                content: DEEPSEEK_MEDICAL_SYSTEM_PROMPT,
            },
            {
                role: 'user',
                content: `Hãy dịch câu hỏi y khoa sau sang Tiếng Việt chuẩn y khoa.

Dữ liệu đầu vào:
${JSON.stringify({
    text: question.text,
    items: question.items?.map((item) => ({ id: item.id, name: item.name })) || [],
})}

Hãy trả về duy nhất 1 JSON object có định dạng:
{
  "text": "Câu hỏi bằng tiếng Việt chuẩn y khoa",
  "items": [
    { "id": "mã_item", "name": "Tên triệu chứng/lựa chọn bằng tiếng Việt" }
  ]
}`,
            },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
    };

    try {
        const res = await fetch(DEEPSEEK_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            console.warn(`[DeepSeek API Error] Status ${res.status}`);
            return question;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) return question;

        const parsed = JSON.parse(content);
        if (!parsed.text) return question;

        const itemsMap = new Map<string, string>();
        if (Array.isArray(parsed.items)) {
            parsed.items.forEach((it: any) => {
                if (it.id && it.name) itemsMap.set(it.id, it.name);
            });
        }

        const translatedItems: InfermedicaQuestionItem[] = (question.items || []).map((item) => ({
            ...item,
            name: itemsMap.get(item.id) || item.name,
        }));

        const translatedQuestion: InfermedicaQuestion = {
            ...question,
            text: parsed.text,
            items: translatedItems,
        };

        translationCache.set(cacheKey, translatedQuestion);
        return translatedQuestion;
    } catch (err) {
        console.error('[DeepSeek Translation Error]:', err);
        return question;
    }
}
