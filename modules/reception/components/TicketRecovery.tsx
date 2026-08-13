import { useEffect, useRef, useState } from 'react';
import {
    X,
    Printer,
    Download,
    TicketCheck,
    User,
    IdCard,
    Phone,
    Stethoscope,
    Clock,
    ShieldCheck,
    Loader2,
    Search,
    AlertCircle,
    Building,
    UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import type { PatientSearchResult } from '@/modules/reception/types/reception.types';
import {
    formatPhoneDisplay,
    priorityBadgeClass,
    statusBadgeClass,
} from '@/modules/reception/utils/receptionSearch';
import {
    printReissueTicket,
    downloadReissueTicketPdf,
} from '@/modules/reception/utils/registrationTicket';

interface TicketReissueModalProps {
    patient?: PatientSearchResult | null;
    onClose: () => void;
}

export function TicketReissueModal({ patient: initialPatient, onClose }: TicketReissueModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const accessToken = useAuthStore((s) => s.accessToken);

    const [searchCode, setSearchCode] = useState('');
    const [ticketData, setTicketData] = useState<PatientSearchResult | null>(initialPatient ?? null);
    const [extraTicketDetails, setExtraTicketDetails] = useState<{
        roomName?: string;
        doctorName?: string;
        ticketCode?: string;
        flowStatus?: string;
        currentStep?: string;
    }>({});
    const [isLoadingTicket, setIsLoadingTicket] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const fetchTicketFromApi = async (patientIdOrCode: string) => {
        if (!accessToken || !patientIdOrCode?.trim()) return;
        setIsLoadingTicket(true);
        setSearchError(null);

        try {
            // 1. Thử gọi API lấy theo patient_id trước
            let raw: any = await receptionService.getTicketByPatientId(patientIdOrCode, accessToken);

            // 2. Nếu không tìm thấy, thử gọi API lấy theo mã ticket/code (/api/ticket/{code})
            if (!raw) {
                raw = await receptionService.getTicketByCode(patientIdOrCode, accessToken);
            }

            if (raw) {
                const data = raw.data ?? raw;
                const pInfo = data.patient ?? {};
                const bInfo = data.booking_info ?? {};
                const qInfo = data.queue_info ?? {};
                const cStep = data.current_step ?? {};

                const ticketNo = String(
                    qInfo.queue_number ??
                    data.ticket_code ??
                    data.ticket_number ??
                    data.queue_number ??
                    data.ticket_no ??
                    initialPatient?.ticketNo ??
                    '—'
                );

                const name = String(pInfo.full_name ?? data.full_name ?? initialPatient?.name ?? '—');
                const citizenId = String(pInfo.citizen_id ?? data.citizen_id ?? initialPatient?.citizenId ?? '—');
                const phone = (pInfo.phone ?? data.phone ?? initialPatient?.phone ?? null) as string | null;
                const bhyt = pInfo.bhyt ? String(pInfo.bhyt) : initialPatient?.bhyt;

                const specialty = String(
                    bInfo.specialty_name ??
                    cStep.step_name ??
                    data.specialty ??
                    initialPatient?.specialty ??
                    'Khoa khám bệnh'
                );

                const roomName = String(bInfo.room_name ?? cStep.room_name ?? '');
                const doctorName = String(bInfo.doctor_name ?? cStep.staff_name ?? '');

                const priority = (data.priority ?? initialPatient?.priority ?? 'Thường') as any;
                const status = (qInfo.queue_status ?? data.flow_status ?? data.status ?? initialPatient?.status ?? 'Chờ khám') as any;
                const waitMinutes = typeof qInfo.eta_minutes === 'number'
                    ? qInfo.eta_minutes
                    : (typeof data.wait_minutes === 'number' ? data.wait_minutes : initialPatient?.waitMinutes);

                setTicketData({
                    accountId: initialPatient?.accountId ?? pInfo.patient_id ?? data.flow_id ?? `reissue-${Date.now()}`,
                    patient_id: pInfo.patient_id ?? initialPatient?.patient_id,
                    name,
                    citizenId,
                    phone,
                    specialty,
                    ticketNo,
                    priority,
                    status,
                    waitMinutes,
                    bhyt: bhyt ?? null,
                    inQueueToday: true,
                    queueId: qInfo.queue_id ?? initialPatient?.queueId,
                    bookingId: bInfo.booking_id ?? initialPatient?.bookingId,
                });

                setExtraTicketDetails({
                    roomName: roomName || undefined,
                    doctorName: doctorName || undefined,
                    ticketCode: data.ticket_code ? String(data.ticket_code) : undefined,
                    flowStatus: data.flow_status ? String(data.flow_status) : undefined,
                    currentStep: cStep.step_name ? String(cStep.step_name) : undefined,
                });
            } else if (!initialPatient) {
                setSearchError('Không tìm thấy phiếu khám khớp với mã hoặc thông tin đã nhập.');
            }
        } catch (err: any) {
            if (!initialPatient) {
                setSearchError(err?.message || 'Lỗi tra cứu thông tin vé.');
            }
        } finally {
            setIsLoadingTicket(false);
        }
    };

    useEffect(() => {
        const patientId = initialPatient?.patient_id || initialPatient?.accountId;
        if (patientId) {
            fetchTicketFromApi(patientId);
        }
    }, [initialPatient, accessToken]);

    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    function handleBackdrop(e: React.MouseEvent) {
        if (e.target === overlayRef.current) onClose();
    }

    function handleSearchSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (searchCode.trim()) {
            fetchTicketFromApi(searchCode.trim());
        }
    }

    return (
        <div
            ref={overlayRef}
            onClick={handleBackdrop}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        >
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.18)] overflow-hidden max-h-[92vh] flex flex-col">

                {/* Header */}
                <div className="relative bg-gradient-to-br from-[#8B7CF6] to-[#6D5DE0] px-6 pt-6 pb-9 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        id="ticket-reissue-close"
                        aria-label="Đóng"
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                            <TicketCheck className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest">Lễ tân — Cấp lại vé</p>
                            <h2 className="text-[18px] font-black text-white leading-tight">Cấp lại vé khám</h2>
                        </div>
                    </div>
                    <p className="text-[12px] text-white/80 mt-2 leading-relaxed">
                        Hỗ trợ cấp lại phiếu khám cho bệnh nhân bị thất lạc hoặc làm mất vé sau khi đã hoàn tất thanh toán.
                    </p>
                </div>

                {/* Body scrollable */}
                <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 space-y-4">
                    {/* Search box if no patient or wanting to lookup another ticket */}
                    <form onSubmit={handleSearchSubmit} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                                type="text"
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                                placeholder="Nhập mã vé (VD: LAB-95262, V-001) hoặc CCCD..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-200 text-[12px] font-medium placeholder:text-neutral-400 outline-none focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/15"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoadingTicket || !searchCode.trim()}
                            className="px-3.5 py-2 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[12px] font-bold disabled:opacity-50 transition-colors shrink-0 inline-flex items-center gap-1.5"
                        >
                            {isLoadingTicket ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                            Tra cứu
                        </button>
                    </form>

                    {searchError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span>{searchError}</span>
                        </div>
                    )}

                    {ticketData ? (
                        <>
                            {/* Queue number display */}
                            <div className="bg-white rounded-2xl border border-neutral-100 shadow-[0_8px_24px_rgba(139,124,246,0.12)] px-5 py-4 flex items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                                            Số Thứ Tự {extraTicketDetails.ticketCode ? `(${extraTicketDetails.ticketCode})` : '(API Ticket)'}
                                        </p>
                                        {isLoadingTicket && <Loader2 className="w-3 h-3 animate-spin text-[#8B7CF6]" />}
                                    </div>
                                    <div className="text-[42px] font-black text-[#8B7CF6] leading-none tracking-tight font-mono">
                                        {ticketData.ticketNo ?? '—'}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border', priorityBadgeClass(ticketData.priority))}>
                                        {ticketData.priority}
                                    </span>
                                    <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full', statusBadgeClass(ticketData.status))}>
                                        {ticketData.status}
                                    </span>
                                </div>
                            </div>

                            {/* Patient info details */}
                            <div className="space-y-0.5">
                                <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Họ và tên" value={ticketData.name} bold />
                                <InfoRow icon={<IdCard className="w-3.5 h-3.5" />} label="CCCD/CMND" value={ticketData.citizenId} mono />
                                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Số điện thoại" value={formatPhoneDisplay(ticketData.phone)} mono />
                                <InfoRow icon={<Stethoscope className="w-3.5 h-3.5" />} label="Khoa khám" value={ticketData.specialty} />
                                {extraTicketDetails.roomName && (
                                    <InfoRow icon={<Building className="w-3.5 h-3.5" />} label="Phòng khám" value={extraTicketDetails.roomName} />
                                )}
                                {extraTicketDetails.doctorName && (
                                    <InfoRow icon={<UserCheck className="w-3.5 h-3.5" />} label="Bác sĩ" value={extraTicketDetails.doctorName} />
                                )}
                                {ticketData.waitMinutes !== undefined && (
                                    <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Ước chờ" value={`${ticketData.waitMinutes} phút`} />
                                )}
                                {ticketData.bhyt && (
                                    <InfoRow icon={<ShieldCheck className="w-3.5 h-3.5" />} label="BHYT" value={ticketData.bhyt} />
                                )}
                            </div>

                            {/* Warning note */}
                            <div className="border border-dashed border-amber-300 bg-amber-50 rounded-xl px-4 py-2.5 flex items-start gap-2">
                                <span className="text-amber-500 font-bold mt-0.5">!</span>
                                <p className="text-[11px] text-amber-800 font-semibold leading-relaxed">
                                    Vé cấp lại có đóng dấu <strong>CẤP LẠI VÉ</strong>. Số thứ tự và vị trí hàng chờ giữ nguyên.
                                </p>
                            </div>
                        </>
                    ) : (
                        !isLoadingTicket && (
                            <div className="py-8 text-center text-neutral-400">
                                <TicketCheck className="w-10 h-10 mx-auto mb-2 text-neutral-300" />
                                <p className="text-[13px] font-semibold text-neutral-500">Chưa chọn hoặc chưa tra cứu thấy phiếu khám</p>
                                <p className="text-[11px] text-neutral-400 mt-1">Nhập mã vé hoặc CCCD ở ô trên để tìm thông tin vé cấp lại</p>
                            </div>
                        )
                    )}
                </div>

                {/* Actions */}
                <div className="p-5 grid grid-cols-2 gap-3 shrink-0 border-t border-neutral-100 bg-white">
                    <button
                        id="ticket-reissue-print"
                        type="button"
                        disabled={!ticketData}
                        onClick={() => ticketData && printReissueTicket(ticketData)}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[13px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.3)] transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                        <Printer className="w-4 h-4" />
                        In vé cấp lại
                    </button>
                    <button
                        id="ticket-reissue-download"
                        type="button"
                        disabled={!ticketData}
                        onClick={() => ticketData && downloadReissueTicketPdf(ticketData)}
                        className="inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-[13px] font-bold transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        Tải file PDF
                    </button>
                    <button
                        id="ticket-reissue-cancel"
                        type="button"
                        onClick={onClose}
                        className="col-span-2 inline-flex items-center justify-center gap-2 min-h-[40px] rounded-xl border border-neutral-200 bg-white text-neutral-600 text-[13px] font-semibold hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon, label, value, bold, mono }: { icon: React.ReactNode; label: string; value: string; bold?: boolean; mono?: boolean; }) {
    return (
        <div className="flex items-center justify-between gap-3 py-2 border-b border-neutral-100 last:border-0">
            <div className="flex items-center gap-2 text-neutral-400 shrink-0">
                {icon}
                <span className="text-[12px] font-medium text-neutral-500">{label}</span>
            </div>
            <span className={cn('text-[13px] text-neutral-800 text-right truncate max-w-[200px]', bold && 'font-bold', mono && 'font-mono font-semibold', !bold && !mono && 'font-semibold')}>
                {value || '—'}
            </span>
        </div>
    );
}
