'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Cross, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '@/modules/auth/services/authService';
import { useAuthStore } from '@/store/authStore';

function getPostLoginPath(role: string) {
    const normalizedRole = role.trim().toUpperCase().replace(/^ROLE_/, '');
    switch (normalizedRole) {
        case 'ADMIN':
            return '/admin/dashboard';
        case 'RECEPTIONIST':
            return '/reception';
        case 'LAB_STAFF':
            return '/lab';
        case 'PHARMACY_STAFF':
            return '/pharmacy';
        case 'CASHIER':
            return '/cashier';
        case 'USER':
            return '/queue';
        case 'NURSE':
            return '/doctor/dashboard';
        case 'DOCTOR':
            return '/doctor/dashboard';
        default:
            return '/doctor/dashboard';
    }
}

export function LoginForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { loginSuccess, setRememberMe: storeRememberMe } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /** Persist login data into the auth store and return resolved role */
    async function completeLogin(token: string, refreshToken: string, username: string, role: string) {
        storeRememberMe(rememberMe);

        let displayFullName = username;
        let resolvedRole = role;
        let userId = email;
        const localAvatar = typeof window !== 'undefined' ? localStorage.getItem('tfopd_avatar') || undefined : undefined;
        let profileData = null;

        try {
            const profileRes = await authService.getProfile(token);
            if (profileRes && profileRes.data) {
                profileData = profileRes.data;
                if (profileRes.data.full_name) {
                    displayFullName = profileRes.data.full_name;
                } else if (profileRes.data.user_name) {
                    displayFullName = profileRes.data.user_name;
                }
                if (profileRes.data.role) {
                    resolvedRole = profileRes.data.role;
                }
                if (profileRes.data.id) {
                    userId = profileRes.data.id;
                }
            }
        } catch (err) {
            console.error('Failed to sync profile during login:', err);
        }

        loginSuccess({
            user: {
                id: userId,
                email,
                fullName: displayFullName,
                role: resolvedRole,
                avatar: localAvatar
            },
            accessToken: token,
            refreshToken,
            profile: profileData,
        });

        return resolvedRole;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        if (!trimmedEmail || !trimmedPassword) {
            setError('Vui lòng nhập email và mật khẩu.');
            return;
        }

        startTransition(async () => {
            try {
                const loginRes = await authService.login({ email: trimmedEmail, password: trimmedPassword });
                const { token, refreshToken, username, role } = loginRes.data;

                const resolvedRole = await completeLogin(token, refreshToken, username, role);
                router.push(getPostLoginPath(resolvedRole));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng thử lại.');
            }
        });
    }

    return (
        <div className="w-full max-w-100 mx-auto">
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

            {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} method="post" className="space-y-5" noValidate>
                <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-medium text-neutral-700">
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="doctor@hospital.vn"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                        disabled={isPending}
                        className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-3 text-base sm:text-sm sm:py-2.5 text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-neutral-700">
                        Mật khẩu
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            placeholder="..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                            disabled={isPending}
                            className="block w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-3 pr-12 text-base sm:text-sm sm:py-2.5 text-neutral-900 placeholder-neutral-400 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-neutral-400 hover:text-neutral-600 touch-manipulation"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 select-none">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-neutral-300 accent-brand-500" />
                        Ghi nhớ đăng nhập
                    </label>
                    <Link href="/forgot-password" className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors">
                        Quên mật khẩu?
                    </Link>
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="mt-1 flex w-full min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-base sm:text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation cursor-pointer relative z-10"
                >
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isPending ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
            </form>

            <p className="mt-8 text-center text-xs text-neutral-400 leading-relaxed">
                Bạn chưa có tài khoản TriageFlowOPD?{' '}
                <Link href="/register" className="font-medium text-brand-500 hover:text-brand-600 transition-colors">
                    Đăng ký ngay
                </Link>
            </p>
        </div>
    );
}
