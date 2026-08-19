'use client';

import React from 'react';
import { PhoneCall, Pill, RefreshCw } from 'lucide-react';
import { Prescription } from '@/shared/types/prescription.types';
import { usePharmacyQueue } from '../../hooks/usePharmacyQueue';
import { QueueSearchBar } from './QueueSearchBar';
import { QueueFilterTabs } from './QueueFilterTabs';
import { QueueItemCard } from './QueueItemCard';

interface PharmacyQueueProps {
    onSelectPrescription: (prescription: Prescription) => void;
    selectedPrescriptionId?: string;
    refreshKey?: number;
}

export function PharmacyQueue({
    onSelectPrescription,
    selectedPrescriptionId,
    refreshKey = 0
}: PharmacyQueueProps) {
    const {
        selectedDate,
        setSelectedDate,
        filteredPrescriptions,
        counts,
        loading,
        activeStatus,
        setActiveStatus,
        searchQuery,
        setSearchQuery,
        scanInput,
        setScanInput,
        scanning,
        scanError,
        fetchQueue,
        handleScanSubmit,
        readyUnshownCount,
        handleCallNext,
        handleMiss,
        handleRecall,
        actingId,
        callNextLoading,
        actionError
    } = usePharmacyQueue(refreshKey, onSelectPrescription);

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 shadow-sm flex flex-col h-full overflow-hidden">
            {/* Header Title */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                        <Pill className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                            Hàng Đợi Đơn Thuốc
                        </h3>
                        <p className="text-[11px] text-neutral-500">
                            {counts.ALL} đơn trong ngày
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => void handleCallNext()}
                    disabled={callNextLoading || readyUnshownCount === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-black shadow-sm cursor-pointer"
                >
                    {callNextLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
                    Call next{readyUnshownCount > 0 ? ` (${readyUnshownCount})` : ''}
                </button>
            </div>

            {/* Search & Scan Controls */}
            <div className="my-3 space-y-3 shrink-0">
                <QueueSearchBar
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    scanInput={scanInput}
                    onScanInputChange={setScanInput}
                    onScanSubmit={handleScanSubmit}
                    scanning={scanning}
                    scanError={scanError}
                    loading={loading}
                    onRefresh={() => fetchQueue(false)}
                />

                <QueueFilterTabs
                    activeStatus={activeStatus}
                    onStatusChange={setActiveStatus}
                    counts={counts}
                />
                {actionError && (
                    <p className="text-[11px] font-medium text-rose-600">{actionError}</p>
                )}
            </div>

            {/* Prescriptions List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                {loading ? (
                    <div className="py-12 text-center text-neutral-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        <p className="text-xs font-medium">Đang tải danh sách đơn thuốc...</p>
                    </div>
                ) : filteredPrescriptions.length === 0 ? (
                    <div className="py-12 text-center text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-4">
                        <Pill className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-indigo-500" />
                        <p className="text-xs font-medium">Không có đơn thuốc nào</p>
                    </div>
                ) : (
                    filteredPrescriptions.map((prescription) => (
                        <QueueItemCard
                            key={prescription.prescription_id}
                            prescription={prescription}
                            isSelected={selectedPrescriptionId === prescription.prescription_id}
                            onSelect={() => onSelectPrescription(prescription)}
                            acting={actingId === prescription.prescription_id}
                            onMiss={(item) => void handleMiss(item)}
                            onRecall={(item) => void handleRecall(item)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
