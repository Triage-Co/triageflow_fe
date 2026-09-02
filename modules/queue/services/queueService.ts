import { apiClient } from '@/shared/services/apiClient';
import type {
    CallNextRequestDto,
    CallNextResponse,
    CallPatientDto,
    QueueOverrideBody,
    QueueRefuseBody,
    QueueTransferBody,
    RoomQueueData,
    ScanQueueDto,
    Serving,
} from '../types/queue.types';
import type { RebalanceSuggestionData } from '../types/rebalance.types';
import {
    FLAGGABLE_RULE_TYPES,
    type FlaggableRule,
} from '../types/ruleFlag.types';
import { normalizeQueueUpdatePayload } from '../utils/normalizeQueueUpdate';
import {
    extractStaffQueueFromCallNext,
    normalizeStaffRoomQueue,
} from '../utils/normalizeStaffRoomQueue';

export type { CallNextResponse, CallPatientDto, CallNextRequestDto, ScanQueueDto };

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
     * POST /api/queue/scan — Quét mã QR hoặc bắt đầu khám thủ công (CALLED -> SERVING hoặc MISSING -> QUEUED)
     */
    async scanTicket(dto: ScanQueueDto, token?: string) {
        const res = await apiClient.post<any>('/api/queue/scan', dto, {
            headers: authHeaders(token),
            suppressLogError: true,
        });
        return unwrapData(res) ?? res;
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

    /**
     * GET /api/queue/rebalance/suggestions?room_id=
     */
    async getRebalanceSuggestions(
        roomId: string,
        token?: string,
    ): Promise<RebalanceSuggestionData[]> {
        const params = new URLSearchParams({ room_id: roomId });
        const res = await apiClient.get<RebalanceSuggestionData[]>(
            `/api/queue/rebalance/suggestions?${params.toString()}`,
            { headers: authHeaders(token), suppressLogError: true },
        );
        return normalizeSuggestionList(unwrapUnknown(res));
    },

    /**
     * POST /api/queue/rebalance/suggestions/:id/confirm
     */
    async confirmRebalanceSuggestion(suggestionId: string, token?: string) {
        const res = await apiClient.post(
            `/api/queue/rebalance/suggestions/${suggestionId}/confirm`,
            {},
            { headers: authHeaders(token), suppressLogError: true },
        );
        return unwrapData(res);
    },

    /**
     * POST /api/queue/rebalance/suggestions/:id/reject
     */
    async rejectRebalanceSuggestion(suggestionId: string, token?: string) {
        const res = await apiClient.post(
            `/api/queue/rebalance/suggestions/${suggestionId}/reject`,
            {},
            { headers: authHeaders(token), suppressLogError: true },
        );
        return unwrapData(res);
    },

    /**
     * GET /api/queue/flaggable-rules
     */
    async getFlaggableRules(token?: string): Promise<FlaggableRule[]> {
        const res = await apiClient.get<FlaggableRule[]>(
            '/api/queue/flaggable-rules',
            { headers: authHeaders(token), suppressLogError: true },
        );
        return normalizeFlaggableList(unwrapUnknown(res));
    },

    /**
     * PATCH /api/queue/:queueId/manual-rule-codes
     * Body: `{ manual_rule_codes: string[] }` (empty array clears flags).
     */
    async updateQueueManualRules(
        queueId: string,
        manualRuleCodes: string[],
        token?: string,
    ) {
        const res = await apiClient.patch(
            `/api/queue/${queueId}/manual-rule-codes`,
            { manual_rule_codes: manualRuleCodes },
            { headers: authHeaders(token), suppressLogError: true },
        );
        return unwrapData(res);
    },
};

function unwrapUnknown(res: unknown): unknown {
    if (res && typeof res === 'object' && 'data' in res) {
        const nested = (res as { data?: unknown }).data;
        if (nested !== undefined) return nested;
    }
    return res;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
    if (value == null) return fallback;
    return String(value);
}

function asNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return fallback;
}

function toIsoString(value: unknown): string {
    if (typeof value === 'string' && value.trim()) return value;
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
    if (typeof value === 'number' && Number.isFinite(value)) {
        return new Date(value).toISOString();
    }
    return '';
}

function unwrapArray(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    const rec = asRecord(raw);
    if (!rec) return [];
    if (Array.isArray(rec.data)) return rec.data;
    if (Array.isArray(rec.rules)) return rec.rules;
    if (Array.isArray(rec.items)) return rec.items;
    return [];
}

function normalizeSuggestion(raw: unknown): RebalanceSuggestionData | null {
    const r = asRecord(raw);
    if (!r) return null;
    const suggestionId = asString(r.suggestion_id);
    if (!suggestionId) return null;
    const expiresAt = toIsoString(r.expires_at);
    if (!expiresAt) return null;
    return {
        suggestion_id: suggestionId,
        from_room_id: asString(r.from_room_id),
        from_room_name: asString(r.from_room_name),
        to_room_id: asString(r.to_room_id),
        to_room_name: asString(r.to_room_name),
        queue_id: asString(r.queue_id),
        queue_number: (r.queue_number as string | number) ?? '',
        patient_name: asString(r.patient_name),
        eta_gain_minutes: asNumber(r.eta_gain_minutes),
        expires_at: expiresAt,
        service_id: r.service_id != null ? asString(r.service_id) : undefined,
        status: r.status != null ? asString(r.status) : undefined,
    };
}

function normalizeSuggestionList(raw: unknown): RebalanceSuggestionData[] {
    return unwrapArray(raw)
        .map(normalizeSuggestion)
        .filter((s): s is RebalanceSuggestionData => s != null);
}

const ALLOWED_FLAG_TYPES = new Set<string>(FLAGGABLE_RULE_TYPES);
const HIDDEN_PICKER_CODES = new Set(['PIN_TOP', 'AGING_DEFAULT', 'REBALANCE_DEFAULT']);

function normalizeFlaggableRule(raw: unknown): FlaggableRule | null {
    const r = asRecord(raw);
    if (!r) return null;
    const ruleCode = asString(r.rule_code).trim().toUpperCase();
    if (!ruleCode || HIDDEN_PICKER_CODES.has(ruleCode)) return null;
    const ruleType = asString(r.rule_type).trim().toUpperCase();
    if (ruleType && !ALLOWED_FLAG_TYPES.has(ruleType)) return null;
    return {
        rule_code: ruleCode,
        name: asString(r.name, ruleCode),
        rule_type: ruleType || 'PATIENT_CATEGORY',
        weight: asNumber(r.weight),
    };
}

function normalizeFlaggableList(raw: unknown): FlaggableRule[] {
    const seen = new Set<string>();
    const out: FlaggableRule[] = [];
    for (const item of unwrapArray(raw)) {
        const rule = normalizeFlaggableRule(item);
        if (!rule || seen.has(rule.rule_code)) continue;
        seen.add(rule.rule_code);
        out.push(rule);
    }
    out.sort((a, b) => {
        const weightDelta = (b.weight ?? 0) - (a.weight ?? 0);
        if (weightDelta !== 0) return weightDelta;
        return a.name.localeCompare(b.name, 'vi');
    });
    return out;
}
