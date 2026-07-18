'use client';

import Link from 'next/link';
import { ChevronLeft, User, Clock, CreditCard, Ticket, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReceptionPatientDetail as PatientDetail } from '@/modules/reception/types/reception.types';

const PRIORITY_STYLES = {
    'Khẩn cấp': 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
    'Người cao tuổi': 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
    'Ưu tiên': 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    'Thường': 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]',
} as const;

const STATUS_STYLES = {
    'Đang khám': 'bg-[#ECFDF5] text-[#059669]',
    'Chờ khám': 'bg-[#EFF6FF] text-[#2563EB]',
    'Chờ TT': 'bg-[#FFFBEB] text-[#D97706]',
    'Đã TT': 'bg-[#ECFDF5] text-[#059669]',
    'Đã gọi': 'bg-[#F5F3FF] text-[#7C3AED]',
    'Check-in': 'bg-[#F3F4F6] text-[#6B7280]',
} as const;

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4 py-2.5 border-b border-[#F3F4F6] last:border-0">
            <span className="text-[12px] text-[#9CA3AF] font-medium shrink-0">{label}</span>
            <span className="text-[12px] text-[#374151] font-semibold text-right">{value}</span>
        </div>
    );
}

interface ReceptionPatientDetailProps {
    patient?: PatientDetail | null;
    isLoading?: boolean;
    error?: string | null;
}

export function ReceptionPatientDetailView({ patient, isLoading, error }: ReceptionPatientDetailProps) {
    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F2FF] py-6">
                <div className="flex-1 flex items-center justify-center bg-white rounded-tl-[48px] rounded-bl-[48px]">
                    <div className="flex flex-col items-center gap-3 text-neutral-400">
                        <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                        <p className="text-sm font-semibold">Đang tải thông tin bệnh nhân...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F2FF] py-6">
                <div className="flex-1 bg-white rounded-tl-[48px] rounded-bl-[48px] p-6">
                    <Link href="/reception" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8B7CF6] mb-6">
                        <ChevronLeft className="w-4 h-4" />
                        Quay lại tổng quan
                    </Link>
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="text-sm text-red-800 font-bold">Lỗi tải dữ liệu</p>
                            <p className="text-xs text-red-700 mt-1">{error ?? 'Không tìm thấy bệnh nhân.'}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F2FF] py-6">
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-tl-[48px] rounded-bl-[48px] overflow-hidden shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-5 py-5 md:px-6 md:py-6">
                    <Link
                        href="/reception"
                        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8B7CF6] mb-5"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Quay lại tổng quan
                    </Link>

                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-[12px] bg-[#EDE9FE] flex items-center justify-center shrink-0">
                                <User className="w-6 h-6 text-[#8B7CF6]" />
                            </div>
                            <div>
                                <h1 className="text-[20px] font-bold text-[#1F2937]">{patient.name}</h1>
                                <p className="text-[12px] text-[#9CA3AF] mt-1 font-medium">
                                    Vé {patient.ticketNo} · CCCD {patient.citizenId}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full border', PRIORITY_STYLES[patient.priority])}>
                                        {patient.priority}
                                    </span>
                                    <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full', STATUS_STYLES[patient.status])}>
                                        {patient.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center gap-2 mb-3">
                                <Ticket className="w-4 h-4 text-[#8B7CF6]" />
                                <h2 className="text-[13px] font-bold text-[#374151]">Hàng đợi</h2>
                            </div>
                            <InfoRow label="Số vé" value={patient.ticketNo} />
                            <InfoRow label="Trạng thái queue" value={patient.queueStatus} />
                            <InfoRow label="Bước khám" value={patient.stepStatus} />
                            <InfoRow label="Chờ" value={`${patient.waitMinutes} phút`} />
                        </div>

                        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center gap-2 mb-3">
                                <Clock className="w-4 h-4 text-[#10B981]" />
                                <h2 className="text-[13px] font-bold text-[#374151]">Lịch khám</h2>
                            </div>
                            <InfoRow label="Ngày" value={patient.slotDate} />
                            <InfoRow label="Giờ" value={patient.slotTime} />
                            <InfoRow label="Booking" value={patient.bookingStatus} />
                        </div>

                        <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                            <div className="flex items-center gap-2 mb-3">
                                <CreditCard className="w-4 h-4 text-[#F59E0B]" />
                                <h2 className="text-[13px] font-bold text-[#374151]">Thanh toán</h2>
                            </div>
                            <InfoRow label="Trạng thái TT" value={patient.paymentStatus} />
                        </div>
                    </div>

                    <div className="rounded-[12px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-[14px] font-bold text-[#1F2937]">Thông tin bệnh nhân</h2>
                            {patient.bookingId && (
                                <Link
                                    href={`/reception/payment?queue=${patient.queueId}`}
                                    className="text-[11px] font-bold text-[#F59E0B] hover:underline"
                                >
                                    Thanh toán
                                </Link>
                            )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                            <InfoRow label="Họ tên" value={patient.name} />
                            <InfoRow label="CCCD" value={patient.citizenId} />
                            <InfoRow label="Email" value={patient.email} />
                            <InfoRow label="SĐT" value={patient.phone ?? '—'} />
                            <InfoRow label="Ngày sinh" value={patient.dob} />
                            <InfoRow label="Giới tính" value={patient.gender} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
