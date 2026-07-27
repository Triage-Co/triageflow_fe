import { apiClient } from '@/shared/services/apiClient';
import type { Shift, CreateShiftDto } from '../types/shift.types';

export const shiftService = {
    getShifts: async (token: string) => {
        return apiClient.get<Shift[]>('/api/shift', {
            headers: { Authorization: `Bearer ${token}` },
        });
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
};
