'use client';

import React, { useState } from 'react';
import {
    QrCode,
    X,
    AlertCircle,
    Copy,
    Check,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Prescription } from '@/shared/types/prescription.types';
import { usePayOsPolling } from '../hooks/usePayOsPolling';
import { useAuthStore } from '@/store/authStore';

interface PaymentQRModalProps {
    isOpen: boolean;
    prescription: Prescription;
    onClose: () => void;
    onPaymentSuccess: (updated: Prescription) => void;
}

export function PaymentQRModal({
    isOpen,
    prescription,
    onClose,
    onPaymentSuccess
}: PaymentQRModalProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [copiedField, setCopiedField] = useState<'account' | 'memo' | null>(null);

    const {
        isGenerating,
        isChecking,
        txData,
        error,
        qrImageSource,
        checkStatus
    } = usePayOsPolling(prescription, accessToken || undefined, onPaymentSuccess);

    if (!isOpen) return null;

    const totalAmount = txData?.amount || prescription.total_amount || 0;
    const rxCode = prescription.prescription_code || prescription.prescription_id;

    const handleCopy = async (text: string, type: 'account' | 'memo') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(type);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-xl bg-white dark:bg-neutral-900 border border-purple-200 dark:border-purple-900/60 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#7C6CF5] text-white flex items-center justify-center shadow-md shadow-purple-500/20 shrink-0">
                            <QrCode className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                                Thanh toán QR PayOS / VietQR
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Mã đơn: <span className="font-mono font-bold text-[#7C6CF5]">{rxCode}</span>
                                {txData?.orderCode ? ` · #${txData.orderCode}` : ''}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Error Box */}
                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* QR & Bank Info */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-2xl">
                        {isGenerating ? (
                            <div className="w-[160px] h-[160px] flex flex-col items-center justify-center text-[#7C6CF5]">
                                <Loader2 className="w-7 h-7 animate-spin mb-2" />
                                <span className="text-xs font-medium text-neutral-500">Khởi tạo QR...</span>
                            </div>
                        ) : qrImageSource ? (
                            <div className="flex flex-col items-center">
                                <img
                                    src={qrImageSource}
                                    alt="Mã QR PayOS"
                                    width={160}
                                    height={160}
                                    className="rounded-xl border border-neutral-100 dark:border-neutral-700 bg-white p-2 shadow-xs object-contain"
                                />
                                <span className="mt-2 text-[11px] font-bold text-neutral-600 dark:text-neutral-300">
                                    Quét bằng App Ngân hàng
                                </span>
                            </div>
                        ) : (
                            <div className="w-[160px] h-[160px] flex flex-col items-center justify-center text-neutral-400">
                                <QrCode className="w-8 h-8 opacity-30 mb-1" />
                                <span className="text-xs font-medium">Chưa có mã QR</span>
                            </div>
                        )}
                    </div>

                    <div className="sm:col-span-7 space-y-2.5 text-xs">
                        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-200 dark:border-neutral-800 space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-neutral-200/60 dark:border-neutral-700/60">
                                <span className="text-neutral-500">Số tiền:</span>
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                    {totalAmount.toLocaleString('vi-VN')} đ
                                </span>
                            </div>

                            {txData?.accountName && (
                                <div className="flex items-center justify-between">
                                    <span className="text-neutral-500">Chủ TK:</span>
                                    <span className="font-bold text-neutral-800 dark:text-neutral-200 uppercase">
                                        {txData.accountName}
                                    </span>
                                </div>
                            )}

                            {txData?.accountNumber && (
                                <div className="flex items-center justify-between">
                                    <span className="text-neutral-500">Số TK:</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold font-mono text-neutral-900 dark:text-white bg-white dark:bg-neutral-800 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-700">
                                            {txData.accountNumber}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(txData.accountNumber || '', 'account')}
                                            className="p-1 text-neutral-500 hover:text-purple-600 cursor-pointer"
                                        >
                                            {copiedField === 'account' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {txData?.description && (
                                <div className="flex items-center justify-between">
                                    <span className="text-neutral-500">Nội dung:</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-bold font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                            {txData.description}
                                        </span>
                                        <button
                                            onClick={() => handleCopy(txData.description || '', 'memo')}
                                            className="p-1 text-neutral-500 hover:text-purple-600 cursor-pointer"
                                        >
                                            {copiedField === 'memo' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                        Đóng
                    </button>

                    <button
                        onClick={() => checkStatus(true)}
                        disabled={isChecking}
                        className="px-4 py-2 bg-[#7C6CF5] hover:bg-[#6C5CE7] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer disabled:opacity-60"
                    >
                        <RefreshCw className={cn('w-3.5 h-3.5', isChecking && 'animate-spin')} />
                        <span>{isChecking ? 'Đang kiểm tra...' : 'Kiểm tra ngay'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
