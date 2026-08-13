'use client';

import {
    CheckCircle2,
    Loader2,
    UserRound,
    XCircle,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Serving } from '../types/queue.types';
import { ACTIVE_SOD_STATUSES } from '../types/queue.types';

export interface RoomServingPanelProps {
    serving: Serving | null;
    isActing?: boolean;
    onCompleteDetail?: (detailId: string) => void | Promise<void>;
    onRefuseDetail?: (detailId: string) => void | Promise<void>;
    onCompleteServiceOrder?: () => void | Promise<void>;
    onRefuseServiceOrder?: () => void | Promise<void>;
    onCompleteStep?: () => void | Promise<void>;
    onRefuseStep?: () => void | Promise<void>;
    onMiss?: () => void | Promise<void>;
    onOpenEmr?: (queueId: string) => void;
    className?: string;
    emptyLabel?: string;
}

function formatDob(dob: string | null): string {
    if (!dob) return '—';
    try {
        const d = new Date(dob);
        if (Number.isNaN(d.getTime())) return dob;
        return d.toLocaleDateString('vi-VN');
    } catch {
        return dob;
    }
}

function genderLabel(g: string): string {
    const u = g.toUpperCase();
    if (u === 'MALE' || u === 'M' || u === 'NAM') return 'Nam';
    if (u === 'FEMALE' || u === 'F' || u === 'NỮ' || u === 'NU') return 'Nữ';
    return g || '—';
}

export function RoomServingPanel({
    serving,
    isActing = false,
    onCompleteDetail,
    onRefuseDetail,
    onCompleteServiceOrder,
    onRefuseServiceOrder,
    onCompleteStep,
    onRefuseStep,
    onMiss,
    onOpenEmr,
    className,
    emptyLabel = 'Chưa có bệnh nhân trong phòng. Bấm “Gọi tiếp theo”.',
}: RoomServingPanelProps) {
    if (!serving) {
        return (
            <div
                className={cn(
                    'rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 p-6 text-center',
                    className,
                )}
            >
                <UserRound className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
                <p className="text-sm font-medium text-neutral-500">{emptyLabel}</p>
            </div>
        );
    }

    const so = serving.service_order;
    const activeDetails =
        so?.details.filter((d) => ACTIVE_SOD_STATUSES.has(String(d.status).toUpperCase())) ?? [];

    return (
        <div
            className={cn(
                'rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm',
                className,
            )}
        >
            <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                        Đang phục vụ
                    </p>
                    <p className="mt-1 text-2xl font-extrabold text-neutral-900">
                        {serving.queue_number}
                    </p>
                    <p className="mt-0.5 text-base font-semibold text-neutral-800">
                        {serving.patient?.full_name || 'Bệnh nhân'}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                        {formatDob(serving.patient?.dob ?? null)} ·{' '}
                        {genderLabel(serving.patient?.gender ?? '')}
                    </p>
                </div>
                {onOpenEmr && (
                    <Button
                        variant="outline"
                        className="h-9 rounded-xl text-xs font-bold"
                        onClick={() => onOpenEmr(serving.queue_id)}
                        disabled={isActing}
                    >
                        Mở EMR
                    </Button>
                )}
            </div>

            {serving.step && (
                <div className="mb-4 rounded-xl bg-neutral-50 px-3 py-2.5">
                    <p className="text-xs font-bold text-neutral-500">Bước</p>
                    <p className="text-sm font-semibold text-neutral-800">
                        {serving.step.step_name}
                        {serving.step.service_code ? (
                            <span className="ml-2 font-mono text-xs text-neutral-400">
                                {serving.step.service_code}
                            </span>
                        ) : null}
                    </p>
                    <p className="text-xs text-neutral-500">
                        {serving.step.step_type} · {serving.step.step_status}
                    </p>
                </div>
            )}

            {so && (
                <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase text-neutral-500">
                            Chỉ định · {so.name}
                        </p>
                        <span className="text-[10px] font-bold uppercase text-neutral-400">
                            {so.status}
                        </span>
                    </div>
                    <ul className="space-y-2">
                        {so.details.map((d) => {
                            const active = ACTIVE_SOD_STATUSES.has(
                                String(d.status).toUpperCase(),
                            );
                            return (
                                <li
                                    key={d.service_order_detail_id}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-neutral-800">
                                            {d.service_name || d.name || d.service_code || 'Dịch vụ'}
                                        </p>
                                        <p className="text-[11px] text-neutral-400">
                                            x{d.quantity} · {d.status}
                                        </p>
                                    </div>
                                    {active && (
                                        <div className="flex shrink-0 gap-1">
                                            <Button
                                                size="sm"
                                                className="h-8 rounded-lg bg-emerald-600 px-2 text-[11px] font-bold hover:bg-emerald-700"
                                                disabled={isActing}
                                                onClick={() =>
                                                    void onCompleteDetail?.(
                                                        d.service_order_detail_id,
                                                    )
                                                }
                                            >
                                                Xong
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 rounded-lg px-2 text-[11px] font-bold text-rose-600"
                                                disabled={isActing}
                                                onClick={() =>
                                                    void onRefuseDetail?.(
                                                        d.service_order_detail_id,
                                                    )
                                                }
                                            >
                                                Hủy
                                            </Button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {activeDetails.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                                variant="outline"
                                className="h-9 rounded-xl text-xs font-bold"
                                disabled={isActing}
                                onClick={() => void onCompleteServiceOrder?.()}
                            >
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                Xong cả SO
                            </Button>
                            <Button
                                variant="outline"
                                className="h-9 rounded-xl text-xs font-bold text-rose-600"
                                disabled={isActing}
                                onClick={() => void onRefuseServiceOrder?.()}
                            >
                                <XCircle className="mr-1 h-3.5 w-3.5" />
                                Hủy SO
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
                <Button
                    className="h-10 flex-1 rounded-xl bg-emerald-600 text-sm font-bold hover:bg-emerald-700"
                    disabled={isActing || !onCompleteStep}
                    onClick={() => void onCompleteStep?.()}
                >
                    {isActing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Hoàn thành bước
                </Button>
                <Button
                    variant="outline"
                    className="h-10 rounded-xl text-sm font-bold text-rose-600"
                    disabled={isActing || !onRefuseStep}
                    onClick={() => void onRefuseStep?.()}
                >
                    Từ chối bước
                </Button>
                {onMiss && (
                    <Button
                        variant="outline"
                        className="h-10 rounded-xl text-sm font-bold"
                        disabled={isActing}
                        onClick={() => void onMiss()}
                    >
                        Vắng mặt
                    </Button>
                )}
            </div>
        </div>
    );
}
