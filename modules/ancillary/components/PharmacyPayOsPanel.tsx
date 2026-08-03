'use client';

import React, { useEffect, useState } from 'react';
import {
    Wallet,
    Clock,
    ExternalLink,
    Copy,
    Check,
    Loader2,
    CheckCircle2,
    Banknote,
    QrCode,
    AlertCircle,
    X,
    Sparkles,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Prescription } from '@/shared/types/prescription.types';
import { paymentService } from '@/modules/payment/services/paymentService';
import { broadcastPaymentDisplaySync } from '@/modules/payment/utils/paymentSync';
import { useAuthStore } from '@/store/authStore';

interface PharmacyPayOsPanelProps {
    prescription: Prescription;
    onPaymentSuccess: (updatedPrescription: Prescription) => void;
    onCancel?: () => void;
    className?: string;
}

export function PharmacyPayOsPanel({
    prescription,
    onPaymentSuccess,
    onCancel,
    className
}: PharmacyPayOsPanelProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [isGenerating, setIsGenerating] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [txData, setTxData] = useState<{
        qrCode?: string;
        checkoutUrl?: string;
        amount?: number;
        accountName?: string;
        accountNumber?: string;
        description?: string;
    } | null>(null);
    const [copiedField, setCopiedField] = useState<'account' | 'memo' | 'link' | null>(null);
    const [error, setError] = useState<string | null>(null);

    const totalAmount = prescription.total_amount || 0;
    const rxCode = prescription.prescription_code || prescription.prescription_id;
    const accountName = 'BV DAKHOA OPD - TRIAGEFLOW';
    const accountNumber = '9999888888';
    const transferMemo = `THUOC ${rxCode}`;

    // Khởi tạo mã PayOS QR khi mount
    useEffect(() => {
        let isMounted = true;
        const initTransaction = async () => {
            setIsGenerating(true);
            setError(null);
            try {
                const res = await paymentService.createPrescriptionPayOsTransaction(
                    prescription.prescription_id,
                    totalAmount,
                    rxCode,
                    accessToken || undefined
                );
                if (isMounted) {
                    const finalQr = res.qr_code || res.qrCode;
                    const finalCheckout = res.checkout_url || res.checkoutUrl;
                    const finalAccountName = res.account_name || res.accountName || accountName;
                    const finalAccountNo = res.account_number || res.accountNumber || accountNumber;

                    setTxData({
                        qrCode: finalQr,
                        checkoutUrl: finalCheckout,
                        amount: res.amount || totalAmount,
                        accountName: finalAccountName,
                        accountNumber: finalAccountNo,
                        description: transferMemo
                    });

                    // Broadcast to patient secondary screen
                    broadcastPaymentDisplaySync({
                        status: 'active',
                        prescriptionId: prescription.prescription_id,
                        patientName: prescription.patient_name || 'Bệnh nhân',
                        patientCode: prescription.patient_code || '',
                        rxCode: rxCode,
                        totalAmount: totalAmount,
                        paymentMethod: 'qr',
                        bankName: 'MB Bank (Ngân hàng Quân Đội)',
                        accountName: finalAccountName,
                        accountNumber: finalAccountNo,
                        transferMemo: transferMemo,
                        checkoutUrl: finalCheckout || `https://pay.payos.vn/web/presc-${prescription.prescription_id}`,
                        qrCode: finalQr,
                        medicines: prescription.prescriptionDetails?.map((d) => ({
                            medicine_code: d.medicine_id,
                            medicine_name: d.medicine?.medicine_name || 'Thuốc kê đơn',
                            quantity: d.quantity,
                            unit: d.medicine?.unit || 'Viên',
                            unit_price: d.unit_price || 0,
                            sub_total: d.sub_total || 0,
                            dosage_instruction: d.dosage_instruction
                        }))
                    });
                }
            } catch (err: any) {
                console.error('[PharmacyPayOsPanel] Failed to generate PayOS QR:', err);
                if (isMounted) {
                    setError('Không thể khởi tạo mã QR PayOS tự động. Bạn vẫn có thể sử dụng thông tin chuyển khoản bên dưới.');
                    setTxData({
                        qrCode: `00020101021238580010A00000072701280006970422011499998888880208QRIBFTTA5303704540${totalAmount}5802VN5922BV DAKHOA TRIAGEFLOW6008HA NOI62240820THUOC ${rxCode}`,
                        checkoutUrl: `https://pay.payos.vn/web/presc-${prescription.prescription_id}`,
                        amount: totalAmount,
                        accountName,
                        accountNumber,
                        description: transferMemo
                    });

                    broadcastPaymentDisplaySync({
                        status: 'active',
                        prescriptionId: prescription.prescription_id,
                        patientName: prescription.patient_name || 'Bệnh nhân',
                        patientCode: prescription.patient_code || '',
                        rxCode: rxCode,
                        totalAmount: totalAmount,
                        paymentMethod: 'qr',
                        bankName: 'MB Bank (Ngân hàng Quân Đội)',
                        accountName: accountName,
                        accountNumber: accountNumber,
                        transferMemo: transferMemo,
                        checkoutUrl: `https://pay.payos.vn/web/presc-${prescription.prescription_id}`
                    });
                }
            } finally {
                if (isMounted) setIsGenerating(false);
            }
        };

        void initTransaction();

        return () => {
            isMounted = false;
        };
    }, [prescription.prescription_id, totalAmount, rxCode, accessToken]);

    // Auto-polling check webhook / backend trạng thái giao dịch mỗi 3s
    useEffect(() => {
        if (prescription.status !== 'PENDING') return;

        const interval = setInterval(async () => {
            try {
                await paymentService.triggerTransactionWebhook(prescription.prescription_id, accessToken || undefined);
            } catch (e) {
                // Bỏ qua lỗi polling webhook
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [prescription.prescription_id, prescription.status, accessToken]);

    // Xác nhận đã nhận chuyển khoản qua PayOS
    const handleConfirmPayOsPayment = async () => {
        setIsConfirming(true);
        setError(null);
        try {
            await paymentService.triggerTransactionWebhook(prescription.prescription_id, accessToken || undefined);
            const updated = await paymentService.payPrescriptionOffline(prescription.prescription_id);
            onPaymentSuccess(updated);
        } catch (err: any) {
            console.error('[PharmacyPayOsPanel] Confirm payment error:', err);
            setError(err?.message || 'Không thể xác nhận thanh toán PayOS.');
        } finally {
            setIsConfirming(false);
        }
    };

    // Xác nhận thanh toán tiền mặt trực tiếp
    const handleConfirmCashPayment = async () => {
        setIsConfirming(true);
        setError(null);
        try {
            const updated = await paymentService.payPrescriptionOffline(prescription.prescription_id);
            onPaymentSuccess(updated);
        } catch (err: any) {
            console.error('[PharmacyPayOsPanel] Confirm cash payment error:', err);
            setError(err?.message || 'Không thể xác nhận thanh toán tiền mặt.');
        } finally {
            setIsConfirming(false);
        }
    };

    const handleCopy = async (text: string, type: 'account' | 'memo' | 'link') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(type);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    const cleanAccountNo = (txData?.accountNumber || accountNumber).replace(/\s+/g, '');
    const displayAccountName = txData?.accountName || accountName;
    const displayMemo = txData?.description || transferMemo;
    const qrImageUrl = (txData?.qrCode && txData.qrCode.startsWith('http'))
        ? txData.qrCode
        : `https://img.vietqr.io/image/MB-${cleanAccountNo}-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(displayMemo)}&accountName=${encodeURIComponent(displayAccountName)}`;

    return (
        <div
            className={cn(
                'rounded-3xl p-5 border transition-all duration-300',
                'border-amber-300 dark:border-amber-800/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/40 dark:via-neutral-900 dark:to-neutral-900 shadow-md',
                className
            )}
        >
            {/* Panel Header */}
            <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-amber-200/80 dark:border-amber-900/40">
                <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                            Thanh toán đơn thuốc qua PayOS / VietQR
                        </h3>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                            Mã đơn: <span className="font-mono font-bold text-neutral-800 dark:text-neutral-200">{rxCode}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-200/80 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 animate-pulse">
                        <Clock className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                        Đang chờ chuyển khoản...
                    </span>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            className="p-1 rounded-lg hover:bg-neutral-200/60 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
                            title="Đóng bảng thanh toán"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* PayOS Direct Link Option */}
            {txData?.checkoutUrl && (
                <div className="mb-4 bg-white dark:bg-neutral-900 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-3.5 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                            <p className="text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                                Cổng thanh toán trực tuyến PayOS:
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={txData.checkoutUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all shrink-0 cursor-pointer"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Mở trang thanh toán PayOS
                            </a>
                            <button
                                onClick={() => handleCopy(txData.checkoutUrl || '', 'link')}
                                className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 text-xs transition-colors"
                                title="Sao chép đường dẫn PayOS"
                            >
                                {copiedField === 'link' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content: QR Code & Transfer Info */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                {/* QR Code Column */}
                <div className="md:col-span-5 flex flex-col items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 shadow-sm text-center">
                    {isGenerating ? (
                        <div className="w-[160px] h-[160px] flex flex-col items-center justify-center text-amber-600">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="text-xs font-medium">Đang khởi tạo mã QR PayOS...</span>
                        </div>
                    ) : (
                        <div className="relative group">
                            <img
                                src={qrImageUrl}
                                alt="Mã VietQR PayOS"
                                width={160}
                                height={160}
                                className="rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white p-1.5 shadow-inner"
                            />
                            <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                                <QrCode className="w-3.5 h-3.5 text-amber-600" />
                                <span>Quét bằng ứng dụng Ngân hàng / Napas247</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Transfer Info Details Column */}
                <div className="md:col-span-7 space-y-2.5">
                    <p className="text-xs text-amber-900 dark:text-amber-300 font-medium">
                        Bệnh nhân quét mã VietQR hoặc chuyển khoản trực tiếp theo thông tin:
                    </p>

                    <div className="bg-white/90 dark:bg-neutral-900/90 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-3.5 space-y-2 text-xs">
                        {/* Amount */}
                        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
                            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Số tiền thanh toán:</span>
                            <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                                {totalAmount.toLocaleString('vi-VN')} VND
                            </span>
                        </div>

                        {/* Account Name */}
                        <div className="flex items-center justify-between">
                            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Chủ tài khoản:</span>
                            <span className="font-bold text-neutral-800 dark:text-neutral-200">{accountName}</span>
                        </div>

                        {/* Account Number */}
                        <div className="flex items-center justify-between">
                            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Số tài khoản:</span>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold font-mono text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                                    {accountNumber}
                                </span>
                                <button
                                    onClick={() => handleCopy(accountNumber, 'account')}
                                    className="p-1 text-neutral-500 hover:text-amber-600 transition-colors"
                                    title="Sao chép số TK"
                                >
                                    {copiedField === 'account' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>

                        {/* Transfer Description */}
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-neutral-500 dark:text-neutral-400 font-medium">Nội dung CK:</span>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold font-mono text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                                    {transferMemo}
                                </span>
                                <button
                                    onClick={() => handleCopy(transferMemo, 'memo')}
                                    className="p-1 text-neutral-500 hover:text-amber-600 transition-colors"
                                    title="Sao chép nội dung"
                                >
                                    {copiedField === 'memo' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Auto Polling Notice */}
                    <div className="flex items-center gap-2 p-2.5 bg-amber-100/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] font-medium text-amber-900 dark:text-amber-300">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600 shrink-0" />
                        <span>Hệ thống tự động kiểm tra giao dịch PayOS và cập nhật khi nhận tiền...</span>
                    </div>
                </div>
            </div>

            {/* Pharmacist Confirmation Action Buttons */}
            <div className="mt-4 pt-3.5 border-t border-amber-200/80 dark:border-amber-900/40 flex flex-wrap items-center justify-end gap-3">
                <button
                    onClick={handleConfirmCashPayment}
                    disabled={isConfirming}
                    className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer"
                >
                    <Banknote className="w-4 h-4 text-amber-600" />
                    Thanh toán Tiền mặt tại quầy
                </button>

                <button
                    onClick={handleConfirmPayOsPayment}
                    disabled={isConfirming}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 shadow-md shadow-amber-600/20 cursor-pointer"
                >
                    {isConfirming ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <CheckCircle2 className="w-4 h-4" />
                    )}
                    Xác nhận đã nhận chuyển khoản (PayOS)
                </button>
            </div>
        </div>
    );
}
