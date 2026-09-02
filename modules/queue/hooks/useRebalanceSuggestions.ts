'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { queueService } from '../services/queueService';
import { useRoomDisplaySocket } from './useRoomDisplaySocket';
import type { RebalanceSuggestionData } from '../types/rebalance.types';

export interface UseRebalanceSuggestionsOptions {
    roomId?: string | null;
    enabled?: boolean;
}

export interface UseRebalanceSuggestionsReturn {
    suggestions: RebalanceSuggestionData[];
    isLoading: boolean;
    isConnected: boolean;
    actingId: string | null;
    error: string | null;
    confirm: (suggestionId: string) => Promise<void>;
    reject: (suggestionId: string) => Promise<void>;
    refresh: () => Promise<void>;
}

function isActiveSuggestion(item: RebalanceSuggestionData, nowMs: number): boolean {
    const expires = new Date(item.expires_at).getTime();
    return Number.isFinite(expires) && expires > nowMs;
}

function mergeById(
    rest: RebalanceSuggestionData[],
    live: RebalanceSuggestionData[],
): RebalanceSuggestionData[] {
    const map = new Map<string, RebalanceSuggestionData>();
    for (const item of rest) {
        if (item.suggestion_id) map.set(item.suggestion_id, item);
    }
    for (const item of live) {
        if (item.suggestion_id) map.set(item.suggestion_id, item);
    }
    return Array.from(map.values());
}

/**
 * Staff rebalance inbox: REST pending list + room-display socket + confirm/reject.
 */
export function useRebalanceSuggestions({
    roomId,
    enabled = true,
}: UseRebalanceSuggestionsOptions): UseRebalanceSuggestionsReturn {
    const accessToken = useAuthStore((s) => s.accessToken);
    const activeRoomId = enabled && roomId ? roomId : undefined;

    const [fetched, setFetched] = useState<RebalanceSuggestionData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [actingId, setActingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());

    const pruneId = useCallback((suggestionId: string) => {
        setFetched((prev) => prev.filter((s) => s.suggestion_id !== suggestionId));
    }, []);

    const { rebalanceSuggestions: liveSuggestions, isConnected } = useRoomDisplaySocket({
        roomId: activeRoomId,
        onRebalanceSuggestion: (payload) => {
            setFetched((prev) => {
                if (prev.some((s) => s.suggestion_id === payload.suggestion_id)) return prev;
                return [payload, ...prev];
            });
        },
        onRebalanceResolved: (payload) => {
            pruneId(payload.suggestion_id);
        },
    });

    const refresh = useCallback(async () => {
        if (!activeRoomId || !accessToken) {
            setFetched([]);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const list = await queueService.getRebalanceSuggestions(
                activeRoomId,
                accessToken,
            );
            setFetched(list);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không tải được gợi ý điều phối');
        } finally {
            setIsLoading(false);
        }
    }, [activeRoomId, accessToken]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    useEffect(() => {
        const timer = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const suggestions = useMemo(
        () => mergeById(fetched, liveSuggestions).filter((s) => isActiveSuggestion(s, nowMs)),
        [fetched, liveSuggestions, nowMs],
    );

    const confirm = useCallback(
        async (suggestionId: string) => {
            if (!accessToken) {
                const msg = 'Chưa đăng nhập';
                setError(msg);
                throw new Error(msg);
            }
            setActingId(suggestionId);
            setError(null);
            try {
                await queueService.confirmRebalanceSuggestion(suggestionId, accessToken);
                pruneId(suggestionId);
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Xác nhận điều phối thất bại';
                setError(msg);
                throw e;
            } finally {
                setActingId(null);
            }
        },
        [accessToken, pruneId],
    );

    const reject = useCallback(
        async (suggestionId: string) => {
            if (!accessToken) {
                const msg = 'Chưa đăng nhập';
                setError(msg);
                throw new Error(msg);
            }
            setActingId(suggestionId);
            setError(null);
            try {
                await queueService.rejectRebalanceSuggestion(suggestionId, accessToken);
                pruneId(suggestionId);
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Từ chối điều phối thất bại';
                setError(msg);
                throw e;
            } finally {
                setActingId(null);
            }
        },
        [accessToken, pruneId],
    );

    return {
        suggestions,
        isLoading,
        isConnected,
        actingId,
        error,
        confirm,
        reject,
        refresh,
    };
}
