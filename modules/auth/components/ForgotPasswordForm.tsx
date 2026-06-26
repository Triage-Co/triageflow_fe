'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { 
    Cross, 
    AlertCircle, 
    Loader2, 
    ChevronLeft, 
    RotateCcw, 
    Eye, 
    EyeOff, 
    CheckCircle2, 
    Mail 
} from 'lucide-react';
import { authService } from '@/modules/auth/services/authService';

export function ForgotPasswordForm() {
    const [isPending, startTransition] = useTransition();
    const [isResending, startResend] = useTransition();

    // Flow Step: 'request' (enter email) | 'verify' (enter OTP & new passwords) | 'success'
    const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
    
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [error, setError] = useState<string | null>(null);
    const [resendMsg, setResendMsg] = useState<string | null>(null);

    // ── STEP 1: Request OTP ──────────────────────────────────────────────────
    async function handleRequestOtp(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Định dạng email không hợp lệ.');
            return;
        }

        startTransition(async () => {
            try {
                await authService.forgotPassword({ email: email.trim() });
                setStep('verify');
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Không thể gửi yêu cầu lấy lại mật khẩu. Vui lòng thử lại.'
                );
            }
        });
    }

    // ── STEP 2: Verify OTP & Reset Password ──────────────────────────────────
    async function handleVerifyAndReset(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (otp.length !== 8) {
            setError('Mã OTP phải có đúng 8 chữ số.');
            return;
        }

        if (password.length < 8) {
            setError('Mật khẩu mới phải tối thiểu 8 ký tự.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Xác nhận mật khẩu mới không trùng khớp.');
            return;
        }

        startTransition(async () => {
            try {
                await authService.forgotPasswordVerify({
                    email: email.trim(),
                    otp: otp.trim(),
                    password: password
                });
                setStep('success');
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Mã OTP không hợp lệ hoặc đã hết hạn.'
                );
            }
        });
    }

    // ── Resend OTP helper ─────────────────────────────────────────────────────
    function handleResendOtp() {
        setError(null);
        setResendMsg(null);
        startResend(async () => {
            try {
                await authService.forgotPassword({ email: email.trim() });
                setResendMsg('Đã gửi lại mã OTP mới qua email.');
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Không thể gửi lại mã OTP.'
                );
            }
        });
    }

    // ── RENDER STEP 3: SUCCESS SCREEN ─────────────────────────────────────────
    if (step === 'success') {
        return (
            <div className="w-full max-w-100 mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100 shadow-sm">
                    <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 tracking-tight leading-snug mb-2">
                    Khôi phục thành công!
                </h2>
                <p className="text-sm text-neutral-500 leading-relaxed max-w-sm mx-auto mb-8">
                    Mật khẩu của bạn đã được đặt lại thành công. Hãy đăng nhập lại bằng mật khẩu mới này.
                </p>
                <Link
                    href="/login"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                    Đăng nhập ngay
                </Link>
            </div>
        );
    }

    // ── RENDER STEP 2: VERIFY OTP & RESET ─────────────────────────────────────
    if (step === 'verify') {
        return (
            <div className="w-full max-w-100 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Back Link */}
                <button
                    type="button"
                    onClick={() => { setStep('request'); setError(null); setResendMsg(null); }}
                    className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Quay lại nhập Email
                </button>

                {/* Header */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-500 mb-5 shadow-md">
                        <Cross className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-snug">
                        Đặt lại mật khẩu
                    </h2>
                    <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
                        Nhập mã OTP 8 chữ số gửi tới email{' '}
                        <span className="font-semibold text-neutral-800">{email}</span> và điền mật khẩu mới.
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Resend success alert */}
                {resendMsg && (
                    <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 animate-in fade-in duration-200">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        <p className="text-sm text-green-700">{resendMsg}</p>
                    </div>
                )}

                <form onSubmit={handleVerifyAndReset} className="space-y-4">
                    {/* OTP code field */}
                    <div className="space-y-1.5">
                        <label htmlFor="otp" className="block text-sm font-medium text-neutral-700">
                            Mã OTP xác thực
                        </label>
                        <input
                            id="otp"
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            autoComplete="one-time-code"
                            required
                            placeholder="— — — — — — — —"
                            value={otp}
                            onChange={(e) => {
                                setOtp(e.target.value.replace(/\D/g, '').slice(0, 8));
                                setError(null);
                            }}
                            disabled={isPending}
                            className="block w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-center text-2xl font-mono tracking-[0.5em] text-neutral-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                        />
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                        <label htmlFor="password-new" className="block text-sm font-medium text-neutral-700">
                            Mật khẩu mới
                        </label>
                        <div className="relative">
                            <input
                                id="password-new"
                                type={showPassword ? 'text' : 'password'}
                                required
                                placeholder="Nhập mật khẩu tối thiểu 8 ký tự"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isPending}
                                className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                        <label htmlFor="password-confirm" className="block text-sm font-medium text-neutral-700">
                            Xác nhận mật khẩu mới
                        </label>
                        <div className="relative">
                            <input
                                id="password-confirm"
                                type={showConfirmPassword ? 'text' : 'password'}
                                required
                                placeholder="Nhập lại mật khẩu mới"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                disabled={isPending}
                                className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                            />
                            <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowConfirmPassword((v) => !v)}
                                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-600"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isPending || otp.length !== 8 || !password || !confirmPassword}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 mt-2"
                    >
                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isPending ? 'Đang cập nhật...' : 'Khôi phục mật khẩu'}
                    </button>
                </form>

                {/* Resend OTP */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-neutral-400">
                        Không nhận được mã?{' '}
                        <button
                            type="button"
                            onClick={handleResendOtp}
                            disabled={isResending || isPending}
                            className="inline-flex items-center gap-1 font-medium text-brand-500 hover:text-brand-600 transition-colors disabled:opacity-50"
                        >
                            {isResending && <Loader2 className="h-3 w-3 animate-spin" />}
                            {!isResending && <RotateCcw className="h-3 w-3" />}
                            Gửi lại mã OTP
                        </button>
                    </p>
                </div>
            </div>
        );
    }

    // ── RENDER STEP 1: REQUEST OTP ───────────────────────────────────────────
    return (
        <div className="w-full max-w-100 mx-auto animate-in fade-in duration-300">
            {/* Back to Login link */}
            <Link
                href="/login"
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors font-medium"
            >
                <ChevronLeft className="h-4 w-4" />
                Quay lại Đăng nhập
            </Link>

            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-500 mb-5 shadow-md">
                    <Cross className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-snug">
                    Quên mật khẩu?
                </h2>
                <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
                    Nhập email đã đăng ký tài khoản. Chúng tôi sẽ gửi cho bạn mã OTP xác thực để đặt lại mật khẩu.
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleRequestOtp} className="space-y-5" noValidate>
                {/* Email address field */}
                <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                        Địa chỉ Email
                    </label>
                    <div className="relative flex items-center">
                        <Mail className="absolute left-3.5 h-4 w-4 text-neutral-400" />
                        <input
                            id="email"
                            type="email"
                            required
                            placeholder="username@hospital.vn"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isPending}
                            className="block w-full rounded-lg border border-neutral-300 bg-white pl-10 pr-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isPending || !email.trim()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 mt-1"
                >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Đang gửi mã...' : 'Nhận mã OTP'}
                </button>
            </form>
        </div>
    );
}
