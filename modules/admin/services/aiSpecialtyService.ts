import { apiClient } from '@/shared/services/apiClient';
import type { PaginationMeta } from '../types/specialty.types';
import type {
    AiSpecialty,
    AiSpecialtyMapping,
    CreateAiSpecialtyDto,
    CreateAiSpecialtyMappingDto,
    QueryAiSpecialtyParams,
    UpdateAiSpecialtyDto,
    UpdateAiSpecialtyMappingDto,
} from '../types/aiSpecialty.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function extractAiSpecialtyList(raw: unknown): { data: AiSpecialty[]; meta?: PaginationMeta } {
    if (Array.isArray(raw)) return { data: raw as AiSpecialty[] };
    const root = asRecord(raw);
    if (!root) return { data: [] };
    if (Array.isArray(root.data)) {
        return { data: root.data as AiSpecialty[], meta: root.meta as PaginationMeta | undefined };
    }
    const nested = asRecord(root.data);
    if (nested && Array.isArray(nested.data)) {
        return { data: nested.data as AiSpecialty[], meta: nested.meta as PaginationMeta | undefined };
    }
    return { data: [] };
}

export function extractAiSpecialtyMappings(raw: unknown): AiSpecialtyMapping[] {
    if (Array.isArray(raw)) return raw as AiSpecialtyMapping[];
    const root = asRecord(raw);
    if (!root) return [];
    if (Array.isArray(root.data)) return root.data as AiSpecialtyMapping[];
    const nested = asRecord(root.data);
    if (nested && Array.isArray(nested.data)) return nested.data as AiSpecialtyMapping[];
    return [];
}

function buildQuery(params: QueryAiSpecialtyParams = {}): string {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.is_active !== undefined) search.set('is_active', String(params.is_active));
    if (params.search?.trim()) search.set('search', params.search.trim());
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

export const aiSpecialtyService = {
    getAiSpecialties: (token: string, params: QueryAiSpecialtyParams = {}) =>
        apiClient.get<unknown>(`/api/ai-specialty${buildQuery(params)}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createAiSpecialty: (body: CreateAiSpecialtyDto, token: string) =>
        apiClient.post<AiSpecialty>('/api/ai-specialty', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateAiSpecialty: (id: string, body: UpdateAiSpecialtyDto, token: string) =>
        apiClient.patch<AiSpecialty>(`/api/ai-specialty/${id}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteAiSpecialty: (id: string, token: string) =>
        apiClient.delete<AiSpecialty>(`/api/ai-specialty/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getMappings: (aiSpecialtyId: string, token: string) =>
        apiClient.get<unknown>(`/api/ai-specialty/${aiSpecialtyId}/mappings`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createMapping: (aiSpecialtyId: string, body: CreateAiSpecialtyMappingDto, token: string) =>
        apiClient.post<AiSpecialtyMapping>(`/api/ai-specialty/${aiSpecialtyId}/mappings`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateMapping: (
        aiSpecialtyId: string,
        mappingId: string,
        body: UpdateAiSpecialtyMappingDto,
        token: string
    ) =>
        apiClient.patch<AiSpecialtyMapping>(
            `/api/ai-specialty/${aiSpecialtyId}/mappings/${mappingId}`,
            body,
            { headers: { Authorization: `Bearer ${token}` } }
        ),

    deleteMapping: (aiSpecialtyId: string, mappingId: string, token: string) =>
        apiClient.delete<AiSpecialtyMapping>(
            `/api/ai-specialty/${aiSpecialtyId}/mappings/${mappingId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        ),
};
