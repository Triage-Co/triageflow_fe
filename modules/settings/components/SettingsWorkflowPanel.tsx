'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    User,
    Printer,
    Bell,
    MessageSquare,
    Lock,
    Upload,
    Save,
    CheckCircle2,
    Loader2,
    ArrowRight,
    FilePlus,
    Pill
} from 'lucide-react';

export function SettingsWorkflowPanel() {
    const [fullName, setFullName] = useState('Nguyễn Lan Phương');
    const [staffCode, setStaffCode] = useState('NV-0342');
    const [email, setEmail] = useState('lanphuong@hospital.vn');
    const [phone, setPhone] = useState('1234');

    const [defaultPrinter, setDefaultPrinter] = useState('Máy in nhiệt – Quầy 3');
    const [paperSize, setPaperSize] = useState('Khổ nhiệt 80mm');

    // Notification Toggles State (Screenshot 2 section 3)
    const [notifState, setNotifState] = useState({
        emergency: true,
        queueOverload: true,
        paymentConfirm: true,
        doctorReady: true,
        patientCheckin: true,
    });

    // Appearance State
    const [largeFont, setLargeFont] = useState(false);

    // Save & Toast state
    const [isSaving, setIsSaving] = useState(false);
    const [saveToast, setSaveToast] = useState(false);

    const toggleNotif = (key: keyof typeof notifState) => {
        setNotifState((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setSaveToast(true);
            setTimeout(() => setSaveToast(false), 3500);
        }, 800);
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-white rounded-tl-[48px] rounded-bl-[48px] p-6 md:p-10 relative">
            <div className="max-w-4xl w-full mx-auto space-y-8 pb-20">
                {/* ── Toast Alert ── */}
                {saveToast && (
                    <div className="fixed top-6 right-6 z-50 bg-emerald-50 border border-emerald-200 rounded-[18px] p-4 text-emerald-900 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold">Lưu thay đổi cài đặt hệ thống thành công!</span>
                    </div>
                )}

                {/* ── Header ── */}
                <div>
                    <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">
                        Cài đặt
                    </h1>
                    <p className="text-xs lg:text-sm text-slate-400 font-medium mt-1">
                        Tuỳ chỉnh giao diện và cấu hình hệ thống
                    </p>
                </div>

                {/* ── Section 1: 👤 Thông tin nhân viên matching Screenshot 2 ── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-6">
                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-[#8B7CF6]" />
                        <h3 className="font-bold text-slate-800 text-base">Thông tin nhân viên</h3>
                    </div>

                    {/* Avatar Upload Box */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-[20px] bg-slate-50/60 border border-slate-100">
                        <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-300 shrink-0 shadow-sm">
                            <User className="w-10 h-10" />
                        </div>

                        <div className="flex-1 w-full border-2 border-dashed border-slate-200 rounded-[18px] p-6 text-center hover:border-purple-300 transition cursor-pointer bg-white">
                            <div className="flex flex-col items-center gap-1.5">
                                <div className="w-8 h-8 rounded-full bg-purple-50 text-[#8B7CF6] flex items-center justify-center">
                                    <Upload className="w-4 h-4" />
                                </div>
                                <p className="text-xs font-bold text-slate-700">
                                    Kéo thả ảnh vào đây <span className="text-slate-400 font-normal">hoặc</span> <span className="text-[#8B7CF6]">nhấp để chọn file</span>
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    Định dạng JPG, PNG hoặc WebP. Tối đa 5MB. Khuyến nghị kích thước 200x200px.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 2x2 Input Grid matching Screenshot 2 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Họ và tên</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] focus:bg-white transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Mã nhân viên</label>
                            <input
                                type="text"
                                value={staffCode}
                                onChange={(e) => setStaffCode(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] focus:bg-white transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] focus:bg-white transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Số điện thoại nội bộ</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] focus:bg-white transition"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Section 2: 🖨️ Cấu hình máy in matching Screenshot 2 ── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-5">
                    <div className="flex items-center gap-2">
                        <Printer className="w-5 h-5 text-[#8B7CF6]" />
                        <h3 className="font-bold text-slate-800 text-base">Cấu hình máy in</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Máy in mặc định</label>
                            <input
                                type="text"
                                value={defaultPrinter}
                                onChange={(e) => setDefaultPrinter(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] focus:bg-white transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Khổ giấy</label>
                            <input
                                type="text"
                                value={paperSize}
                                onChange={(e) => setPaperSize(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] focus:bg-white transition"
                            />
                        </div>
                    </div>
                </div>

                {/* ── Section 3: 🔔 Thông báo matching Screenshot 2 ── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Bell className="w-5 h-5 text-[#8B7CF6]" />
                        <h3 className="font-bold text-slate-800 text-base">Thông báo</h3>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {/* Toggle 1 */}
                        <div className="py-3.5 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Thông báo bệnh nhân cấp cứu</span>
                            <button
                                onClick={() => toggleNotif('emergency')}
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    notifState.emergency ? 'bg-[#8B7CF6] justify-end' : 'bg-slate-300 justify-start'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Toggle 2 */}
                        <div className="py-3.5 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Cảnh báo hàng đợi quá tải</span>
                            <button
                                onClick={() => toggleNotif('queueOverload')}
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    notifState.queueOverload ? 'bg-[#8B7CF6] justify-end' : 'bg-slate-300 justify-start'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Toggle 3 */}
                        <div className="py-3.5 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Xác nhận thanh toán</span>
                            <button
                                onClick={() => toggleNotif('paymentConfirm')}
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    notifState.paymentConfirm ? 'bg-[#8B7CF6] justify-end' : 'bg-slate-300 justify-start'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Toggle 4 */}
                        <div className="py-3.5 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Bác sĩ sẵn sàng</span>
                            <button
                                onClick={() => toggleNotif('doctorReady')}
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    notifState.doctorReady ? 'bg-[#8B7CF6] justify-end' : 'bg-slate-300 justify-start'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Toggle 5 */}
                        <div className="py-3.5 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Check-in bệnh nhân</span>
                            <button
                                onClick={() => toggleNotif('patientCheckin')}
                                className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                                    notifState.patientCheckin ? 'bg-[#8B7CF6] justify-end' : 'bg-slate-300 justify-start'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Section 4: 💬 Giao diện matching Screenshot 2 ── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-[#8B7CF6]" />
                        <h3 className="font-bold text-slate-800 text-base">Giao diện</h3>
                    </div>

                    <div className="flex items-center justify-between py-2">
                        <div>
                            <p className="text-xs font-bold text-slate-800">Cỡ chữ lớn</p>
                            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                Tăng cỡ chữ để dễ đọc hơn trong ca trực
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={largeFont}
                            onChange={(e) => setLargeFont(e.target.checked)}
                            className="w-4 h-4 text-[#8B7CF6] rounded border-slate-300 focus:ring-[#8B7CF6] cursor-pointer"
                        />
                    </div>
                </div>

                {/* ── Section 5: 💊 Kê đơn thuốc mới (Dược phẩm) ── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <FilePlus className="w-5 h-5 text-[#8B7CF6]" />
                        <h3 className="font-bold text-slate-800 text-base">Kê đơn thuốc mới</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                        Tạo và kê đơn thuốc mới trực tiếp tại quầy nhà thuốc hoặc bổ sung theo chỉ định.
                    </p>
                    <div className="pt-2">
                        <Link
                            href="/pharmacy/create"
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-indigo-200"
                        >
                            <FilePlus className="w-4 h-4 text-indigo-600" />
                            <span>Mở giao diện Kê đơn thuốc mới</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                    </div>
                </div>

                {/* ── Section 6: 🔒 Bảo mật matching Screenshot 2 ── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-5 h-5 text-[#8B7CF6]" />
                        <h3 className="font-bold text-slate-800 text-base">Bảo mật</h3>
                    </div>

                    <button
                        type="button"
                        className="text-xs font-bold text-[#8B7CF6] hover:underline transition flex items-center gap-1 cursor-pointer"
                    >
                        <span>Đổi mật khẩu</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* ── Bottom Right Sticky Save Button matching Screenshot 2 ── */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-8 py-3.5 rounded-[14px] bg-[#8B7CF6] hover:bg-[#7C6CF5] text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Đang lưu...</span>
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                <span>Lưu thay đổi</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
