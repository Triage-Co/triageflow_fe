'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    User, 
    Upload, 
    Printer, 
    Loader2, 
    CheckCircle2, 
    AlertCircle, 
    Trash2, 
    Lock, 
    Info, 
    Save 
} from 'lucide-react';
import { authService } from '@/modules/auth/services/authService';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Button } from '@/shared/components/ui/Button';
import type { Gender } from '@/shared/types/auth.types';
import { cn } from '@/lib/utils';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

export default function SettingsPage() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);
    const setUser = useAuthStore((s) => s.setUser);

    // Profile State (from backend API)
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [dob, setDob] = useState('');
    const [gender, setGender] = useState<Gender>('MALE');

    // Custom State (persisted locally)
    const [extPhone, setExtPhone] = useState('1234');
    const [avatarUrl, setAvatarUrl] = useState('');
    
    // Printer State (persisted locally)
    const [defaultPrinter, setDefaultPrinter] = useState('Máy in nhiệt – Quầy 3');
    const [paperSize, setPaperSize] = useState('Khổ nhiệt 80mm');

    // UI Loading & Interaction States
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // ── Toast Utility ────────────────────────────────────────────────────────
    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
        const id = Date.now().toString();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    // ── ISO Date converter to YYYY-MM-DD ─────────────────────────────────────
    const formatIsoDateToYmd = (isoString?: string) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch {
            return '';
        }
    };

    // ── Fetch Profile on Mount ───────────────────────────────────────────────
    useEffect(() => {
        if (!accessToken) {
            showToast('Vui lòng đăng nhập để truy cập cài đặt.', 'error');
            router.push('/login');
            return;
        }

        // Load persisted local configurations
        if (typeof window !== 'undefined') {
            setDefaultPrinter(localStorage.getItem('tfopd_default_printer') || 'Máy in nhiệt – Quầy 3');
            setPaperSize(localStorage.getItem('tfopd_paper_size') || 'Khổ nhiệt 80mm');
            setExtPhone(localStorage.getItem('tfopd_ext_phone') || '1234');
            setAvatarUrl(user?.avatar || localStorage.getItem('tfopd_avatar') || '');
        }

        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                const res = await authService.getProfile(accessToken);
                if (res && res.data) {
                    setFullName(res.data.full_name || '');
                    setEmail(res.data.email || '');
                    setDob(formatIsoDateToYmd(res.data.dob));
                    setGender(res.data.gender || 'MALE');
                }
            } catch (err) {
                showToast(err instanceof Error ? err.message : 'Không thể tải thông tin nhân viên.', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [accessToken, router]);

    // ── Drag & Drop Handlers ──────────────────────────────────────────────────
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const processFile = (file: File) => {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
            showToast('Định dạng tệp không được hỗ trợ. Chỉ hỗ trợ PNG, JPG, WebP.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Ảnh quá lớn. Dung lượng tối đa cho phép là 5MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarUrl(reader.result as string);
            showToast('Đã tải ảnh lên thành công. Hãy bấm Lưu để cập nhật!', 'info');
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    // ── Form Submission handler ───────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) return;

        if (!fullName.trim()) {
            showToast('Họ và tên không được để trống.', 'error');
            return;
        }

        try {
            setIsSaving(true);

            // 1. Send update request to server
            await authService.updateProfile({
                fullName,
                dob,
                gender
            }, accessToken);

            // 2. Save local configurations to localStorage
            localStorage.setItem('tfopd_default_printer', defaultPrinter);
            localStorage.setItem('tfopd_paper_size', paperSize);
            localStorage.setItem('tfopd_ext_phone', extPhone);
            localStorage.setItem('tfopd_avatar', avatarUrl);

            // 3. Update global auth store state
            if (user) {
                setUser({
                    ...user,
                    fullName: fullName,
                    avatar: avatarUrl || undefined
                });
            }

            showToast('Lưu cấu hình và thông tin cá nhân thành công!', 'success');
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu cấu hình.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50/50">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-9 bg-neutral-200 rounded-[12px] w-1/4" />
                        <div className="h-4 bg-neutral-200 rounded-[12px] w-2/5 mb-8" />
                        
                        <Card className="p-6 md:p-8 space-y-8">
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                                <div className="w-24 h-24 rounded-full bg-neutral-200 shrink-0" />
                                <div className="flex-1 space-y-3 w-full">
                                    <div className="h-4 bg-neutral-200 rounded-[12px] w-1/4" />
                                    <div className="h-3 bg-neutral-200 rounded-[12px] w-1/2" />
                                    <div className="h-20 bg-neutral-200 rounded-2xl w-full" />
                                </div>
                            </div>
                            
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
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-neutral-50/50">
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
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ── Card 1: Employee Info ── */}
                    <Card className="p-6 md:p-8 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-shadow duration-300">
                        {/* Header title */}
                        <div className="flex items-center gap-2 mb-8">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100/50">
                                <User className="w-4.5 h-4.5" />
                            </div>
                            <h3 className="font-bold text-neutral-800 text-[15px] tracking-wide">
                                Thông tin nhân viên
                            </h3>
                        </div>

                        {/* Avatar upload layout */}
                        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center pb-8 border-b border-neutral-100/80 mb-6">
                            {/* Avatar Display */}
                            <div className="relative w-24 h-24 rounded-full border-2 border-dashed border-neutral-200 bg-neutral-50/50 flex flex-col items-center justify-center text-neutral-400 overflow-hidden shrink-0 group shadow-inner">
                                {avatarUrl ? (
                                    <>
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setAvatarUrl('')}
                                            className="absolute inset-0 bg-neutral-950/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white transition-colors duration-200"
                                            title="Xóa ảnh"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <User className="w-8 h-8 text-neutral-300" />
                                        <span className="text-[10px] mt-1.5 font-bold text-neutral-400 uppercase tracking-wider scale-95">Chưa có ảnh</span>
                                    </>
                                )}
                            </div>

                            {/* Dropzone Upload */}
                            <div className="flex-1 w-full space-y-3">
                                <div>
                                    <h4 className="text-sm font-bold text-neutral-800">Ảnh đại diện</h4>
                                    <p className="text-xs text-neutral-400 font-medium mt-0.5">
                                        Định dạng JPG, PNG hoặc WebP. Tối đa 5MB. Khuyến nghị kích thước 200×200px.
                                    </p>
                                </div>

                                <label
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={cn(
                                        "flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 cursor-pointer transition-all duration-200 text-center w-full",
                                        isDragging
                                            ? "border-brand-500 bg-brand-50/15"
                                            : "border-neutral-200 hover:border-brand-300 hover:bg-neutral-50/20"
                                    )}
                                >
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 mb-2.5 transition-colors">
                                        <Upload className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-medium text-neutral-600">
                                        Kéo thả ảnh vào đây hoặc <span className="text-brand-500 font-semibold hover:underline">nhấp để chọn file</span>
                                    </p>
                                </label>
                            </div>
                        </div>

                        {/* Input Form Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                            {/* Fullname */}
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Họ và tên</label>
                                <Input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
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
                                    onChange={(e) => setExtPhone(e.target.value)}
                                    placeholder="Ví dụ: 1234"
                                    className="h-11 shadow-sm"
                                />
                            </div>

                            {/* Date of Birth */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Ngày sinh</label>
                                <Input
                                    type="date"
                                    value={dob}
                                    onChange={(e) => setDob(e.target.value)}
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
            </div>
        </div>
    );
}
