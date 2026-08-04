import { apiClient } from '@/shared/services/apiClient';
import type {
    CreateServiceOrderReqDto,
    ServiceOrder,
    UpdateServiceOrderReqDto,
} from '../types/serviceOrder.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function extractServiceOrderList(raw: unknown): ServiceOrder[] {
    if (Array.isArray(raw)) return raw as ServiceOrder[];
    const root = asRecord(raw);
    if (!root) return [];
    if (Array.isArray(root.data)) return root.data as ServiceOrder[];
    if (Array.isArray(root.items)) return root.items as ServiceOrder[];
    const nested = asRecord(root.data);
    if (nested && Array.isArray(nested.data)) return nested.data as ServiceOrder[];
    if (nested && Array.isArray(nested.items)) return nested.items as ServiceOrder[];
    return [];
}

export const serviceOrderService = {
    createOrder: (body: CreateServiceOrderReqDto, token: string) =>
        apiClient.post<unknown>('/api/service-order', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getOrders: (token: string, page = 1, limit = 100) =>
        apiClient.get<unknown>(`/api/service-order?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPendingByPatientId: (patientId: string, token: string) =>
        apiClient.get<unknown>(`/api/service-order/pending/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getOrderById: (id: string, token: string) =>
        apiClient.get<unknown>(`/api/service-order/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateOrder: (id: string, body: UpdateServiceOrderReqDto, token: string) =>
        apiClient.patch<unknown>(`/api/service-order/${id}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteOrder: (id: string, token: string) =>
        apiClient.delete<unknown>(`/api/service-order/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
