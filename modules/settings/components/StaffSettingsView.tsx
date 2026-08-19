'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    User,
    Lock,
    Upload,
    Save,
    CheckCircle2,
    Loader2,
    ChevronDown,
    Eye,
    EyeOff,
    RotateCcw,
    AlertCircle,
    KeyRound,
    Calendar,
    Clock,
    MapPin,
    Shield,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import type { Gender } from '@/shared/types/auth.types';
import { uploadImageToCloudinary } from '@/shared/services/cloudinaryService';
import { authService } from '@/modules/auth/services/authService';
import { labService } from '@/modules/lab/services/labService';
import type { ShiftInfo } from '@/modules/lab/types/lab.types';
import { PROCEDURE_ROOM_TYPES } from '@/modules/clinical/utils/staffShift';

const ROLE_LABELS: Record<string, string> = {
    RECEPTIONIST: 'Nhân viên Lễ tân',
    DOCTOR: 'Bác sĩ',
    NURSE: 'Điều dưỡng / Y tá',
    ADMIN: 'Quản trị viên',
    LAB_STAFF: 'Kỹ thuật viên Xét nghiệm',
    LAB_TECHNICIAN: 'Kỹ thuật viên Xét nghiệm',
    PHARMACY_STAFF: 'Dược sĩ',
    PHARMACIST: 'Dược sĩ',
    PHARMACY: 'Dược sĩ',
    CASHIER: 'Nhân viên Thu ngân',
    USER: 'Bệnh nhân',
};

const PARACLINICAL_ROLE_MAP: Record<string, { DOCTOR: string; NURSE: string }> = {
    PROCEDURE_ROOM: { DOCTOR: 'Bác sĩ Thủ thuật', NURSE: 'Điều dưỡng Thủ thuật' },
    PROCEDURE: { DOCTOR: 'Bác sĩ Thủ thuật', NURSE: 'Điều dưỡng Thủ thuật' },
    LABORATORY: { DOCTOR: 'Bác sĩ Xét nghiệm', NURSE: 'Điều dưỡng Xét nghiệm' },
    IMAGING_ROOM: { DOCTOR: 'Bác sĩ CĐHA', NURSE: 'Điều dưỡng CĐHA' },
    FUNCTIONAL_EXPLORATION: { DOCTOR: 'Bác sĩ Thăm dò chức năng', NURSE: 'Điều dưỡng Thăm dò chức năng' },
};

export function getRoleDisplayName(role?: string): string {
    if (!role) return 'Nhân viên Y tế';
    const key = role.trim().toUpperCase().replace(/^ROLE_/, '');
    if (typeof window !== 'undefined') {
        const storedRoomType = (localStorage.getItem('tfopd_active_room_type') || '').toUpperCase();
        const mapping = PARACLINICAL_ROLE_MAP[storedRoomType];
        if (mapping) {
            if (key === 'DOCTOR') return mapping.DOCTOR;
            if (key === 'NURSE') return mapping.NURSE;
        }
    }
    return ROLE_LABELS[key] || role;
}

