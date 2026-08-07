'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { queueAdminService } from '../services/queueAdminService';
import { getErrorMessage } from '../utils/errorMessage';

export type CongestionLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface HeatmapRoom {
    room_id: string;
    room_name: string;
    room_type?: string;
    physical_room_id: string | null;
    specialty_name?: string;
    waiting_count: number;
    serving_count?: number;
    missing_count?: number;
    avg_wait_minutes_today?: number;
    max_current_wait_minutes?: number;
    expected_service_minutes?: number;
    eta_full_queue_minutes: number;
    completed_today?: number;
    congestion_level: CongestionLevel;
}

export interface HeatmapSummary {
    total_waiting: number;
    busiest_room_id: string | null;
    avg_wait_minutes_all: number;
}

export const CONGESTION_STYLES: Record<CongestionLevel, { label: string; dot: string; badge: string }> = {
    LOW: { label: 'Thấp', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    MEDIUM: { label: 'Trung bình', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 border-amber-100' },
    HIGH: { label: 'Cao', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-100' },
};

const POLL_MS = 60_000;

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

interface UseQueueHeatmapResult {
    rooms: HeatmapRoom[];
    roomsByRoomId: Map<string, HeatmapRoom>;
    roomsByPhysicalId: Map<string, HeatmapRoom>;
    summary: HeatmapSummary | null;
    generatedAt: string | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
}

/** Fetches the admin queue heatmap snapshot and polls every 60s while `enabled`. */
export function useQueueHeatmap(enabled: boolean, token: string | null | undefined): UseQueueHeatmapResult {
    const [rooms, setRooms] = useState<HeatmapRoom[]>([]);
    const [summary, setSummary] = useState<HeatmapSummary | null>(null);
    const [generatedAt, setGeneratedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const tokenRef = useRef(token);
    tokenRef.current = token;

    const load = useCallback(async () => {
        const currentToken = tokenRef.current;
        if (!currentToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await queueAdminService.getHeatmap(currentToken);
            const root = asRecord(res?.data);
            setRooms(Array.isArray(root?.rooms) ? (root!.rooms as HeatmapRoom[]) : []);
            setSummary(asRecord(root?.summary) as unknown as HeatmapSummary | null);
            setGeneratedAt(typeof root?.generated_at === 'string' ? (root!.generated_at as string) : null);
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải dữ liệu heatmap.'));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        void load();
        const timer = window.setInterval(() => void load(), POLL_MS);
        return () => window.clearInterval(timer);
    }, [enabled, load]);

    const roomsByRoomId = useMemo(() => new Map(rooms.map((r) => [r.room_id, r])), [rooms]);
    const roomsByPhysicalId = useMemo(
        () => new Map(rooms.filter((r) => r.physical_room_id).map((r) => [r.physical_room_id as string, r])),
        [rooms]
    );

    return {
        rooms,
        roomsByRoomId,
        roomsByPhysicalId,
        summary,
        generatedAt,
        isLoading,
        error,
        refresh: () => void load(),
    };
}
