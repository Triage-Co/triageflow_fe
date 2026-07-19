'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Eye, EyeOff, Cross, AlertCircle, Loader2, CheckCircle2,
} from 'lucide-react';
import { authService } from '@/modules/auth/services/authService';
import { buildUserNameFromFullName } from '@/shared/utils/userName';
import type { Gender, StaffRole } from '@/shared/types/auth.types';

interface FormState {
    email: string;
    userName: string;
    password: string;
    confirmPassword: string;
    gender: Gender;
    phone: string;
}

const INITIAL: FormState = {
    email: '',
    userName: '',
    password: '',
    confirmPassword: '',
    gender: 'MALE',
    phone: '',
};

export function RegisterForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [step, setStep] = useState<'form' | 'success'>('form');
    const [form, setForm] = useState<FormState>(INITIAL);
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function update(field: keyof FormState, value: string) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!form.userName.trim()) {
            setError('Vui lòng nhập tên người dùng.');
            return;
        }
        if (!form.email.trim()) {
            setError('Vui lòng nhập email.');
            return;
        }
        if (!form.phone.trim()) {
            setError('Vui lòng nhập số điện thoại.');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }
        if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 9) {
            setError('Vui lòng nhập số điện thoại hợp lệ.');
            return;
        }

        startTransition(async () => {
            try {
                await authService.register({
                    user_name: buildUserNameFromFullName(
                        form.userName,
                        form.email.split('@')[0] || 'user',
                    ),
                    email: form.email,
                    password: form.password,
                    gender: form.gender,
                    phone: form.phone.trim(),
                });
                setStep('success');
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Đăng ký thất bại. Vui lòng thử lại.',
                );
            }
        });
    }

    // ── Success screen ──────────────────────────────────────────
    if (step === 'success') {
        return (
            <div className="w-full max-w-100 mx-auto text-center">
                <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-neutral-900 mb-2">Đăng ký thành công!</h2>

                {/* Email confirmation notice */}
                <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-left">
                    <p className="text-sm font-semibold text-brand-700 mb-1">
                        ✉️ Xác thực email của bạn
                    </p>
                    <p className="text-sm text-brand-600 leading-relaxed">
                        Mail confirm đã được gửi tới{' '}
                        <span className="font-semibold">{form.email}</span>.
                        Hãy kiểm tra hộp thư và xác thực tài khoản trước khi đăng nhập.
                    </p>
                </div>

                <button
                    onClick={() => router.push('/login')}
                    className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition"
                >
                    Đến trang đăng nhập
                </button>
            </div>
        );
    }

    return (
        <div className="w-full max-w-105 mx-auto">
            <div className="mb-8">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-500 mb-5 shadow-md">
                    <Cross className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-snug">
                    Tạo tài khoản
                </h2>
                <p className="mt-1.5 text-sm text-neutral-500">
                    Đăng ký tài khoản tại hệ thống TriageFlowOPD
                </p>
            </div>

            {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                    <label htmlFor="userName" className="block text-sm font-medium text-neutral-700">
                        Tên người dùng
                    </label>
                    <input
                        id="userName"
                        type="text"
                        required
                        placeholder="DuongMinh"
                        value={form.userName}
                        onChange={(e) => update('userName', e.target.value)}
                        disabled={isPending}
                        className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="reg-email" className="block text-sm font-medium text-neutral-700">
                        Email
                    </label>
                    <input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        disabled={isPending}
                        className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label htmlFor="gender" className="block text-sm font-medium text-neutral-700">
                            Giới tính
                        </label>
                        <select
                            id="gender"
                            required
                            value={form.gender}
                            onChange={(e) => update('gender', e.target.value)}
                            disabled={isPending}
                            className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                        >
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
                            Số điện thoại
                        </label>
                        <input
                            id="phone"
                            type="text"
                            inputMode="tel"
                            maxLength={10}
                            required
                            placeholder="0947900432"
                            value={form.phone}
                            onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            disabled={isPending}
                            className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="reg-password" className="block text-sm font-medium text-neutral-700">
                        Mật khẩu
                    </label>
                    <div className="relative">
                        <input
                            id="reg-password"
                            type={showPw ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            placeholder="..."
                            value={form.password}
                            onChange={(e) => update('password', e.target.value)}
                            disabled={isPending}
                            className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                        />
                        <button type="button" tabIndex={-1} onClick={() => setShowPw((v) => !v)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-600">
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
                        Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                        <input
                            id="confirmPassword"
                            type={showConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            placeholder="..."
                            value={form.confirmPassword}
                            onChange={(e) => update('confirmPassword', e.target.value)}
                            disabled={isPending}
                            className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                        />
                        <button type="button" tabIndex={-1} onClick={() => setShowConfirm((v) => !v)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-600">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Đang đăng ký...' : 'Đăng ký'}
                </button>
            </form>

            <p className="mt-6 text-center text-xs text-neutral-400">
                Đã có tài khoản?{' '}
                <Link href="/login" className="font-medium text-brand-500 hover:text-brand-600 transition-colors">
                    Đăng nhập
                </Link>
            </p>
        </div>
    );
}
