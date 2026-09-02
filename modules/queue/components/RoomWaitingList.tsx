'use client';

import { useState } from 'react';
import { Clock, ExternalLink, Pin, PhoneCall, RotateCcw, UserX, CheckCircle2, X, Loader2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import type { FinishedEntry, MissingEntry, WaitingEntry } from '../types/queue.types';
import { useFlaggableRules } from '../hooks/useFlaggableRules';
import { RuleFlagChipPicker } from './RuleFlagChipPicker';

export interface RoomWaitingListProps {
    waiting: WaitingEntry[];
    missing: MissingEntry[];
    finished?: FinishedEntry[];
    isActing?: boolean;
    onCallByStep?: (stepId: string, queueId: string) => void | Promise<void>;
    onMiss?: (queueId: string) => void | Promise<void>;
    onRecall?: (queueId: string) => void | Promise<void>;
    onPinTop?: (queueId: string) => void | Promise<void>;
    onSetManualRules?: (queueId: string, codes: string[]) => void | Promise<void>;
    onOpenEmr?: (queueId: string) => void;
    className?: string;
}

const QUEUE_TYPE_LABEL: Record<string, string> = {
    NEW: 'Khám mới',
    APPOINTMENT: 'Đặt lịch hẹn',
    RETURNING: 'Tái khám',
    TRANSFER: 'Chuyển khoa',
    WALK_IN: 'Vãng lai',
    WALK_IN_BASE: 'Vãng lai',
};

function typeBadge(queueType: string): string {
    return QUEUE_TYPE_LABEL[queueType?.toUpperCase()] || queueType || '';
}

const SYSTEM_REASON_RE = /^(AGING|PINNED|HOLD_|INTERLEAVE)/i;

function visibleReasons(reasons: string[] | undefined): string[] {
    if (!reasons?.length) return [];
    return reasons.filter((r) => r && !SYSTEM_REASON_RE.test(r));
}

function formatEtaTime(eta: string | null | undefined): string {
    if (!eta) return '';
    try {
        const d = new Date(eta);
        if (Number.isNaN(d.getTime())) return eta;
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return eta;
    }
}

export function RoomWaitingList({
    waiting,
    missing,
    finished = [],
    isActing = false,
    onCallByStep,
    onMiss,
    onRecall,
    onPinTop,
    onSetManualRules,
    onOpenEmr,
    className,
}: RoomWaitingListProps) {
    const [tab, setTab] = useState<'waiting' | 'missing' | 'finished'>('waiting');
    const [missPatient, setMissPatient] = useState<WaitingEntry | null>(null);
    const { rules: flaggableRules, isLoading: flaggableLoading } = useFlaggableRules();

    return (
        <div className={cn('flex h-full min-h-0 flex-col rounded-2xl border border-neutral-200/70 bg-white shadow-sm overflow-hidden', className)}>
            {/* Segmented Control Header */}
            <div className="p-2.5 bg-neutral-50/80 border-b border-neutral-100">
                <div className="flex rounded-xl bg-neutral-200/60 p-1">
                    <button
                        type="button"
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all',
                            tab === 'waiting'
                                ? 'bg-white text-indigo-700 shadow-xs'
                                : 'text-neutral-600 hover:text-neutral-900',
                        )}
                        onClick={() => setTab('waiting')}
                    >
                        <span>Đang chờ</span>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.2 text-[10px] font-extrabold',
                                tab === 'waiting'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-neutral-300/70 text-neutral-600',
                            )}
                        >
                            {waiting.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all',
                            tab === 'missing'
                                ? 'bg-white text-amber-700 shadow-xs'
                                : 'text-neutral-600 hover:text-neutral-900',
                        )}
                        onClick={() => setTab('missing')}
                    >
                        <span>Vắng mặt</span>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.2 text-[10px] font-extrabold',
                                tab === 'missing'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-neutral-300/70 text-neutral-600',
                            )}
                        >
                            {missing.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        className={cn(
                            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all',
                            tab === 'finished'
                                ? 'bg-white text-emerald-700 shadow-xs'
                                : 'text-neutral-600 hover:text-neutral-900',
                        )}
                        onClick={() => setTab('finished')}
                    >
                        <span>Đã khám</span>
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.2 text-[10px] font-extrabold',
                                tab === 'finished'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-neutral-300/70 text-neutral-600',
                            )}
                        >
                            {finished.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* List content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2.5">
                {tab === 'waiting' && waiting.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-400">
                        <Clock className="h-8 w-8 mb-2 stroke-1 opacity-50" />
                        <p className="text-xs font-semibold">Hiện không có bệnh nhân nào trong hàng chờ</p>
                    </div>
                )}
                {tab === 'waiting' &&
                    waiting.map((w) => (
                        <div
                            key={w.queue_id}
                            className="rounded-xl border border-neutral-200/70 bg-white p-3 hover:border-indigo-200 hover:bg-indigo-50/20 transition-all shadow-2xs"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 font-black text-neutral-800 text-sm border border-neutral-200/60">
                                        {w.queue_number}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {w.is_pinned && (
                                                <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                                                    <Pin className="h-3 w-3 fill-amber-500 text-amber-500" />
                                                    Ghim
                                                </span>
                                            )}
                                            {w.queue_type && (
                                                <span className="rounded-md bg-indigo-50 border border-indigo-200/60 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                                                    {typeBadge(w.queue_type)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 truncate text-sm font-bold text-neutral-800">
                                            {w.patient_name}
                                        </p>
                                        {visibleReasons(w.reasons).length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {visibleReasons(w.reasons).map((reason) => (
                                                    <span
                                                        key={`${w.queue_id}-${reason}`}
                                                        className="rounded-md bg-violet-50 border border-violet-200/70 px-1.5 py-0.5 text-[10px] font-bold text-violet-700"
                                                    >
                                                        {reason}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {onSetManualRules && (
                                            <RuleFlagChipPicker
                                                rules={flaggableRules}
                                                selectedCodes={w.manual_rule_codes ?? []}
                                                onChange={(codes) =>
                                                    void onSetManualRules(w.queue_id, codes)
                                                }
                                                disabled={isActing}
                                                isLoading={flaggableLoading}
                                                compact
                                                accent="indigo"
                                                className="mt-1.5"
                                            />
                                        )}
                                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-neutral-400">
                                            <Clock className="h-3 w-3" />
                                            Thời gian chờ ~{w.eta_minutes ?? '—'}p
                                            {w.eta_time ? ` · ${formatEtaTime(w.eta_time)}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    {onOpenEmr && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 rounded-lg border-neutral-200 px-2.5 text-xs font-bold text-neutral-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 shadow-2xs"
                                            disabled={isActing}
                                            onClick={() => onOpenEmr(w.queue_id)}
                                            startIcon={<ExternalLink className="h-3 w-3" />}
                                        >
                                            Xem thông tin
                                        </Button>
                                    )}
                                    {onCallByStep && w.step_id && (
                                        <Button
                                            size="sm"
                                            className="h-8 rounded-lg bg-indigo-600 px-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-2xs"
                                            disabled={isActing}
                                            onClick={() =>
                                                void onCallByStep(w.step_id!, w.queue_id)
                                            }
                                            startIcon={<PhoneCall className="h-3 w-3" />}
                                        >
                                            Gọi
                                        </Button>
                                    )}
                                    {onPinTop && !w.is_pinned && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 rounded-lg border-neutral-200 px-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 hover:text-amber-600 shadow-2xs"
                                            disabled={isActing}
                                            onClick={() => void onPinTop(w.queue_id)}
                                            title="Ghim lên đầu"
                                        >
                                            <Pin className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    {onMiss && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 rounded-lg border-rose-200 px-2 text-xs font-bold text-rose-600 hover:bg-rose-50 shadow-2xs"
                                            disabled={isActing}
                                            onClick={() => setMissPatient(w)}
                                            title="Báo vắng mặt"
                                        >
                                            <UserX className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                {tab === 'missing' && missing.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-400">
                        <UserX className="h-8 w-8 mb-2 stroke-1 opacity-50" />
                        <p className="text-xs font-semibold">Không có bệnh nhân vắng mặt</p>
                    </div>
                )}
                {tab === 'missing' &&
                    missing.map((m) => (
                        <div
                            key={m.queue_id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-amber-50/40 p-3 shadow-2xs"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-black text-amber-900 text-sm border border-amber-200">
                                    {m.queue_number}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-neutral-800">{m.patient_name}</p>
                                    <p className="text-[11px] font-medium text-amber-700">Trạng thái: Vắng mặt</p>
                                </div>
                            </div>
                            {onRecall && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg border-amber-300 bg-white px-3 text-xs font-bold text-amber-800 hover:bg-amber-50 shadow-xs"
                                    disabled={isActing}
                                    onClick={() => void onRecall(m.queue_id)}
                                    startIcon={<RotateCcw className="h-3.5 w-3.5 text-amber-600" />}
                                >
                                    Gọi lại
                                </Button>
                            )}
                        </div>
                    ))}

                {tab === 'finished' && finished.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-neutral-400">
                        <CheckCircle2 className="h-8 w-8 mb-2 stroke-1 opacity-50 text-emerald-500" />
                        <p className="text-xs font-semibold">Chưa có bệnh nhân nào đã khám</p>
                    </div>
                )}
                {tab === 'finished' &&
                    finished.map((f) => {
                        const patientName = f.patient_name || f.patient?.full_name || 'Bệnh nhân';
                        return (
                            <div
                                key={f.queue_id}
                                className="rounded-xl border border-neutral-200/70 bg-white p-3 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all shadow-2xs"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 font-black text-emerald-800 text-sm border border-emerald-200/60">
                                            {f.queue_number}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {f.queue_type && (
                                                    <span className="rounded-md bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                                        {typeBadge(f.queue_type)}
                                                    </span>
                                                )}
                                                {f.step?.step_name && (
                                                    <span className="rounded-md bg-neutral-100 border border-neutral-200/80 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                                                        {f.step.step_name}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 truncate text-sm font-bold text-neutral-800">
                                                {patientName}
                                            </p>
                                            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-neutral-400">
                                                <Clock className="h-3 w-3 text-emerald-600" />
                                                {f.finished_at
                                                    ? `Đã khám lúc ${formatEtaTime(f.finished_at)}`
                                                    : 'Đã hoàn thành'}
                                                {f.duration_minutes !== undefined && f.duration_minutes !== null
                                                    ? ` · ${f.duration_minutes} phút`
                                                    : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center">
                                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-1 rounded-lg">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Đã khám
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>

            {/* Miss Patient Confirmation Modal */}
            {missPatient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setMissPatient(null)}
                    />

                    {/* Modal Box */}
                    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-200/80 shadow-xs">
                                    <UserX className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-neutral-900">
                                        Xác nhận báo vắng mặt
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-medium mt-0.5">
                                        Đánh dấu bệnh nhân vắng mặt
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setMissPatient(null)}
                                className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4 text-xs">
                            <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 font-medium">Bệnh nhân:</span>
                                    <span className="font-extrabold text-neutral-900 text-sm">
                                        {missPatient.patient_name}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 font-medium">Số thứ tự:</span>
                                    <span className="font-extrabold text-amber-800 font-mono bg-amber-100 px-2 py-0.5 rounded-md text-xs">
                                        Số {missPatient.queue_number}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                                Bạn có chắc chắn muốn báo bệnh nhân này <strong className="text-amber-700 font-bold">Vắng mặt</strong> không?
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                            <Button
                                variant="outline"
                                className="h-9.5 rounded-xl border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 px-4"
                                disabled={isActing}
                                onClick={() => setMissPatient(null)}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="h-9.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-200 hover:bg-amber-700 px-5"
                                disabled={isActing}
                                onClick={async () => {
                                    const qid = missPatient.queue_id;
                                    setMissPatient(null);
                                    await onMiss?.(qid);
                                }}
                                startIcon={
                                    isActing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <UserX className="h-4 w-4" />
                                    )
                                }
                            >
                                Xác nhận vắng mặt
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
