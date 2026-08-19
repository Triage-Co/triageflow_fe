'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/shared/constants/config';
import { pharmacyService } from '../services/pharmacyService';
import type { PharmacyDisplayPayload } from '../types/pharmacy-display.types';

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    API_BASE_URL.replace(/\/$/, '').replace(/\/api$/i, '');

const EVENT_PHARMACY_DISPLAY = 'onPharmacyDisplayUpdate';

function isPharmacyPayload(value: unknown): value is PharmacyDisplayPayload {
    if (!value || typeof value !== 'object') return false;
    const body = value as Record<string, unknown>;
    return Array.isArray(body.calling_numbers);
}

function unwrapPayload(value: unknown): PharmacyDisplayPayload | null {
    if (isPharmacyPayload(value)) return value;
    if (value && typeof value === 'object' && 'data' in value) {
        const inner = (value as { data: unknown }).data;
        if (isPharmacyPayload(inner)) return inner;
    }
    return null;
}

interface UsePharmacyDisplaySocketOptions {
    roomId?: string;
}

interface UsePharmacyDisplaySocketReturn {
    data: PharmacyDisplayPayload | null;
    resolvedRoomId: string | undefined;
    isConnected: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function usePharmacyDisplaySocket({
    roomId
}: UsePharmacyDisplaySocketOptions): UsePharmacyDisplaySocketReturn {
    const [data, setData] = useState<PharmacyDisplayPayload | null>(null);
    const [resolvedRoomId, setResolvedRoomId] = useState<string | undefined>(roomId);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<ReturnType<typeof import('socket.io-client')['io']> | null>(null);

    const applyPayload = useCallback((payload: PharmacyDisplayPayload) => {
        setData(payload);
        if (payload.room?.room_id) {
            setResolvedRoomId(payload.room.room_id);
        }
        setError(null);
    }, []);

    const refresh = useCallback(async () => {
        try {
            const payload = await pharmacyService.getPharmacyDisplay(roomId || resolvedRoomId);
            applyPayload(payload);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Không thể tải màn hình nhà thuốc';
            setError(message);
        }
    }, [applyPayload, resolvedRoomId, roomId]);

    useEffect(() => {
        let cancelled = false;
        pharmacyService
            .getPharmacyDisplay(roomId)
            .then((payload) => {
                if (!cancelled) applyPayload(payload);
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                const message = err instanceof Error ? err.message : 'Không thể tải màn hình nhà thuốc';
                setError(message);
            });
        return () => {
            cancelled = true;
        };
    }, [applyPayload, roomId]);

    useEffect(() => {
        const joinRoomId = roomId || resolvedRoomId;
        if (!joinRoomId) return;

        let cancelled = false;
        let socket: ReturnType<typeof import('socket.io-client')['io']>;

        import('socket.io-client').then(({ io }) => {
            if (cancelled) return;

            socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                setIsConnected(true);
                setError(null);
                socket.emit('joinRoomDisplay', { roomId: joinRoomId });
            });

            socket.on('disconnect', () => {
                setIsConnected(false);
            });

            socket.on('connect_error', () => {
                setIsConnected(false);
                setError('Không thể kết nối socket. Đang thử lại...');
            });

            socket.on('onError', (errPayload: { message?: string }) => {
                setError(errPayload?.message || 'Lỗi dữ liệu từ máy chủ.');
            });

            socket.on(EVENT_PHARMACY_DISPLAY, (payload: unknown) => {
                const normalized = unwrapPayload(payload);
                if (normalized) applyPayload(normalized);
            });
        });

        return () => {
            cancelled = true;
            if (socketRef.current) {
                socketRef.current.emit('leaveRoomDisplay', { roomId: joinRoomId });
                socketRef.current.off(EVENT_PHARMACY_DISPLAY);
                socketRef.current.off('onError');
                socketRef.current.off('connect');
                socketRef.current.off('disconnect');
                socketRef.current.off('connect_error');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
            setIsConnected(false);
        };
    }, [applyPayload, resolvedRoomId, roomId]);

    return { data, resolvedRoomId, isConnected, error, refresh };
}
