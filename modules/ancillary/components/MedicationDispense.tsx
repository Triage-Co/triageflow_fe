'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Pill,
    CheckCircle2,
    Clock,
    PackageCheck,
    AlertCircle,
    User,
    FileText,
    DollarSign,
    CreditCard,
    Printer,
    QrCode,
    Loader2,
    ShieldCheck,
    Sparkles,
    Calendar,
    Stethoscope,
    Wallet,
    Banknote
} from 'lucide-react';
import { Prescription, PrescriptionStatusEnum } from '@/shared/types/prescription.types';
import { pharmacyService } from '../services/pharmacyService';
import { PharmacyPayOsPanel } from './PharmacyPayOsPanel';
import { PaymentWorkflowPanel } from '@/modules/payment/components/PaymentWorkflowPanel';
import { broadcastPaymentDisplaySync } from '@/modules/payment/utils/paymentSync';

interface MedicationDispenseProps {
    prescription: Prescription | null;
    onStatusChange?: (updatedPrescription: Prescription) => void;
}

export function MedicationDispense({
    prescription,
    onStatusChange
}: MedicationDispenseProps) {
    const router = useRouter();
    const [actionLoading, setActionLoading] = useState(false);
    const [showPayOsPanel, setShowPayOsPanel] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        setShowPayOsPanel(false);
        setError(null);
        setSuccessMessage(null);
    }, [prescription?.prescription_id]);

    const handleGoToPayment = () => {
        setShowPayOsPanel(true);
    };

    if (!prescription) {
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

    if (showPayOsPanel) {
        return (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl h-full overflow-hidden flex flex-col shadow-sm">
                <PaymentWorkflowPanel
                    presetPrescriptionId={prescription.prescription_id}
                    onClose={() => {
                        setShowPayOsPanel(false);
                        broadcastPaymentDisplaySync({ status: 'idle' });
                    }}
                    onPaymentSuccess={(updated) => {
                        setSuccessMessage('Thanh toán đơn thuốc thành công! Trạng thái đã tự động chuyển sang "Đang soạn thuốc".');
                        setShowPayOsPanel(false);
                        if (onStatusChange) onStatusChange(updated);
                    }}
                />
            </div>
        );
    }

    const handlePayOffline = async () => {
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await pharmacyService.payPrescriptionOffline(prescription.prescription_id);
            setSuccessMessage('Đã xác nhận thanh toán tiền mặt thành công! Đơn thuốc chuyển sang trạng thái "Đang soạn".');
            broadcastPaymentDisplaySync({
                status: 'success',
                prescriptionId: prescription.prescription_id,
                patientName: prescription.patient_name || 'Bệnh nhân',
                patientCode: prescription.patient_code || '',
                rxCode: prescription.prescription_code || prescription.prescription_id,
                totalAmount: prescription.total_amount || 0,
            });
            if (onStatusChange) onStatusChange(updated);
        } catch (err: any) {
            setError(err?.message || 'Không thể xác nhận thanh toán offline');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePrepare = async () => {
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await pharmacyService.preparePrescription(prescription.prescription_id);
            setSuccessMessage('Đã xác nhận soạn xong thuốc! Hệ thống đã gửi thông báo đến Bệnh nhân.');
            if (onStatusChange) onStatusChange(updated);
        } catch (err: any) {
            setError(err?.message || 'Không thể cập nhật trạng thái soạn xong');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDispense = async () => {
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await pharmacyService.dispensePrescription(prescription.prescription_id);
            setSuccessMessage('Đã xác nhận giao thuốc thành công! Đơn hàng dịch vụ đã hoàn thành.');
            if (onStatusChange) onStatusChange(updated);
        } catch (err: any) {
            setError(err?.message || 'Không thể xác nhận giao thuốc');
        } finally {
            setActionLoading(false);
        }
    };

    const renderStatusHeaderBadge = (status: PrescriptionStatusEnum) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        Chờ nhận đơn
                    </span>
                );
            case 'PROCESSING':
                return (
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Pill className="w-4 h-4 animate-spin" />
                        Đang soạn thuốc (PROCESSING)
                    </span>
                );
            case 'PREPARED':
                return (
                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <PackageCheck className="w-4 h-4" />
                        Đã soạn xong (PREPARED)
                    </span>
                );
            case 'DISPENSED':
                return (
                    <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Đã giao thuốc (DISPENSED)
                    </span>
                );
            case 'EXPIRED':
                return (
                    <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-xl text-xs font-bold">
                        Hết hạn (EXPIRED)
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="px-3 py-1 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold">
                        Đã hủy (CANCELLED)
                    </span>
                );
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm flex flex-col h-full overflow-y-auto no-scrollbar">
            {/* Header Info */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Pill className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                {prescription.prescription_code}
                            </span>
                            {renderStatusHeaderBadge(prescription.status)}
                        </div>
                        <h2 className="text-lg font-bold text-neutral-900 dark:text-white mt-1">
                            {prescription.patient_name || 'Bệnh nhân khám ngoại trú'}
                        </h2>
                    </div>
                </div>

                <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                    <Printer className="w-4 h-4" />
                    In đơn thuốc
                </button>
            </div>

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

            {/* Meta Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-4">
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <Stethoscope className="w-4 h-4 text-indigo-500" />
                        <span>Bác sĩ kê đơn:</span>
                    </div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                        {prescription.prescribed_by_name || 'Bác sĩ chuyên khoa OPD'}
                    </p>
                </div>

                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span>Thời gian kê đơn:</span>
                    </div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                        {prescription.created_at ? new Date(prescription.created_at).toLocaleString('vi-VN') : 'Mới khởi tạo'}
                    </p>
                </div>

                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span>Tổng tiền thanh toán:</span>
                    </div>
                    <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {prescription.total_amount?.toLocaleString('vi-VN')} đ
                    </p>
                </div>
            </div>

            {/* Diagnosis & Doctor Notes */}
            {prescription.diagnosis_note && (
                <div className="p-4 mb-4 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <FileText className="w-4 h-4" />
                        <span>Lời dặn & Chẩn đoán của Bác sĩ:</span>
                    </div>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                        {prescription.diagnosis_note}
                    </p>
                </div>
            )}

            {/* Medicines List Table */}
            <div className="flex-1 space-y-3">
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                    <span>Danh Sách Thuốc Chi Tiết ({prescription.prescriptionDetails?.length || 0})</span>
                </h4>

                <div className="space-y-3">
                    {prescription.prescriptionDetails?.map((detail, idx) => (
                        <div
                            key={detail.prescription_detail_id || idx}
                            className="p-4 bg-white dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-bold text-neutral-900 dark:text-white">
                                            {detail.medicine?.medicine_name || `Thuốc ID: ${detail.medicine_id}`}
                                        </h5>
                                        {detail.medicine?.active_ingredient && (
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                Hoạt chất: {detail.medicine.active_ingredient}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="text-sm font-extrabold text-neutral-900 dark:text-white">
                                        SL: {detail.quantity} {detail.medicine?.unit || 'đơn vị'}
                                    </span>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                        {detail.sub_total?.toLocaleString('vi-VN')} đ
                                    </p>
                                </div>
                            </div>

                            {/* Dosage instructions box */}
                            <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-xl border border-neutral-100 dark:border-neutral-700/50 text-xs text-neutral-700 dark:text-neutral-300">
                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Cách dùng: </span>
                                {detail.dosage_instruction}
                                {detail.note && (
                                    <p className="text-neutral-500 text-[11px] mt-1">
                                        Ghi chú thêm: {detail.note}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pharmacist Action Bar */}
            <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800">
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

                        {/* Right: Single Purple "Thanh toán" Button */}
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={handleGoToPayment}
                                className="px-6 py-3 bg-[#7C6CF5] hover:bg-[#6C5CE7] active:scale-95 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-purple-500/25 cursor-pointer"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>Thanh toán</span>
                            </button>
                        </div>
                    </div>
                )}

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
                            onClick={handlePrepare}
                            disabled={actionLoading}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shrink-0 shadow-sm"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                            Xác nhận soạn xong thuốc
                        </button>
                    </div>
                )}

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
                            onClick={handleDispense}
                            disabled={actionLoading}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shrink-0 shadow-sm"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Xác nhận đã giao thuốc cho bệnh nhân
                        </button>
                    </div>
                )}

                {prescription.status === 'DISPENSED' && (
                    <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span>Đã giao thuốc thành công. Quy trình cấp phát hoàn thành.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
