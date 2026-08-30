'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '@/shared/constants/config';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { queueService } from '../services/queueService';
import type {
    CallNextRequestDto,
    QueueOverrideBody,
    QueueRefuseBody,
    RoomQueueData,
    Serving,
} from '../types/queue.types';
import { normalizeStaffRoomQueue } from '../utils/normalizeStaffRoomQueue';

const SOCKET_URL =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    API_BASE_URL.replace(/\/$/, '').replace(/\/api$/i, '');

const POLL_MS = 20_000;

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asStaffUuid(value?: string | null): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    return UUID_RE.test(trimmed) ? trimmed : undefined;
}

export interface UseRoomQueueOptions {
    roomId?: string | null;
    staffId?: string | null;
    /** Poll interval when WS down; default 20s. Set 0 to disable. */
    pollIntervalMs?: number;
    enabled?: boolean;
}

export interface UseRoomQueueReturn {
    queue: RoomQueueData | null;
    isLoading: boolean;
    isConnected: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    callNext: (stepId?: string) => Promise<Serving | null>;
    completeStep: () => Promise<void>;
    refuseStep: (reason?: string) => Promise<void>;
    completeDetail: (detailId: string) => Promise<void>;
    refuseDetail: (detailId: string) => Promise<void>;
    completeServiceOrder: () => Promise<void>;
    refuseServiceOrder: () => Promise<void>;
    missServing: () => Promise<void>;
    missQueue: (queueId: string) => Promise<void>;
    recall: (queueId: string) => Promise<void>;
    override: (queueId: string, body: QueueOverrideBody) => Promise<void>;
    scanTicket: (dto: { ticket_code?: string; queue_id?: string }) => Promise<any>;
    startServing: (queueId?: string) => Promise<any>;
    isActing: boolean;
}

/**
 * Staff room queue: REST load + WS onQueueUpdate (staff shape) + poll fallback.
 */
