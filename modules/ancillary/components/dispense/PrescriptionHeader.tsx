'use client';

import React from 'react';
import { Pill, Clock, PackageCheck, CheckCircle2, Printer, Loader2 } from 'lucide-react';
import { Prescription, PrescriptionStatusEnum } from '@/shared/types/prescription.types';

interface PrescriptionHeaderProps {
    prescription: Prescription;
    loadingDetail?: boolean;
}

export function PrescriptionHeader({
    prescription,
    loadingDetail
}: PrescriptionHeaderProps) {
    const renderStatusBadge = (status: PrescriptionStatusEnum) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Chờ thanh toán (PENDING)
                    </span>
                );
            case 'PROCESSING':
                return (
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 animate-spin" />
                        Đang soạn thuốc (PROCESSING)
                    </span>
                );
            case 'PREPARED':
                return (
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5" />
                        Đã soạn xong (PREPARED)
                    </span>
                );
            case 'DISPENSED':
                return (
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã giao thuốc (DISPENSED)
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Pill className="w-6 h-6" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                            {prescription.prescription_code}
                        </span>
                        {prescription.pickup_number && (
                            <span className="text-xs font-mono font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Số {prescription.pickup_number}
                            </span>
                        )}
                        {renderStatusBadge(prescription.status)}
                        {loadingDetail && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                            </span>
                        )}
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                        {prescription.patient_name || 'Bệnh nhân'}
                    </h2>
                </div>
            </div>

            <button
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
                <Printer className="w-4 h-4" />
                In đơn thuốc
            </button>
        </div>
    );
}