export default function StaffSettingsView() {
    const { profile, fetchProfile, updateProfile, accessToken, error } = useAuthStore();

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Ca trực state
    const [activeShift, setActiveShift] = useState<ShiftInfo | null>(null);
    const [isLoadingShifts, setIsLoadingShifts] = useState(false);

    // Định dạng ngày hiện tại YYYY-MM-DD
    const todayStr = useMemo(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const [userName, setUserName] = useState('');
    const [gender, setGender] = useState<Gender>('MALE');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState<string | null>(null);

    // Load & Upload state
    const [isSaving, setIsSaving] = useState(false);
    const [saveToast, setSaveToast] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // ── Đổi mật khẩu state ──
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [pwStep, setPwStep] = useState<'send_otp' | 'verify' | 'success'>('send_otp');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showNewPw, setShowNewPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);
    const [pwResending, setPwResending] = useState(false);
    const [pwError, setPwError] = useState<string | null>(null);
    const [pwResendMsg, setPwResendMsg] = useState<string | null>(null);

    useEffect(() => {
        if (accessToken) {
            fetchProfile(accessToken).catch((err) => {
                console.error('[StaffSettingsView] Failed to fetch profile:', err);
            });
        }
    }, [accessToken, fetchProfile]);

    useEffect(() => {
        if (accessToken) {
            setIsLoadingShifts(true);
            labService
                .getMyShifts(todayStr)
                .then((shifts) => {
                    if (Array.isArray(shifts) && shifts.length > 0) {
                        const shift =
                            shifts.find(
                                (s) =>
                                    PROCEDURE_ROOM_TYPES.has(String(s.room?.room_type || '').toUpperCase()) ||
                                    s.room?.room_type === 'EXAMINATION_ROOM' ||
                                    s.room?.room_type === 'CLINICAL_ROOM',
                            ) || shifts[0];
                        if (shift) {
                            setActiveShift(shift);
                        }
                    }
                })
                .catch((err) => {
                    console.error('[StaffSettingsView] Failed to fetch shifts:', err);
                })
                .finally(() => {
                    setIsLoadingShifts(false);
                });
        }
    }, [accessToken, todayStr]);

    useEffect(() => {
        if (profile) {
            setUserName(profile.user_name || '');
            setGender(profile.gender || 'MALE');
            setPhone(profile.phone || '');
            setAvatar(profile.avatar || null);
        }
    }, [profile]);

    const handleAvatarClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setErrorMessage(null);
        try {
            const url = await uploadImageToCloudinary(file);
            setAvatar(url);
        } catch (err) {
            console.error('[StaffSettingsView] Failed to upload image:', err);
            setErrorMessage('Tải ảnh đại diện lên thất bại, vui lòng thử lại.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!accessToken) return;

        setIsSaving(true);
        setErrorMessage(null);
        try {
            await updateProfile(
                {
                    user_name: userName,
                    gender,
                    phone,
                    avatar,
                },
                accessToken,
            );

            setSaveToast(true);
            setTimeout(() => setSaveToast(false), 3500);
        } catch (err) {
            console.error('[StaffSettingsView] Failed to update profile:', err);
            setErrorMessage(error || 'Có lỗi xảy ra khi lưu thông tin.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Đổi mật khẩu handlers ──────────────────────────────────────────────────

    const handleToggleChangePassword = () => {
        setShowChangePassword((v) => !v);
        setPwStep('send_otp');
        setOtp('');
        setNewPassword('');
        setConfirmNewPassword('');
        setPwError(null);
        setPwResendMsg(null);
    };

    /** Bước 1: Gửi OTP về email */
    const handleSendOtp = async () => {
        if (!profile?.email) return;
        setPwError(null);
        setPwResendMsg(null);
        setPwLoading(true);
        try {
            await authService.forgotPassword({ email: profile.email });
            setPwStep('verify');
        } catch (err) {
            setPwError(err instanceof Error ? err.message : 'Không thể gửi mã OTP. Vui lòng thử lại.');
        } finally {
            setPwLoading(false);
        }
    };

    /** Bước 1b: Gửi lại OTP */
    const handleResendOtp = async () => {
        if (!profile?.email) return;
        setPwError(null);
        setPwResendMsg(null);
        setPwResending(true);
        try {
            await authService.forgotPassword({ email: profile.email });
            setPwResendMsg('Đã gửi lại mã OTP mới qua email.');
        } catch (err) {
            setPwError(err instanceof Error ? err.message : 'Không thể gửi lại mã OTP.');
        } finally {
            setPwResending(false);
        }
    };

    /** Bước 2: Xác nhận OTP + đặt mật khẩu mới */
    const handleVerifyAndReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError(null);

        if (otp.length !== 8) {
            setPwError('Mã OTP phải có đúng 8 chữ số.');
            return;
        }
        if (newPassword.length < 8) {
            setPwError('Mật khẩu mới phải tối thiểu 8 ký tự.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setPwError('Xác nhận mật khẩu không trùng khớp.');
            return;
        }
        if (!profile?.email) return;

        setPwLoading(true);
        try {
            await authService.forgotPasswordVerify({
                email: profile.email,
                otp: otp.trim(),
                new_password: newPassword,
            });
            setPwStep('success');
        } catch (err) {
            setPwError(err instanceof Error ? err.message : 'Mã OTP không hợp lệ hoặc đã hết hạn.');
        } finally {
            setPwLoading(false);
        }
    };

    const roleName = getRoleDisplayName(profile?.role);

    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-white rounded-tl-4xl rounded-bl-4xl p-6 md:p-10 relative">
            <div className="max-w-4xl w-full mx-auto space-y-8 pb-20">
                {/* ── Toast Alert ── */}
                {saveToast && (
                    <div className="fixed top-6 right-6 z-50 bg-emerald-50 border border-emerald-200 rounded-[18px] p-4 text-emerald-900 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold">Lưu thay đổi thông tin cá nhân thành công!</span>
                    </div>
                )}

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">
                            Thông tin cá nhân
                        </h1>
                        <p className="text-xs lg:text-sm text-slate-400 font-medium mt-1">
                            Xem và chỉnh sửa thông tin cá nhân, ca làm việc
                        </p>
                    </div>
                    {profile?.role && (
                        <div className="flex flex-col sm:items-end gap-1.5 sm:text-right shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8B7CF6]/10 text-[#8B7CF6] border border-[#8B7CF6]/20 rounded-full text-[11.5px] font-bold tracking-wide">
                                <Shield className="w-3.5 h-3.5" />
                                {roleName}
                            </span>
                            {isLoadingShifts ? (
                                <div className="space-y-1 mt-1 flex flex-col items-end">
                                    <div className="h-3 w-32 bg-slate-100 animate-pulse rounded" />
                                    <div className="h-2.5 w-24 bg-slate-100 animate-pulse rounded" />
                                </div>
                            ) : activeShift ? (
                                <div className="mt-1 sm:text-right bg-[#FAF9FF] border border-[#8B7CF6]/10 p-2.5 rounded-xl">
                                    <p className="text-[11.5px] font-extrabold text-slate-700 flex items-center sm:justify-end gap-1.5">
                                        <MapPin className="w-3 h-3 text-[#8B7CF6]" />
                                        Ca trực: {activeShift.room?.room_name || 'Phòng làm việc'}
                                    </p>
                                    <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5 flex items-center sm:justify-end gap-1.5">
                                        <Clock className="w-3 h-3 text-[#8B7CF6]" />
                                        {activeShift.start_time} – {activeShift.end_time} • Ngày {activeShift.date}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-1 sm:text-right">
                                    <p className="text-[11px] font-semibold text-slate-400">
                                        Không có ca trực được xếp hôm nay
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-[14px] p-4 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* ── Section 1: 👤 Thông tin nhân viên ── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-6">
                    <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-[#8B7CF6]" />
                        <h3 className="font-bold text-slate-800 text-base">Thông tin nhân viên</h3>
                    </div>

                    {/* Avatar Upload Box */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-[20px] bg-slate-50/60 border border-slate-100">
                        <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                            {avatar ? (
                                <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-10 h-10 text-slate-300" />
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                </div>
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={isUploading}
                        />

                        <div
                            onClick={handleAvatarClick}
                            className="flex-1 w-full border-2 border-dashed border-slate-200 rounded-[18px] p-6 text-center hover:border-purple-300 transition cursor-pointer bg-white"
                        >
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

                    {/* 2x2 Input Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Họ và tên</label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] focus:bg-white transition"
                                placeholder="Nhập họ và tên..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Vai trò chức danh</label>
                            <input
                                type="text"
                                value={roleName}
                                readOnly
                                className="w-full bg-slate-100 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-semibold text-slate-500 cursor-not-allowed outline-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Email tài khoản</label>
                            <input
                                type="email"
                                value={profile?.email || ''}
                                readOnly
                                className="w-full bg-slate-100 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-semibold text-slate-500 cursor-not-allowed outline-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Số điện thoại</label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] focus:bg-white transition"
                                placeholder="Nhập số điện thoại..."
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600">Giới tính</label>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value as Gender)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] focus:bg-white transition"
                            >
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ── Section 2: 🔒 Bảo mật & Đổi mật khẩu ── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-5 h-5 text-[#8B7CF6]" />
                        <h3 className="font-bold text-slate-800 text-base">Bảo mật tài khoản</h3>
                    </div>

                    {/* Toggle button */}
                    <button
                        type="button"
                        onClick={handleToggleChangePassword}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-[14px] bg-slate-50 border border-slate-200 hover:border-[#8B7CF6]/40 hover:bg-purple-50/30 transition cursor-pointer group"
                    >
                        <div className="flex items-center gap-2.5">
                            <KeyRound className="w-4 h-4 text-[#8B7CF6]" />
                            <span className="text-xs font-bold text-slate-700 group-hover:text-[#8B7CF6] transition">
                                Đổi mật khẩu qua mã xác thực Email OTP
                            </span>
                        </div>
                        <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showChangePassword ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {/* Inline change password panel */}
                    {showChangePassword && (
                        <div className="rounded-[18px] border border-slate-200/80 bg-slate-50/50 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                            {/* ── SUCCESS ── */}
                            {pwStep === 'success' && (
                                <div className="flex flex-col items-center gap-3 py-4 text-center">
                                    <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-800">Đổi mật khẩu thành công!</p>
                                    <p className="text-xs text-slate-500">Mật khẩu mới đã được cập nhật. Sử dụng mật khẩu mới cho lần đăng nhập tiếp theo.</p>
                                    <button
                                        type="button"
                                        onClick={handleToggleChangePassword}
                                        className="mt-1 text-xs font-bold text-[#8B7CF6] hover:underline cursor-pointer"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            )}

                            {/* ── STEP 1: Gửi OTP ── */}
                            {pwStep === 'send_otp' && (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Chúng tôi sẽ gửi mã OTP xác thực đến email{' '}
                                        <span className="font-bold text-slate-700">{profile?.email}</span>{' '}
                                        để xác nhận yêu cầu đổi mật khẩu.
                                    </p>

                                    {pwError && (
                                        <div className="flex items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
                                            <p className="text-xs text-red-700">{pwError}</p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={handleSendOtp}
                                        disabled={pwLoading}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[12px] bg-[#8B7CF6] hover:bg-[#7C6CF5] text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer shadow-xs"
                                    >
                                        {pwLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        {pwLoading ? 'Đang gửi mã OTP...' : 'Gửi mã OTP xác thực'}
                                    </button>
                                </div>
                            )}

                            {/* ── STEP 2: Nhập OTP + mật khẩu mới ── */}
                            {pwStep === 'verify' && (
                                <form onSubmit={handleVerifyAndReset} className="space-y-4">
                                    <p className="text-xs text-slate-500">
                                        Nhập mã OTP 8 chữ số đã gửi đến{' '}
                                        <span className="font-bold text-slate-700">{profile?.email}</span>
                                    </p>

                                    {pwError && (
                                        <div className="flex items-start gap-2 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2.5">
                                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
                                            <p className="text-xs text-red-700">{pwError}</p>
                                        </div>
                                    )}

                                    {pwResendMsg && (
                                        <div className="flex items-start gap-2 rounded-[10px] border border-green-200 bg-green-50 px-3 py-2.5">
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-600 mt-0.5" />
                                            <p className="text-xs text-green-700">{pwResendMsg}</p>
                                        </div>
                                    )}

                                    {/* OTP input */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Mã OTP xác thực</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={8}
                                            autoComplete="one-time-code"
                                            placeholder="— — — — — — — —"
                                            value={otp}
                                            onChange={(e) => {
                                                setOtp(e.target.value.replace(/\D/g, '').slice(0, 8));
                                                setPwError(null);
                                            }}
                                            disabled={pwLoading}
                                            className="w-full bg-white border border-slate-200 rounded-[12px] px-4 py-3 text-center text-xl font-mono tracking-[0.4em] text-slate-900 focus:outline-none focus:border-[#8B7CF6] transition disabled:opacity-50"
                                        />
                                    </div>

                                    {/* New password */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showNewPw ? 'text' : 'password'}
                                                placeholder="Tối thiểu 8 ký tự"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                disabled={pwLoading}
                                                className="w-full bg-white border border-slate-200 rounded-[12px] px-4 py-3 pr-10 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] transition disabled:opacity-50"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowNewPw((v) => !v)}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            >
                                                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm password */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-600">Xác nhận mật khẩu mới</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPw ? 'text' : 'password'}
                                                placeholder="Nhập lại mật khẩu mới"
                                                value={confirmNewPassword}
                                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                                disabled={pwLoading}
                                                className="w-full bg-white border border-slate-200 rounded-[12px] px-4 py-3 pr-10 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#8B7CF6] transition disabled:opacity-50"
                                            />
                                            <button
                                                type="button"
                                                tabIndex={-1}
                                                onClick={() => setShowConfirmPw((v) => !v)}
                                                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            >
                                                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            type="submit"
                                            disabled={pwLoading || otp.length !== 8 || !newPassword || !confirmNewPassword}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[#8B7CF6] hover:bg-[#7C6CF5] text-white text-xs font-bold transition disabled:opacity-60 cursor-pointer shadow-xs"
                                        >
                                            {pwLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            {pwLoading ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
                                        </button>
                                    </div>

                                    {/* Resend OTP */}
                                    <div className="text-center">
                                        <button
                                            type="button"
                                            onClick={handleResendOtp}
                                            disabled={pwResending || pwLoading}
                                            className="inline-flex items-center gap-1 text-xs font-bold text-[#8B7CF6] hover:underline disabled:opacity-50 transition cursor-pointer"
                                        >
                                            {pwResending ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <RotateCcw className="w-3 h-3" />
                                            )}
                                            Gửi lại mã OTP
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Bottom Right Sticky Save Button ── */}
                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || isUploading}
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
