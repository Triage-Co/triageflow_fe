'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    AlertCircle,
    CheckCircle2,
    Info,
    Loader2,
    Lock,
    Save,
    Shield,
    Upload,
    User,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import type { Gender, UserProfile } from '@/shared/types/auth.types';
import { cn } from '@/lib/utils';
import { uploadImageToCloudinary } from '@/shared/services/cloudinaryService';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

const ROLE_LABELS: Record<string, string> = {
    RECEPTIONIST: 'Lễ tân',
    DOCTOR: 'Bác sĩ',
    NURSE: 'Y tá',
    ADMIN: 'Quản trị',
    LAB_STAFF: 'Xét nghiệm',
    LAB_TECHNICIAN: 'Xét nghiệm',
    PHARMACY_STAFF: 'Dược sĩ',
    PHARMACIST: 'Dược sĩ',
    PHARMACY: 'Dược sĩ',
    CASHIER: 'Thu ngân',
    USER: 'Bệnh nhân',
};

function roleLabel(role?: string) {
    if (!role) return '—';
    const key = role.trim().toUpperCase().replace(/^ROLE_/, '');
    return ROLE_LABELS[key] || role;
}

function ProfileForm({
    profile,
    onSave,
    isSaving,
}: {
    profile: UserProfile;
    onSave: (data: {
        userName: string;
        gender: Gender;
        phone: string;
        avatar: string | null;
    }) => Promise<void>;
    isSaving: boolean;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [userName, setUserName] = useState(profile.user_name || '');
    const [gender, setGender] = useState<Gender>(profile.gender || 'MALE');
    const [phone, setPhone] = useState(profile.phone || '');
    const [avatar, setAvatar] = useState<string | null>(profile.avatar || null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        setUserName(profile.user_name || '');
        if (profile.gender) setGender(profile.gender);
        setPhone(profile.phone || '');
        if (profile.avatar !== undefined) setAvatar(profile.avatar);
    }, [profile]);

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Vui lòng chỉ chọn tệp hình ảnh (JPG, PNG, WebP).');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('Kích thước ảnh tối đa là 5MB.');
            return;
        }

        try {
            setIsUploading(true);
            const uploadedUrl = await uploadImageToCloudinary(file);
            setAvatar(uploadedUrl);
        } catch (err) {
            console.error('Avatar upload failed:', err);
            alert('Không thể tải ảnh lên. Vui lòng thử lại.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.[0]) {
            void handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void onSave({ userName, gender, phone, avatar });
            }}
            className="space-y-6"
        >
            <Card className="p-6 md:p-8 hover:shadow-xs transition-shadow duration-300 border border-neutral-200/80 rounded-3xl">
                <div className="flex items-center gap-2.5 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                        <User className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-neutral-800 text-[15px] tracking-tight">
                        Thông tin nhân viên
                    </h3>
                </div>

                <div className="mb-8 p-4 md:p-6 rounded-2xl bg-neutral-50/50 border border-neutral-100 flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative shrink-0">
                        {isUploading ? (
                            <div className="w-24 h-24 rounded-full border-2 border-purple-300 bg-purple-50 flex flex-col items-center justify-center text-purple-600 gap-1 shadow-2xs animate-pulse">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-[10px] font-semibold">Đang tải...</span>
                            </div>
                        ) : avatar ? (
                            <img
                                src={avatar}
                                alt="Avatar"
                                className="w-24 h-24 rounded-full object-cover border-2 border-purple-200 shadow-sm"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-neutral-300 bg-white flex flex-col items-center justify-center text-neutral-400 gap-1 shadow-2xs">
                                <User className="w-7 h-7 text-neutral-300" />
                                <span className="text-[10px] font-medium text-neutral-400">
                                    Chưa có ảnh
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                        <div>
                            <h4 className="text-sm font-bold text-neutral-800">Ảnh đại diện</h4>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Định dạng JPG, PNG hoặc WebP. Tối đa 5MB. Khuyến nghị 200×200px.
                            </p>
                        </div>
                        <div
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragging(true);
                            }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={cn(
                                'border-2 border-dashed rounded-2xl p-4 md:p-6 text-center transition cursor-pointer relative group flex flex-col items-center justify-center gap-2',
                                isUploading && 'opacity-50 cursor-wait',
                                isDragging
                                    ? 'border-purple-500 bg-purple-50/30'
                                    : 'border-neutral-200 hover:border-purple-300 bg-white hover:bg-purple-50/10'
                            )}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                    if (e.target.files?.[0]) void handleFileSelect(e.target.files[0]);
                                }}
                            />
                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                {isUploading ? (
                                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                ) : (
                                    <Upload className="w-4.5 h-4.5" />
                                )}
                            </div>
                            <p className="text-xs text-neutral-600">
                                <span className="font-semibold text-neutral-800">
                                    {isUploading ? 'Đang tải ảnh lên...' : 'Kéo thả ảnh vào đây'}
                                </span>{' '}
                                {!isUploading ? (
                                    <>
                                        hoặc{' '}
                                        <span className="font-semibold text-purple-600 hover:underline">
                                            nhấp để chọn file
                                        </span>
                                    </>
                                ) : null}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-600">Tên người dùng</label>
                        <Input
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Nhập tên người dùng"
                            className="h-11 rounded-xl shadow-2xs text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-600">Vai trò</label>
                        <Input
                            value={roleLabel(profile.role)}
                            disabled
                            className="bg-neutral-50 text-neutral-400 border-neutral-200/80 cursor-not-allowed select-none h-11 rounded-xl text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-600">Email</label>
                        <Input
                            value={profile.email || ''}
                            disabled
                            className="bg-neutral-50 text-neutral-400 border-neutral-200/80 cursor-not-allowed select-none h-11 rounded-xl text-sm"
                            startIcon={<Lock className="w-4 h-4 text-neutral-300 shrink-0" />}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-600">Số điện thoại</label>
                        <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Ví dụ: 0975298413"
                            className="h-11 rounded-xl shadow-2xs text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-neutral-600">Giới tính</label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value as Gender)}
                            className="flex h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-900 shadow-2xs transition-all focus-visible:outline-none focus-visible:border-purple-500 focus-visible:ring-2 focus-visible:ring-purple-500/20"
                        >
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="p-6 md:p-8 hover:shadow-xs transition-shadow duration-300 border border-neutral-200/80 rounded-3xl space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                        <Shield className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-neutral-800 text-[15px] tracking-tight">Bảo mật</h3>
                </div>
                <Link
                    href="/forgot-password"
                    className="inline-flex items-center gap-1 text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors"
                >
                    <span>Đổi mật khẩu</span>
                    <span>→</span>
                </Link>
            </Card>

            <div className="flex justify-end pt-2">
                <Button
                    type="submit"
                    isLoading={isSaving}
                    size="lg"
                    className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-sm transition-all"
                    startIcon={<Save className="w-4 h-4" />}
                >
                    Lưu thay đổi
                </Button>
            </div>
        </form>
    );
}