export function useRoomQueue({
    roomId,
    staffId,
    pollIntervalMs = POLL_MS,
    enabled = true,
}: UseRoomQueueOptions): UseRoomQueueReturn {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authUserId = useAuthStore((s) => s.user?.id);
    const resolvedStaffId = asStaffUuid(staffId) || asStaffUuid(authUserId);

    const [queue, setQueue] = useState<RoomQueueData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isActing, setIsActing] = useState(false);

    const socketRef = useRef<ReturnType<typeof import('socket.io-client')['io']> | null>(null);
    const roomIdRef = useRef(roomId);
    roomIdRef.current = roomId;

    const refresh = useCallback(async () => {
        if (!roomId || !enabled) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await queueService.getRoomQueue(roomId, accessToken || undefined);
            setQueue(data);
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Không tải được hàng chờ phòng';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    }, [roomId, enabled, accessToken]);

    useEffect(() => {
        if (!enabled || !roomId) {
            setQueue(null);
            return;
        }
        void refresh();
    }, [enabled, roomId, refresh]);

    // WebSocket
    useEffect(() => {
        if (!enabled || !roomId || typeof window === 'undefined') return;

        let cancelled = false;

        async function connect() {
            const { io } = await import('socket.io-client');
            if (cancelled) return;

            const socket = io(SOCKET_URL, {
                transports: ['websocket', 'polling'],
                autoConnect: true,
            });
            socketRef.current = socket;

            socket.on('connect', () => {
                setIsConnected(true);
                const payload: { roomId: string; staffId?: string } = { roomId: roomId! };
                if (resolvedStaffId) payload.staffId = resolvedStaffId;
                socket.emit('joinRoomDisplay', payload);
                // Authoritative staff list comes from REST — sync after join so the
                // desk is filled even if the first WS push is TV-shaped / empty.
                void refresh();
            });

            socket.on('disconnect', () => setIsConnected(false));

            socket.on('onQueueUpdate', (raw: unknown) => {
                const staff = normalizeStaffRoomQueue(raw);
                if (staff) {
                    if (!staff.room_id && roomIdRef.current) {
                        staff.room_id = roomIdRef.current;
                    }
                    // Only apply if same room (or room_id empty)
                    if (!staff.room_id || staff.room_id === roomIdRef.current) {
                        setQueue(staff);
                        return;
                    }
                }
                // TV-only / unrecognized push: refresh REST for full staff payload
                void refresh();
            });

            socket.on('connect_error', () => {
                setIsConnected(false);
            });
        }

        void connect();

        return () => {
            cancelled = true;
            socketRef.current?.disconnect();
            socketRef.current = null;
            setIsConnected(false);
        };
    }, [enabled, roomId, resolvedStaffId, refresh]);

    // Poll fallback when disconnected
    useEffect(() => {
        if (!enabled || !roomId || !pollIntervalMs || isConnected) return;
        const id = setInterval(() => {
            void refresh();
        }, pollIntervalMs);
        return () => clearInterval(id);
    }, [enabled, roomId, pollIntervalMs, isConnected, refresh]);

    const withActing = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
        setIsActing(true);
        setError(null);
        try {
            return await fn();
        } catch (e) {
            const msg = e instanceof Error ? e.message : 'Thao tác hàng chờ thất bại';
            setError(msg);
            throw e;
        } finally {
            setIsActing(false);
        }
    }, []);

    const applyServingUpdate = useCallback((serving: Serving | null | undefined) => {
        setQueue((prev) => {
            if (!prev) return prev;
            if (serving === undefined) return prev;
            return { ...prev, serving: serving ?? null };
        });
    }, []);

    const callNext = useCallback(
        async (stepId?: string): Promise<Serving | null> => {
            if (!roomId || !resolvedStaffId) {
                const msg = 'Thiếu room_id hoặc staff_id để gọi bệnh nhân';
                setError(msg);
                throw new Error(msg);
            }
            return withActing(async () => {
                const dto: CallNextRequestDto = {
                    room_id: roomId,
                    staff_id: resolvedStaffId,
                };
                if (stepId) dto.step_id = stepId;
                const res = await queueService.callNext(dto, accessToken || undefined);
                if (res.staffQueue?.serving) {
                    setQueue(res.staffQueue);
                }
                // Always re-fetch staff room queue — call-next often returns TV shape
                // (current_patient) without a full serving payload.
                await refresh();
                return res.staffQueue?.serving ?? res.serving ?? null;
            });
        },
        [roomId, resolvedStaffId, accessToken, withActing, refresh],
    );

    const completeStep = useCallback(async () => {
        const qid = queue?.serving?.queue_id;
        if (!qid) throw new Error('Không có bệnh nhân đang phục vụ');
        await withActing(async () => {
            await queueService.completeStep(qid, accessToken || undefined);
            setQueue((prev) => (prev ? { ...prev, serving: null } : prev));
            await refresh();
        });
    }, [queue?.serving?.queue_id, accessToken, withActing, refresh]);

    const refuseStep = useCallback(
        async (reason?: string) => {
            const qid = queue?.serving?.queue_id;
            if (!qid) throw new Error('Không có bệnh nhân đang phục vụ');
            const body: QueueRefuseBody | undefined = reason ? { reason } : undefined;
            await withActing(async () => {
                await queueService.refuseStep(qid, body, accessToken || undefined);
                setQueue((prev) => (prev ? { ...prev, serving: null } : prev));
                await refresh();
            });
        },
        [queue?.serving?.queue_id, accessToken, withActing, refresh],
    );

    const completeDetail = useCallback(
        async (detailId: string) => {
            const qid = queue?.serving?.queue_id;
            if (!qid) throw new Error('Không có bệnh nhân đang phục vụ');
            await withActing(async () => {
                const res = await queueService.completeDetail(
                    qid,
                    detailId,
                    accessToken || undefined,
                );
                if (res?.serving !== undefined) applyServingUpdate(res.serving);
                else await refresh();
            });
        },
        [queue?.serving?.queue_id, accessToken, withActing, applyServingUpdate, refresh],
    );

    const refuseDetail = useCallback(
        async (detailId: string) => {
            const qid = queue?.serving?.queue_id;
            if (!qid) throw new Error('Không có bệnh nhân đang phục vụ');
            await withActing(async () => {
                const res = await queueService.refuseDetail(
                    qid,
                    detailId,
                    accessToken || undefined,
                );
                if (res?.serving !== undefined) applyServingUpdate(res.serving);
                else await refresh();
            });
        },
        [queue?.serving?.queue_id, accessToken, withActing, applyServingUpdate, refresh],
    );

    const completeServiceOrder = useCallback(async () => {
        const serving = queue?.serving;
        const qid = serving?.queue_id;
        const oid = serving?.service_order?.service_order_id;
        if (!qid || !oid) throw new Error('Không có service order đang phục vụ');
        await withActing(async () => {
            const res = await queueService.completeServiceOrder(
                qid,
                oid,
                accessToken || undefined,
            );
            if (res?.serving !== undefined) applyServingUpdate(res.serving);
            else await refresh();
        });
    }, [queue?.serving, accessToken, withActing, applyServingUpdate, refresh]);

    const refuseServiceOrder = useCallback(async () => {
        const serving = queue?.serving;
        const qid = serving?.queue_id;
        const oid = serving?.service_order?.service_order_id;
        if (!qid || !oid) throw new Error('Không có service order đang phục vụ');
        await withActing(async () => {
            const res = await queueService.refuseServiceOrder(
                qid,
                oid,
                accessToken || undefined,
            );
            if (res?.serving !== undefined) applyServingUpdate(res.serving);
            else await refresh();
        });
    }, [queue?.serving, accessToken, withActing, applyServingUpdate, refresh]);

    const missServing = useCallback(async () => {
        const qid = queue?.serving?.queue_id;
        if (!qid) throw new Error('Không có bệnh nhân đang phục vụ');
        await withActing(async () => {
            await queueService.miss(qid, accessToken || undefined);
            await refresh();
        });
    }, [queue?.serving?.queue_id, accessToken, withActing, refresh]);

    const missQueue = useCallback(
        async (queueId: string) => {
            await withActing(async () => {
                await queueService.miss(queueId, accessToken || undefined);
                await refresh();
            });
        },
        [accessToken, withActing, refresh],
    );

    const recall = useCallback(
        async (queueId: string) => {
            await withActing(async () => {
                await queueService.recall(queueId, accessToken || undefined);
                await refresh();
            });
        },
        [accessToken, withActing, refresh],
    );

    const override = useCallback(
        async (queueId: string, body: QueueOverrideBody) => {
            await withActing(async () => {
                await queueService.override(queueId, body, accessToken || undefined);
                await refresh();
            });
        },
        [accessToken, withActing, refresh],
    );

    const scanTicket = useCallback(
        async (dto: { ticket_code?: string; queue_id?: string }) => {
            if (!roomId) throw new Error('Chưa chọn phòng khám');
            return withActing(async () => {
                const res = await queueService.scanTicket(
                    {
                        ...dto,
                        room_id: roomId,
                        staff_id: resolvedStaffId,
                    },
                    accessToken || undefined,
                );
                await refresh();
                return res;
            });
        },
        [roomId, resolvedStaffId, accessToken, withActing, refresh],
    );

    const startServing = useCallback(
        async (queueId?: string) => {
            const targetQueueId = queueId || queue?.serving?.queue_id;
            if (!targetQueueId) throw new Error('Không có lượt chờ để bắt đầu khám');
            return scanTicket({ queue_id: targetQueueId });
        },
        [queue?.serving?.queue_id, scanTicket],
    );

    return {
        queue,
        isLoading,
        isConnected,
        error,
        refresh,
        callNext,
        completeStep,
        refuseStep,
        completeDetail,
        refuseDetail,
        completeServiceOrder,
        refuseServiceOrder,
        missServing,
        missQueue,
        recall,
        override,
        scanTicket,
        startServing,
        isActing,
    };
}
