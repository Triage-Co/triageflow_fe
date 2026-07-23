'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { roomDisplayService } from '../services/roomDisplayService';
import type { RoomWaitingDisplayData } from '../types/queue.types';

interface UseRoomDisplayOptions {
    roomId: string;
    token?: string | null;
    /** Polling interval in milliseconds (default: 5000ms) */
    pollIntervalMs?: number;
}

interface UseRoomDisplayReturn {
    data: RoomWaitingDisplayData | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => void;
    lastUpdated: Date | null;
}

/**
 * Hook for real-time room waiting screen data.
 * Polls /api/room and /api/doctor/patients?date=today at a given interval.
 * Falls back to mock data if the API is unreachable or returns an error.
 */
export function useRoomDisplay({
    roomId,
    token,
    pollIntervalMs = 5000,
}: UseRoomDisplayOptions): UseRoomDisplayReturn {
    const [data, setData] = useState<RoomWaitingDisplayData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const isMounted = useRef(true);

    const fetchData = useCallback(async () => {
        try {
            setError(null);
            const result = await roomDisplayService.getRoomDisplayData(
                roomId,
                token ?? undefined,
            );
            if (isMounted.current) {
                setData(result);
                setLastUpdated(new Date());
            }
        } catch (err) {
            if (isMounted.current) {
                setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu phòng khám.');
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    }, [roomId, token]);

    useEffect(() => {
        isMounted.current = true;
        setIsLoading(true);
        fetchData();

        const interval = setInterval(fetchData, pollIntervalMs);

        return () => {
            isMounted.current = false;
            clearInterval(interval);
        };
    }, [fetchData, pollIntervalMs]);

    return { data, isLoading, error, refresh: fetchData, lastUpdated };
}
