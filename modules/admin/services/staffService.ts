import { apiClient } from '@/shared/services/apiClient';
import type { Staff, CreateStaffDto, UpdateStaffDto, QueryStaffParams } from '../types/staff.types';

function buildStaffQuery(params: QueryStaffParams = {}): string {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.is_active !== undefined) search.set('is_active', String(params.is_active));
    if (params.search?.trim()) search.set('search', params.search.trim());
    if (params.role?.trim() && params.role !== 'ALL') search.set('role', params.role.trim());
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

function extractStaffList(raw: unknown): Staff[] {
    if (Array.isArray(raw)) return raw as Staff[];
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data as Staff[];
        if (Array.isArray(obj.staffs)) return obj.staffs as Staff[];
        if (Array.isArray(obj.items)) return obj.items as Staff[];
        if (obj.data && typeof obj.data === 'object') {
            const nested = obj.data as Record<string, unknown>;
            if (Array.isArray(nested.data)) return nested.data as Staff[];
            if (Array.isArray(nested.staffs)) return nested.staffs as Staff[];
            if (Array.isArray(nested.items)) return nested.items as Staff[];
        }
    }
    return [];
}

export const staffService = {
    getStaffs: async (token: string, params: QueryStaffParams = {}) => {
        const res = await apiClient.get<unknown>(`/api/staff${buildStaffQuery(params)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const list = extractStaffList(res?.data);
        return {
            ...res,
            data: list,
        };
    },

    getStaffById: async (id: string, token: string) => {
        return apiClient.get<Staff>(`/api/staff/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    createStaff: async (data: CreateStaffDto, token: string) => {
        return apiClient.post<Staff>('/api/staff', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    updateStaff: async (id: string, data: UpdateStaffDto, token: string) => {
        return apiClient.patch<Staff>(`/api/staff/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    deleteStaff: async (id: string, token: string) => {
        return apiClient.delete<void>(`/api/staff/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};

