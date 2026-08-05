'use client';

import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/shared/constants/config';
import type { CallNextResponse, CallNextPatient } from '../types/queue.types';
import { normalizeQueueUpdatePayload } from '../utils/normalizeQueueUpdate';

import type {
    RebalanceSuggestionData,
    RebalanceResolvedData,
} from '../types/rebalance.types';

export type SocketRoomInfo = CallNextResponse['room_info'];
export type SocketQueuePatient = CallNextPatient;
export type SocketQueueUpdateData = CallNextResponse;

interface UseRoomDisplaySocketOptions {
    roomId?: string;
    staffId?: string;
}

interface UseRoomDisplaySocketReturn {
    data: SocketQueueUpdateData | null;
    rebalanceSuggestions: RebalanceSuggestionData[];
    isConnected: boolean;
    error: string | null;
}

/** Prefer explicit socket URL; fall back to API host (strip path). */
const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    API_BASE_URL.replace(/\/$/, '');

/** Event emitted by BE for queue display updates */
const EVENT_ON_QUEUE_UPDATE = 'onQueueUpdate';
/** Event emitted by BE for rebalance load-balancing suggestions */
const EVENT_ON_REBALANCE_SUGGESTION = 'onRebalanceSuggestion';
/** Event emitted by BE when a suggestion is confirmed or rejected */
const EVENT_ON_REBALANCE_RESOLVED = 'onRebalanceResolved';

export { normalizeQueueUpdatePayload };

/**
 * Connects to Socket.IO for TV/kiosk room display (always anonymous — no auth.token).
 *
 * Join: `joinRoomDisplay` { roomId, staffId }
 * Listen: `onQueueUpdate`, `onRebalanceSuggestion`, `onRebalanceResolved`
 *
 * Payload: { room_info, current_patient, upcoming_patients }
 */
export function useRoomDisplaySocket({
    roomId,
    staffId,
}: UseRoomDisplaySocketOptions): UseRoomDisplaySocketReturn {
    const [data, setData] = useState<SocketQueueUpdateData | null>(null);
    const [rebalanceSuggestions, setRebalanceSuggestions] = useState<RebalanceSuggestionData[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<ReturnType<typeof import('socket.io-client')['io']> | null>(null);

    // Prune expired suggestions periodically
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            setRebalanceSuggestions((prev) =>
                prev.filter((s) => new Date(s.expires_at).getTime() > now),
            );
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!roomId) return;

        let cancelled = false;
        let socket: ReturnType<typeof import('socket.io-client')['io']>;

        const applyUpdate = (payload: unknown) => {
            const normalized = normalizeQueueUpdatePayload(payload);
            if (!normalized) {
                console.warn('[RoomDisplaySocket] Ignored invalid queue payload:', payload);
                return;
            }
            setData(normalized);
            setError(null);
        };

        import('socket.io-client').then(({ io }) => {
            if (cancelled) return;

            // TV display is always anonymous — do not send staff/Supabase JWT
            socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                console.log('[RoomDisplaySocket] Connected:', socket.id);
                setIsConnected(true);
                setError(null);
                socket.emit('joinRoomDisplay', { roomId, staffId });
            });

            socket.on('disconnect', (reason: string) => {
                console.log('[RoomDisplaySocket] Disconnected:', reason);
                setIsConnected(false);
            });

            socket.on('connect_error', (err: Error) => {
                console.warn('[RoomDisplaySocket] Connection error:', err.message);
                setError('Không thể kết nối socket. Đang thử lại...');
                setIsConnected(false);
            });

            socket.on('onError', (errPayload: { message?: string }) => {
                console.warn('[RoomDisplaySocket] Socket error event:', errPayload);
                setError(errPayload?.message || 'Lỗi dữ liệu từ máy chủ.');
            });

            socket.on(EVENT_ON_QUEUE_UPDATE, (payload: unknown) => {
                console.log('[RoomDisplaySocket] onQueueUpdate:', payload);
                applyUpdate(payload);
            });

            socket.on(EVENT_ON_REBALANCE_SUGGESTION, (payload: RebalanceSuggestionData) => {
                console.log('[RoomDisplaySocket] onRebalanceSuggestion:', payload);
                if (!payload || !payload.suggestion_id) return;
                setRebalanceSuggestions((prev) => {
                    if (prev.some((s) => s.suggestion_id === payload.suggestion_id)) return prev;
                    return [payload, ...prev];
                });
            });

            socket.on(EVENT_ON_REBALANCE_RESOLVED, (payload: RebalanceResolvedData) => {
                console.log('[RoomDisplaySocket] onRebalanceResolved:', payload);
                if (!payload?.suggestion_id) return;
                setRebalanceSuggestions((prev) =>
                    prev.filter((s) => s.suggestion_id !== payload.suggestion_id),
                );
            });
        });

        return () => {
            cancelled = true;
            if (socketRef.current) {
                socketRef.current.emit('leaveRoomDisplay', { roomId });
                socketRef.current.off(EVENT_ON_QUEUE_UPDATE);
                socketRef.current.off(EVENT_ON_REBALANCE_SUGGESTION);
                socketRef.current.off(EVENT_ON_REBALANCE_RESOLVED);
                socketRef.current.off('onError');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setIsConnected(false);
        };
    }, [roomId, staffId]);

    return { data, rebalanceSuggestions, isConnected, error };
}
