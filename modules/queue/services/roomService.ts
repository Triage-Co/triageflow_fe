import { apiClient } from '@/shared/services/apiClient';

export interface BackendRoom {
    room_id: string;
    room_name: string;
    room_type: string;
    specialty_id?: string;
    specialty?: {
        specialty_id: string;
        specialty_code: string;
        specialty_name: string;
    };
}

export interface SpecialtyGroup {
    specialtyId: string;
    specialtyName: string;
    rooms: BackendRoom[];
}

export const roomService = {
    /**
     * GET /api/room — Lấy danh sách toàn bộ phòng khám
     */
    async getRooms(): Promise<BackendRoom[]> {
        try {
            const res = await apiClient.get<BackendRoom[]>('/api/room', {
                suppressLogError: true,
            });
            if (res?.data && Array.isArray(res.data)) return res.data;
            if (Array.isArray(res)) return res as BackendRoom[];
            return [];
        } catch {
            return [];
        }
    },

    /**
     * Lấy danh sách phòng đã nhóm theo khoa (specialty)
     */
    async getRoomsBySpecialty(): Promise<SpecialtyGroup[]> {
        const rooms = await this.getRooms();
        const map = new Map<string, SpecialtyGroup>();

        for (const room of rooms) {
            const specId = room.specialty?.specialty_id || room.specialty_id || 'OTHER';
            const specName = room.specialty?.specialty_name || 'KHOA KHÁM BỆNH GIA ĐÌNH';

            if (!map.has(specId)) {
                map.set(specId, {
                    specialtyId: specId,
                    specialtyName: specName,
                    rooms: [],
                });
            }
            map.get(specId)!.rooms.push(room);
        }

        return Array.from(map.values()).sort((a, b) =>
            a.specialtyName.localeCompare(b.specialtyName, 'vi'),
        );
    },
};
