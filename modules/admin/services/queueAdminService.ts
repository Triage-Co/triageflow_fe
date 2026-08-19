import { apiClient } from '@/shared/services/apiClient';
import type {
    CreatePriorityRuleDto,
    QueryPriorityRuleParams,
    QueuePriorityRule,
    RebalanceConfig,
    RoomServiceStat,
    UpdatePriorityRuleDto,
    UpdateRebalanceConfigDto,
} from '../types/queueRule.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function extractList<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    const root = asRecord(raw);
    if (!root) return [];
    if (Array.isArray(root.data)) return root.data as T[];
    const nested = asRecord(root.data);
    if (nested && Array.isArray(nested.data)) return nested.data as T[];
    return [];
}

function buildQuery(params: Record<string, string | boolean | undefined>): string {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') search.set(key, String(value));
    });
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

export const queueAdminService = {
    /* ─── Priority Rules ─── */
    getRules: (token: string, params: QueryPriorityRuleParams = {}) =>
        apiClient.get<unknown>(
            `/api/queue/admin/rules${buildQuery({
                rule_type: params.rule_type,
                is_active: params.is_active,
                room_type: params.room_type,
                specialty_id: params.specialty_id,
            })}`,
            { headers: { Authorization: `Bearer ${token}` } }
        ),

    createRule: (body: CreatePriorityRuleDto, token: string) =>
        apiClient.post<QueuePriorityRule>('/api/queue/admin/rules', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateRule: (ruleId: string, body: UpdatePriorityRuleDto, token: string) =>
        apiClient.patch<QueuePriorityRule>(`/api/queue/admin/rules/${ruleId}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** Soft-delete (`is_active=false`) — never a hard delete. */
    deactivateRule: (ruleId: string, token: string) =>
        apiClient.delete<QueuePriorityRule>(`/api/queue/admin/rules/${ruleId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /* ─── Room Stats (default service duration) ─── */
    getRoomStats: (token: string, roomId?: string) =>
        apiClient.get<unknown>(`/api/queue/admin/room-stats${buildQuery({ room_id: roomId })}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /**
     * Updates the admin-configurable `default_duration_sec` for a room, keyed by
     * `roomId` + `step_type` (BE upserts `Room_Service_Stat` on this composite key —
     * NOT the stat row id).
     */
    updateRoomDefaultDuration: (
        roomId: string,
        body: { step_type: string; default_duration_sec: number },
        token: string
    ) =>
        apiClient.patch<RoomServiceStat>(`/api/queue/admin/room-stats/${roomId}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /* ─── Heatmap ─── */
    getHeatmap: (token: string) =>
        apiClient.get<unknown>('/api/queue/admin/heatmap', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getRebalanceConfig: (token: string) =>
        apiClient.get<RebalanceConfig>('/api/queue/admin/rebalance-config', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateRebalanceConfig: (body: UpdateRebalanceConfigDto, token: string) =>
        apiClient.patch<RebalanceConfig>('/api/queue/admin/rebalance-config', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
