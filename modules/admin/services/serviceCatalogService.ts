import { apiClient } from '@/shared/services/apiClient';
import type {
    CatalogService,
    CreateServiceReqDto,
    UpdateServiceReqDto,
} from '../types/service.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
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

export const serviceCatalogService = {
    getServices: (token: string, page = 1, limit = 100) =>
        apiClient.get<unknown>(`/api/service?page=${page}&limit=${limit}`, {
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

    deleteService: (id: string, token: string) =>
        apiClient.delete<unknown>(`/api/service/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
