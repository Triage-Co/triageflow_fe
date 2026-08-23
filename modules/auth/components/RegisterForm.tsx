'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Eye, EyeOff, AlertCircle, Loader2, CheckCircle2,
} from 'lucide-react';
import { authService } from '@/modules/auth/services/authService';
import type { Gender } from '@/shared/types/auth.types';
import { isValidEmail, isValidPassword, isValidPhone, isValidUserName } from '@/shared/utils/validators';
import { cn } from '@/lib/utils';

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
    const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
    const [showPw, setShowPw] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function validateField(name: keyof FormState, value: string, currentForm: FormState): string | null {
        switch (name) {
            case 'userName':
                if (!value.trim()) return 'Vui lòng nhập tên người dùng.';
                if (!isValidUserName(value)) return 'Tên người dùng từ 3-50 ký tự, không dấu và không khoảng trắng.';
                return null;
            case 'email':
                if (!value.trim()) return 'Vui lòng nhập email.';
                if (!isValidEmail(value)) return 'Định dạng email không hợp lệ (Ví dụ: user@example.com).';
                return null;
            case 'phone':
                if (value.trim() && !isValidPhone(value)) return 'Số điện thoại không hợp lệ (gồm 10 số, VD: 0912345678).';
                return null;
            case 'password':
                if (!value) return 'Vui lòng nhập mật khẩu.';
                if (!isValidPassword(value, 6)) return 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
                return null;
            case 'confirmPassword':
                if (!value) return 'Vui lòng xác nhận lại mật khẩu.';
                if (value !== currentForm.password) return 'Mật khẩu xác nhận không khớp.';
                return null;
            default:
                return null;
        }
    }

    function update(field: keyof FormState, value: string) {
        const nextForm = { ...form, [field]: value };
        setForm(nextForm);
        setError(null);

        if (touched[field]) {
            const err = validateField(field, value, nextForm);
            setFieldErrors((prev) => ({ ...prev, [field]: err || undefined }));
        }

        // Also revalidate confirmPassword if password changes
        if (field === 'password' && touched.confirmPassword) {
            const confirmErr = validateField('confirmPassword', nextForm.confirmPassword, nextForm);
            setFieldErrors((prev) => ({ ...prev, confirmPassword: confirmErr || undefined }));
        }
    }

    function handleBlur(field: keyof FormState) {
        setTouched((prev) => ({ ...prev, [field]: true }));
        const err = validateField(field, form[field], form);
        setFieldErrors((prev) => ({ ...prev, [field]: err || undefined }));
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const allTouched: Record<keyof FormState, boolean> = {
            userName: true,
            email: true,
            phone: true,
            password: true,
            confirmPassword: true,
            gender: true,
        };
        setTouched(allTouched);

        const errors: Partial<Record<keyof FormState, string>> = {};
        const fieldsToValidate: (keyof FormState)[] = ['userName', 'email', 'phone', 'password', 'confirmPassword'];

        for (const f of fieldsToValidate) {
            const err = validateField(f, form[f], form);
            if (err) errors[f] = err;
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            const firstError = Object.values(errors)[0];
            setError(firstError || 'Vui lòng kiểm tra lại thông tin đã nhập.');
            return;
        }

        startTransition(async () => {
            try {
                await authService.register({
                    user_name: form.userName.trim(),
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
        <div className="w-full max-w-100 mx-auto">
            <div className="mb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white p-2 mb-5 shadow-md border border-neutral-100">
                    <Image
                        src="/logo.png?v=2"
                        alt="TriageFlow Logo"
                        width={40}
                        height={40}
                        className="w-full h-full object-contain"
                        unoptimized
                        priority
                    />
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
                <div className="space-y-1">
                    <label htmlFor="userName" className="block text-sm font-medium text-neutral-700">
                        <span className="mr-1 text-xs text-red-500" aria-hidden="true">*</span>
                        Tên người dùng
                    </label>
                    <input
                        id="userName"
                        type="text"
                        required
                        value={form.userName}
                        onChange={(e) => update('userName', e.target.value)}
                        onBlur={() => handleBlur('userName')}
                        disabled={isPending}
                        placeholder="VD: nguyenvanan"
                        className={cn(
                            'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition disabled:opacity-50',
                            touched.userName && fieldErrors.userName
                                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                                : 'border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                        )}
                    />
                    {touched.userName && fieldErrors.userName && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {fieldErrors.userName}
                        </p>
                    )}
                </div>

                <div className="space-y-1">
                    <label htmlFor="reg-email" className="block text-sm font-medium text-neutral-700">
                        <span className="mr-1 text-xs text-red-500" aria-hidden="true">*</span>
                        Email
                    </label>
                    <input
                        id="reg-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        onBlur={() => handleBlur('email')}
                        disabled={isPending}
                        placeholder="VD: user@example.com"
                        className={cn(
                            'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition disabled:opacity-50',
                            touched.email && fieldErrors.email
                                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                                : 'border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                        )}
                    />
                    {touched.email && fieldErrors.email && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {fieldErrors.email}
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label htmlFor="gender" className="block text-sm font-medium text-neutral-700">
                            Giới tính
                        </label>
                        <select
                            id="gender"
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
                    <div className="space-y-1">
                        <label htmlFor="phone" className="block text-sm font-medium text-neutral-700">
                            Số điện thoại
                        </label>
                        <input
                            id="phone"
                            type="text"
                            inputMode="tel"
                            maxLength={10}
                            value={form.phone}
                            onChange={(e) => update('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                            onBlur={() => handleBlur('phone')}
                            disabled={isPending}
                            placeholder="VD: 0912345678"
                            className={cn(
                                'block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition disabled:opacity-50',
                                touched.phone && fieldErrors.phone
                                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                                : 'border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            )}
                        />
                        {touched.phone && fieldErrors.phone && (
                            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {fieldErrors.phone}
                            </p>
                        )}
                    </div>
                </div>

                <div className="space-y-1">
                    <label htmlFor="reg-password" className="block text-sm font-medium text-neutral-700">
                        <span className="mr-1 text-xs text-red-500" aria-hidden="true">*</span>
                        Mật khẩu
                    </label>
                    <div className="relative">
                        <input
                            id="reg-password"
                            type={showPw ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            value={form.password}
                            onChange={(e) => update('password', e.target.value)}
                            onBlur={() => handleBlur('password')}
                            disabled={isPending}
                            placeholder="Tối thiểu 6 ký tự"
                            className={cn(
                                'block w-full rounded-lg border bg-white px-3.5 py-2.5 pr-12 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition disabled:opacity-50',
                                touched.password && fieldErrors.password
                                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                                    : 'border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            )}
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPw((v) => !v)}
                            className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-neutral-400 hover:text-neutral-600 touch-manipulation"
                        >
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {touched.password && fieldErrors.password && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {fieldErrors.password}
                        </p>
                    )}
                </div>

                <div className="space-y-1">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700">
                        <span className="mr-1 text-xs text-red-500" aria-hidden="true">*</span>
                        Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                        <input
                            id="confirmPassword"
                            type={showConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            required
                            value={form.confirmPassword}
                            onChange={(e) => update('confirmPassword', e.target.value)}
                            onBlur={() => handleBlur('confirmPassword')}
                            disabled={isPending}
                            placeholder="Nhập lại mật khẩu"
                            className={cn(
                                'block w-full rounded-lg border bg-white px-3.5 py-2.5 pr-12 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition disabled:opacity-50',
                                touched.confirmPassword && fieldErrors.confirmPassword
                                    ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                                    : 'border-neutral-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20',
                            )}
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowConfirm((v) => !v)}
                            className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-neutral-400 hover:text-neutral-600 touch-manipulation"
                        >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {touched.confirmPassword && fieldErrors.confirmPassword && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {fieldErrors.confirmPassword}
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="mt-2 flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation"
                >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Đang đăng ký...' : 'Đăng ký'}
                </button>
            </form>

            <p className="mt-6 text-center text-xs text-neutral-400 leading-relaxed">
                Đã có tài khoản?{' '}
                <Link href="/login" className="font-medium text-brand-500 hover:text-brand-600 transition-colors">
                    Đăng nhập
                </Link>
            </p>
        </div>
    );
}
