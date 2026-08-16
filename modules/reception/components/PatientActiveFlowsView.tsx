'use client';

import React, { useEffect, useState, useTransition } from 'react';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock,
    Download,
    FileText,
    IdCard,
    Loader2,
    MapPin,
    Phone,
    Printer,
    QrCode,
    RefreshCw,
    Stethoscope,
    User,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import type { PatientSearchResult, RegistrationResult } from '@/modules/reception/types/reception.types';
import {
    mapActiveFlowsList,
    flowItemToRegistrationResult,
    type PatientActiveFlowItem,
} from '@/modules/reception/utils/receptionFlowMapper';
import { formatPhoneDisplay } from '@/modules/reception/utils/receptionSearch';
import {
    downloadRegistrationTicketPdf,
    getQrImageUrl,
    printRegistrationTicket,
} from '@/modules/reception/utils/registrationTicket';

function formatDob(dob?: string): string {
    if (!dob) return '—';
    const [y, m, d] = dob.slice(0, 10).split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return dob;
}

interface PatientActiveFlowsViewProps {
    patient: PatientSearchResult;
    onBack: () => void;
    onBookNew: (patient: PatientSearchResult) => void;
}

export function PatientActiveFlowsView({
    patient,
    onBack,
    onBookNew,
}: PatientActiveFlowsViewProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [flows, setFlows] = useState<PatientActiveFlowItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFlow, setSelectedFlow] = useState<PatientActiveFlowItem | null>(null);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [, startTransition] = useTransition();

    const patientId = patient.patient_id || patient.accountId;

    const loadFlows = async () => {
        if (!accessToken || !patientId) return;
        setIsLoading(true);
        setError(null);
        try {
            const rawFlows = await receptionService.getPatientActiveFlows(patientId, accessToken);
            const mapped = mapActiveFlowsList(rawFlows);
            setFlows(mapped);
            if (mapped.length > 0 && !selectedFlow) {
                // do not auto open modal, let user click
            }
        } catch (err) {
            console.error('[PatientActiveFlowsView] Failed to load active flows:', err);
            setError('Không thể tải danh sách phiếu khám của bệnh nhân. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadFlows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, accessToken]);

    const activeRegistrationResult: RegistrationResult | null = selectedFlow
        ? flowItemToRegistrationResult(selectedFlow, {
            full_name: patient.name,
            citizen_id: patient.citizenId,
            phone: patient.phone,
            dob: patient.dob,
            medical_coverage_id: patient.bhyt,
        })
        : null;

    const handlePrint = (result: RegistrationResult) => {
        setIsPrinting(true);
        try {
            printRegistrationTicket(result);
        } catch (e) {
            console.error('[PatientActiveFlowsView] Print error:', e);
        } finally {
            setTimeout(() => setIsPrinting(false), 800);
        }
    };

    const handleDownloadPdf = (result: RegistrationResult) => {
        setIsDownloading(true);
        try {
            downloadRegistrationTicketPdf(result);
        } catch (e) {
            console.error('[PatientActiveFlowsView] Download PDF error:', e);
        } finally {
            setTimeout(() => setIsDownloading(false), 800);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        className="w-10 h-10 rounded-xl border border-[#E5E7EB] bg-white flex items-center justify-center text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#1F2937] transition-colors cursor-pointer shadow-xs"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-[18px] font-bold text-[#1F2937]">Phiếu khám trong ngày</h2>
                        <p className="text-[12px] text-[#9CA3AF]">
                            Tra cứu & in lại phiếu khám cho bệnh nhân
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => void loadFlows()}
                        disabled={isLoading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#E5E7EB] bg-white text-[12.5px] font-semibold text-[#374151] hover:bg-neutral-50 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    >
                        <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
                        Làm mới
                    </button>
                    <button
                        type="button"
                        onClick={() => onBookNew(patient)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[12.5px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.25)] transition-all cursor-pointer"
                    >
                        <CalendarDays className="w-4 h-4" />
                        Đăng ký khám mới
                    </button>
                </div>
            </div>

            {/* Patient Information Card */}
            <div className="rounded-2xl border border-[#EBEBEB] bg-white p-5 md:p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#EDE9FE] flex items-center justify-center font-black text-[#8B7CF6] text-xl shrink-0">
                            {patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-bold text-[#1F2937]">{patient.name}</h3>
                                {patient.gender && (
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                                        {patient.gender.toUpperCase() === 'FEMALE' ? 'Nữ' : 'Nam'}
                                    </span>
                                )}
                                {patient.bhyt && patient.bhyt !== 'N/A' && (
                                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                                        BHYT: {patient.bhyt}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 mt-2 text-[12.5px] text-[#6B7280]">
                                <span className="flex items-center gap-1.5">
                                    <IdCard className="w-4 h-4 text-[#9CA3AF]" />
                                    CCCD: <strong className="text-[#374151] font-mono">{patient.citizenId}</strong>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-[#9CA3AF]" />
                                    Ngày sinh: <strong className="text-[#374151]">{formatDob(patient.dob)}</strong>
                                </span>
                                {patient.phone && (
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-4 h-4 text-[#9CA3AF]" />
                                        SĐT: <strong className="text-[#374151] font-mono">{formatPhoneDisplay(patient.phone)}</strong>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error state */}
            {error && (
                <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Flows List Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-[15px] font-bold text-[#1F2937]">
                        Danh sách phiếu khám ({flows.length})
                    </h3>
                    <span className="text-[12px] text-[#9CA3AF]">
                        Dữ liệu khám trong ngày từ hệ thống
                    </span>
                </div>

                {isLoading ? (
                    <div className="rounded-2xl border border-[#EBEBEB] bg-white p-12 flex flex-col items-center justify-center gap-3 text-neutral-400 shadow-sm">
                        <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                        <span className="text-sm font-semibold text-[#6B7280]">
                            Đang tải danh sách phiếu khám của bệnh nhân...
                        </span>
                    </div>
                ) : flows.length === 0 ? (
                    <div className="rounded-2xl border border-[#EBEBEB] bg-[#FAFAFA] p-10 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-[#EDE9FE] flex items-center justify-center mx-auto text-[#8B7CF6]">
                            <FileText className="w-6 h-6" />
                        </div>
                        <h4 className="text-[15px] font-bold text-[#374151]">
                            Chưa có phiếu khám nào trong ngày hôm nay
                        </h4>
                        <p className="text-[12.5px] text-[#9CA3AF] max-w-md mx-auto">
                            Bệnh nhân hiện tại chưa được tiếp nhận vào luồng khám nào trong ngày. Bạn có thể bấm nút dưới đây để tạo lịch khám mới.
                        </p>
                        <button
                            type="button"
                            onClick={() => onBookNew(patient)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold shadow-md transition-all cursor-pointer mt-2"
                        >
                            <CalendarDays className="w-4 h-4" />
                            Đăng ký khám ngay
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {flows.map((flow) => (
                            <div
                                key={flow.flowId}
                                className="rounded-2xl border border-[#EBEBEB] bg-white p-5 md:p-6 shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:border-[#8B7CF6]/40 hover:shadow-md transition-all"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                    {/* Left: Queue Number Ticket Badge & Main Info */}
                                    <div className="flex items-start gap-4 sm:gap-5">
                                        <div className="bg-[#F5F3FF] border border-[#8B7CF6]/20 rounded-2xl p-3.5 text-center shrink-0 min-w-[90px] shadow-xs">
                                            <span className="text-[10px] font-bold text-[#8B7CF6] uppercase block">
                                                Số thứ tự
                                            </span>
                                            <span className="text-[28px] font-black text-[#5B21B6] leading-none block my-1">
                                                {flow.ticketNo}
                                            </span>
                                            <span className="text-[10px] font-semibold text-neutral-400 block">
                                                TriageFlow
                                            </span>
                                        </div>

                                        <div className="space-y-1.5 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-[16px] font-bold text-[#1F2937]">
                                                    {flow.specialty}
                                                </h4>
                                                <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full border', flow.statusBadgeClass)}>
                                                    {flow.statusLabel}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[12.5px] text-[#6B7280] pt-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Stethoscope className="w-4 h-4 text-[#8B7CF6] shrink-0" />
                                                    <span>{flow.doctorLabel}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="w-4 h-4 text-[#8B7CF6] shrink-0" />
                                                    <span>{flow.roomLabel}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actions */}
                                    <div className="flex items-center gap-2.5 shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-neutral-100 w-full lg:w-auto justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const res = flowItemToRegistrationResult(flow, {
                                                    full_name: patient.name,
                                                    citizen_id: patient.citizenId,
                                                    phone: patient.phone,
                                                    dob: patient.dob,
                                                    medical_coverage_id: patient.bhyt,
                                                });
                                                handlePrint(res);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#8B7CF6]/30 bg-[#F5F3FF] text-[#6D28D9] text-[12.5px] font-bold hover:bg-[#EDE9FE] transition-colors cursor-pointer shadow-xs"
                                        >
                                            <Printer className="w-4 h-4 text-[#8B7CF6]" />
                                            In nhanh
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setSelectedFlow(flow)}
                                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[12.5px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.25)] transition-all cursor-pointer"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Xem & In phiếu
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal: View Flow Details & Ticket Reprint */}
            {selectedFlow && activeRegistrationResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
                    <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden my-8 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-white shrink-0">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#8B7CF6]">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-bold text-[#1F2937]">
                                        Chi tiết luồng & In lại phiếu khám
                                    </h3>
                                    <p className="text-[11.5px] text-[#9CA3AF]">
                                        Mã luồng: <span className="font-mono">{selectedFlow.flowId}</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedFlow(null)}
                                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-500 transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Modal Body - 2 Columns */}
                        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 bg-neutral-50/50">
                            {/* Left: Workflow Timeline & Info (5 cols) */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="bg-white p-5 rounded-2xl border border-neutral-200/70 shadow-xs space-y-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                                        Trạng thái ca khám
                                    </span>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-neutral-800">
                                            {selectedFlow.specialty}
                                        </span>
                                        <span className={cn('text-[11px] font-bold px-2.5 py-0.5 rounded-full border', selectedFlow.statusBadgeClass)}>
                                            {selectedFlow.statusLabel}
                                        </span>
                                    </div>
                                    <div className="border-t border-neutral-100 pt-3 space-y-2 text-[12.5px] text-neutral-600">
                                        <div className="flex justify-between">
                                            <span className="text-neutral-400">Bác sĩ:</span>
                                            <span className="font-semibold text-neutral-800">{selectedFlow.doctorLabel}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-400">Phòng khám:</span>
                                            <span className="font-semibold text-neutral-800">{selectedFlow.roomLabel}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-neutral-400">Giờ khám:</span>
                                            <span className="font-semibold text-neutral-800">{selectedFlow.slotTimeLabel}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Step Timeline */}
                                <div className="bg-white p-5 rounded-2xl border border-neutral-200/70 shadow-xs space-y-3">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                                        Tiến trình các bước ({selectedFlow.steps.length})
                                    </span>
                                    {selectedFlow.steps.length === 0 ? (
                                        <p className="text-xs text-neutral-400 italic">Chưa có thông tin bước chi tiết</p>
                                    ) : (
                                        <div className="space-y-3 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-200">
                                            {selectedFlow.steps.map((st, idx) => {
                                                const isDone = st.stepStatus === 'COMPLETED' || st.stepStatus === 'DONE';
                                                const isCurr = st.stepStatus === 'IN_PROGRESS' || st.stepStatus === 'PROCESSING';
                                                return (
                                                    <div key={st.stepId || idx} className="relative text-xs">
                                                        <div
                                                            className={cn(
                                                                'absolute -left-4 top-0.5 w-3 h-3 rounded-full border-2 border-white shadow-xs',
                                                                isDone ? 'bg-emerald-500' : isCurr ? 'bg-blue-600 animate-pulse' : 'bg-neutral-300',
                                                            )}
                                                        />
                                                        <div className="font-bold text-neutral-800 flex items-center justify-between gap-2">
                                                            <span className="truncate">{st.stepName}</span>
                                                            <span className={cn('text-[10.5px] font-bold px-2 py-0.5 rounded-full border shrink-0', st.statusBadgeClass)}>
                                                                {st.statusLabel}
                                                            </span>
                                                        </div>
                                                        {st.roomName && (
                                                            <p className="text-[11px] text-neutral-500 mt-0.5">
                                                                📍 {st.roomName} {st.doctorName ? `· ${st.doctorName}` : ''}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right: Ticket Preview (7 cols) */}
                            <div className="lg:col-span-7 flex flex-col items-center">
                                <div className="w-full max-w-[380px] rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-lg relative overflow-hidden text-neutral-800">
                                    {/* Decorative glow */}
                                    <div className="absolute top-0 right-0 w-28 h-28 bg-[#8B7CF6]/10 rounded-full blur-2xl pointer-events-none" />

                                    {/* Ticket Header */}
                                    <div className="text-center pb-3 border-b border-neutral-100">
                                        <span className="text-[10px] font-bold tracking-widest text-[#8B7CF6] uppercase block">
                                            TriageFlow OPD
                                        </span>
                                        <h4 className="text-[14px] font-bold text-neutral-800">
                                            Phiếu Đăng Ký Khám
                                        </h4>
                                    </div>

                                    {/* Queue Number */}
                                    <div className="bg-[#F5F2FF] border border-[#8B7CF6]/20 rounded-2xl p-4 text-center my-3 shadow-inner">
                                        <span className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase block">
                                            Số Thứ Tự Của Bạn
                                        </span>
                                        <div className="text-[42px] font-black text-[#8B7CF6] tracking-tight leading-none my-1">
                                            {activeRegistrationResult.ticketNo}
                                        </div>
                                    </div>

                                    {/* Patient & Clinic Details */}
                                    <div className="space-y-2 text-[12px] bg-neutral-50 p-3.5 rounded-xl border border-neutral-100">
                                        <div className="flex justify-between py-0.5">
                                            <span className="text-neutral-500 font-medium">Bệnh nhân:</span>
                                            <span className="font-bold text-neutral-800">{activeRegistrationResult.fullName.toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between py-0.5">
                                            <span className="text-neutral-500 font-medium">CCCD:</span>
                                            <span className="font-mono font-semibold text-neutral-800">{activeRegistrationResult.citizenId}</span>
                                        </div>
                                        <div className="flex justify-between py-0.5">
                                            <span className="text-neutral-500 font-medium">Khoa khám:</span>
                                            <span className="font-bold text-[#8B7CF6]">{activeRegistrationResult.specialty}</span>
                                        </div>
                                        <div className="flex justify-between py-0.5">
                                            <span className="text-neutral-500 font-medium">Bác sĩ:</span>
                                            <span className="font-semibold text-neutral-800">{activeRegistrationResult.doctorLabel}</span>
                                        </div>
                                        <div className="flex justify-between py-0.5">
                                            <span className="text-neutral-500 font-medium">Phòng khám:</span>
                                            <span className="font-semibold text-neutral-800">{activeRegistrationResult.roomLabel}</span>
                                        </div>
                                        <div className="flex justify-between py-0.5">
                                            <span className="text-neutral-500 font-medium">Giờ khám:</span>
                                            <span className="font-semibold text-neutral-800">{activeRegistrationResult.slotTimeLabel}</span>
                                        </div>
                                    </div>

                                    {/* QR Code */}
                                    <div className="flex flex-col items-center justify-center my-3 py-2 border-t border-b border-dashed border-neutral-200">
                                        <img
                                            src={getQrImageUrl(activeRegistrationResult.qrPayload, 100)}
                                            alt="Mã QR vé khám"
                                            width={100}
                                            height={100}
                                            className="rounded-lg shadow-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer Actions */}
                        <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-end gap-3 bg-white shrink-0">
                            <button
                                type="button"
                                onClick={() => setSelectedFlow(null)}
                                className="px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-700 text-[13px] font-semibold hover:bg-neutral-50 transition-colors cursor-pointer"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDownloadPdf(activeRegistrationResult)}
                                disabled={isDownloading}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#8B7CF6]/30 bg-[#F5F3FF] text-[#6D28D9] text-[13px] font-bold hover:bg-[#EDE9FE] transition-colors cursor-pointer"
                            >
                                <Download className="w-4 h-4 text-[#8B7CF6]" />
                                {isDownloading ? 'Đang tải...' : 'Tải PDF'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handlePrint(activeRegistrationResult)}
                                disabled={isPrinting}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold shadow-md transition-all cursor-pointer"
                            >
                                <Printer className="w-4 h-4" />
                                {isPrinting ? 'Đang gửi in...' : 'In lại phiếu khám'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
