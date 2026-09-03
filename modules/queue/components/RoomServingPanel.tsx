import { useState } from 'react';
import {
    Calendar,
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

const BRAND_GRADIENT = 'bg-[#8B7CF6] shadow-[#8B7CF6]/25';
const BRAND_SURFACE = 'border-[#8B7CF6]/30 bg-gradient-to-b from-[#8B7CF6]/10 via-white to-white';

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

    const showEmrButton = Boolean(onOpenEmr);

    return (
        <div
            className={cn(
                'flex flex-col justify-between rounded-2xl border p-5 shadow-sm relative transition-colors',
                BRAND_SURFACE,
                className,
            )}
        >
            {showEmrButton && (
                <Button
                    variant="outline"
                    className="absolute top-4 right-4 z-10 h-8.5 rounded-xl border-[#8B7CF6]/35 bg-white/90 text-xs font-bold text-[#7C6FE0] hover:bg-[#F5F2FF] hover:text-[#8B7CF6] hover:border-[#8B7CF6]/50 shadow-xs cursor-pointer"
                    onClick={() => onOpenEmr!(serving.queue_id)}
                    disabled={isActing}
                    startIcon={<ExternalLink className="h-3.5 w-3.5" />}
                >
                    Xem bệnh án
                </Button>
            )}

            <div className="space-y-4 pr-28">
                {/* Header section with badge */}
                <div className="flex items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={cn(
                                'flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-2xl text-white shadow-sm',
                                BRAND_GRADIENT,
                            )}
                        >
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">STT</span>
                            <span className="text-xl font-black leading-none">{serving.queue_number}</span>
                        </div>
                        <div className="min-w-0">
                            {isCalled ? (
                                <div className="inline-flex items-center gap-1.5 rounded-md bg-[#8B7CF6] px-2 py-0.5 text-[11px] font-bold text-white border border-[#8B7CF6]">
                                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                                    ĐANG GỌI VÀO PHÒNG
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-1.5 rounded-md bg-[#EDE9FE] px-2 py-0.5 text-[11px] font-bold text-[#7C6FE0] border border-[#8B7CF6]/25">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#8B7CF6] animate-pulse" />
                                    ĐANG PHỤC VỤ
                                </div>
                            )}
                            <h2 className="mt-1 text-lg font-extrabold text-neutral-900 tracking-tight truncate">
                                {serving.patient?.full_name || 'Bệnh nhân'}
                            </h2>
                            <p className="text-xs font-medium text-neutral-500">
                                {formatDob(serving.patient?.dob ?? null)} · {genderLabel(serving.patient?.gender ?? '')}
                            </p>
                            {serving.appointment_time && (
                                <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-neutral-600">
                                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                                    <span>Hẹn khám: {serving.appointment_time}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 flex flex-wrap gap-2.5 border-t border-neutral-100/90 pt-4">
                {isCalled ? (
                    <>
                        {onStartServing && (
                            <Button
                                className="h-10 flex-1 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE8] text-white text-xs sm:text-sm font-bold shadow-sm shadow-[#8B7CF6]/25 active:scale-[0.99] transition-all cursor-pointer"
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
                            className="h-10 flex-1 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-xs sm:text-sm font-bold shadow-sm shadow-[#8B7CF6]/25 active:scale-[0.99] transition-all cursor-pointer"
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
                                <div className="w-10 h-10 rounded-2xl bg-[#F5F2FF] flex items-center justify-center border border-[#8B7CF6]/20 shadow-xs">
                                    <CheckCircle2 className="w-5 h-5 text-[#8B7CF6]" />
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
                            <div className="bg-[#F5F2FF]/60 border border-[#8B7CF6]/15 rounded-2xl p-4 space-y-2.5">
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 font-medium">Bệnh nhân:</span>
                                    <span className="font-extrabold text-neutral-900 text-sm">
                                        {serving.patient?.full_name || 'Bệnh nhân'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 font-medium">Số thứ tự:</span>
                                    <span className="font-extrabold text-[#7C6FE0] font-mono bg-[#EDE9FE] px-2 py-0.5 rounded-md text-xs">
                                        Số {serving.queue_number}
                                    </span>
                                </div>
                                {serving.step?.step_name && (
                                    <div className="flex justify-between items-start pt-2 border-t border-[#8B7CF6]/10">
                                        <span className="text-neutral-500 font-medium">Bước khám:</span>
                                        <span className="font-bold text-neutral-800 text-right max-w-[65%]">
                                            {serving.step.step_name}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                                Bạn có chắc chắn muốn Hoàn thành phiên khám này không? Trạng thái sẽ chuyển sang <strong className="text-[#7C6FE0] font-bold">Đã khám</strong>.
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
                                className="h-9.5 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-xs font-bold shadow-sm shadow-[#8B7CF6]/25 px-5"
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
