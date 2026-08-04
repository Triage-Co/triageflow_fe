import { apiClient } from '@/shared/services/apiClient';
import type { HospitalRoom, CreateRoomDto, UpdateRoomDto, Specialty } from '../types/room.types';

interface PaginatedMeta {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}

const ROOM_PAGE_SIZE = 100;

export const roomService = {
    getRooms: async (token: string) => {
        const headers = { Authorization: `Bearer ${token}` };
        const firstPage = await apiClient.get<HospitalRoom[]>(`/api/room?page=1&limit=${ROOM_PAGE_SIZE}`, {
            headers,
        });
        const firstPageWithMeta = firstPage as typeof firstPage & { meta?: PaginatedMeta };

        const rooms = [...(firstPage.data || [])];
        const totalPages = firstPageWithMeta.meta?.totalPages ?? 1;

        for (let page = 2; page <= totalPages; page += 1) {
            const nextPage = await apiClient.get<HospitalRoom[]>(`/api/room?page=${page}&limit=${ROOM_PAGE_SIZE}`, {
                headers,
            });

            rooms.push(...(nextPage.data || []));
        }

        return {
            ...firstPage,
            data: rooms,
        };
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

    getSpecialties: async (token: string) => {
        return apiClient.get<Specialty[]>('/api/specialty', {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};
