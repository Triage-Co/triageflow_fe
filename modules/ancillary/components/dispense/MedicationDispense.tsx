'use client';

import React from 'react';
import { Pill, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Prescription } from '@/shared/types/prescription.types';
import { usePrescriptionDetail } from '../../hooks/usePrescriptionDetail';
import { PrescriptionHeader } from './PrescriptionHeader';
import { PrescriptionMeta } from './PrescriptionMeta';
import { MedicineListTable } from './MedicineListTable';
import { DispenseActionBar } from './DispenseActionBar';
import { PaymentQRModal } from '../../modals/PaymentQRModal';

interface MedicationDispenseProps {
    prescription: Prescription | null;
    onStatusChange?: (updatedPrescription: Prescription) => void;
}

export function MedicationDispense({
    prescription,
    onStatusChange
}: MedicationDispenseProps) {
    const {
        activeRx,
        detailLoading,
        actionLoading,
        showPayOsModal,
        setShowPayOsModal,
        error,
        successMessage,
        handlePayOffline,
        handlePrepare,
        handleDispense,
        handlePayOsSuccess
    } = usePrescriptionDetail(prescription, onStatusChange);

    if (!activeRx) {
        return (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 h-full flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
                    <Pill className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                    Chưa chọn đơn thuốc nào
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mt-1">
                    Vui lòng chọn đơn thuốc từ danh sách bên trái hoặc quét mã QR trên ứng dụng Bệnh nhân để bắt đầu xử lý cấp phát.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col h-full overflow-y-auto no-scrollbar relative">
            {/* Header Info */}
            <PrescriptionHeader
                prescription={activeRx}
                loadingDetail={detailLoading}
            />

            {/* Notification messages */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {successMessage && (
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Meta Grid (Doctor, Date, Price, Diagnosis) */}
            <PrescriptionMeta prescription={activeRx} />

            {/* Medicines List Table */}
            <MedicineListTable details={activeRx.prescriptionDetails} />

            {/* Pharmacist Action Bar */}
            <DispenseActionBar
                prescription={activeRx}
                actionLoading={actionLoading}
                onPayOffline={handlePayOffline}
                onOpenQrModal={() => setShowPayOsModal(true)}
                onPrepare={handlePrepare}
                onDispense={handleDispense}
            />

            {/* PayOS QR Popup Modal */}
            <PaymentQRModal
                isOpen={showPayOsModal}
                prescription={activeRx}
                onClose={() => setShowPayOsModal(false)}
                onPaymentSuccess={handlePayOsSuccess}
            />
        </div>
    );
}
