import { apiClient } from '@/shared/services/apiClient';
import type {
    CreateMedicineDto,
    Medicine,
    MedicineListMeta,
    QueryMedicineParams,
    UpdateMedicineDto,
} from '../types/medicine.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function pickListAndMeta(node: Record<string, unknown> | null): { data: Medicine[]; meta?: MedicineListMeta } | null {
    if (!node || !Array.isArray(node.data)) return null;
    return { data: node.data as Medicine[], meta: node.meta as MedicineListMeta | undefined };
}

/**
 * `GET /api/medicine` responds with a flat `{ data, meta }` body (no `{code,status,data}`
 * envelope), so `apiClient.get`'s return value itself already has `.data`/`.meta` at the
 * top level — this also tolerates a future wrapped `{ code, data: { data, meta } }` shape.
 */
export function extractMedicineList(raw: unknown): { data: Medicine[]; meta?: MedicineListMeta } {
    if (Array.isArray(raw)) return { data: raw as Medicine[] };
    const root = asRecord(raw);
    if (!root) return { data: [] };
    return pickListAndMeta(root) || pickListAndMeta(asRecord(root.data)) || { data: [] };
}

function buildQuery(params: QueryMedicineParams = {}): string {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.is_active !== undefined) search.set('is_active', String(params.is_active));
    if (params.search?.trim()) search.set('search', params.search.trim());
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

export const medicineAdminService = {
    getMedicines: (token: string, params: QueryMedicineParams = {}) =>
        apiClient.get<unknown>(`/api/medicine${buildQuery(params)}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getMedicineById: (id: string, token: string) =>
        apiClient.get<Medicine>(`/api/medicine/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createMedicine: (body: CreateMedicineDto, token: string) =>
        apiClient.post<Medicine>('/api/medicine', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateMedicine: (id: string, body: UpdateMedicineDto, token: string) =>
        apiClient.patch<Medicine>(`/api/medicine/${id}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** Soft-disable via DELETE; BE returns 409 if the medicine still has prescription detail refs. */
    deleteMedicine: (id: string, token: string) =>
        apiClient.delete<Medicine>(`/api/medicine/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    restoreMedicine: (id: string, token: string) =>
        apiClient.patch<Medicine>(`/api/medicine/${id}/restore`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
