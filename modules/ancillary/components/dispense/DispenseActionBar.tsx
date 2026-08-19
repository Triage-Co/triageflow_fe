'use client';

import React from 'react';
import {
    Wallet,
    QrCode,
    Banknote,
    Loader2,
    PackageCheck,
    CheckCircle2
} from 'lucide-react';
import { Prescription } from '@/shared/types/prescription.types';

interface DispenseActionBarProps {
    prescription: Prescription;
    actionLoading: boolean;
    onPayOffline: () => void;
    onOpenQrModal: () => void;
    onPrepare: () => void;
    onDispense: () => void;
}

export function DispenseActionBar({
    prescription,
    actionLoading,
    onPayOffline,
    onOpenQrModal,
    onPrepare,
    onDispense
}: DispenseActionBarProps) {
    return (
        <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800">
            {/* Case 1: PENDING -> Cash or QR Payment */}
            {prescription.status === 'PENDING' && (
                <div className="p-4 bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-purple-50/30 dark:from-purple-950/40 dark:via-neutral-900 dark:to-neutral-900 border border-purple-200/90 dark:border-purple-800/60 rounded-3xl shadow-xs flex flex-wrap items-center justify-between gap-4">
                    {/* Left: Total Price */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#7C6CF5] text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20 shrink-0">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-purple-800/80 dark:text-purple-300 uppercase tracking-wider">Tổng thanh toán</span>
                            <h4 className="text-xl font-black text-[#7C6CF5] dark:text-purple-400 leading-tight">
                                {prescription.total_amount?.toLocaleString('vi-VN')} đ
                            </h4>
                        </div>
                    </div>

                    {/* Right: Cash & QR Payment Buttons */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={onOpenQrModal}
                            disabled={actionLoading}
                            className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <QrCode className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span>Quét QR</span>
                        </button>

                        <button
                            onClick={onPayOffline}
                            disabled={actionLoading}
                            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-emerald-500/25 cursor-pointer disabled:opacity-50"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />}
                            <span>Xác nhận Thu Tiền Mặt ({prescription.total_amount?.toLocaleString('vi-VN')} đ)</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Case 2: PROCESSING -> Mark as Prepared */}
            {prescription.status === 'PROCESSING' && (
                <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
                            Đã thanh toán - Bắt đầu soạn thuốc
                        </h4>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                            Dược sĩ kiểm tra đúng loại & số lượng thuốc theo danh sách trên và bấm xác nhận khi hoàn tất.
                        </p>
                    </div>

                    <button
                        onClick={onPrepare}
                        disabled={actionLoading}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                        Xác nhận soạn xong thuốc
                    </button>
                </div>
            )}

            {/* Case 3: PREPARED -> Mark as Dispensed */}
            {prescription.status === 'PREPARED' && (
                <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                            Thuốc đã sẵn sàng - Chờ bệnh nhân nhận
                        </h4>
                        <p className="text-xs text-indigo-700 dark:text-indigo-400 mt-0.5">
                            Kiểm tra thông tin bệnh nhân, hướng dẫn liều dùng và bấm giao thuốc.
                        </p>
                    </div>

                    <button
                        onClick={onDispense}
                        disabled={actionLoading}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                        {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Xác nhận đã giao thuốc cho bệnh nhân
                    </button>
                </div>
            )}

            {/* Case 4: DISPENSED -> Completed */}
            {prescription.status === 'DISPENSED' && (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>Đã giao thuốc thành công. Quy trình cấp phát hoàn thành.</span>
                    </div>
                </div>
            )}
        </div>
    );
}
