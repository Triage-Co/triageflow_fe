'use client';

import Link from 'next/link';
import {
    Check,
    Clock,
    Download,
    Headphones,
    Home,
    MapPin,
    Printer,
    Stethoscope,
    UserRound,
    Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegistrationResult } from '@/modules/reception/types/reception.types';
import { formatPhoneDisplay } from '@/modules/reception/utils/receptionSearch';
import {
    downloadRegistrationTicketPdf,
    getQrImageUrl,
    printRegistrationTicket,
} from '@/modules/reception/utils/registrationTicket';

interface RegisterSuccessStepProps {
    result: RegistrationResult;
    onRegisterNew: () => void;
}

const DIRECTIONS = [
    'Đi thẳng đến sảnh chính',
    'Lên thang máy số 2 lên tầng 2',
    'Rẽ trái, đi đến phòng khám theo số phòng trên vé',
];

export function RegisterSuccessStep({ result, onRegisterNew }: RegisterSuccessStepProps) {
    const qrUrl = getQrImageUrl(result.qrPayload, 112);

    return (
        <div className="space-y-6">
            <div className="text-center pt-2 pb-2">
                <div className="w-16 h-16 rounded-full bg-[#8B7CF6] flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgba(139,124,246,0.35)]">
                    <Check className="w-8 h-8 text-white" strokeWidth={3} />
                </div>
                <h2 className="text-[24px] font-bold text-[#1F2937]">Đăng ký thành công!</h2>
                <p className="text-[13px] text-[#9CA3AF] mt-2">
                    Bệnh nhân đã được cấp số thứ tự và sẵn sàng khám bệnh
                </p>
            </div>

            <div className="max-w-[440px] mx-auto rounded-3xl border border-neutral-100 bg-white p-6 md:p-8 shadow-[0_10px_30px_rgba(139,124,246,0.06)] relative overflow-hidden text-neutral-800">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B7CF6]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

                {/* Ticket Header */}
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="space-y-1">
                        <span className="text-[11px] font-bold tracking-widest text-[#8B7CF6] uppercase block">
                            TriageFlow OPD
                        </span>
                        <h3 className="text-[15px] font-bold text-neutral-800 tracking-tight leading-tight">
                            Phiếu Đăng Ký Khám
                        </h3>
                    </div>
                    {/* Priority Badge */}
                    <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider",
                        result.priority === 'Khẩn cấp' 
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : result.priority === 'Người cao tuổi'
                            ? 'bg-blue-50 text-blue-700 border border-blue-100'
                            : result.priority === 'Ưu tiên'
                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                            : 'bg-neutral-50 text-neutral-600 border border-neutral-200'
                    )}>
                        {result.priority}
                    </span>
                </div>

                {/* Queue Number Panel */}
                <div className="bg-[#F5F2FF] border border-[#8B7CF6]/15 rounded-2xl p-5 text-center mb-6 shadow-[inset_0_2px_4px_rgba(139,124,246,0.03)]">
                    <span className="text-[11px] font-bold text-neutral-500 tracking-wider uppercase block mb-1">
                        Số Thứ Tự Của Bạn
                    </span>
                    <div className="text-[52px] font-black text-[#8B7CF6] tracking-tight leading-none my-1">
                        {result.ticketNo}
                    </div>
                    <span className="text-[11px] font-medium text-neutral-500 block mt-2">
                        Bệnh viện Đa khoa Trung ương
                    </span>
                </div>

                {/* Details Section */}
                <div className="space-y-5">
                    {/* Patient Information */}
                    <div>
                        <span className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase block mb-2">
                            Thông tin hành chính
                        </span>
                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 space-y-2.5 text-[13px]">
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-neutral-500 font-medium">Họ và tên</span>
                                <span className="font-bold text-neutral-800">{result.fullName.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2.5">
                                <span className="text-neutral-500 font-medium">CCCD/CMND</span>
                                <span className="font-semibold text-neutral-800 font-mono">{result.citizenId}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2.5">
                                <span className="text-neutral-500 font-medium">Số điện thoại</span>
                                <span className="font-semibold text-neutral-800 font-mono">{formatPhoneDisplay(result.phone)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Examination Details */}
                    <div>
                        <span className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase block mb-2">
                            Thông tin phòng khám
                        </span>
                        <div className="bg-[#FAF9FF] border border-[#8B7CF6]/5 rounded-2xl p-4 space-y-2.5 text-[13px]">
                            <div className="flex justify-between items-center py-0.5">
                                <span className="text-neutral-500 font-medium">Khoa khám</span>
                                <span className="font-bold text-[#8B7CF6]">{result.specialty.toUpperCase()}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2.5">
                                <span className="text-neutral-500 font-medium">Bác sĩ</span>
                                <span className="font-bold text-neutral-800">{result.doctorLabel}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2.5">
                                <span className="text-neutral-500 font-medium">Phòng khám</span>
                                <span className="font-bold text-neutral-800">{result.roomLabel}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2.5">
                                <span className="text-neutral-500 font-medium">Ngày & Giờ khám</span>
                                <span className="font-bold text-neutral-800">{result.slotTimeLabel || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2.5">
                                <span className="text-neutral-500 font-medium">Trạng thái thanh toán</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#ECFDF5] text-[#10B981] border border-[#A7F3D0]">
                                    {result.paymentLabel}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QR Code section */}
                <div className="flex flex-col items-center justify-center my-6 py-4 border-t border-b border-dashed border-neutral-100">
                    <div className="bg-white p-2.5 border border-neutral-150 rounded-2xl shadow-xs">
                        <img
                            src={qrUrl}
                            alt="Mã QR vé khám"
                            width={130}
                            height={130}
                            className="block"
                        />
                    </div>
                    <p className="text-[10px] text-neutral-400 font-semibold tracking-wide uppercase mt-3 text-center">
                        Quét QR để theo dõi & dẫn đường trong bệnh viện
                    </p>
                </div>

                {/* Footer Notes */}
                <div className="text-center text-[11px] text-neutral-400 space-y-1">
                    <p className="font-bold text-neutral-500 uppercase">
                        Vui lòng giữ phiếu này trong suốt quá trình khám
                    </p>
                    <p className="font-semibold text-neutral-400/80">
                        In lúc: {new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    type="button"
                    onClick={() => printRegistrationTicket(result)}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[14px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.3)] transition-colors"
                >
                    <Printer className="w-4 h-4" />
                    In vé khám
                </button>
                <button
                    type="button"
                    onClick={() => downloadRegistrationTicketPdf(result)}
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-[#374151] hover:bg-[#1F2937] text-white text-[14px] font-bold transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Tải PDF
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <Link
                    href="/reception"
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-[#E5E7EB] bg-white text-[#374151] text-[14px] font-semibold hover:bg-[#F9FAFB] transition-colors"
                >
                    <Home className="w-4 h-4" />
                    Về trang chủ
                </Link>
                <button
                    type="button"
                    onClick={onRegisterNew}
                    className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-[#E5E7EB] bg-white text-[#374151] text-[14px] font-semibold hover:bg-[#F9FAFB] transition-colors"
                >
                    <UserRound className="w-4 h-4" />
                    Đăng ký bệnh nhân mới
                </button>
            </div>

            <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-5 py-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center shrink-0">
                    <Headphones className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div>
                    <p className="text-[13px] text-[#1E40AF]">
                        Cần hỗ trợ? Liên hệ với nhân viên để được hỗ trợ giải đáp
                    </p>
                    <p className="text-[18px] font-bold text-[#1D4ED8] mt-1">1900 1234</p>
                </div>
            </div>
        </div>
    );
}
