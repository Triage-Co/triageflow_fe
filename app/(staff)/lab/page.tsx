'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    QrCode,
    Search,
    Cpu,
    Camera,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { cn } from '@/lib/utils';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

export default function LabReceptionPage() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<'qr' | 'code'>('qr');
    const [searchCode, setSearchCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
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
        }
    }, [accessToken, mounted, router]);

    if (!mounted || !accessToken) {
        return (
            <div className="flex-1 flex items-center justify-center bg-neutral-50/50 min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7CF6]"></div>
            </div>
        );
    }

    const handleLookup = () => {
        if (!searchCode.trim()) {
            showToast('Vui lòng nhập mã lượt khám.', 'error');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            showToast(`Đã tìm thấy lượt khám: ${searchCode}`, 'success');
            // Navigate to patient list or show modal
            router.push('/lab/patients?search=' + encodeURIComponent(searchCode));
        }, 1200);
    };

    const handleScanQR = () => {
        setIsScanning(true);
        showToast('Đang khởi động camera quét mã QR...', 'info');
        setTimeout(() => {
            setIsScanning(false);
            const mockQueueId = 'XN-042';
            showToast(`Quét QR thành công! Tìm thấy lượt khám: ${mockQueueId}`, 'success');
            router.push('/lab/patients?search=' + encodeURIComponent(mockQueueId));
        }, 2500);
    };

    return (
        <EMRWorkspaceLayout activeTabId="lab-reception" activeTabName="Tiếp Nhận Bệnh Nhân">
            <div className="flex-1 flex flex-col p-4 pb-6 overflow-hidden">
                <div className="h-fit max-h-full flex flex-col bg-white rounded-[24px] border border-neutral-200/50 shadow-[0_4px_24px_-4px_rgba(139,124,246,0.02)] overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        {/* Toast Portal */}
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
                                    {toast.type === 'info' && <Cpu className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />}
                                    <span className="flex-1 leading-snug">{toast.message}</span>
                                </div>
                            ))}
                        </div>

                        <div className="max-w-4xl mx-auto space-y-8">
                            {/* Header */}
                            <div>
                                <h1 className="text-[24px] font-bold text-neutral-900 tracking-tight leading-snug">
                                    Tiếp Nhận Bệnh Nhân
                                </h1>
                                <p className="text-sm text-neutral-400 mt-1 font-medium">
                                    Quét mã QR bệnh nhân hoặc nhập mã lượt khám để tiếp nhận vào phòng xét nghiệm
                                </p>
                            </div>

                            {/* 2-Column Side-by-Side Area */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-4">
                                {/* Left Side: QR Scanner Column */}
                                <div className="flex flex-col gap-3">
                                    <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2 px-1">
                                        <QrCode className="w-5 h-5 text-[#8B7CF6]" />
                                        Quét Mã QR
                                    </h2>
                                    <div className="flex flex-col items-center justify-center p-8 rounded-[28px] border transition-all duration-300 min-h-[340px] bg-[#F3F0FF] border-[#E2DBFF] shadow-xs">
                                        {isScanning ? (
                                            <div className="flex flex-col items-center justify-center space-y-6">
                                                <div className="relative w-32 h-32 rounded-3xl border-2 border-[#8B7CF6] flex items-center justify-center bg-white shadow-sm overflow-hidden">
                                                    <div className="absolute inset-x-0 h-1 bg-[#8B7CF6] animate-bounce shadow-[0_0_8px_#8B7CF6]" />
                                                    <Camera className="w-10 h-10 text-[#8B7CF6] animate-pulse" />
                                                </div>
                                                <p className="text-sm font-bold text-[#8B7CF6] animate-pulse">Đang căn chỉnh mã QR...</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center space-y-6 text-center">
                                                <div className="w-32 h-32 rounded-3xl bg-white flex items-center justify-center shadow-xs border border-[#E2DBFF]/60">
                                                    <QrCode className="w-16 h-16 text-[#8B7CF6]" />
                                                </div>
                                                <div>
                                                    <h3 className="text-base font-bold text-neutral-800">Đặt Mã QR Vào Máy Quét</h3>
                                                    <p className="text-xs text-neutral-400 mt-1 max-w-[220px]">
                                                        Đặt QR trên phiếu khám hoặc ứng dụng điện thoại trước camera quét
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={handleScanQR}
                                                    className="bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl px-6 py-2.5 text-xs font-bold shadow-xs shrink-0 flex items-center justify-center"
                                                >
                                                    Mở Phòng Quét
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Code Input Column */}
                                <div className="flex flex-col gap-3">
                                    <h2 className="text-base font-bold text-neutral-800 flex items-center gap-2 px-1">
                                        <Search className="w-5 h-5 text-[#8B7CF6]" />
                                        Nhập Mã Lượt Khám
                                    </h2>
                                    <div className="space-y-6 p-8 rounded-[28px] border transition-all duration-300 min-h-[340px] flex flex-col justify-center bg-white border-neutral-200/80 shadow-xs">
                                        <div className="space-y-2">
                                            <label className="text-sm font-bold text-neutral-800">Mã Lượt Khám</label>
                                            <div className="relative">
                                                <Input
                                                    value={searchCode}
                                                    onChange={(e) => setSearchCode(e.target.value)}
                                                    disabled={isLoading}
                                                    placeholder="V-20240518-042"
                                                    className="h-12 pl-4 pr-10 rounded-xl text-sm font-medium border-neutral-300 focus:border-[#8B7CF6] focus:ring-2 focus:ring-[#8B7CF6]/20 bg-white"
                                                />
                                                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-neutral-400" />
                                            </div>
                                            <p className="text-[11px] text-neutral-400 font-medium">
                                                Định dạng: V-YYYYMMDD-XXX (VD: V-20240518-042)
                                            </p>
                                        </div>

                                        <Button
                                            onClick={handleLookup}
                                            disabled={isLoading}
                                            className="w-full h-12 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl font-bold shadow-sm flex items-center justify-center gap-2"
                                        >
                                            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                                            Tra Cứu Bệnh Nhân
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
