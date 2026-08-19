import { apiClient } from '@/shared/services/apiClient';
import type { QuestionLimitConfig } from '../types/triageConfig.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function extractQuestionLimit(raw: unknown): QuestionLimitConfig | null {
    const root = asRecord(raw);
    if (!root) return null;
    const nested = asRecord(root.data) ?? root;
    const value = nested.number_of_diagnosis;
    if (typeof value === 'number' && Number.isFinite(value)) {
        return { number_of_diagnosis: value };
    }
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return { number_of_diagnosis: parsed };
    }
    return null;
}

export const triageConfigService = {
    getQuestionLimit: (token: string) =>
        apiClient.get<unknown>('/api/infermedica/question-limit', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateQuestionLimit: (number_of_diagnosis: number, token: string) =>
        apiClient.patch<unknown>(
            '/api/infermedica/question-limit',
            { number_of_diagnosis },
            { headers: { Authorization: `Bearer ${token}` } }
        ),
};
