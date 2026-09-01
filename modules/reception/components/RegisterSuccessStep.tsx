'use client';

import Link from 'next/link';
import {
    Check,
    Clock,
    Download,
    Headphones,
    Home,
    Printer,
    Sparkles,
    UserRound,
} from 'lucide-react';
import type { RegistrationResult } from '@/modules/reception/types/reception.types';
import {
    downloadRegistrationTicketPdf,
    getQrImageUrl,
    printRegistrationTicket,
} from '@/modules/reception/utils/registrationTicket';

interface RegisterSuccessStepProps {
    result: RegistrationResult;
    onRegisterNew: () => void;
}

export function RegisterSuccessStep({ result, onRegisterNew }: RegisterSuccessStepProps) {
    const qrUrl = getQrImageUrl(result.qrPayload, 120);

    return (
        <div className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                {/* ── CỘT TRÁI: Thông tin vé khám (5/12 cols) ── */}
                <div className="lg:col-span-5 space-y-3">
                    {/* Ticket Card Preview */}
                    <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-[0_10px_30px_rgba(139,124,246,0.08)] relative overflow-hidden text-neutral-800">
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B7CF6]/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

                        {/* Queue Number Panel */}
                        <div className="bg-[#F5F2FF] border border-[#8B7CF6]/20 rounded-2xl p-5 text-center mb-5 shadow-[inset_0_2px_4px_rgba(139,124,246,0.03)]">
                            <span className="text-[11px] font-bold text-neutral-500 tracking-wider uppercase block mb-1">
                                Số Thứ Tự Của Bạn
                            </span>
                            <div className="text-[52px] font-black text-[#8B7CF6] tracking-tight leading-none my-1">
                                {result.ticketNo}
                            </div>
                            {result.waitTimeLabel && (
                                <div className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-[#7C6FE0] font-semibold bg-white/80 px-3 py-1 rounded-full border border-[#8B7CF6]/15">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Dự kiến: {result.waitTimeLabel}</span>
                                </div>
                            )}
                        </div>

                        {/* Details Section */}
                        <div className="space-y-4">
                            {/* Patient Information */}
                            <div>
                                <span className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase block mb-2">
                                    Thông tin hành chính
                                </span>
                                <div className="bg-neutral-50/80 border border-neutral-100 rounded-2xl p-3.5 space-y-2 text-[13px]">
                                    <div className="flex justify-between items-center py-0.5">
                                        <span className="text-neutral-500 font-medium">Họ và tên</span>
                                        <span className="font-bold text-neutral-900">{result.fullName.toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2">
                                        <span className="text-neutral-500 font-medium">CCCD/CMND</span>
                                        <span className="font-bold text-neutral-800 font-mono">{result.citizenId}</span>
                                    </div>
                                    {result.phone && (
                                        <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2">
                                            <span className="text-neutral-500 font-medium">Số điện thoại</span>
                                            <span className="font-semibold text-neutral-800">{result.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Examination Details */}
                            <div>
                                <span className="text-[11px] font-bold text-neutral-400 tracking-widest uppercase block mb-2">
                                    Thông tin phòng khám
                                </span>
                                <div className="bg-[#FAF9FF] border border-[#8B7CF6]/10 rounded-2xl p-3.5 space-y-2 text-[13px]">
                                    <div className="flex justify-between items-center py-0.5">
                                        <span className="text-neutral-500 font-medium">Khoa khám</span>
                                        <span className="font-bold text-[#8B7CF6]">{result.specialty.toUpperCase()}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2">
                                        <span className="text-neutral-500 font-medium">Bác sĩ</span>
                                        <span className="font-bold text-neutral-800">{result.doctorLabel}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2">
                                        <span className="text-neutral-500 font-medium">Phòng khám</span>
                                        <span className="font-bold text-neutral-800">{result.roomLabel}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t border-neutral-200/50 pt-2">
                                        <span className="text-neutral-500 font-medium">Ngày & Giờ khám</span>
                                        <span className="font-bold text-neutral-800">{result.slotTimeLabel || '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* QR Code section */}
                        <div className="flex flex-col items-center justify-center my-5 py-3 border-t border-b border-dashed border-neutral-200">
                            <div className="bg-white p-2 border border-neutral-200 rounded-2xl shadow-xs mb-1.5">
                                <img
                                    src={qrUrl}
                                    alt="Mã QR vé khám"
                                    width={120}
                                    height={120}
                                    className="block"
                                />
                            </div>
                            <span className="text-[11px] text-neutral-400 font-medium">Mã QR quét tự động tại phòng khám</span>
                        </div>

                        {/* Footer Notes */}
                        <div className="text-center text-[11px] text-neutral-400 space-y-1">
                            <p className="font-bold text-neutral-600 uppercase">
                                Vui lòng giữ phiếu này trong suốt quá trình khám
                            </p>
                            <p className="font-medium text-neutral-400/80">
                                In lúc: {new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── CỘT PHẢI: Thông báo thành công + Thao tác vé + Điều hướng (7/12 cols) ── */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Success Hero Banner */}
                    <div className="rounded-3xl bg-gradient-to-br from-[#8B7CF6]/10 via-[#F5F2FF] to-white border border-[#8B7CF6]/20 p-6 md:p-7 relative overflow-hidden shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#8B7CF6] flex items-center justify-center shrink-0 shadow-[0_8px_20px_rgba(139,124,246,0.35)]">
                                <Check className="w-7 h-7 text-white" strokeWidth={3} />
                            </div>
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#8B7CF6]/15 text-[#7C6FE0] text-[12px] font-bold mb-2">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Đăng ký hoàn tất
                                </div>
                                <h2 className="text-[22px] md:text-[24px] font-extrabold text-[#1F2937] leading-tight">
                                    Đăng ký khám thành công!
                                </h2>
                                <p className="text-[13px] md:text-[14px] text-[#4B5563] mt-1.5 leading-relaxed">
                                    Bệnh nhân <strong className="text-neutral-900">{result.fullName}</strong> đã được cấp số thứ tự <strong className="text-[#8B7CF6] font-extrabold">{result.ticketNo}</strong> và sẵn sàng vào khám bệnh.
                                </p>
                            </div>
                        </div>

                        {/* Quick Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-[#8B7CF6]/15">
                            <div className="bg-white/80 rounded-xl p-3 border border-[#8B7CF6]/10 shadow-xs">
                                <span className="text-[11px] font-medium text-neutral-400 block">Số thứ tự</span>
                                <span className="text-[18px] font-black text-[#8B7CF6]">{result.ticketNo}</span>
                            </div>
                            <div className="bg-white/80 rounded-xl p-3 border border-[#8B7CF6]/10 shadow-xs">
                                <span className="text-[11px] font-medium text-neutral-400 block">Phòng khám</span>
                                <span className="text-[13px] font-bold text-neutral-800 truncate block">{result.roomLabel}</span>
                            </div>
                            <div className="bg-white/80 rounded-xl p-3 border border-[#8B7CF6]/10 shadow-xs col-span-2 sm:col-span-1">
                                <span className="text-[11px] font-medium text-neutral-400 block">Bác sĩ</span>
                                <span className="text-[13px] font-bold text-neutral-800 truncate block">{result.doctorLabel}</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Action Buttons: In vé & Tải PDF */}
                    <div className="space-y-3">
                        <h3 className="text-[14px] font-bold text-neutral-700">In & Tải vé khám</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => printRegistrationTicket(result)}
                                className="inline-flex items-center justify-center gap-2.5 min-h-[50px] px-5 rounded-2xl bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[15px] font-bold shadow-[0_4px_14px_rgba(139,124,246,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                            >
                                <Printer className="w-5 h-5" />
                                In vé khám
                            </button>
                            <button
                                type="button"
                                onClick={() => downloadRegistrationTicketPdf(result)}
                                className="inline-flex items-center justify-center gap-2.5 min-h-[50px] px-5 rounded-2xl bg-[#374151] hover:bg-[#1F2937] text-white text-[15px] font-bold transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm"
                            >
                                <Download className="w-5 h-5" />
                                Tải file PDF
                            </button>
                        </div>
                    </div>

                    {/* Navigation / Next Step Buttons */}
                    <div className="space-y-3 pt-1">
                        <h3 className="text-[14px] font-bold text-neutral-700">Các thao tác tiếp theo</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={onRegisterNew}
                                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl border border-[#8B7CF6]/30 bg-[#F5F2FF] hover:bg-[#EDE9FE] text-[#7C6FE0] text-[14px] font-bold transition-colors cursor-pointer"
                            >
                                <UserRound className="w-4 h-4" />
                                Đăng ký bệnh nhân mới
                            </button>
                            <Link
                                href="/reception"
                                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-4 rounded-xl border border-[#E5E7EB] bg-white text-[#374151] text-[14px] font-semibold hover:bg-[#F9FAFB] transition-colors"
                            >
                                <Home className="w-4 h-4" />
                                Về trang chủ lễ tân
                            </Link>
                        </div>
                    </div>

                    {/* Support Banner */}
                    <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-5 py-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center shrink-0">
                            <Headphones className="w-5 h-5 text-[#2563EB]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[#1E40AF] font-medium">
                                Cần hỗ trợ? Liên hệ nhân viên bàn tiếp đón hoặc hotline
                            </p>
                            <p className="text-[16px] font-bold text-[#1D4ED8]">1900 1234</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

