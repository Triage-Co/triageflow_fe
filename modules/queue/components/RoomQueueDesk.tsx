'use client';

import { Loader2, PhoneCall, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import { RoomServingPanel } from './RoomServingPanel';
import { RoomWaitingList } from './RoomWaitingList';
import type { UseRoomQueueReturn } from '../hooks/useRoomQueue';

export interface RoomQueueDeskProps {
    title: string;
    roomLabel?: string;
    roomQueue: UseRoomQueueReturn;
    onOpenEmr?: (queueId: string) => void;
    className?: string;
}

/**
 * Shared staff desk: call-next + serving 3-level + waiting/missing lists.
 */
export function RoomQueueDesk({
    title,
    roomLabel,
    roomQueue,
    onOpenEmr,
    className,
}: RoomQueueDeskProps) {
    const {
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
        isActing,
    } = roomQueue;

    return (
        <div className={cn('flex min-h-0 flex-1 flex-col gap-4', className)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-xl font-extrabold tracking-tight text-neutral-900">
                        {title}
                    </h1>
                    {roomLabel && (
                        <p className="mt-0.5 text-sm font-medium text-neutral-500">{roomLabel}</p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold',
                            isConnected
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-neutral-100 text-neutral-500',
                        )}
                    >
                        {isConnected ? (
                            <Wifi className="h-3.5 w-3.5" />
                        ) : (
                            <WifiOff className="h-3.5 w-3.5" />
                        )}
                        {isConnected ? 'Realtime' : 'Polling'}
                    </span>
                    <Button
                        variant="outline"
                        className="h-10 rounded-xl text-xs font-bold"
                        disabled={isLoading || isActing}
                        onClick={() => void refresh()}
                    >
                        <RefreshCw
                            className={cn('mr-1.5 h-3.5 w-3.5', isLoading && 'animate-spin')}
                        />
                        Làm mới
                    </Button>
                    <Button
                        className="h-10 rounded-xl bg-indigo-600 text-sm font-bold hover:bg-indigo-700"
                        disabled={isActing || isLoading}
                        onClick={() => void callNext().catch(() => undefined)}
                    >
                        {isActing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <PhoneCall className="mr-2 h-4 w-4" />
                        )}
                        Gọi tiếp theo
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                    {error}
                </div>
            )}

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
                <RoomServingPanel
                    serving={queue?.serving ?? null}
                    isActing={isActing}
                    onOpenEmr={onOpenEmr}
                    onCompleteDetail={(id) => void completeDetail(id).catch(() => undefined)}
                    onRefuseDetail={(id) => void refuseDetail(id).catch(() => undefined)}
                    onCompleteServiceOrder={() =>
                        void completeServiceOrder().catch(() => undefined)
                    }
                    onRefuseServiceOrder={() => void refuseServiceOrder().catch(() => undefined)}
                    onCompleteStep={() => void completeStep().catch(() => undefined)}
                    onRefuseStep={() => void refuseStep().catch(() => undefined)}
                    onMiss={() => void missServing().catch(() => undefined)}
                />
                <RoomWaitingList
                    waiting={queue?.waiting ?? []}
                    missing={queue?.missing ?? []}
                    isActing={isActing}
                    onCallByStep={(stepId) => void callNext(stepId).catch(() => undefined)}
                    onMiss={(qid) => void missQueue(qid).catch(() => undefined)}
                    onRecall={(qid) => void recall(qid).catch(() => undefined)}
                    onPinTop={(qid) =>
                        void override(qid, {
                            action: 'PIN_TOP',
                            reason: 'Staff pin top',
                        }).catch(() => undefined)
                    }
                />
            </div>
        </div>
    );
}