/** Staff settings form bound to GET/PATCH /api/auth/profile + /api/auth/update. */
export function StaffProfileSettings() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const profile = useAuthStore((s) => s.profile);
    const fetchProfile = useAuthStore((s) => s.fetchProfile);
    const updateProfile = useAuthStore((s) => s.updateProfile);

    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: Toast['type']) => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    useEffect(() => {
        setMounted(true);
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
                showToast(
                    err instanceof Error ? err.message : 'Không thể tải thông tin nhân viên.',
                    'error'
                );
            } finally {
                setIsLoading(false);
            }
        };

        void load();
    }, [accessToken, router, mounted, fetchProfile]);

    const handleSave = async (data: {
        userName: string;
        gender: Gender;
        phone: string;
        avatar: string | null;
    }) => {
        if (!accessToken) return;
        if (!data.userName.trim()) {
            showToast('Tên người dùng không được để trống.', 'error');
            return;
        }

        try {
            setIsSaving(true);
            await updateProfile(
                {
                    user_name: data.userName.trim(),
                    gender: data.gender,
                    phone: data.phone ? data.phone.trim() : undefined,
                    avatar: data.avatar || undefined,
                },
                accessToken
            );
            showToast('Lưu thông tin cá nhân thành công!', 'success');
        } catch (err) {
            const errData = err as { message?: string | string[] };
            const errorMsg = Array.isArray(errData.message)
                ? errData.message.join(', ')
                : err instanceof Error
                    ? err.message
                    : 'Có lỗi xảy ra khi lưu cấu hình.';
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
                        <div className="h-9 bg-neutral-200 rounded-xl w-1/4" />
                        <div className="h-4 bg-neutral-200 rounded-xl w-2/5 mb-8" />
                        <Card className="p-6 md:p-8 space-y-8 rounded-3xl">
                            <div className="h-24 bg-neutral-200 rounded-2xl w-full" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
                                <div className="h-11 bg-neutral-200 rounded-xl w-full" />
                                <div className="h-11 bg-neutral-200 rounded-xl w-full" />
                                <div className="h-11 bg-neutral-200 rounded-xl w-full" />
                                <div className="h-11 bg-neutral-200 rounded-xl w-full" />
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col p-4 pb-6 overflow-hidden">
            <div className="h-fit max-h-full flex flex-col bg-white rounded-3xl border border-neutral-200/50 shadow-xs overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full">
                        {toasts.map((toast) => (
                            <div
                                key={toast.id}
                                className={cn(
                                    'flex items-start gap-3 p-4 rounded-2xl shadow-lg border text-sm font-semibold animate-in fade-in-0 slide-in-from-top-5 duration-300 backdrop-blur-md select-none',
                                    toast.type === 'success' &&
                                        'bg-emerald-50/95 border-emerald-100/80 text-emerald-800',
                                    toast.type === 'error' &&
                                        'bg-rose-50/95 border-rose-100/80 text-rose-800',
                                    toast.type === 'info' &&
                                        'bg-indigo-50/95 border-indigo-100/80 text-indigo-800'
                                )}
                            >
                                {toast.type === 'success' ? (
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                ) : null}
                                {toast.type === 'error' ? (
                                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                ) : null}
                                {toast.type === 'info' ? (
                                    <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                                ) : null}
                                <span className="flex-1 leading-snug">{toast.message}</span>
                            </div>
                        ))}
                    </div>

                    <div className="max-w-4xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-snug">
                                Cài đặt
                            </h1>
                            <p className="text-sm text-neutral-400 mt-1 font-medium">
                                Xem và chỉnh sửa thông tin tài khoản
                            </p>
                        </div>

                        {profile ? (
                            <ProfileForm
                                profile={profile}
                                onSave={handleSave}
                                isSaving={isSaving}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                                <p className="text-sm font-semibold">Đang tải thông tin...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
