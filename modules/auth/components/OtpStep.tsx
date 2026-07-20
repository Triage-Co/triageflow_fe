'use client';

import { useState, useTransition } from 'react';
import { Cross, AlertCircle, Loader2, ChevronLeft, RotateCcw } from 'lucide-react';
import { authService } from '@/modules/auth/services/authService';
import type { OtpVerifyResponseData } from '@/shared/types/auth.types';

interface OtpStepProps {
    email: string;
    authToken?: string; // Bearer token required by otp/send (login flow)
    onVerified: (data: OtpVerifyResponseData) => void;
    onBack: () => void;
}

export function OtpStep({ email, authToken, onVerified, onBack }: OtpStepProps) {
    const [isPending, startTransition] = useTransition();
    const [isResending, startResend] = useTransition();

    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [resendMsg, setResendMsg] = useState<string | null>(null);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (otp.length !== 8) {
            setError('Mã OTP phải có đúng 8 chữ số.');
            return;
        }

        startTransition(async () => {
            try {
                const res = await authService.verifyOtp({ email, otp });
                onVerified(res.data);
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Mã OTP không hợp lệ. Vui lòng thử lại.',
                );
            }
        });
    }

    function handleResend() {
        setError(null);
        setResendMsg(null);
        startResend(async () => {
            try {
                await authService.sendOtp({ email }, authToken);
                setResendMsg('Đã gửi lại mã OTP.');
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Không thể gửi lại OTP.',
                );
            }
        });
    }

    return (
        <div className="w-full max-w-100 mx-auto">
            {/* Back */}
            <button
                type="button"
                onClick={onBack}
                className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
            >
                <ChevronLeft className="h-4 w-4" />
                Quay lại
            </button>

            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-500 mb-5 shadow-md">
                    <Cross className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-snug">
                    Xác thực Email
                </h2>
                <p className="mt-1.5 text-sm text-neutral-500">
                    Chúng tôi đã gửi mã OTP 8 chữ số đến{' '}
                    <span className="font-semibold text-neutral-700">{email}</span>
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Resend success */}
            {resendMsg && (
                <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <p className="text-sm text-green-700">{resendMsg}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                    <label htmlFor="otp-input" className="block text-sm font-medium text-neutral-700">
                        Nhập mã OTP
                    </label>
                    <input
                        id="otp-input"
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
                        className="block w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-neutral-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                    />
                    <p className="text-xs text-neutral-400 text-center">
                        Mã có hiệu lực trong vài phút
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-base sm:text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation cursor-pointer"
                >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Đang xác thực...' : 'Xác nhận OTP'}
                </button>
            </form>

            {/* Resend */}
            <div className="mt-6 text-center">
                <p className="text-sm text-neutral-400">
                    Không nhận được mã?{' '}
                    <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending || isPending}
                        className="inline-flex items-center gap-1 font-medium text-brand-500 hover:text-brand-600 transition-colors disabled:opacity-50"
                    >
                        {isResending && <Loader2 className="h-3 w-3 animate-spin" />}
                        {!isResending && <RotateCcw className="h-3 w-3" />}
                        Gửi lại OTP
                    </button>
                </p>
            </div>
        </div>
    );
}
