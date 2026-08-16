import { apiClient } from '@/shared/services/apiClient';
import type {
    CallNextRequestDto,
    CallNextResponse,
    CallPatientDto,
    QueueOverrideBody,
    QueueRefuseBody,
    QueueTransferBody,
    RoomQueueData,
    Serving,
} from '../types/queue.types';
import { normalizeQueueUpdatePayload } from '../utils/normalizeQueueUpdate';
import {
    extractStaffQueueFromCallNext,
    normalizeStaffRoomQueue,
} from '../utils/normalizeStaffRoomQueue';

export type { CallNextResponse, CallPatientDto, CallNextRequestDto };

function authHeaders(token?: string): Record<string, string> | undefined {
    if (!token) return undefined;
    return { Authorization: `Bearer ${token}` };
}

function unwrapData<T>(res: { data?: T } | T): T {
    if (res && typeof res === 'object' && 'data' in res && (res as { data?: T }).data !== undefined) {
        return (res as { data: T }).data;
    }
    return res as T;
}

export const queueService = {
    /**
     * GET /api/queue/room/:roomId — staff view (serving + waiting + missing).
     */
    async getRoomQueue(roomId: string, token?: string): Promise<RoomQueueData> {
        const res = await apiClient.get<RoomQueueData>(`/api/queue/room/${roomId}`, {
            headers: authHeaders(token),
            suppressLogError: true,
        });
        const raw = unwrapData(res);
        const normalized = normalizeStaffRoomQueue(raw);
        if (!normalized) {
            throw new Error('Invalid room queue payload');
        }
        if (!normalized.room_id) {
            normalized.room_id = roomId;
        }
        return normalized;
    },

    /**
     * POST /api/queue/call-next — step_id optional (omit = head of queue).
     * Returns TV-normalized payload; also returns staff serving when present.
     */
    async callNext(dto: CallNextRequestDto, token?: string) {
        const body: Record<string, string> = {
            room_id: dto.room_id,
            staff_id: dto.staff_id,
        };
        if (dto.step_id) body.step_id = dto.step_id;

        const res = await apiClient.post<CallNextResponse>('/api/queue/call-next', body, {
            headers: authHeaders(token),
            suppressLogError: true,
        });

        const raw = unwrapData(res) ?? res;
        const tv = normalizeQueueUpdatePayload(raw);
        const staff = extractStaffQueueFromCallNext(raw, dto.room_id);
        const servingFromRaw =
            staff?.serving ??
            (raw as CallNextResponse)?.serving ??
            null;

        return {
            ...res,
            data: tv ?? (raw as CallNextResponse),
            staffQueue: staff,
            serving: servingFromRaw,
        };
    },

    /**
     * @deprecated Prefer `callNext` with optional step_id.
     */
    async callNextPatient(dto: CallPatientDto, token: string) {
        return this.callNext(
            { room_id: dto.room_id, staff_id: dto.staff_id, step_id: dto.step_id },
            token,
        );
    },

    async completeStep(queueId: string, token?: string): Promise<{ serving?: Serving | null }> {
        const res = await apiClient.post(`/api/queue/${queueId}/complete`, {}, {
            headers: authHeaders(token),
            suppressLogError: true,
        });
        return unwrapData(res) as { serving?: Serving | null };
    },

    async refuseStep(
        queueId: string,
        body?: QueueRefuseBody,
        token?: string,
    ): Promise<{ serving?: Serving | null }> {
        const res = await apiClient.post(`/api/queue/${queueId}/refuse`, body ?? {}, {
            headers: authHeaders(token),
            suppressLogError: true,
        });
        return unwrapData(res) as { serving?: Serving | null };
    },

    async completeDetail(
        queueId: string,
        detailId: string,
        token?: string,
    ): Promise<{ serving?: Serving | null }> {
        const res = await apiClient.post(
            `/api/queue/${queueId}/service-order-details/${detailId}/complete`,
            {},
            { headers: authHeaders(token), suppressLogError: true },
        );
        return unwrapData(res) as { serving?: Serving | null };
    },

    async refuseDetail(
        queueId: string,
        detailId: string,
        token?: string,
    ): Promise<{ serving?: Serving | null }> {
        const res = await apiClient.post(
            `/api/queue/${queueId}/service-order-details/${detailId}/refuse`,
            {},
            { headers: authHeaders(token), suppressLogError: true },
        );
        return unwrapData(res) as { serving?: Serving | null };
    },

    async completeServiceOrder(
        queueId: string,
        orderId: string,
        token?: string,
    ): Promise<{ serving?: Serving | null }> {
        const res = await apiClient.post(
            `/api/queue/${queueId}/service-orders/${orderId}/complete`,
            {},
            { headers: authHeaders(token), suppressLogError: true },
        );
        return unwrapData(res) as { serving?: Serving | null };
    },

    async refuseServiceOrder(
        queueId: string,
        orderId: string,
        token?: string,
    ): Promise<{ serving?: Serving | null }> {
        const res = await apiClient.post(
            `/api/queue/${queueId}/service-orders/${orderId}/refuse`,
            {},
            { headers: authHeaders(token), suppressLogError: true },
        );
        return unwrapData(res) as { serving?: Serving | null };
    },

    async miss(queueId: string, token?: string) {
        const res = await apiClient.post(`/api/queue/${queueId}/miss`, {}, {
            headers: authHeaders(token),
            suppressLogError: true,
        });
        return unwrapData(res);
    },

    async recall(queueId: string, token?: string) {
        const res = await apiClient.post(`/api/queue/${queueId}/recall`, {}, {
            headers: authHeaders(token),
            suppressLogError: true,
        });
        return unwrapData(res);
    },

    async override(queueId: string, body: QueueOverrideBody, token?: string) {
        const res = await apiClient.post(`/api/queue/${queueId}/override`, body, {
            headers: authHeaders(token),
            suppressLogError: true,
        });
        return unwrapData(res);
    },

    async transfer(body: QueueTransferBody, token?: string) {
        const res = await apiClient.post('/api/queue/transfer', body, {
            headers: authHeaders(token),
            suppressLogError: true,
        });
        return unwrapData(res);
    },
};
