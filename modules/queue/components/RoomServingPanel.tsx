import { useState } from 'react';
import {
    CheckCircle2,
    ExternalLink,
    Loader2,
    UserRound,
    UserX,
    X,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import type { Serving } from '../types/queue.types';
import { ACTIVE_SOD_STATUSES } from '../types/queue.types';

export interface RoomServingPanelProps {
    serving: Serving | null;
    isActing?: boolean;
    onStartServing?: () => void | Promise<void>;
    onCompleteDetail?: (detailId: string) => void | Promise<void>;
    onRefuseDetail?: (detailId: string) => void | Promise<void>;
    onCompleteServiceOrder?: () => void | Promise<void>;
    onRefuseServiceOrder?: () => void | Promise<void>;
    onCompleteStep?: () => void | Promise<void>;
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
    onStartServing,
    onCompleteDetail,
    onRefuseDetail,
    onCompleteServiceOrder,
    onRefuseServiceOrder,
    onCompleteStep,
    onMiss,
    onOpenEmr,
    className,
    emptyLabel = 'Chưa có bệnh nhân trong phòng. Bấm “Gọi tiếp theo”.',
}: RoomServingPanelProps) {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isMissConfirmOpen, setIsMissConfirmOpen] = useState(false);

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

    const isCalled =
        serving.status === 'CALLED' ||
        (!serving.serving_started_at && String(serving.step?.step_status).toUpperCase() === 'PENDING');

    const so = serving.service_order;
    const activeDetails =
        so?.details.filter((d) => ACTIVE_SOD_STATUSES.has(String(d.status).toUpperCase())) ?? [];

    return (
        <div
            className={cn(
                'flex flex-col justify-between rounded-2xl border p-5 shadow-sm relative transition-colors',
                isCalled
                    ? 'border-amber-300/80 bg-gradient-to-b from-amber-50/40 via-white to-white'
                    : 'border-emerald-200/60 bg-gradient-to-b from-emerald-50/20 via-white to-white',
                className,
            )}
        >
            <div className="space-y-4">
                {/* Header section with badge & EMR button */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                'flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-sm',
                                isCalled
                                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-200'
                                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200',
                            )}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">STT</span>
                            <span className="text-xl font-black leading-none">{serving.queue_number}</span>
                        </div>
                        <div>
                            {isCalled ? (
                                <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                                    ĐANG GỌI VÀO PHÒNG
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-100/70 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    ĐANG PHỤC VỤ
                                </div>
                            )}
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
                            className="h-8.5 rounded-xl border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 hover:text-indigo-600 hover:border-indigo-200 shadow-xs cursor-pointer"
                            onClick={() => onOpenEmr(serving.queue_id)}
                            disabled={isActing}
                            startIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        >
                            Xem bệnh án
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
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-md bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 text-[11px] font-bold text-indigo-700 shadow-2xs">
                                {formatStepType(serving.step.step_type)}
                            </span>
                            {(() => {
                                const badge = isCalled
                                    ? { label: 'Chờ vào phòng', className: 'bg-amber-100 text-amber-800 border-amber-300' }
                                    : getStatusBadge(serving.step.step_status);
                                return (
                                    <span className={cn('rounded-md border px-2 py-0.5 text-[11px] font-bold shadow-2xs', badge.className)}>
                                        {badge.label}
                                    </span>
                                );
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 flex flex-wrap gap-2.5 border-t border-neutral-100/90 pt-4">
                {isCalled ? (
                    <>
                        {onStartServing && (
                            <Button
                                className="h-10 flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs sm:text-sm font-bold shadow-sm shadow-indigo-200 active:scale-[0.99] transition-all cursor-pointer"
                                disabled={isActing}
                                onClick={() => void onStartServing()}
                                startIcon={
                                    isActing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )
                                }
                            >
                                Bắt đầu khám
                            </Button>
                        )}
                        {onMiss && (
                            <Button
                                variant="outline"
                                className="h-10 rounded-xl border-neutral-200 text-xs sm:text-sm font-bold text-neutral-600 hover:bg-neutral-50 shadow-xs cursor-pointer"
                                disabled={isActing}
                                onClick={() => setIsMissConfirmOpen(true)}
                            >
                                Vắng mặt
                            </Button>
                        )}
                    </>
                ) : (
                    <>
                        <Button
                            className="h-10 flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs sm:text-sm font-bold shadow-sm shadow-emerald-200 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.99] transition-all cursor-pointer"
                            disabled={isActing || !onCompleteStep}
                            onClick={() => setIsConfirmOpen(true)}
                            startIcon={
                                isActing ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                )
                            }
                        >
                            Hoàn thành phiên khám
                        </Button>
                        {onMiss && (
                            <Button
                                variant="outline"
                                className="h-10 rounded-xl border-neutral-200 text-xs sm:text-sm font-bold text-neutral-600 hover:bg-neutral-50 shadow-xs cursor-pointer"
                                disabled={isActing}
                                onClick={() => setIsMissConfirmOpen(true)}
                            >
                                Vắng mặt
                            </Button>
                        )}
                    </>
                )}
            </div>


            {/* Confirmation Modal */}
            {isConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setIsConfirmOpen(false)}
                    />

                    {/* Modal Box */}
                    <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-xs">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-neutral-900">
                                        Xác nhận hoàn thành phiên khám
                                    </h3>
                                    <p className="text-xs text-neutral-500 font-medium mt-0.5">
                                        Hoàn tất phiên khám cho bệnh nhân
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsConfirmOpen(false)}
                                className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4 text-xs">
                            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 font-medium">Bệnh nhân:</span>
                                    <span className="font-extrabold text-neutral-900 text-sm">
                                        {serving.patient?.full_name || 'Bệnh nhân'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 font-medium">Số thứ tự:</span>
                                    <span className="font-extrabold text-emerald-700 font-mono bg-emerald-100/80 px-2 py-0.5 rounded-md text-xs">
                                        Số {serving.queue_number}
                                    </span>
                                </div>
                                {serving.step?.step_name && (
                                    <div className="flex justify-between items-start pt-2 border-t border-emerald-100/70">
                                        <span className="text-neutral-500 font-medium">Bước khám:</span>
                                        <span className="font-bold text-neutral-800 text-right max-w-[65%]">
                                            {serving.step.step_name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                                Bạn có chắc chắn muốn Hoàn thành phiên khám này không ?<strong className="text-emerald-700 font-bold">Đã khám</strong>.
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                            <Button
                                variant="outline"
                                className="h-9.5 rounded-xl border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 px-4"
                                disabled={isActing}
                                onClick={() => setIsConfirmOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="h-9.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-sm shadow-emerald-200 hover:from-emerald-700 hover:to-teal-700 px-5"
                                disabled={isActing}
                                onClick={async () => {
                                    setIsConfirmOpen(false);
                                    await onCompleteStep?.();
                                }}
                                startIcon={
                                    isActing ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )
                                }
                            >
                                Xác nhận hoàn thành
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Miss Confirmation Modal */}
            {isMissConfirmOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setIsMissConfirmOpen(false)}
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
                                        Chuyển bệnh nhân sang danh sách Vắng mặt
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsMissConfirmOpen(false)}
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
                                        {serving.patient?.full_name || 'Bệnh nhân'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 font-medium">Số thứ tự:</span>
                                    <span className="font-extrabold text-amber-800 font-mono bg-amber-100 px-2 py-0.5 rounded-md text-xs">
                                        Số {serving.queue_number}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                                Bạn có chắc chắn muốn chuyển bệnh nhân này sang danh sách <strong className="text-amber-700 font-bold">Vắng mặt</strong> không?
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                            <Button
                                variant="outline"
                                className="h-9.5 rounded-xl border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100 px-4"
                                disabled={isActing}
                                onClick={() => setIsMissConfirmOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="h-9.5 rounded-xl bg-amber-600 text-white text-xs font-bold shadow-sm shadow-amber-200 hover:bg-amber-700 px-5"
                                disabled={isActing}
                                onClick={async () => {
                                    setIsMissConfirmOpen(false);
                                    await onMiss?.();
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
