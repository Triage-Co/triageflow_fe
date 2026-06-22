'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Cross, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '@/modules/auth/services/authService';

export function LoginForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        startTransition(async () => {
            try {
                const res = await authService.login({ email, password });
                const { token, refreshToken } = res.data;

                if (rememberMe) {
                    localStorage.setItem('accessToken', token);
                    localStorage.setItem('refreshToken', refreshToken);
                } else {
                    sessionStorage.setItem('accessToken', token);
                    sessionStorage.setItem('refreshToken', refreshToken);
                }

                router.push('/dashboard');
            } catch (err) {
                setError(
                    err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.',
                );
            }
        });
    }

    return (
        <div className="w-full max-w-100 mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-500 mb-5 shadow-md">
                    <Cross className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-snug">
                    Clinical Hub Login
                </h2>
                <p className="mt-1.5 text-sm text-neutral-500">
                    Đăng nhập vào hệ thống TriageFlowOPD
                </p>
            </div>

            {/* Error banner */}
            {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Email */}
                <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="doctor@hospital.vn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                        disabled={isPending}
                    />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                        Mật khẩu
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                            disabled={isPending}
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-400 hover:text-neutral-600"
                            aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                {/* Remember me + Forgot password */}
                <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 select-none">
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-neutral-300 text-brand-500 accent-brand-500"
                        />
                        Ghi nhớ đăng nhập
                    </label>
                    <Link
                        href="/forgot-password"
                        className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
                    >
                        Quên mật khẩu?
                    </Link>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isPending || !email || !password}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
            </form>

            {/* Register link */}
            <p className="mt-8 text-center text-xs text-neutral-400 leading-relaxed">
                Bạn chưa có tài khoản TriageFlowOPD?{' '}
                <Link
                    href="/register"
                    className="font-medium text-brand-500 hover:text-brand-600 transition-colors"
                >
                    Đăng ký ngay
                </Link>
            </p>
        </div>
    );
}
