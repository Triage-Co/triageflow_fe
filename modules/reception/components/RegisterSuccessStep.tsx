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

            <div className="rounded-[16px] border border-[#EBEBEB] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="bg-[#8B7CF6] px-5 py-4 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[13px] font-bold text-white">TriageFlow OPD</p>
                        <p className="text-[11px] text-white/80 mt-0.5">Bệnh viện Đa khoa Trung ương</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-semibold text-white/75 uppercase tracking-wide">Số thứ tự</p>
                        <p className="text-[28px] font-extrabold text-white leading-none mt-1">{result.ticketNo}</p>
                    </div>
                </div>

                <div className="p-5 md:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-[12px] mb-5">
                        <div>
                            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-1">
                                Thông tin bệnh nhân
                            </p>
                            <p className="text-[15px] font-bold text-[#1F2937]">{result.fullName}</p>
                        </div>
                        <div className="sm:text-right">
                            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-1">CCCD</p>
                            <p className="text-[13px] font-semibold text-[#374151]">{result.citizenId}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-1">SĐT</p>
                            <p className="text-[13px] font-semibold text-[#374151]">{formatPhoneDisplay(result.phone)}</p>
                        </div>
                        <div className="sm:text-right">
                            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-1">Chuyên khoa</p>
                            <p className="text-[13px] font-semibold text-[#374151]">{result.specialty}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-5">
                        <span className="text-[11px] font-bold text-[#9CA3AF] uppercase">Ưu tiên</span>
                        <span
                            className={cn(
                                'inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full border',
                                result.priority === 'Khẩn cấp'
                                    ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                                    : result.priority === 'Người cao tuổi'
                                      ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
                                      : result.priority === 'Ưu tiên'
                                        ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                                        : 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]',
                            )}
                        >
                            <span className="w-2 h-2 rounded-full bg-current opacity-70" />
                            {result.priority}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                        <div className="rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] px-4 py-3">
                            <div className="flex items-center gap-2 text-[#8B7CF6] mb-1.5">
                                <Stethoscope className="w-4 h-4" />
                                <span className="text-[11px] font-bold text-[#9CA3AF]">Bác sĩ</span>
                            </div>
                            <p className="text-[12px] font-semibold text-[#374151]">{result.doctorLabel}</p>
                        </div>
                        <div className="rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] px-4 py-3">
                            <div className="flex items-center gap-2 text-[#8B7CF6] mb-1.5">
                                <Clock className="w-4 h-4" />
                                <span className="text-[11px] font-bold text-[#9CA3AF]">Giờ khám</span>
                            </div>
                            <p className="text-[12px] font-semibold text-[#374151]">{result.slotTimeLabel || '—'}</p>
                        </div>
                        <div className="rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] px-4 py-3">
                            <div className="flex items-center gap-2 text-[#8B7CF6] mb-1.5">
                                <MapPin className="w-4 h-4" />
                                <span className="text-[11px] font-bold text-[#9CA3AF]">Phòng</span>
                            </div>
                            <p className="text-[12px] font-semibold text-[#374151]">{result.roomLabel}</p>
                        </div>
                        <div className="rounded-xl bg-[#F9FAFB] border border-[#F3F4F6] px-4 py-3">
                            <div className="flex items-center gap-2 text-[#8B7CF6] mb-1.5">
                                <Wallet className="w-4 h-4" />
                                <span className="text-[11px] font-bold text-[#9CA3AF]">Thanh toán</span>
                            </div>
                            <p className="text-[12px] font-semibold text-[#374151]">{result.paymentLabel}</p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center rounded-xl border border-[#F3F4F6] bg-[#FAFAFA] p-4 mb-4">
                        <img
                            src={qrUrl}
                            alt="Mã QR vé khám"
                            width={112}
                            height={112}
                            className="rounded-lg border border-[#E5E7EB] bg-white shrink-0"
                        />
                        <p className="text-[12px] text-[#6B7280] leading-relaxed">
                            Quét mã QR để theo dõi lượt khám, xem hướng dẫn điều hướng và nhận thông báo khi đến
                            lượt. Có vướng mắc quét mã QR để chat hỗ trợ.
                        </p>
                    </div>

                    <div className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3.5 mb-3">
                        <p className="text-[13px] font-bold text-[#1E40AF] mb-2">Hướng dẫn đến phòng khám</p>
                        <ol className="space-y-1.5 text-[12px] text-[#1D4ED8] list-decimal list-inside">
                            {DIRECTIONS.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ol>
                    </div>

                    <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
                        <p className="text-[12px] font-semibold text-[#92400E]">
                            Thời gian chờ: Dự kiến {result.waitTimeLabel}
                        </p>
                    </div>
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
