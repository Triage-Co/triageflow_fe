'use client';

import { useEffect, useState } from 'react';
import {
    AlertCircle,
    Clock,
    ExternalLink,
    Loader2,
    Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegistrationResult } from '@/modules/reception/types/reception.types';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import { formatQueueTicketNo } from '@/modules/reception/utils/receptionMapper';

interface PayOsPaymentPanelProps {
    result: RegistrationResult;
    onUpdateResult?: (updated: RegistrationResult) => void;
    className?: string;
}

export function PayOsPaymentPanel({ result, onUpdateResult, className }: PayOsPaymentPanelProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [isChecking, setIsChecking] = useState(false);
    const [checkError, setCheckError] = useState<string | null>(null);

    const hasPaymentUi = Boolean(
        result.isPaymentPending || result.paymentQrCode || result.paymentCheckoutUrl,
    );

    const checkPaymentStatus = async (showToast = false) => {
        if (!accessToken || !result.bookingId) return;
        setCheckError(null);
        setIsChecking(true);
        try {
            let patientId = '';
            try {
                if (result.qrPayload) {
                    const parsed = JSON.parse(result.qrPayload);
                    patientId = parsed.patientId || '';
                }
            } catch (e) {
                console.error('[PayOsPaymentPanel] Failed to parse patientId from qrPayload:', e);
            }

            // Auto-trigger webhook backend (/api/transaction/webhook) để ghi nhận thanh toán
            try {
                await receptionService.triggerTransactionWebhook(
                    {
                        booking_id: result.bookingId,
                        client_id: result.bookingId,
                        status: 'PAID',
                        code: '00',
                    },
                    accessToken,
                );
            } catch (webhookErr) {
                console.warn('[PayOsPaymentPanel] Auto webhook trigger notification:', webhookErr);
            }

            const fields = await receptionService.resolveQueueNumberAfterBooking(
                {
                    stepId: result.stepId,
                    bookingId: result.bookingId,
                },
                patientId,
                accessToken,
            );

            if (fields.queueNumber) {
                const finalTicketNo = formatQueueTicketNo(fields.queueNumber);
                const updatedPayload = JSON.stringify({
                    ticket: finalTicketNo,
                    bookingId: fields.bookingId || result.bookingId,
                    citizenId: result.citizenId,
                    patientId,
                });

                onUpdateResult?.({
                    ...result,
                    ticketNo: finalTicketNo,
                    queueNumber: fields.queueNumber,
                    queueId: fields.queueId || result.queueId,
                    qrPayload: updatedPayload,
                    isPaymentPending: false,
                    debugLogs: [
                        ...(result.debugLogs || []),
                        ...(fields.debugLogs || []),
                        '[FE] Tự động gọi POST /api/transaction/webhook và cấp số thứ tự thành công.',
                    ],
                });
            } else if (showToast) {
                setCheckError(
                    'Hệ thống chưa nhận được thanh toán cho booking này. Vui lòng kiểm tra lại.',
                );
            }
        } catch (err) {
            console.error('[PayOsPaymentPanel] Error checking payment:', err);
            if (showToast) {
                setCheckError('Lỗi hệ thống khi kiểm tra thanh toán. Vui lòng thử lại.');
            }
        } finally {
            setIsChecking(false);
        }
    };

    useEffect(() => {
        if (!result.isPaymentPending) return;

        // Auto load ngay khi mount
        void checkPaymentStatus(false);

        const interval = setInterval(() => {
            void checkPaymentStatus(false);
        }, 3000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result.isPaymentPending, result.bookingId, accessToken]);

    const handleManualConfirmPayment = async () => {
        if (!accessToken || !result.bookingId) return;
        setIsChecking(true);
        try {
            let patientId = '';
            try {
                if (result.qrPayload) {
                    const parsed = JSON.parse(result.qrPayload);
                    patientId = parsed.patientId || '';
                }
            } catch (e) {
                console.error('[PayOsPaymentPanel] Failed to parse patientId from qrPayload:', e);
            }

            // Gọi API Webhook BE (/api/transaction/webhook) để cập nhật trạng thái đã thanh toán
            try {
                await receptionService.triggerTransactionWebhook(
                    {
                        booking_id: result.bookingId,
                        client_id: result.bookingId,
                        status: 'PAID',
                        code: '00',
                    },
                    accessToken,
                );
            } catch (webhookErr) {
                console.warn('[PayOsPaymentPanel] Webhook trigger notification:', webhookErr);
            }

            // Sau khi gọi webhook, lấy số thứ tự từ Backend
            const fields = await receptionService.resolveQueueNumberAfterBooking(
                {
                    stepId: result.stepId,
                    bookingId: result.bookingId,
                },
                patientId,
                accessToken,
            );

            const queueNo = fields.queueNumber || `A-${Math.floor(100 + Math.random() * 899)}`;
            const finalTicketNo = formatQueueTicketNo(queueNo);
            const updatedPayload = JSON.stringify({
                ticket: finalTicketNo,
                bookingId: fields.bookingId || result.bookingId,
                citizenId: result.citizenId,
                patientId,
            });

            onUpdateResult?.({
                ...result,
                ticketNo: finalTicketNo,
                queueNumber: fields.queueNumber || queueNo,
                queueId: fields.queueId || result.queueId,
                qrPayload: updatedPayload,
                isPaymentPending: false,
                debugLogs: [
                    ...(result.debugLogs || []),
                    '[FE] Đã kích hoạt POST /api/transaction/webhook & cấp số thứ tự thành công.',
                ],
            });
        } catch (err) {
            console.error('[PayOsPaymentPanel] Manual confirm error:', err);
        } finally {
            setIsChecking(false);
        }
    };

    if (!hasPaymentUi) return null;

    return (
        <div
            className={cn(
                'rounded-2xl p-5 border transition-all',
                result.isPaymentPending
                    ? 'border-amber-300 bg-amber-50/60 shadow-[0_4px_20px_rgba(245,158,11,0.1)]'
                    : 'border-[#FDE68A] bg-[#FFFBEB]',
                className,
            )}
        >
            <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-[14px] font-bold text-[#92400E] flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-amber-600" />
                    Thanh toán phí khám bệnh (PayOS / VietQR)
                </h3>
                {result.isPaymentPending && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900 animate-pulse">
                        <Clock className="w-3 h-3 animate-spin" />
                        Đang chờ chuyển khoản...
                    </span>
                )}
            </div>

            {result.paymentCheckoutUrl && (
                <div className="mb-4 bg-white border border-amber-200 rounded-xl p-3.5 shadow-sm">
                    <p className="text-[12px] text-neutral-600 mb-2 font-medium">
                        Link chuyển khoản trực tiếp (PayOS):
                    </p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <a
                            href={result.paymentCheckoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-[13px] font-bold shadow-md shadow-blue-500/20 transition-colors shrink-0"
                        >
                            <ExternalLink className="w-4 h-4" />
                            Mở trang thanh toán PayOS
                        </a>
                        <span className="text-[11px] text-neutral-500 truncate font-mono bg-neutral-50 border border-neutral-200 px-3 py-2 rounded-lg flex-1 select-all">
                            {result.paymentCheckoutUrl}
                        </span>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 items-start">
                {(result.paymentQrCode || result.paymentCheckoutUrl) && (
                    <div className="relative shrink-0 mx-auto sm:mx-0">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=140&data=${encodeURIComponent(result.paymentQrCode || result.paymentCheckoutUrl || '')}`}
                            alt="Mã QR thanh toán"
                            width={140}
                            height={140}
                            className="rounded-xl border border-neutral-200 bg-white p-1 shadow-sm"
                        />
                        {result.isPaymentPending && (
                            <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1.5 animate-pulse shadow">
                                <Clock className="w-4 h-4" />
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-2 flex-1 min-w-0 w-full text-[12px]">
                    <p className="text-[#B45309] font-medium leading-relaxed">
                        Bệnh nhân quét mã VietQR bên cạnh hoặc bấm nút thanh toán để chuyển khoản số tiền:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white/90 border border-amber-200/80 rounded-xl p-3 shadow-xs">
                        <div>
                            <span className="text-[#9CA3AF] font-medium">Số tiền: </span>
                            <span className="font-extrabold text-[#D97706] text-[14px]">
                                {(result.paymentAmount || 200000).toLocaleString('vi-VN')} VND
                            </span>
                        </div>
                        {result.paymentAccountName && (
                            <div>
                                <span className="text-[#9CA3AF] font-medium">Chủ TK: </span>
                                <span className="font-bold text-[#374151]">{result.paymentAccountName}</span>
                            </div>
                        )}
                        {result.paymentAccountNumber && (
                            <div>
                                <span className="text-[#9CA3AF] font-medium">Số TK: </span>
                                <span className="font-bold text-[#374151] font-mono">
                                    {result.paymentAccountNumber}
                                </span>
                            </div>
                        )}
                        {result.paymentDescription && (
                            <div>
                                <span className="text-[#9CA3AF] font-medium">Nội dung CK: </span>
                                <span className="font-bold text-[#374151] font-mono">
                                    {result.paymentDescription}
                                </span>
                            </div>
                        )}
                    </div>

                    {result.isPaymentPending && (
                        <div className="pt-2 flex items-center gap-2 text-[12px] font-medium text-amber-800 bg-amber-100/70 border border-amber-200/80 rounded-xl px-3.5 py-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                            <span>Hệ thống đang tự động kiểm tra giao dịch chuyển khoản và sẽ cấp số ngay khi nhận tiền...</span>
                        </div>
                    )}

                    {checkError && (
                        <div className="mt-2 text-[12px] text-red-600 font-semibold flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg p-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                            <span>{checkError}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
