'use client';

import React from 'react';
import { Search, QrCode, Calendar, RefreshCw } from 'lucide-react';

interface QueueSearchBarProps {
    selectedDate: string;
    onDateChange: (date: string) => void;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onOpenScanModal?: () => void;
    loading: boolean;
    onRefresh: () => void;
}

export function QueueSearchBar({
    selectedDate,
    onDateChange,
    searchQuery,
    onSearchChange,
    onOpenScanModal,
    loading,
    onRefresh
}: QueueSearchBarProps) {
    return (
        <div className="space-y-3">
            {/* Row 1: Date Filter & Refresh Button */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800/80 px-2.5 py-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-700/80 flex-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => onDateChange(e.target.value)}
                        className="bg-transparent text-xs font-bold text-neutral-800 dark:text-neutral-200 outline-none w-full cursor-pointer"
                        title="Lọc đơn thuốc theo ngày"
                    />
                </div>

                {onOpenScanModal && (
                    <button
                        type="button"
                        onClick={onOpenScanModal}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
                        title="Mở camera quét mã QR đơn thuốc"
                    >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Quét QR</span>
                    </button>
                )}

                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                    title="Làm mới hàng đợi"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Row 2: Search Input */}
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                    type="text"
                    placeholder="Tìm mã đơn RX, tên bệnh nhân..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
            </div>
        </div>
    );
}
