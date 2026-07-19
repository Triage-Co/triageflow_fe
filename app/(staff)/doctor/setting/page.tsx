'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User,
    CheckCircle2,
    AlertCircle,
    Lock,
    Info,
    Save,
    Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import type { Gender, UserProfile } from '@/shared/types/auth.types';
import { cn } from '@/lib/utils';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const toUpdateDobFormat = (dob?: string): string => {
    if (!dob) return '';
    const trimmed = dob.trim();

    if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        return trimmed;
    }

    const isoLikeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoLikeMatch) {
        return `${isoLikeMatch[3]}-${isoLikeMatch[2]}-${isoLikeMatch[1]}`;
    }

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
        const dd = String(parsed.getDate()).padStart(2, '0');
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const yyyy = parsed.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    }

    return '';
};

// ── Extracted Settings Form Component ─────────────────────────────────────
function SettingsForm({
    profile,
    onSave,
    isSaving
}: {
    profile: UserProfile;
    onSave: (data: { userName: string; gender: Gender; extPhone: string }) => Promise<void>;
    isSaving: boolean;
}) {
    const [userName, setUserName] = useState(profile.full_name || '');
    const [email] = useState(profile.email || '');
    const [gender, setGender] = useState<Gender>(profile.gender || 'MALE');

    const [extPhone, setExtPhone] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tfopd_ext_phone') || profile.phone || '';
        }
        return profile.phone || '';
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ userName, gender, extPhone });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Card 1: Employee Info ── */}
            <Card className="p-6 md:p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-shadow duration-300">
                {/* Header title */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <User className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="font-bold text-neutral-800 text-[15px] tracking-wide">
                        Thông tin nhân viên
                    </h3>
                </div>

                {/* Input Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Fullname */}
                    <div className="md:col-span-2 space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Họ và tên</label>
                        <Input
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Nhập họ và tên của bạn"
                            className="h-11 shadow-sm"
                        />
                    </div>

                    {/* Email (Disabled) */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Email</label>
                        <Input
                            value={email}
                            disabled
                            placeholder="email@hospital.vn"
                            className="bg-neutral-50 text-neutral-400 border-neutral-200/80 cursor-not-allowed select-none h-11"
                            startIcon={<Lock className="w-4 h-4 text-neutral-300 shrink-0" />}
                        />
                    </div>

                    {/* Ext Phone */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Số điện thoại nội bộ</label>
                        <Input
                            value={extPhone}
                            onChange={(e) => setExtPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Ví dụ: 0912345678"
                            maxLength={10}
                            className="h-11 shadow-sm"
                        />
                    </div>

                    {/* Gender Select */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Giới tính</label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value as Gender)}
                            className="flex h-11 w-full rounded-[24px] border border-neutral-200 bg-white px-4 py-2 text-sm text-neutral-900 shadow-sm transition-all focus-visible:outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* ── Actions Row ── */}
            <div className="flex justify-end pt-2">
                <Button
                    type="submit"
                    isLoading={isSaving}
                    size="lg"
                    variant="brand"
                    className="w-full sm:w-auto shadow-md hover:shadow-lg transition-all duration-200"
                    startIcon={<Save className="w-4.5 h-4.5" />}
                >
                    Lưu thay đổi
                </Button>
            </div>
        </form>
    );
}

// ── Main Page Component ──────────────────────────────────────────────────
export default function DoctorSettingsPage() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const profile = useAuthStore((s) => s.profile);
    const fetchProfile = useAuthStore((s) => s.fetchProfile);
    const updateProfile = useAuthStore((s) => s.updateProfile);

    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        if (!accessToken) {
            router.push('/login');
            return;
        }

        const load = async () => {
            try {
                setIsLoading(true);
                await fetchProfile(accessToken);
            } catch (err) {
                showToast(err instanceof Error ? err.message : 'Không thể tải thông tin nhân viên.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [accessToken, router, mounted, fetchProfile]);

    const handleSave = async (data: { userName: string; gender: Gender; extPhone: string }) => {
        if (!accessToken) return;

        if (!data.userName.trim()) {
            showToast('Họ và tên không được để trống.', 'error');
            return;
        }

        try {
            setIsSaving(true);
            const dob = toUpdateDobFormat(profile?.dob);
            if (!dob) {
                showToast('Thiếu hoặc sai định dạng ngày sinh trong hồ sơ. Vui lòng cập nhật lại hồ sơ.', 'error');
                return;
            }

            await updateProfile({
                full_name: data.userName,
                dob,
                gender: data.gender,
                phone: data.extPhone || undefined
            }, accessToken);

            localStorage.setItem('tfopd_ext_phone', data.extPhone);
            showToast('Lưu cấu hình và thông tin cá nhân thành công!', 'success');
        } catch (err) {
            let errorMsg = 'Có lỗi xảy ra khi lưu cấu hình.';
            if (err instanceof Error) {
                const errData = err as unknown as Record<string, unknown>;
                errorMsg = Array.isArray(errData.message)
                    ? errData.message.join(', ')
                    : err.message;
            }
            showToast(errorMsg, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!mounted || isLoading) {
        return (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50/50">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-9 bg-neutral-200 rounded-[12px] w-1/4" />
                        <div className="h-4 bg-neutral-200 rounded-[12px] w-2/5 mb-8" />

                        <Card className="p-6 md:p-8 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                                <div className="md:col-span-2 space-y-2">
                                    <div className="h-3.5 bg-neutral-200 rounded-[12px] w-16" />
                                    <div className="h-11 bg-neutral-200 rounded-[24px] w-full" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3.5 bg-neutral-200 rounded-[12px] w-12" />
                                    <div className="h-11 bg-neutral-200 rounded-[24px] w-full" />
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3.5 bg-neutral-200 rounded-[12px] w-24" />
                                    <div className="h-11 bg-neutral-200 rounded-[24px] w-full" />
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <EMRWorkspaceLayout activeTabId="setting">
            <div className="flex-1 flex flex-col p-4 pb-6 overflow-hidden">
                <div className="h-fit max-h-full flex flex-col bg-white rounded-[24px] border border-neutral-200/50 shadow-[0_4px_24px_-4px_rgba(139,124,246,0.02)] overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        {/* ── Toast notifications portal ── */}
                        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
                            {toasts.map((toast) => (
                                <div
                                    key={toast.id}
                                    className={cn(
                                        "flex items-start gap-3 p-4 rounded-2xl shadow-lg border text-sm font-semibold animate-in fade-in-0 slide-in-from-top-5 duration-300 backdrop-blur-md select-none",
                                        toast.type === 'success' && "bg-emerald-50/95 border-emerald-100/80 text-emerald-800",
                                        toast.type === 'error' && "bg-rose-50/95 border-rose-100/80 text-rose-800",
                                        toast.type === 'info' && "bg-indigo-50/95 border-indigo-100/80 text-indigo-800"
                                    )}
                                >
                                    {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}
                                    {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                                    {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />}
                                    <span className="flex-1 leading-snug">{toast.message}</span>
                                </div>
                            ))}
                        </div>

                        <div className="max-w-4xl mx-auto">
                            {/* ── Header ── */}
                            <div className="mb-8">
                                <h1 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-snug">
                                    Cài đặt
                                </h1>
                                <p className="text-sm text-neutral-400 mt-1 font-medium">
                                    Tuỳ chỉnh giao diện và cấu hình hệ thống
                                </p>
                            </div>

                            {/* ── Main Form ── */}
                            {profile ? (
                                <SettingsForm
                                    profile={profile}
                                    onSave={handleSave}
                                    isSaving={isSaving}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                    <p className="text-sm font-semibold">Đang tải thông tin...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
