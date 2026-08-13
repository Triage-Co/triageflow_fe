import { apiClient } from '@/shared/services/apiClient';
import type { HospitalRoom, CreateRoomDto, UpdateRoomDto, Specialty } from '../types/room.types';
import { extractSpecialtyList } from './specialtyService';

interface PaginatedMeta {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}

const ROOM_PAGE_SIZE = 100;

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function normalizeRoom(raw: unknown): HospitalRoom | null {
    const rec = asRecord(raw);
    if (!rec) return null;
    const specialty = asRecord(rec.specialty);
    const roomId = String(rec.room_id || rec.id || '').trim();
    const roomName = String(rec.room_name || rec.name || '').trim();
    if (!roomId && !roomName) return null;
    return {
        room_id: roomId || roomName,
        room_name: roomName || roomId,
        physical_room_id:
            typeof rec.physical_room_id === 'string' ? rec.physical_room_id : null,
        specialty_id: String(
            rec.specialty_id || specialty?.specialty_id || ''
        ).trim(),
        specialty: specialty
            ? ({
                  specialty_id: String(specialty.specialty_id || ''),
                  specialty_code: String(specialty.specialty_code || ''),
                  specialty_name: String(specialty.specialty_name || ''),
                  description:
                      typeof specialty.description === 'string'
                          ? specialty.description
                          : null,
                  createdAt: String(specialty.createdAt || ''),
                  updatedAt: String(specialty.updatedAt || ''),
              } as Specialty)
            : undefined,
        room_type: typeof rec.room_type === 'string' ? rec.room_type : null,
    };
}

export function extractRoomList(data: unknown): HospitalRoom[] {
    if (Array.isArray(data)) {
        return data.map(normalizeRoom).filter((r): r is HospitalRoom => Boolean(r));
    }
    const rec = asRecord(data);
    if (!rec) return [];
    const nested = rec.items ?? rec.rooms ?? rec.data ?? rec.results;
    if (Array.isArray(nested)) {
        return nested.map(normalizeRoom).filter((r): r is HospitalRoom => Boolean(r));
    }
    return [];
}

export const roomService = {
    getRooms: async (token: string) => {
        const headers = { Authorization: `Bearer ${token}` };
        const firstPage = await apiClient.get<unknown>(
            `/api/room?page=1&limit=${ROOM_PAGE_SIZE}`,
            { headers }
        );
        const firstPageWithMeta = firstPage as typeof firstPage & {
            meta?: PaginatedMeta;
        };

        const rooms = extractRoomList(firstPage.data);
        const totalPages = firstPageWithMeta.meta?.totalPages ?? 1;

        for (let page = 2; page <= totalPages; page += 1) {
            const nextPage = await apiClient.get<unknown>(
                `/api/room?page=${page}&limit=${ROOM_PAGE_SIZE}`,
                { headers }
            );
            rooms.push(...extractRoomList(nextPage.data));
        }

        const byId = new Map<string, HospitalRoom>();
        for (const room of rooms) {
            if (!byId.has(room.room_id)) byId.set(room.room_id, room);
        }

        return {
            ...firstPage,
            data: [...byId.values()],
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
        const res = await apiClient.get<unknown>('/api/specialty?limit=500', {
            headers: { Authorization: `Bearer ${token}` },
        });
        const extracted = extractSpecialtyList(res.data);
        return {
            ...res,
            data: extracted.data,
        };
    },
};
