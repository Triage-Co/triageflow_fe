import { apiClient } from '@/shared/services/apiClient';
import type { Staff, CreateStaffDto, UpdateStaffDto } from '../types/staff.types';

export const staffService = {
    getStaffs: async (token: string) => {
        return apiClient.get<Staff[]>('/api/staff', {
            headers: { Authorization: `Bearer ${token}` },
        });
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
