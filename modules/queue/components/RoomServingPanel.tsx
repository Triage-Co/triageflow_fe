'use client';

import {
    CheckCircle2,
    ExternalLink,
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

const STEP_TYPE_VI: Record<string, string> = {
    CLINICAL: 'Khám chuyên khoa',
    EXAMINATION: 'Khám bệnh',
    TRIAGE: 'Phân loại khám',
    VITAL_SIGNS: 'Đo sinh hiệu',
    LAB: 'Xét nghiệm',
    TEST: 'Xét nghiệm',
    IMAGING: 'Chẩn đoán hình ảnh',
    XRAY: 'Chụp X-Quang',
    ULTRASOUND: 'Siêu âm',
    PROCEDURE: 'Thủ thuật',
    PHARMACY: 'Cấp phát thuốc',
    PAYMENT: 'Thu ngân / Viện phí',
    REGISTRATION: 'Đăng ký tiếp đón',
};

function formatStepType(t: string | undefined | null): string {
    if (!t) return 'Khám';
    const key = String(t).toUpperCase();
    return STEP_TYPE_VI[key] || t;
}

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
    IN_PROGRESS: { label: 'Đang thực hiện', className: 'bg-sky-50 text-sky-700 border-sky-200/80' },
    WAITING: { label: 'Đang chờ', className: 'bg-amber-50 text-amber-700 border-amber-200/80' },
    PENDING: { label: 'Chờ xử lý', className: 'bg-amber-50 text-amber-700 border-amber-200/80' },
    COMPLETED: { label: 'Đã hoàn thành', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
    DONE: { label: 'Đã xong', className: 'bg-emerald-50 text-emerald-700 border-emerald-200/80' },
    CANCELLED: { label: 'Đã hủy', className: 'bg-rose-50 text-rose-700 border-rose-200/80' },
    REFUSED: { label: 'Đã từ chối', className: 'bg-rose-50 text-rose-700 border-rose-200/80' },
    SKIPPED: { label: 'Bỏ qua', className: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
};

function getStatusBadge(s: string | undefined | null) {
    if (!s) return { label: '—', className: 'bg-neutral-100 text-neutral-600 border-neutral-200' };
    const key = String(s).toUpperCase();
    return STATUS_BADGE_MAP[key] || { label: s, className: 'bg-neutral-100 text-neutral-600 border-neutral-200' };
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
                    'flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200/80 bg-neutral-50/60 p-8 text-center min-h-[300px]',
                    className,
                )}
            >
                <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3">
                    <UserRound className="h-6 w-6 text-neutral-400" />
                </div>
                <p className="text-sm font-semibold text-neutral-600 max-w-xs">{emptyLabel}</p>
            </div>
        );
    }

    const so = serving.service_order;
    const activeDetails =
        so?.details.filter((d) => ACTIVE_SOD_STATUSES.has(String(d.status).toUpperCase())) ?? [];

    return (
        <div
            className={cn(
                'flex flex-col justify-between rounded-2xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50/20 via-white to-white p-5 shadow-sm',
                className,
            )}
        >
            <div className="space-y-4">
                {/* Header section with badge & EMR button */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-200">
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">STT</span>
                            <span className="text-xl font-black leading-none">{serving.queue_number}</span>
                        </div>
                        <div>
                            <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100/70 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                ĐANG PHỤC VỤ
                            </div>
                            <h2 className="mt-1 text-lg font-extrabold text-neutral-900 tracking-tight">
                                {serving.patient?.full_name || 'Bệnh nhân'}
                            </h2>
                            <p className="text-xs font-medium text-neutral-500">
                                {formatDob(serving.patient?.dob ?? null)} · {genderLabel(serving.patient?.gender ?? '')}
                            </p>
                        </div>
                    </div>
                    {onOpenEmr && (
                        <Button
                            variant="outline"
                            className="h-8.5 rounded-xl border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 hover:text-indigo-600 hover:border-indigo-200 shadow-xs"
                            onClick={() => onOpenEmr(serving.queue_id)}
                            disabled={isActing}
                            startIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        >
                            Mở EMR
                        </Button>
                    )}
                </div>

                {/* Step Info */}
                {serving.step && (
                    <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-3.5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                            Bước khám hiện tại
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-neutral-800">
                                {serving.step.step_name}
                            </span>
                            {serving.step.service_code && (
                                <span className="rounded-md bg-neutral-200/70 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-neutral-600">
                                    {serving.step.service_code}
                                </span>
                            )}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-md bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 text-[11px] font-bold text-indigo-700 shadow-2xs">
                                {formatStepType(serving.step.step_type)}
                            </span>
                            {(() => {
                                const badge = getStatusBadge(serving.step.step_status);
                                return (
                                    <span className={cn('rounded-md border px-2 py-0.5 text-[11px] font-bold shadow-2xs', badge.className)}>
                                        {badge.label}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Service Order (if any) */}
                {so && (
                    <div className="space-y-2.5 rounded-xl border border-neutral-200/70 bg-neutral-50/40 p-3.5">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                                Chỉ định · {so.name}
                            </p>
                            {(() => {
                                const badge = getStatusBadge(so.status);
                                return (
                                    <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-2xs', badge.className)}>
                                        {badge.label}
                                    </span>
                                );
                            })()}
                        </div>
                        <ul className="space-y-2">
                            {so.details.map((d) => {
                                const active = ACTIVE_SOD_STATUSES.has(
                                    String(d.status).toUpperCase(),
                                );
                                const detailBadge = getStatusBadge(d.status);
                                return (
                                    <li
                                        key={d.service_order_detail_id}
                                        className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200/80 bg-white px-3 py-2 shadow-2xs"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-bold text-neutral-800">
                                                {d.service_name || d.name || d.service_code || 'Dịch vụ'}
                                            </p>
                                            <p className="text-[11px] font-medium text-neutral-400 mt-0.5">
                                                x{d.quantity} · <span className="font-semibold text-neutral-600">{detailBadge.label}</span>
                                            </p>
                                        </div>
                                        {active && (
                                            <div className="flex shrink-0 gap-1.5">
                                                <Button
                                                    size="sm"
                                                    className="h-7.5 rounded-lg bg-emerald-600 px-2.5 text-[11px] font-bold text-white hover:bg-emerald-700 shadow-xs"
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
                                                    className="h-7.5 rounded-lg border-rose-200 px-2.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 shadow-xs"
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
                                    className="h-8.5 rounded-xl border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
                                    disabled={isActing}
                                    onClick={() => void onCompleteServiceOrder?.()}
                                    startIcon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                                >
                                    Xong cả SO
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-8.5 rounded-xl border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"
                                    disabled={isActing}
                                    onClick={() => void onRefuseServiceOrder?.()}
                                    startIcon={<XCircle className="h-3.5 w-3.5" />}
                                >
                                    Hủy SO
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 flex flex-wrap gap-2.5 border-t border-neutral-100/90 pt-4">
                <Button
                    className="h-10 flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-bold shadow-sm shadow-emerald-200 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] transition-all"
                    disabled={isActing || !onCompleteStep}
                    onClick={() => void onCompleteStep?.()}
                    startIcon={
                        isActing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4" />
                        )
                    }
                >
                    Hoàn thành bước
                </Button>
                <Button
                    variant="outline"
                    className="h-10 rounded-xl border-rose-200 bg-rose-50/40 text-xs sm:text-sm font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-300 shadow-xs"
                    disabled={isActing || !onRefuseStep}
                    onClick={() => void onRefuseStep?.()}
                >
                    Từ chối bước
                </Button>
                {onMiss && (
                    <Button
                        variant="outline"
                        className="h-10 rounded-xl border-neutral-200 text-xs sm:text-sm font-bold text-neutral-600 hover:bg-neutral-50 shadow-xs"
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
