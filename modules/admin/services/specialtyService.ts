import { apiClient } from '@/shared/services/apiClient';
import type {
    CreateSpecialtyDto,
    PaginationMeta,
    QuerySpecialtyParams,
    Specialty,
    UpdateSpecialtyDto,
} from '../types/specialty.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function extractSpecialtyList(raw: unknown): { data: Specialty[]; meta?: PaginationMeta } {
    if (Array.isArray(raw)) return { data: raw as Specialty[] };
    const root = asRecord(raw);
    if (!root) return { data: [] };
    const rootList = root.data ?? root.items ?? root.specialties ?? root.results;
    if (Array.isArray(rootList)) {
        return { data: rootList as Specialty[], meta: root.meta as PaginationMeta | undefined };
    }
    const nested = asRecord(root.data);
    if (nested) {
        const nestedList = nested.data ?? nested.items ?? nested.specialties ?? nested.results;
        if (Array.isArray(nestedList)) {
            return { data: nestedList as Specialty[], meta: (nested.meta || root.meta) as PaginationMeta | undefined };
        }
    }
    return { data: [] };
}

function buildQuery(params: QuerySpecialtyParams = {}): string {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.is_active !== undefined) search.set('is_active', String(params.is_active));
    if (params.search?.trim()) search.set('search', params.search.trim());
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

export const specialtyService = {
    getSpecialties: (token: string, params: QuerySpecialtyParams = {}) =>
        apiClient.get<unknown>(`/api/specialty${buildQuery(params)}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getSpecialtyById: (id: string, token: string) =>
        apiClient.get<Specialty>(`/api/specialty/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createSpecialty: (body: CreateSpecialtyDto, token: string) =>
        apiClient.post<Specialty>('/api/specialty', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateSpecialty: (id: string, body: UpdateSpecialtyDto, token: string) =>
        apiClient.patch<Specialty>(`/api/specialty/${id}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** Soft-disable via DELETE; BE returns 409 if the specialty still has Room/Staff/Rule refs. */
    deleteSpecialty: (id: string, token: string) =>
        apiClient.delete<Specialty>(`/api/specialty/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
