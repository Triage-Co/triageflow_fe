'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    User,
    CheckCircle2,
    AlertCircle,
    Lock,
    Save,
    Loader2,
    Upload,
    X
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import type { Gender, UserProfile } from '@/shared/types/auth.types';
import { cn } from '@/lib/utils';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { uploadImageToCloudinary, validateImageFile } from '@/shared/services/cloudinaryService';
import Image from 'next/image';

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
    onSave: (data: { userName: string; gender: Gender; extPhone: string; avatar: string }) => Promise<void>;
    isSaving: boolean;
    onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) {
    const [userName, setUserName] = useState(profile.user_name || '');
    const [email] = useState(profile.email || '');
    const [avatar, setAvatar] = useState(profile.avatar || '');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Keep gender hidden from display but tracked for API compatibility
    const [gender] = useState<Gender>(profile.gender || 'MALE');

    const [extPhone, setExtPhone] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('tfopd_ext_phone') || profile.phone || '';
        }
        return profile.phone || '';
    });

    // Format Employee ID like NV-0342 based on user id or display mock
    const employeeId = profile.id 
        ? `NV-${profile.id.replace(/\D/g, '').slice(0, 4) || '0342'}`
        : 'NV-0342';

    const handleFileSelect = async (file: File) => {
        const validationError = validateImageFile(file);
        if (validationError) {
            onShowToast(validationError, 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(10);
        
        const progressTimer = setInterval(() => {
            setUploadProgress((p) => Math.min(p + 15, 80));
        }, 150);

        try {
            const uploadResult = await uploadImageToCloudinary(file);
            clearInterval(progressTimer);
            setUploadProgress(100);
            setAvatar(uploadResult.secure_url);
            onShowToast('Tải ảnh lên thành công!', 'success');
        } catch (err) {
            clearInterval(progressTimer);
            onShowToast(err instanceof Error ? err.message : 'Tải ảnh lên thất bại.', 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFileSelect(file);
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ userName, gender, extPhone, avatar });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Card 1: Employee Info ── */}
            <Card className="p-6 md:p-8 border border-neutral-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.01)] transition-shadow duration-300">
                {/* Header title */}
                <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100/50">
                        <User className="w-4.5 h-4.5" />
                    </div>
                    <h3 className="font-bold text-neutral-800 text-[15px] tracking-wide">
                        Thông tin nhân viên
                    </h3>
                </div>

                {/* Local File Upload Section */}
                <div className="flex flex-col md:flex-row items-center gap-6 pb-6 border-b border-neutral-100 mb-6">
                    {/* Circle Preview on Left */}
                    <div className="relative group">
                        <div className={cn(
                            "w-[100px] h-[100px] rounded-full border border-dashed border-neutral-300 bg-[#F8F9FC] flex flex-col items-center justify-center overflow-hidden shrink-0 select-none",
                            avatar ? "border-solid border-neutral-200" : ""
                        )}>
                            {avatar ? (
                                <Image 
                                    src={avatar} 
                                    alt="Avatar Preview" 
                                    width={100}
                                    height={100}
                                    className="w-full h-full object-cover" 
                                    unoptimized
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-1.5 text-neutral-400">
                                    <User className="w-6 h-6 stroke-[1.5]" />
                                    <span className="text-[10px] font-semibold text-neutral-400">Chưa có ảnh</span>
                                </div>
                            )}

                            {isUploading && (
                                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    <span className="text-white text-[10px] font-bold">{uploadProgress}%</span>
                                </div>
                            )}
                        </div>

                        {avatar && !isUploading && (
                            <button
                                type="button"
                                onClick={() => setAvatar('')}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border border-neutral-200 flex items-center justify-center shadow transition-colors cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Drag and Drop Container on Right */}
                    <div className="flex-1 w-full space-y-3">
                        <div>
                            <p className="text-[13px] font-bold text-neutral-800">Ảnh đại diện</p>
                            <p className="text-[11px] text-neutral-400 font-semibold leading-relaxed mt-0.5">
                                Định dạng JPG, PNG hoặc WebP. Tối đa 5MB. Khuyến nghị kích thước 200×200px.
                            </p>
                        </div>

                        {/* Dashed Drag/Click Box */}
                        <div
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border border-dashed border-neutral-200 bg-[#FAFBFD] hover:bg-[#F4F6FB] rounded-2xl py-6 px-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 text-center select-none",
                                isUploading ? "pointer-events-none opacity-60" : ""
                            )}
                        >
                            <div className="w-9 h-9 rounded-xl bg-white border border-neutral-100 shadow-sm flex items-center justify-center text-neutral-500">
                                <Upload className="w-4 h-4" />
                            </div>
                            <p className="text-[12px] font-bold text-neutral-700">
                                Kéo thả ảnh vào đây
                            </p>
                            <p className="text-[11px] text-neutral-400 font-semibold">
                                hoặc <span className="text-indigo-500 hover:underline">nhấp để chọn file</span>
                            </p>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleInputChange}
                            disabled={isUploading}
                        />
                    </div>
                </div>

                {/* Input Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Họ và tên */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Họ và tên</label>
                        <Input
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Nguyễn Lan Phương"
                            className="h-11 shadow-sm rounded-xl px-4 text-sm font-semibold border-neutral-200"
                        />
                    </div>

                    {/* Mã nhân viên (Disabled) */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Mã nhân viên</label>
                        <Input
                            value={employeeId}
                            disabled
                            placeholder="NV-0342"
                            className="bg-neutral-50/70 text-neutral-400 border-neutral-200 cursor-not-allowed select-none h-11 rounded-xl px-4 text-sm font-semibold"
                            startIcon={<Lock className="w-4 h-4 text-neutral-300 shrink-0" />}
                        />
                    </div>

                    {/* Email (Disabled) */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Email</label>
                        <Input
                            value={email}
                            disabled
                            placeholder="lanphuong@hospital.vn"
                            className="bg-neutral-50/70 text-neutral-400 border-neutral-200 cursor-not-allowed select-none h-11 rounded-xl px-4 text-sm font-semibold"
                            startIcon={<Lock className="w-4 h-4 text-neutral-300 shrink-0" />}
                        />
                    </div>

                    {/* Số điện thoại nội bộ */}
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Số điện thoại nội bộ</label>
                        <Input
                            value={extPhone}
                            onChange={(e) => setExtPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="1234"
                            maxLength={10}
                            className="h-11 shadow-sm rounded-xl px-4 text-sm font-semibold border-neutral-200"
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

    const handleSave = async (data: { userName: string; gender: Gender; extPhone: string; avatar: string }) => {
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
            <div className="flex-1 flex flex-col p-4 pb-6 overflow-hidden bg-[#FAFBFD]">
                <div className="h-fit max-h-full flex flex-col bg-white rounded-[24px] border border-neutral-200/50 shadow-[0_4px_24px_-4px_rgba(139,124,246,0.01)] overflow-hidden">
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
