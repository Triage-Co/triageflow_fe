'use client';

import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '@/shared/constants/config';
import type { CallNextResponse, CallNextPatient } from '../types/queue.types';
import { normalizeQueueUpdatePayload } from '../utils/normalizeQueueUpdate';
import { roomDisplayService } from '../services/roomDisplayService';
import { useAuthStore } from '@/modules/auth/store/authStore';

export type SocketRoomInfo = CallNextResponse['room_info'];
export type SocketQueuePatient = CallNextPatient;
export type SocketQueueUpdateData = CallNextResponse;

interface UseRoomDisplaySocketOptions {
    roomId?: string;
    staffId?: string;
}

interface UseRoomDisplaySocketReturn {
    data: SocketQueueUpdateData | null;
    isConnected: boolean;
    error: string | null;
}

/** Prefer explicit socket URL; fall back to API host (strip path). */
const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    API_BASE_URL.replace(/\/$/, '');

/** Prompt event name after call-next broadcast */
const EVENT_DOCTOR_QUEUE_UPDATED = 'doctor_queue_updated';
/** Legacy event still emitted by some BE builds */
const EVENT_ON_QUEUE_UPDATE = 'onQueueUpdate';

export { normalizeQueueUpdatePayload };

/**
 * Connects to Socket.IO for TV/kiosk room display.
 *
 * Join: `joinRoomDisplay` { roomId, staffId }
 * Listen (primary): `doctor_queue_updated`
 * Listen (legacy): `onQueueUpdate`
 *
 * Payload: { room_info, current_patient, upcoming_patients }
 */
export function useRoomDisplaySocket({
    roomId,
    staffId,
}: UseRoomDisplaySocketOptions): UseRoomDisplaySocketReturn {
    const [data, setData] = useState<SocketQueueUpdateData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<ReturnType<typeof import('socket.io-client')['io']> | null>(null);

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

            socket.on(EVENT_DOCTOR_QUEUE_UPDATED, (payload: unknown) => {
                console.log('[RoomDisplaySocket] doctor_queue_updated:', payload);
                applyUpdate(payload);
            });

            socket.on(EVENT_ON_QUEUE_UPDATE, (payload: unknown) => {
                console.log('[RoomDisplaySocket] onQueueUpdate (legacy):', payload);
                applyUpdate(payload);
            });
        });

        return () => {
            cancelled = true;
            if (socketRef.current) {
                socketRef.current.off(EVENT_DOCTOR_QUEUE_UPDATED);
                socketRef.current.off(EVENT_ON_QUEUE_UPDATE);
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setIsConnected(false);
        };
    }, [roomId, staffId]);

    return { data, isConnected, error };
}
