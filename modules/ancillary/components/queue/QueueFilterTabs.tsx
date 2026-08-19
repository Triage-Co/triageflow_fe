'use client';

import React from 'react';
import { Clock, Pill, PackageCheck, CheckCircle2 } from 'lucide-react';
import { PrescriptionStatusEnum } from '@/shared/types/prescription.types';

interface QueueFilterTabsProps {
    activeStatus: PrescriptionStatusEnum | 'ALL';
    onStatusChange: (status: PrescriptionStatusEnum | 'ALL') => void;
    counts: {
        ALL: number;
        PENDING: number;
        PROCESSING: number;
        PREPARED: number;
        DISPENSED: number;
    };
}

export function QueueFilterTabs({
    activeStatus,
    onStatusChange,
    counts
}: QueueFilterTabsProps) {
    const tabs: { id: PrescriptionStatusEnum | 'ALL'; label: string; count: number; color?: string }[] = [
        { id: 'ALL', label: 'Tất cả', count: counts.ALL },
        { id: 'PENDING', label: 'Chờ thanh toán', count: counts.PENDING, color: 'text-amber-600 dark:text-amber-400' },
        { id: 'PROCESSING', label: 'Đang soạn', count: counts.PROCESSING, color: 'text-blue-600 dark:text-blue-400' },
        { id: 'PREPARED', label: 'Đã soạn', count: counts.PREPARED, color: 'text-indigo-600 dark:text-indigo-400' },
        { id: 'DISPENSED', label: 'Đã giao', count: counts.DISPENSED, color: 'text-emerald-600 dark:text-emerald-400' }
    ];

    return (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
            {tabs.map((tab) => {
                const isActive = activeStatus === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onStatusChange(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            isActive
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                                : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/80'
                        }`}
                    >
                        <span>{tab.label}</span>
                        <span
                            className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                                isActive
                                    ? 'bg-white/20 text-white dark:bg-black/10 dark:text-neutral-900'
                                    : 'bg-neutral-200/80 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                            }`}
                        >
                            {tab.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
