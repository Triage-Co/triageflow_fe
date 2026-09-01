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

/** Prefer explicit socket URL; fall back to API host (strip trailing /api). */
const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    API_BASE_URL.replace(/\/$/, '').replace(/\/api$/i, '');

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asStaffUuid(value?: string): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    return UUID_RE.test(trimmed) ? trimmed : undefined;
}

/** Event emitted by BE for queue display updates */
const EVENT_ON_QUEUE_UPDATE = 'onQueueUpdate';
/** Event emitted by BE for rebalance load-balancing suggestions */
const EVENT_ON_REBALANCE_SUGGESTION = 'onRebalanceSuggestion';
/** Event emitted by BE when a suggestion is confirmed or rejected */
const EVENT_ON_REBALANCE_RESOLVED = 'onRebalanceResolved';

const LOG = '[TV Display][Socket]';

export { normalizeQueueUpdatePayload };

function summarizeQueuePayload(data: CallNextResponse) {
    return {
        room: data.room_info?.room_name,
        doctor: data.room_info?.doctor_name,
        current: data.current_patient
            ? {
                  queue_number: data.current_patient.queue_number,
                  patient_name: data.current_patient.patient_name,
                  status: data.current_patient.status,
              }
            : null,
        upcoming_count: data.upcoming_patients?.length ?? 0,
        upcoming_numbers: (data.upcoming_patients ?? []).map((p) => p.queue_number),
        missing_count: data.missing?.length ?? 0,
        missing_numbers: (data.missing ?? []).map((m) => m.queue_number),
    };
}

/**
 * Connects to Socket.IO for TV/kiosk room display (always anonymous — no auth.token).
 *
 * Join: `joinRoomDisplay` { roomId, staffId? }
 * Listen: `onQueueUpdate`, `onRebalanceSuggestion`, `onRebalanceResolved`
 *
 * Payload: { room_info, current_patient, upcoming_patients, missing? }
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

    // Only UUID staff ids — never send auth email (e.g. admin@gmail.com)
    const safeStaffId = asStaffUuid(staffId);

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
        console.log(`${LOG} effect start`, {
            roomId: roomId ?? '(missing)',
            staffId: staffId ?? '(none)',
            safeStaffId: safeStaffId ?? '(omitted — not a UUID)',
            SOCKET_URL,
        });

        if (!roomId) {
            console.warn(`${LOG} SKIP connect — roomId is empty.`);
            return;
        }

        let cancelled = false;
        let socket: ReturnType<typeof import('socket.io-client')['io']>;

        const applyUpdate = (payload: unknown, source: string) => {
            const normalized = normalizeQueueUpdatePayload(payload);
            if (!normalized) {
                console.warn(`${LOG} Ignored invalid queue payload from ${source}:`, payload);
                return;
            }
            console.log(`${LOG} ${source} → UI`, summarizeQueuePayload(normalized));
            setData(normalized);
            setError(null);
        };

        import('socket.io-client').then(({ io }) => {
            if (cancelled) return;

            socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                const joinPayload: { roomId: string; staffId?: string } = { roomId };
                if (safeStaffId) joinPayload.staffId = safeStaffId;

                console.log(`${LOG} CONNECTED`, {
                    socketId: socket.id,
                    SOCKET_URL,
                    joinPayload,
                });
                setIsConnected(true);
                setError(null);
                socket.emit('joinRoomDisplay', joinPayload);
            });

            socket.on('disconnect', (reason: string) => {
                console.warn(`${LOG} DISCONNECTED`, reason);
                setIsConnected(false);
            });

            socket.on('connect_error', (err: Error) => {
                console.error(`${LOG} CONNECT_ERROR`, err.message, { SOCKET_URL });
                setError('Không thể kết nối socket. Đang thử lại...');
                setIsConnected(false);
            });

            socket.on('onError', (errPayload: { message?: string; roomId?: string }) => {
                console.error(`${LOG} BE onError`, errPayload);
                setError(errPayload?.message || 'Lỗi dữ liệu từ máy chủ.');
            });

            socket.on(EVENT_ON_QUEUE_UPDATE, (payload: unknown) => {
                applyUpdate(payload, 'onQueueUpdate');
            });

            socket.on(EVENT_ON_REBALANCE_SUGGESTION, (payload: RebalanceSuggestionData) => {
                if (!payload || !payload.suggestion_id) return;
                setRebalanceSuggestions((prev) => {
                    if (prev.some((s) => s.suggestion_id === payload.suggestion_id)) return prev;
                    return [payload, ...prev];
                });
            });

            socket.on(EVENT_ON_REBALANCE_RESOLVED, (payload: RebalanceResolvedData) => {
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
                socketRef.current.off('connect');
                socketRef.current.off('disconnect');
                socketRef.current.off('connect_error');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setIsConnected(false);
        };
    }, [roomId, staffId, safeStaffId]);

    return { data, rebalanceSuggestions, isConnected, error };
}
