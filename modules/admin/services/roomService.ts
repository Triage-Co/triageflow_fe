import { apiClient } from '@/shared/services/apiClient';
import type { HospitalRoom, CreateRoomDto, UpdateRoomDto } from '../types/room.types';

export const roomService = {
    getRooms: async (token: string) => {
        return apiClient.get<HospitalRoom[]>('/api/room', {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    getRoomById: async (id: string, token: string) => {
        return apiClient.get<HospitalRoom>(`/api/room/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    createRoom: async (data: CreateRoomDto, token: string) => {
        return apiClient.post<HospitalRoom>('/api/room', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    updateRoom: async (id: string, data: UpdateRoomDto, token: string) => {
        return apiClient.patch<HospitalRoom>(`/api/room/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    deleteRoom: async (id: string, token: string) => {
        return apiClient.delete<void>(`/api/room/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};
