'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Bell, 
    Check, 
    Trash2, 
    CheckCircle2,
    Loader2,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { useNotificationStore } from '@/modules/clinical/store/notificationStore';

export default function DoctorNotificationPage() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const [mounted, setMounted] = useState(false);

    const {
        notifications,
        isLoading,
        error,
        fetchNotifications,
        toggleRead,
        markAllRead,
        deleteNotification,
        deleteAllNotifications,
    } = useNotificationStore();

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
        }
    }, [accessToken, mounted, router]);

    useEffect(() => {
        if (!mounted || !accessToken) return;
        fetchNotifications(accessToken);
    }, [mounted, accessToken, fetchNotifications]);

    if (!mounted || !accessToken) {
        return (
            <div className="flex-1 flex items-center justify-center bg-neutral-50/50 min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7CF6]"></div>
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <EMRWorkspaceLayout activeTabId="notification">
            <div className="flex-1 flex flex-col p-4 pb-6 overflow-hidden">
                <div className="h-fit max-h-full flex flex-col bg-white rounded-[24px] border border-neutral-200/50 shadow-[0_4px_24px_-4px_rgba(139,124,246,0.02)] overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 md:p-8">
                        <div className="max-w-4xl mx-auto">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h1 className="text-[28px] font-bold text-neutral-900 tracking-tight leading-snug">
                                        Thông báo
                                    </h1>
                                    <p className="text-sm text-neutral-400 mt-1 font-medium">
                                        Cập nhật tình trạng bệnh nhân, lịch khám và hệ thống
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={() => fetchNotifications(accessToken)}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full shadow-sm bg-white"
                                        startIcon={<RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />}
                                    >
                                        Làm mới
                                    </Button>
                                    <Button
                                        onClick={markAllRead}
                                        variant="outline"
                                        size="sm"
                                        className="rounded-full shadow-sm bg-white"
                                        startIcon={<Check className="w-4 h-4" />}
                                        disabled={unreadCount === 0}
                                    >
                                        Đánh dấu đã đọc tất cả
                                    </Button>
                                    <Button
                                        onClick={() => deleteAllNotifications(accessToken)}
                                        variant="destructive"
                                        size="sm"
                                        className="rounded-full shadow-sm"
                                        startIcon={<Trash2 className="w-4 h-4" />}
                                        disabled={notifications.length === 0 || isLoading}
                                    >
                                        Xoá tất cả
                                    </Button>
                                </div>
                            </div>

                            {/* Content */}
                            {isLoading && notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                    <p className="text-sm font-semibold">Đang tải thông báo...</p>
                                </div>
                            ) : error ? (
                                <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm text-red-800 font-bold">Lỗi tải thông báo</p>
                                        <p className="text-xs text-red-700 font-semibold mt-1">{error}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Summary */}
                                    {notifications.length > 0 && (
                                        <p className="text-[12px] text-[#9C9C9C] font-medium mb-2">
                                            {notifications.length} thông báo · {unreadCount} chưa đọc
                                        </p>
                                    )}

                                    {notifications.length > 0 ? (
                                        notifications.map((item) => (
                                            <Card
                                                key={item.id}
                                                className={cn(
                                                    "p-5 hover:shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-300 border flex items-start gap-4",
                                                    !item.read ? "bg-white border-neutral-200 shadow-sm" : "bg-white/60 border-neutral-100 text-neutral-500"
                                                )}
                                            >
                                                {/* Left Icon Badge */}
                                                <div className={cn(
                                                    "w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                                                    !item.read
                                                        ? "bg-purple-50/70 border-purple-100/50"
                                                        : "bg-neutral-50 border-neutral-100"
                                                )}>
                                                    <Bell className={cn(
                                                        "w-4 h-4",
                                                        !item.read ? "text-[#8B7CF6]" : "text-neutral-400"
                                                    )} />
                                                </div>

                                                {/* Body */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className={cn(
                                                            "text-[13px] font-bold text-neutral-800 leading-relaxed",
                                                            item.read && "text-neutral-500 font-medium"
                                                        )}>
                                                            {item.content}
                                                        </p>
                                                        {!item.read && (
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] shrink-0" />
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-neutral-400 font-semibold block mt-2">
                                                        {item.time}
                                                    </span>
                                                </div>

                                                {/* Right Actions */}
                                                <div className="flex items-center gap-1.5 self-center shrink-0">
                                                    <button
                                                        onClick={() => toggleRead(item.id)}
                                                        title={item.read ? "Đánh dấu chưa đọc" : "Đánh dấu đã đọc"}
                                                        className={cn(
                                                            "p-2 rounded-xl transition-colors cursor-pointer border border-transparent",
                                                            item.read
                                                                ? "hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600"
                                                                : "hover:bg-purple-50 text-[#8B7CF6]"
                                                        )}
                                                    >
                                                        <CheckCircle2 className="w-4.5 h-4.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteNotification(item.id, accessToken)}
                                                        title="Xoá thông báo"
                                                        className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50/60 transition-colors cursor-pointer border border-transparent"
                                                    >
                                                        <Trash2 className="w-4.5 h-4.5" />
                                                    </button>
                                                </div>
                                            </Card>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
                                            <Bell className="w-12 h-12 text-neutral-300" />
                                            <p className="text-sm font-semibold">Chưa có thông báo nào</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
