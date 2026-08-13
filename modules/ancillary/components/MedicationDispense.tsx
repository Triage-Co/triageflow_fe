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
            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-[#FBFBFF] rounded-2xl border border-dashed border-neutral-200/80">
                <div className="w-16 h-16 rounded-2xl bg-[#F5F3FF] border border-[#8B7CF6]/30 flex items-center justify-center text-[#8B7CF6] mb-4 shadow-xs">
                    <Pill className="w-8 h-8" />
                </div>
                <h3 className="text-[18px] font-bold text-[#2D2D2D]">
                    Chưa chọn đơn thuốc nào
                </h3>
                <p className="text-[13px] text-[#7B7B7B] font-medium max-w-md mt-1">
                    Vui lòng chọn đơn thuốc từ danh sách bên trái hoặc quét mã QR trên ứng dụng Bệnh nhân để bắt đầu xử lý cấp phát.
                </p>
            </div>
        );
    }

    if (showPayOsPanel) {
        return (
            <div className="h-full overflow-hidden flex flex-col rounded-2xl border border-neutral-100 shadow-xs">
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
                    <span className="px-3 py-1 bg-purple-50 border border-purple-100 text-[#8B7CF6] rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#8B7CF6]" />
                        Chờ nhận đơn
                    </span>
                );
            case 'PROCESSING':
                return (
                    <span className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 animate-spin" />
                        Đang soạn thuốc (PROCESSING)
                    </span>
                );
            case 'PREPARED':
                return (
                    <span className="px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5" />
                        Đã soạn xong (PREPARED)
                    </span>
                );
            case 'DISPENSED':
                return (
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đã giao thuốc (DISPENSED)
                    </span>
                );
            case 'EXPIRED':
                return (
                    <span className="px-3 py-1 bg-neutral-100 border border-neutral-200 text-neutral-600 rounded-xl text-xs font-bold">
                        Hết hạn (EXPIRED)
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="px-3 py-1 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs font-bold">
                        Đã hủy (CANCELLED)
                    </span>
                );
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar pr-1">
            {/* Header Info */}
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-neutral-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] border border-[#8B7CF6]/30 flex items-center justify-center text-[#8B7CF6] shrink-0">
                        <Pill className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-purple-50 text-[#8B7CF6] border border-purple-100">
                                {prescription.prescription_code}
                            </span>
                            {renderStatusHeaderBadge(prescription.status)}
                        </div>
                        <h2 className="text-[18px] font-bold text-[#2D2D2D] mt-1 tracking-tight">
                            {prescription.patient_name || 'Bệnh nhân khám ngoại trú'}
                        </h2>
                    </div>
                </div>

                <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-neutral-200/80 cursor-pointer"
                >
                    <Printer className="w-4 h-4 text-neutral-500" />
                    In đơn thuốc
                </button>
            </div>

            {/* Notification messages */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {successMessage && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 w-full">
                <div className="p-3.5 bg-[#FBFBFF] rounded-2xl border border-neutral-100 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#7B7B7B] font-medium">
                        <Stethoscope className="w-4 h-4 text-[#8B7CF6] shrink-0" />
                        <span className="truncate">Bác sĩ kê đơn:</span>
                    </div>
                    <p className="text-sm font-bold text-[#2D2D2D] mt-1 truncate">
                        {prescription.prescribed_by_name || 'Bác sĩ chuyên khoa OPD'}
                    </p>
                </div>

                <div className="p-3.5 bg-[#FBFBFF] rounded-2xl border border-neutral-100 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#7B7B7B] font-medium">
                        <Calendar className="w-4 h-4 text-[#8B7CF6] shrink-0" />
                        <span className="truncate">Thời gian kê đơn:</span>
                    </div>
                    <p className="text-sm font-bold text-[#2D2D2D] mt-1 truncate">
                        {prescription.created_at ? new Date(prescription.created_at).toLocaleString('vi-VN') : 'Mới khởi tạo'}
                    </p>
                </div>

                <div className="p-3.5 bg-[#FBFBFF] rounded-2xl border border-neutral-100 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-[#7B7B7B] font-medium">
                        <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="truncate">Tổng tiền thanh toán:</span>
                    </div>
                    <p className="text-base font-extrabold text-emerald-600 mt-0.5 truncate">
                        {prescription.total_amount?.toLocaleString('vi-VN')} đ
                    </p>
                </div>
            </div>

            {/* Diagnosis & Doctor Notes */}
            {prescription.diagnosis_note && (
                <div className="p-3.5 px-5 mb-3 bg-[#F5F3FF]/70 border border-[#8B7CF6]/20 rounded-[32px]">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#8B7CF6]">
                        <FileText className="w-4 h-4" />
                        <span>Lời dặn & Chẩn đoán của Bác sĩ:</span>
                    </div>
                    <p className="text-xs text-[#2D2D2D] mt-0.5 leading-relaxed font-medium">
                        {prescription.diagnosis_note}
                    </p>
                </div>
            )}

            {/* Medicines List Table */}
            <div className="flex-1 space-y-2.5">
                <h4 className="text-sm font-bold text-[#2D2D2D] flex items-center justify-between">
                    <span>Danh Sách Thuốc Chi Tiết ({prescription.prescriptionDetails?.length || 0})</span>
                </h4>

                <div className="space-y-2.5">
                    {prescription.prescriptionDetails?.map((detail, idx) => (
                        <div
                            key={detail.prescription_detail_id || idx}
                            className="p-3.5 px-5 bg-white rounded-[32px] border border-neutral-100/90 shadow-xs hover:border-[#8B7CF6]/30 transition-all"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-6.5 h-6.5 rounded-full bg-[#F5F3FF] text-[#8B7CF6] font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-purple-100">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <h5 className="text-[13px] font-bold text-[#2D2D2D]">
                                            {detail.medicine?.medicine_name || `Thuốc ID: ${detail.medicine_id}`}
                                        </h5>
                                        {detail.medicine?.active_ingredient && (
                                            <p className="text-[11px] text-[#7B7B7B] mt-0.5 font-medium">
                                                Hoạt chất: {detail.medicine.active_ingredient}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="text-xs font-extrabold text-[#2D2D2D]">
                                        SL: {detail.quantity} {detail.medicine?.unit || 'đơn vị'}
                                    </span>
                                    <p className="text-xs text-emerald-600 font-bold mt-0.5">
                                        {detail.sub_total?.toLocaleString('vi-VN')} đ
                                    </p>
                                </div>
                            </div>

                            {/* Dosage instructions box */}
                            <div className="mt-2 p-2.5 px-4 bg-[#FBFBFF] rounded-[24px] border border-neutral-100 text-xs text-[#2D2D2D] font-medium">
                                <span className="font-bold text-[#8B7CF6]">Cách dùng: </span>
                                {detail.dosage_instruction}
                                {detail.note && (
                                    <p className="text-[#7B7B7B] text-[11px] mt-0.5">
                                        Ghi chú thêm: {detail.note}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pharmacist Action Bar */}
            {/* Pharmacist Action Bar */}
            <div className="mt-6 pt-5 border-t border-neutral-100">
                {prescription.status === 'PENDING' && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50/40 to-purple-50 border border-purple-100 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                        {/* Left: Total Price */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#8B7CF6] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-bold text-purple-800/80 uppercase tracking-wider">Tổng thanh toán</span>
                                <h4 className="text-xl font-black text-[#8B7CF6] leading-tight">
                                    {prescription.total_amount?.toLocaleString('vi-VN')} đ
                                </h4>
                            </div>
                        </div>

                        {/* Right: Single Purple "Thanh toán" Button */}
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={handleGoToPayment}
                                className="px-6 py-3 bg-[#8B7CF6] hover:bg-[#7C6EE6] active:scale-95 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-purple-500/20 cursor-pointer"
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>Thanh toán</span>
                            </button>
                        </div>
                    </div>
                )}

                {prescription.status === 'PROCESSING' && (
                    <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h4 className="text-xs font-bold text-blue-900">
                                Đã thanh toán - Bắt đầu soạn thuốc
                            </h4>
                            <p className="text-xs text-blue-700 font-medium mt-0.5">
                                Dược sĩ kiểm tra đúng loại & số lượng thuốc theo danh sách trên và bấm xác nhận khi hoàn tất.
                            </p>
                        </div>

                        <button
                            onClick={handlePrepare}
                            disabled={actionLoading}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />}
                            Xác nhận soạn xong thuốc
                        </button>
                    </div>
                )}

                {prescription.status === 'PREPARED' && (
                    <div className="p-4 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h4 className="text-xs font-bold text-indigo-900">
                                Thuốc đã sẵn sàng - Chờ bệnh nhân nhận
                            </h4>
                            <p className="text-xs text-indigo-700 font-medium mt-0.5">
                                Kiểm tra thông tin bệnh nhân, hướng dẫn liều dùng và bấm giao thuốc.
                            </p>
                        </div>

                        <button
                            onClick={handleDispense}
                            disabled={actionLoading}
                            className="px-5 py-2.5 bg-[#8B7CF6] hover:bg-[#7C6EE6] text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shrink-0 shadow-xs cursor-pointer"
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            Xác nhận đã giao thuốc cho bệnh nhân
                        </button>
                    </div>
                )}

                {prescription.status === 'DISPENSED' && (
                    <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3 text-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                            <span>Đã giao thuốc thành công. Quy trình cấp phát hoàn thành.</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
