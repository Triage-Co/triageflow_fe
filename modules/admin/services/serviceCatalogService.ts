import { apiClient } from '@/shared/services/apiClient';
import type {
    CatalogService,
    CreateServiceReqDto,
    QueryServiceParams,
    UpdateServiceReqDto,
} from '../types/service.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export interface ServicePaginationMeta {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}

export function extractServiceList(raw: unknown): CatalogService[] {
    if (Array.isArray(raw)) return raw as CatalogService[];
    const root = asRecord(raw);
    if (!root) return [];
    if (Array.isArray(root.data)) return root.data as CatalogService[];
    if (Array.isArray(root.items)) return root.items as CatalogService[];
    const nested = asRecord(root.data);
    if (nested && Array.isArray(nested.data)) return nested.data as CatalogService[];
    if (nested && Array.isArray(nested.items)) return nested.items as CatalogService[];
    return [];
}

export function extractServiceMeta(raw: unknown): ServicePaginationMeta | undefined {
    const root = asRecord(raw);
    if (!root) return undefined;
    if (root.meta) return root.meta as ServicePaginationMeta;
    const nested = asRecord(root.data);
    if (nested?.meta) return nested.meta as ServicePaginationMeta;
    return undefined;
}

function buildQuery(params: QueryServiceParams = {}): string {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.service_type) search.set('service_type', String(params.service_type));
    if (params.room_type) search.set('room_type', String(params.room_type));
    if (params.is_active !== undefined) search.set('is_active', String(params.is_active));
    if (params.search?.trim()) search.set('search', params.search.trim());
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

export const serviceCatalogService = {
    getServices: (token: string, params: QueryServiceParams = {}) =>
        apiClient.get<unknown>(`/api/service${buildQuery({ page: 1, limit: 200, ...params })}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getServiceById: (id: string, token: string) =>
        apiClient.get<unknown>(`/api/service/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createService: (body: CreateServiceReqDto, token: string) =>
        apiClient.post<unknown>('/api/service', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateService: (id: string, body: UpdateServiceReqDto, token: string) =>
        apiClient.patch<unknown>(`/api/service/${id}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** Soft-disable (BE maps this to `is_active=false`, never a hard delete). */
    deleteService: (id: string, token: string) =>
        apiClient.delete<unknown>(`/api/service/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
