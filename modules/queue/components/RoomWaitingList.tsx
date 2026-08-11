'use client';

import { useState } from 'react';
import { Clock, Pin, PhoneCall, RotateCcw, UserX } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import type { MissingEntry, WaitingEntry } from '../types/queue.types';

export interface RoomWaitingListProps {
    waiting: WaitingEntry[];
    missing: MissingEntry[];
    isActing?: boolean;
    onCallByStep?: (stepId: string, queueId: string) => void | Promise<void>;
    onMiss?: (queueId: string) => void | Promise<void>;
    onRecall?: (queueId: string) => void | Promise<void>;
    onPinTop?: (queueId: string) => void | Promise<void>;
    className?: string;
}

const QUEUE_TYPE_LABEL: Record<string, string> = {
    NEW: 'Mới',
    APPOINTMENT: 'Hẹn',
    RETURNING: 'Tái khám',
    TRANSFER: 'Chuyển',
    WALK_IN: 'Vãng lai',
};

function typeBadge(queueType: string): string {
    return QUEUE_TYPE_LABEL[queueType?.toUpperCase()] || queueType || '';
}

export function RoomWaitingList({
    waiting,
    missing,
    isActing = false,
    onCallByStep,
    onMiss,
    onRecall,
    onPinTop,
    className,
}: RoomWaitingListProps) {
    const [tab, setTab] = useState<'waiting' | 'missing'>('waiting');

    return (
        <div className={cn('flex h-full min-h-0 flex-col rounded-2xl border border-neutral-200 bg-white', className)}>
            <div className="flex border-b border-neutral-100">
                <button
                    type="button"
                    className={cn(
                        'flex-1 px-3 py-2.5 text-xs font-bold',
                        tab === 'waiting'
                            ? 'border-b-2 border-indigo-500 text-indigo-700'
                            : 'text-neutral-400',
                    )}
                    onClick={() => setTab('waiting')}
                >
                    Đang chờ ({waiting.length})
                </button>
                <button
                    type="button"
                    className={cn(
                        'flex-1 px-3 py-2.5 text-xs font-bold',
                        tab === 'missing'
                            ? 'border-b-2 border-amber-500 text-amber-700'
                            : 'text-neutral-400',
                    )}
                    onClick={() => setTab('missing')}
                >
                    Vắng ({missing.length})
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {tab === 'waiting' && waiting.length === 0 && (
                    <p className="py-8 text-center text-sm text-neutral-400">Không có người chờ</p>
                )}
                {tab === 'waiting' &&
                    waiting.map((w) => (
                        <div
                            key={w.queue_id}
                            className="mb-2 rounded-xl border border-neutral-100 px-3 py-2.5 last:mb-0"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-sm font-extrabold text-neutral-900">
                                            {w.queue_number}
                                        </span>
                                        {w.is_pinned && (
                                            <Pin className="h-3.5 w-3.5 text-amber-500" />
                                        )}
                                        {w.queue_type && (
                                            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                                                {typeBadge(w.queue_type)}
                                            </span>
                                        )}
                                        {w.reasons?.slice(0, 2).map((r) => (
                                            <span
                                                key={r}
                                                className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700"
                                            >
                                                {r}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="mt-0.5 truncate text-sm font-medium text-neutral-700">
                                        {w.patient_name}
                                    </p>
                                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-400">
                                        <Clock className="h-3 w-3" />
                                        ETA ~{w.eta_minutes ?? '—'}p
                                        {w.eta_time ? ` · ${w.eta_time}` : ''}
                                    </p>
                                </div>
                                <div className="flex shrink-0 flex-col gap-1">
                                    {onCallByStep && w.step_id && (
                                        <Button
                                            size="sm"
                                            className="h-7 rounded-lg px-2 text-[10px] font-bold"
                                            disabled={isActing}
                                            onClick={() =>
                                                void onCallByStep(w.step_id!, w.queue_id)
                                            }
                                        >
                                            <PhoneCall className="mr-1 h-3 w-3" />
                                            Gọi
                                        </Button>
                                    )}
                                    {onPinTop && !w.is_pinned && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 rounded-lg px-2 text-[10px] font-bold"
                                            disabled={isActing}
                                            onClick={() => void onPinTop(w.queue_id)}
                                        >
                                            <Pin className="mr-1 h-3 w-3" />
                                            Ghim
                                        </Button>
                                    )}
                                    {onMiss && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 rounded-lg px-2 text-[10px] font-bold text-rose-600"
                                            disabled={isActing}
                                            onClick={() => void onMiss(w.queue_id)}
                                        >
                                            <UserX className="mr-1 h-3 w-3" />
                                            Vắng
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                {tab === 'missing' && missing.length === 0 && (
                    <p className="py-8 text-center text-sm text-neutral-400">Không có vắng mặt</p>
                )}
                {tab === 'missing' &&
                    missing.map((m) => (
                        <div
                            key={m.queue_id}
                            className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-amber-50 bg-amber-50/40 px-3 py-2.5 last:mb-0"
                        >
                            <div>
                                <p className="text-sm font-extrabold text-neutral-900">
                                    {m.queue_number}
                                </p>
                                <p className="text-sm text-neutral-700">{m.patient_name}</p>
                            </div>
                            {onRecall && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg text-[11px] font-bold"
                                    disabled={isActing}
                                    onClick={() => void onRecall(m.queue_id)}
                                >
                                    <RotateCcw className="mr-1 h-3 w-3" />
                                    Gọi lại
                                </Button>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
}
