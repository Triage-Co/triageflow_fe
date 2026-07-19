'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    User,
    Printer,
    CheckCircle2,
    AlertCircle,
    Lock,
    Save,
    Loader2,
    Image as ImageIcon,
    Upload,
    Trash2
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

// ── Extracted Settings Form Component ─────────────────────────────────────
function SettingsForm({
    profile,
    onSave,
    isSaving,
    onShowToast
}: {
    profile: UserProfile;
    onSave: (data: { userName: string; gender: Gender; extPhone: string; defaultPrinter: string; paperSize: string; avatar: string }) => Promise<void>;
    isSaving: boolean;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
    const [userName, setUserName] = useState(profile.user_name || '');
    const [email] = useState(profile.email || '');
    const [gender, setGender] = useState<Gender>(profile.gender || 'MALE');
    const [avatar, setAvatar] = useState(profile.avatar || '');

    const [extPhone, setExtPhone] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tfopd_ext_phone') || profile.phone || '1234567890';
        }
        return profile.phone || '1234567890';
    });

    const [defaultPrinter, setDefaultPrinter] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tfopd_default_printer') || 'Máy in nhiệt – Quầy 3';
        }
        return 'Máy in nhiệt – Quầy 3';
    });

    const [paperSize, setPaperSize] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tfopd_paper_size') || 'Khổ nhiệt 80mm';
        }
        return 'Khổ nhiệt 80mm';
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate size (limit to 2MB for DB safe base64 storage)
            if (file.size > 2 * 1024 * 1024) {
                onShowToast('Kích thước ảnh không được vượt quá 2MB.', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    setAvatar(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = () => {
        setAvatar('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ userName, gender, extPhone, defaultPrinter, paperSize, avatar });
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

                {/* Local File Upload Section */}
                <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-neutral-100 mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                        ) : (
                            <ImageIcon className="w-8 h-8 text-neutral-400" />
                        )}
                    </div>
                    <div className="flex flex-col items-center sm:items-start gap-2">
                        <p className="text-[12px] font-bold text-neutral-700">Ảnh đại diện nhân viên</p>
                        <p className="text-[10px] text-neutral-400 font-medium">Hỗ trợ JPG, PNG. Dung lượng tối đa 2MB.</p>
                        <div className="flex items-center gap-2 mt-1">
                            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer">
                                <Upload className="w-3.5 h-3.5" />
                                Tải ảnh lên
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </label>
                            {avatar && (
                                <button
                                    type="button"
                                    onClick={handleRemoveAvatar}
                                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Gỡ bỏ
                                </button>
                            )}
                        </div>
                    </div>
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

            {/* ── Card 2: Printer configuration ── */}
            <Card className="p-6 md:p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-shadow duration-300">
                {/* Header title */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                        <Printer className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="font-bold text-neutral-800 text-[15px] tracking-wide">
                        Cấu hình máy in
                    </h3>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Default Printer name */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Máy in mặc định</label>
                        <Input
                            value={defaultPrinter}
                            onChange={(e) => setDefaultPrinter(e.target.value)}
                            placeholder="Ví dụ: Máy in nhiệt – Quầy 3"
                            className="h-11 shadow-sm"
                        />
                    </div>

                    {/* Paper size */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Khổ giấy</label>
                        <Input
                            value={paperSize}
                            onChange={(e) => setPaperSize(e.target.value)}
                            placeholder="Ví dụ: Khổ nhiệt 80mm"
                            className="h-11 shadow-sm"
                        />
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
export default function SettingsPage() {
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

    const handleSave = async (data: {
        userName: string;
        gender: Gender;
        extPhone: string;
        defaultPrinter: string;
        paperSize: string;
        avatar: string;
    }) => {
        if (!accessToken) return;

        if (!data.userName.trim()) {
            showToast('Họ và tên không được để trống.', 'error');
            return;
        }

        try {
            setIsSaving(true);
            await updateProfile({
                user_name: data.userName,
                gender: data.gender,
                phone: data.extPhone || undefined,
                avatar: data.avatar || null
            }, accessToken);

            localStorage.setItem('tfopd_default_printer', data.defaultPrinter);
            localStorage.setItem('tfopd_paper_size', data.paperSize);
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
        <EMRWorkspaceLayout activeTabId="settings">
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
                                    onShowToast={showToast}
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
