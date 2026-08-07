import { apiClient } from '@/shared/services/apiClient';
import type {
    CreateRoomServiceDto,
    RoomServiceMapping,
    UpdateRoomServiceDto,
} from '../types/roomService.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function extractRoomServiceList(raw: unknown): RoomServiceMapping[] {
    if (Array.isArray(raw)) return raw as RoomServiceMapping[];
    const root = asRecord(raw);
    if (!root) return [];
    if (Array.isArray(root.data)) return root.data as RoomServiceMapping[];
    const nested = asRecord(root.data);
    if (nested && Array.isArray(nested.data)) return nested.data as RoomServiceMapping[];
    return [];
}

/**
 * FE wrapper for `/api/queue/admin/room-services`. Per the admin soft-disable
 * convention, the UI never calls hard DELETE — only create + toggle `is_active`.
 */
export const roomServiceMappingService = {
    getByRoom: (roomId: string, token: string) =>
        apiClient.get<unknown>(`/api/queue/admin/room-services?room_id=${encodeURIComponent(roomId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getByService: (serviceId: string, token: string) =>
        apiClient.get<unknown>(`/api/queue/admin/room-services?service_id=${encodeURIComponent(serviceId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    create: (body: CreateRoomServiceDto, token: string) =>
        apiClient.post<RoomServiceMapping>('/api/queue/admin/room-services', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    setActive: (id: string, is_active: boolean, token: string) =>
        apiClient.patch<RoomServiceMapping>(
            `/api/queue/admin/room-services/${id}`,
            { is_active } satisfies UpdateRoomServiceDto,
            { headers: { Authorization: `Bearer ${token}` } }
        ),
};
