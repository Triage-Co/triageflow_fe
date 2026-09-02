import { useState } from 'react';
import { Loader2, PhoneCall, QrCode, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import { RoomServingPanel } from './RoomServingPanel';
import { RoomWaitingList } from './RoomWaitingList';
import { StaffQRScanModal } from '@/shared/components/modals/StaffQRScanModal';
import type { UseRoomQueueReturn } from '../hooks/useRoomQueue';

export interface RoomQueueDeskProps {
    title: string;
    roomLabel?: string;
    roomQueue: UseRoomQueueReturn;
    onOpenEmr?: (queueId: string) => void;
    className?: string;
}

/**
 * Shared staff desk: call-next + serving 3-level + waiting/missing lists + QR scan check-in.
 */
export function RoomQueueDesk({
    title,
    roomLabel,
    roomQueue,
    onOpenEmr,
    className,
}: RoomQueueDeskProps) {
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);

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
        scanTicket,
        startServing,
        isActing,
        setManualRules,
    } = roomQueue;

    return (
        <div className={cn('flex min-h-0 flex-1 flex-col gap-4', className)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-neutral-100/80">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                        {title}
                    </h1>
                    {roomLabel && (
                        <p className="mt-0.5 text-xs font-medium text-neutral-500 flex items-center gap-1.5">
                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            {roomLabel}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-xs border transition-colors',
                            isConnected
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                                : 'bg-neutral-100 text-neutral-500 border-neutral-200',
                        )}
                    >
                        <span
                            className={cn(
                                'h-2 w-2 rounded-full',
                                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
                            )}
                        />
                        {isConnected ? 'Thời gian thực' : 'Polling'}
                    </span>
                    <Button
                        variant="outline"
                        className="h-9 rounded-xl border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-xs cursor-pointer"
                        disabled={isLoading || isActing}
                        onClick={() => void refresh()}
                        startIcon={
                            <RefreshCw
                                className={cn('h-3.5 w-3.5 text-neutral-500', isLoading && 'animate-spin')}
                            />
                        }
                    >
                        Làm mới
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 rounded-xl border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-700 text-xs font-bold shadow-xs transition-all cursor-pointer"
                        disabled={isActing || isLoading}
                        onClick={() => setIsScanModalOpen(true)}
                        startIcon={<QrCode className="h-3.5 w-3.5 text-indigo-600" />}
                    >
                        Quét mã QR
                    </Button>
                    <Button
                        className="h-9 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-200 transition-all active:scale-[0.99] cursor-pointer"
                        disabled={isActing || isLoading}
                        onClick={() => void callNext().catch(() => undefined)}
                        startIcon={
                            isActing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <PhoneCall className="h-3.5 w-3.5" />
                            )
                        }
                    >
                        Gọi tiếp theo
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/90 px-3.5 py-2.5 text-xs font-medium text-rose-700 shadow-xs">
                    {error}
                </div>
            )}

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
                <RoomServingPanel
                    serving={queue?.serving ?? null}
                    isActing={isActing}
                    onOpenEmr={onOpenEmr}
                    onStartServing={() => void startServing().catch(() => undefined)}
                    onCompleteDetail={(id) => void completeDetail(id).catch(() => undefined)}
                    onRefuseDetail={(id) => void refuseDetail(id).catch(() => undefined)}
                    onCompleteServiceOrder={() =>
                        void completeServiceOrder().catch(() => undefined)
                    }
                    onRefuseServiceOrder={() => void refuseServiceOrder().catch(() => undefined)}
                    onCompleteStep={() => void completeStep().catch(() => undefined)}
                    onMiss={() => void missServing().catch(() => undefined)}
                />
                <RoomWaitingList
                    waiting={queue?.waiting ?? []}
                    missing={queue?.missing ?? []}
                    finished={queue?.finished ?? []}
                    isActing={isActing}
                    onOpenEmr={onOpenEmr}
                    onCallByStep={(stepId) => void callNext(stepId).catch(() => undefined)}
                    onMiss={(qid) => void missQueue(qid).catch(() => undefined)}
                    onRecall={(qid) => void recall(qid).catch(() => undefined)}
                    onPinTop={(qid) =>
                        void override(qid, {
                            action: 'PIN_TOP',
                            reason: 'Staff pin top',
                        }).catch(() => undefined)
                    }
                    onSetManualRules={(qid, codes) =>
                        void setManualRules(qid, codes).catch(() => undefined)
                    }
                />
            </div>

            {/* Modal Quét mã QR */}
            <StaffQRScanModal
                isOpen={isScanModalOpen}
                onClose={() => setIsScanModalOpen(false)}
                title="Quét mã QR vé khám"
                subtitle={roomLabel}
                inputLabel="Mã vé khám / Mã QR phiếu"
                inputPlaceholder="VD: TK-20260830-XXXX..."
                onScanSuccess={async (ticketCode) => {
                    return scanTicket({ ticket_code: ticketCode });
                }}
            />
        </div>
    );
}

