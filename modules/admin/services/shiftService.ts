import { apiClient } from '@/shared/services/apiClient';
import type { ApiResponse } from '@/shared/services/apiClient';
import type {
    BulkImportShiftDto,
    BulkWeeklyResult,
    BulkWeeklyShiftDto,
    QueryShiftParams,
    Shift,
    ShiftListMeta,
    CreateShiftDto,
} from '../types/shift.types';

function buildShiftQuery(params: QueryShiftParams = {}): string {
    const search = new URLSearchParams();
    if (params.date) search.set('date', params.date);
    if (params.from) search.set('from', params.from);
    if (params.to) search.set('to', params.to);
    if (params.room_id) search.set('room_id', params.room_id);
    if (params.staff_id) search.set('staff_id', params.staff_id);
    if (params.page != null) search.set('page', String(params.page));
    if (params.limit != null) search.set('limit', String(params.limit));
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

export type ShiftListResponse = ApiResponse<Shift[]> & { meta: ShiftListMeta };

export const shiftService = {
    getShifts: async (token: string, params: QueryShiftParams = {}): Promise<ShiftListResponse> => {
        const res = await apiClient.get<Shift[]>(`/api/shift${buildShiftQuery(params)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const withMeta = res as ApiResponse<Shift[]> & { meta?: ShiftListMeta };
        return {
            ...withMeta,
            meta: withMeta.meta ?? {
                total: withMeta.data?.length ?? 0,
                page: params.page ?? 1,
                limit: params.limit ?? 100,
            },
        };
    },

    getShiftById: async (id: string, token: string) => {
        return apiClient.get<Shift>(`/api/shift/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    createShift: async (data: CreateShiftDto, token: string) => {
        return apiClient.post<Shift>('/api/shift', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    updateShift: async (id: string, data: Partial<CreateShiftDto>, token: string) => {
        return apiClient.patch<Shift>(`/api/shift/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    deleteShift: async (id: string, token: string) => {
        return apiClient.delete<void>(`/api/shift/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    bulkWeekly: async (data: BulkWeeklyShiftDto, token: string) => {
        return apiClient.post<BulkWeeklyResult>('/api/shift/bulk-weekly', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    bulkImport: async (data: BulkImportShiftDto, token: string) => {
        return apiClient.post<BulkWeeklyResult>('/api/shift/bulk-import', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};
