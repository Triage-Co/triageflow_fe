'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { authService } from '@/modules/auth/services/authService';
import { useAuthStore } from '@/store/authStore';
import { labService } from '@/modules/lab/services/labService';
import { PROCEDURE_ROOM_TYPES } from '@/modules/clinical/utils/staffShift';
import { isValidEmail } from '@/shared/utils/validators';
import { cn } from '@/lib/utils';

function getPostLoginPath(role: string) {
    const normalizedRole = role.trim().toUpperCase().replace(/^ROLE_/, '');
    switch (normalizedRole) {
        case 'ADMIN':
            return '/admin/dashboard';
        case 'RECEPTIONIST':
            return '/reception';
        case 'LAB_STAFF':
        case 'LAB_TECHNICIAN':
            return '/lab';
        case 'PHARMACY_STAFF':
        case 'PHARMACIST':
        case 'PHARMACY':
            return '/pharmacy';
        case 'CASHIER':
            return '/cashier';
        case 'NURSE':
            return '/nurse/dashboard';
        case 'DOCTOR':
            return '/doctor/dashboard';
        case 'USER':
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
    const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function validateLoginField(name: 'email' | 'password', value: string): string | null {
        if (name === 'email') {
            if (!value.trim()) return 'Vui lòng nhập email.';
            if (!isValidEmail(value)) return 'Định dạng email không hợp lệ (Ví dụ: doctor@hospital.vn).';
            return null;
        }
        if (name === 'password') {
            if (!value) return 'Vui lòng nhập mật khẩu.';
            if (value.length < 6) return 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.';
            return null;
        }
        return null;
    }

    function handleEmailChange(val: string) {
        setEmail(val);
        setError(null);
        if (touched.email) {
            const err = validateLoginField('email', val);
            setFieldErrors((prev) => ({ ...prev, email: err || undefined }));
        }
    }

    function handlePasswordChange(val: string) {
        setPassword(val);
        setError(null);
        if (touched.password) {
            const err = validateLoginField('password', val);
            setFieldErrors((prev) => ({ ...prev, password: err || undefined }));
        }
    }

    function handleBlur(name: 'email' | 'password') {
        setTouched((prev) => ({ ...prev, [name]: true }));
        const val = name === 'email' ? email : password;
        const err = validateLoginField(name, val);
        setFieldErrors((prev) => ({ ...prev, [name]: err || undefined }));
    }

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
                if (profileRes.data.user_name) {
                    displayFullName = profileRes.data.user_name;
                }
                if (profileRes.data.role) {
                    resolvedRole = profileRes.data.role;
                }
                if (profileRes.data.account_id) {
                    userId = profileRes.data.account_id;
                }
            }
        } catch (err) {
            console.error('Failed to sync profile during login:', err);
        }

        const roleClean = resolvedRole.trim().toUpperCase().replace(/^ROLE_/, '');
        if (roleClean === 'USER') {
            throw new Error(
                'Tài khoản của bạn chưa được phân quyền nhân viên y tế. Vui lòng liên hệ Quản trị viên để cấp quyền truy cập.',
            );
        }

        loginSuccess({
            user: {
                id: userId,
                email,
                fullName: displayFullName,
                role: resolvedRole,
                avatar: profileData?.avatar || localAvatar
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

        setTouched({ email: true, password: true });

        const emailErr = validateLoginField('email', email);
        const passErr = validateLoginField('password', password);

        setFieldErrors({
            email: emailErr || undefined,
            password: passErr || undefined,
        });

        if (emailErr || passErr) {
            setError(emailErr || passErr || 'Vui lòng kiểm tra lại thông tin đăng nhập.');
            return;
        }

        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        startTransition(async () => {
            try {
                const loginRes = await authService.login({ email: trimmedEmail, password: trimmedPassword });
                const { token, refreshToken, username, role } = loginRes.data;

                const resolvedRole = await completeLogin(token, refreshToken, username, role);

                let redirectPath = getPostLoginPath(resolvedRole);
                const roleClean = resolvedRole.trim().toUpperCase().replace(/^ROLE_/, '');
                if (roleClean === 'DOCTOR' || roleClean === 'NURSE') {
                    try {
                        const d = new Date();
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const todayStr = `${year}-${month}-${day}`;

                        const shifts = await labService.getMyShifts(todayStr);
                        const paraclinicalShift = shifts.find(s =>
                            PROCEDURE_ROOM_TYPES.has(String(s.room?.room_type || '').toUpperCase())
                        );
                        if (paraclinicalShift) {
                            const roomType = String(paraclinicalShift.room?.room_type || 'PROCEDURE_ROOM').toUpperCase();
                            localStorage.setItem('tfopd_active_room_type', roomType);
                            redirectPath = '/lab';
                        } else {
                            localStorage.removeItem('tfopd_active_room_type');
                        }
                    } catch (err) {
                        console.error('Lỗi khi kiểm tra ca trực phòng thủ thuật của nhân viên y tế:', err);
                        localStorage.removeItem('tfopd_active_room_type');
                    }
                } else {
                    localStorage.removeItem('tfopd_active_room_type');
                }

                router.push(redirectPath);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.');
            }
        });
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

            <form onSubmit={handleSubmit} method="post" className="space-y-4" noValidate>
                <div className="space-y-1">
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
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={() => handleBlur('email')}
                        disabled={isPending}
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

                <div className="space-y-1">
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
                            placeholder="Nhập mật khẩu..."
                            value={password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            onBlur={() => handleBlur('password')}
                            disabled={isPending}
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
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-neutral-400 hover:text-neutral-600 touch-manipulation"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                    {touched.password && fieldErrors.password && (
                        <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {fieldErrors.password}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between pt-1">
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
                    className="mt-2 flex w-full min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation cursor-pointer relative z-10"
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
