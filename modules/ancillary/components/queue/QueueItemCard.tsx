'use client';

import React from 'react';
import { Pill, Clock, PackageCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { Prescription, PrescriptionStatusEnum } from '@/shared/types/prescription.types';

interface QueueItemCardProps {
    prescription: Prescription;
    isSelected: boolean;
    onSelect: () => void;
}

export function QueueItemCard({
    prescription,
    isSelected,
    onSelect
}: QueueItemCardProps) {
    const renderStatusBadge = (status: PrescriptionStatusEnum) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                        <Clock className="w-2.5 h-2.5 text-amber-500" />
                        Chờ thanh toán
                    </span>
                );
            case 'PROCESSING':
                return (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                        <Pill className="w-2.5 h-2.5 animate-pulse" />
                        Đang soạn
                    </span>
                );
            case 'PREPARED':
                return (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-full">
                        <PackageCheck className="w-2.5 h-2.5" />
                        Đã soạn
                    </span>
                );
            case 'DISPENSED':
                return (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Đã giao
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div
            onClick={onSelect}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                isSelected
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-xs'
                    : 'bg-white dark:bg-neutral-800/60 border-neutral-200/80 dark:border-neutral-700/60 hover:border-neutral-300 hover:shadow-xs'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-neutral-800 dark:text-neutral-200 truncate">
                            {prescription.prescription_code}
                        </span>
                        {renderStatusBadge(prescription.status)}
                    </div>

                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white mt-1 truncate">
                        {prescription.patient_name || 'Bệnh nhân'}
                    </h4>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5 pt-1.5 border-t border-neutral-100 dark:border-neutral-700/50">
                        <span>{prescription.prescriptionDetails?.length || 0} loại thuốc</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {prescription.total_amount?.toLocaleString('vi-VN')} đ
                        </span>
                    </div>
                </div>

                <ChevronRight className={`w-4 h-4 mt-2 shrink-0 transition-transform ${isSelected ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-neutral-400'}`} />
            </div>
        </div>
    );
}
