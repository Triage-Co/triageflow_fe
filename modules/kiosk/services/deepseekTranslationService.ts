import { InfermedicaQuestion } from '../types/triage.types';

export interface TranslationResult {
  translatedQuestion: InfermedicaQuestion;
  error?: string;
}

export const deepseekTranslationService = {
  translateQuestion: async (question: InfermedicaQuestion): Promise<InfermedicaQuestion> => {
    if (!question) return question;

    const payload = {
      text: question.text || '',
      items: (question.items || []).map((item) => ({
        id: item.id,
        name: item.name
      }))
    };

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || `Lỗi HTTP ${response.status} khi gọi bộ dịch DeepSeek`);
    }

    const { translatedText, translatedItems } = result.data || {};

    const itemMap = new Map<string, string>();
    if (Array.isArray(translatedItems)) {
      translatedItems.forEach((it: { id: string; name: string }) => {
        if (it.id && it.name) {
          itemMap.set(it.id, it.name);
        }
      });
    }

    // Clone & update question object
    const updatedQuestion: InfermedicaQuestion = {
      ...question,
      text: translatedText || question.text,
      items: (question.items || []).map((item) => ({
        ...item,
        name: itemMap.get(item.id) || item.name
      }))
    };

    return updatedQuestion;
  }
};
