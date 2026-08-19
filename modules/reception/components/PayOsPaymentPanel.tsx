'use client';

import { useEffect, useState } from 'react';
import {
    AlertCircle,
    Clock,
    ExternalLink,
    Loader2,
    QrCode,
    RefreshCw,
    Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegistrationResult } from '@/modules/reception/types/reception.types';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import { formatQueueTicketNo, getTodayDateString } from '@/modules/reception/utils/receptionMapper';
import {
    mapActiveFlowsList,
    flowItemToRegistrationResult,
} from '@/modules/reception/utils/receptionFlowMapper';

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

    // Kiểm tra trạng thái thanh toán từ Backend và tải flow thực tế (giống cơ chế Kiosk)
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

            // 1. Thử gọi API sinh số thứ tự nếu có stepId
            if (result.stepId) {
                try {
                    await receptionService.generateBookingNumber(result.stepId, accessToken, true);
                } catch {
                    // BE trả 400 nếu chưa thanh toán, bỏ qua
                }
            }

            // 2. Tra cứu luồng khám Active của bệnh nhân từ API GET /api/flow/patient/{id}/active
            if (patientId) {
                try {
                    const rawFlows = await receptionService.getPatientActiveFlows(patientId, accessToken, getTodayDateString());
                    const mappedFlows = mapActiveFlowsList(rawFlows);
                    const matchedFlow =
                        mappedFlows.find((f) => f.bookingId === result.bookingId) ||
                        mappedFlows.find((f) => f.queueNumber) ||
                        mappedFlows[0];

                    if (matchedFlow && (matchedFlow.queueNumber || matchedFlow.ticketNo !== '—')) {
                        const flowResult = flowItemToRegistrationResult(matchedFlow, {
                            full_name: result.fullName,
                            citizen_id: result.citizenId,
                            phone: result.phone,
                            medical_coverage_id: result.insuranceId,
                        });

                        onUpdateResult?.({
                            ...result,
                            ...flowResult,
                            ticketNo: flowResult.ticketNo,
                            queueNumber: matchedFlow.queueNumber,
                            specialty: flowResult.specialty || result.specialty,
                            doctorLabel: flowResult.doctorLabel || result.doctorLabel,
                            roomLabel: flowResult.roomLabel || result.roomLabel,
                            slotTimeLabel: flowResult.slotTimeLabel || result.slotTimeLabel,
                            isPaymentPending: false,
                        });
                        return;
                    }
                } catch (flowErr) {
                    console.warn('[PayOsPaymentPanel] getPatientActiveFlows error:', flowErr);
                }
            }

            // 3. Fallback kiểm tra resolveQueueNumberAfterBooking
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
                });
            } else if (showToast) {
                setCheckError('Chưa nhận được giao dịch từ ngân hàng. Nếu bệnh nhân đã quét mã, vui lòng đợi vài giây và bấm kiểm tra lại!');
            }
        } catch (err) {
            console.error('[PayOsPaymentPanel] Error checking payment:', err);
            if (showToast) {
                setCheckError('Chưa nhận được giao dịch từ ngân hàng. Vui lòng kiểm tra lại.');
            }
        } finally {
            setIsChecking(false);
        }
    };

    // Auto poll mỗi 3 giây
    useEffect(() => {
        if (!result.isPaymentPending) return;

        const interval = setInterval(() => {
            void checkPaymentStatus(false);
        }, 3000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [result.isPaymentPending, result.bookingId, accessToken]);

    if (!hasPaymentUi) return null;

    const qrData = result.paymentQrCode || result.paymentCheckoutUrl || '';
    const qrImageUrl = qrData
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`
        : '';

    return (
        <div className={cn('max-w-4xl mx-auto w-full space-y-6', className)}>
            {/* Header Title */}
            <div className="text-center space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold mb-2">
                    <QrCode className="w-3.5 h-3.5" />
                    Thanh toán chuyển khoản VietQR / PayOS
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#1E2939] tracking-tight">
                    Quét mã VietQR để hoàn tất đặt lịch
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 font-medium">
                    Bệnh nhân quét mã QR bằng ứng dụng ngân hàng hoặc ví điện tử để thanh toán
                </p>
            </div>

            {/* Main 2-column card */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-lg items-stretch">
                {/* Left Column: VietQR Image */}
                <div className="md:col-span-6 flex flex-col items-center justify-center p-6 bg-neutral-50 rounded-2xl border border-neutral-200/70 space-y-4">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-500">
                        Mã VietQR Thanh Toán
                    </span>

                    <div className="bg-white p-4 rounded-2xl border-2 border-[#155DFC]/20 shadow-md relative">
                        {qrImageUrl ? (
                            <img
                                src={qrImageUrl}
                                alt="Mã VietQR Thanh toán"
                                className="w-56 h-56 object-contain rounded-xl"
                            />
                        ) : (
                            <div className="w-56 h-56 flex flex-col items-center justify-center text-neutral-400 text-xs font-semibold">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                                Đang tạo mã QR...
                            </div>
                        )}
                        {result.isPaymentPending && (
                            <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white rounded-full p-2 animate-pulse shadow-md">
                                <Clock className="w-4 h-4" />
                            </div>
                        )}
                    </div>

                    {result.paymentCheckoutUrl && (
                        <a
                            href={result.paymentCheckoutUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#155DFC] hover:underline pt-1"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Mở trang thanh toán PayOS trực tiếp
                        </a>
                    )}
                </div>

                {/* Right Column: Transaction Details & Status */}
                <div className="md:col-span-6 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                        <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
                            <h4 className="font-extrabold text-[#1E2939] text-base">
                                Chi tiết thanh toán
                            </h4>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 animate-pulse">
                                <Clock className="w-3 h-3 animate-spin text-amber-600" />
                                Chờ chuyển khoản...
                            </span>
                        </div>

                        <div className="space-y-3 text-xs font-medium text-neutral-600">
                            <div>
                                <span className="text-neutral-400 block mb-0.5">Bệnh nhân</span>
                                <span className="font-bold text-[#1E2939] text-sm">{result.fullName}</span>
                            </div>

                            <div>
                                <span className="text-neutral-400 block mb-0.5">Khoa / Dịch vụ khám</span>
                                <span className="font-bold text-[#1E2939] text-sm">{result.specialty}</span>
                            </div>

                            {result.paymentAccountName && (
                                <div>
                                    <span className="text-neutral-400 block mb-0.5">Chủ tài khoản thụ hưởng</span>
                                    <span className="font-bold text-[#1E2939]">{result.paymentAccountName}</span>
                                </div>
                            )}

                            {result.paymentAccountNumber && (
                                <div>
                                    <span className="text-neutral-400 block mb-0.5">Số tài khoản</span>
                                    <span className="font-bold text-[#1E2939] font-mono text-sm">{result.paymentAccountNumber}</span>
                                </div>
                            )}

                            {result.paymentDescription && (
                                <div>
                                    <span className="text-neutral-400 block mb-0.5">Nội dung chuyển khoản</span>
                                    <span className="font-bold text-[#1E2939] font-mono text-xs bg-neutral-100 px-2 py-1 rounded select-all block break-all">
                                        {result.paymentDescription}
                                    </span>
                                </div>
                            )}

                            <div className="pt-2 border-t border-neutral-100">
                                <span className="text-neutral-400 block mb-0.5">Tổng số tiền cần thanh toán</span>
                                <span className="font-black text-2xl text-[#155DFC]">
                                    {result.paymentAmount
                                        ? `${result.paymentAmount.toLocaleString('vi-VN')} đ`
                                        : 'Theo thông báo PayOS'}
                                </span>
                            </div>
                        </div>

                        {checkError && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                                <span>{checkError}</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-neutral-100">
                        <button
                            type="button"
                            onClick={() => void checkPaymentStatus(true)}
                            disabled={isChecking}
                            className="w-full py-3 px-4 rounded-xl bg-[#155DFC] hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                            {isChecking ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            Kiểm tra trạng thái thanh toán
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
