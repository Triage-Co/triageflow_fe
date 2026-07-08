'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
    Bell, 
    Check, 
    Trash2, 
    FlaskConical, 
    UserPlus, 
    ShieldAlert,
    CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';

interface NotificationItem {
    id: string;
    title: string;
    content: string;
    time: string;
    type: 'patient' | 'lab' | 'system' | 'general';
    read: boolean;
    priority: 'high' | 'medium' | 'low';
}

const MOCK_NOTIFICATIONS: NotificationItem[] = [
    {
        id: '1',
        title: 'Bệnh nhân mới phân luồng khẩn cấp',
        content: 'Bệnh nhân Dương Minh (Độ ưu tiên: UT1 - Khẩn cấp) vừa được phân luồng trực tiếp đến phòng khám của bạn.',
        time: '5 phút trước',
        type: 'patient',
        read: false,
        priority: 'high',
    },
    {
        id: '2',
        title: 'Kết quả cận lâm sàng sẵn sàng',
        content: 'Bệnh nhân Nguyễn Trung Sơn đã có kết quả xét nghiệm "Tổng phân tích tế bào máu". Vui lòng xem bệnh án để chẩn đoán.',
        time: '20 phút trước',
        type: 'lab',
        read: false,
        priority: 'medium',
    },
    {
        id: '3',
        title: 'Yêu cầu hỗ trợ từ phòng điều dưỡng',
        content: 'Điều dưỡng Nguyễn Thị Mai gửi yêu cầu xác nhận đơn thuốc bổ sung cho phòng khám số 4.',
        time: '1 giờ trước',
        type: 'general',
        read: true,
        priority: 'low',
    },
    {
        id: '4',
        title: 'Bảo trì hệ thống định kỳ',
        content: 'Hệ thống TriageFlow OPD sẽ tạm dừng bảo trì định kỳ từ 23:00 đến 23:30 hôm nay. Vui lòng hoàn tất hồ sơ bệnh án trước thời gian này.',
        time: '3 giờ trước',
        type: 'system',
        read: true,
        priority: 'high',
    },
    {
        id: '5',
        title: 'Hoàn thành thanh toán viện phí',
        content: 'Bệnh nhân Trần Thị B (UT3) đã hoàn thành thanh toán hóa đơn tạm ứng xét nghiệm và đang di chuyển đến phòng siêu âm.',
        time: 'Hôm qua',
        type: 'patient',
        read: true,
        priority: 'low',
    },
];

export default function DoctorNotificationPage() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const [mounted, setMounted] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
    const [filter, setFilter] = useState<'all' | 'unread' | 'patient' | 'lab'>('all');

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

    if (!mounted || !accessToken) {
        return (
            <div className="flex-1 flex items-center justify-center bg-neutral-50/50 min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B7CF6]"></div>
            </div>
        );
    }

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const handleToggleRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: !n.read } : n));
    };

    const handleDelete = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const filteredList = notifications.filter(n => {
        if (filter === 'unread') return !n.read;
        if (filter === 'patient') return n.type === 'patient';
        if (filter === 'lab') return n.type === 'lab';
        return true;
    });

    const getIcon = (type: NotificationItem['type']) => {
        switch (type) {
            case 'patient': return <UserPlus className="w-4 h-4 text-blue-600" />;
            case 'lab': return <FlaskConical className="w-4 h-4 text-emerald-600" />;
            case 'system': return <ShieldAlert className="w-4 h-4 text-amber-600" />;
            default: return <Bell className="w-4 h-4 text-[#8B7CF6]" />;
        }
    };

    const getBgColor = (type: NotificationItem['type']) => {
        switch (type) {
            case 'patient': return 'bg-blue-50/70 border-blue-100/50';
            case 'lab': return 'bg-emerald-50/70 border-emerald-100/50';
            case 'system': return 'bg-amber-50/70 border-amber-100/50';
            default: return 'bg-purple-50/70 border-purple-100/50';
        }
    };

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
                                        Cập nhật tình trạng bệnh nhân, kết quả xét nghiệm và hệ thống
                                    </p>
                                </div>
                                <Button
                                    onClick={handleMarkAllRead}
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full shadow-sm bg-white"
                                    startIcon={<Check className="w-4 h-4" />}
                                >
                                    Đánh dấu đã đọc tất cả
                                </Button>
                            </div>

                            {/* Filters */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-4 shrink-0">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={cn(
                                        "px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-150 cursor-pointer whitespace-nowrap",
                                        filter === 'all'
                                            ? "bg-white text-[#2D2D2D] border-neutral-200 shadow-sm"
                                            : "bg-transparent text-[#9C9C9C] border-transparent hover:text-[#8B7CF6] hover:bg-white/60"
                                    )}
                                >
                                    Tất cả ({notifications.length})
                                </button>
                                <button
                                    onClick={() => setFilter('unread')}
                                    className={cn(
                                        "px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-150 cursor-pointer whitespace-nowrap",
                                        filter === 'unread'
                                            ? "bg-white text-[#2D2D2D] border-neutral-200 shadow-sm"
                                            : "bg-transparent text-[#9C9C9C] border-transparent hover:text-[#8B7CF6] hover:bg-white/60"
                                    )}
                                >
                                    Chưa đọc ({notifications.filter(n => !n.read).length})
                                </button>
                                <button
                                    onClick={() => setFilter('patient')}
                                    className={cn(
                                        "px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-150 cursor-pointer whitespace-nowrap",
                                        filter === 'patient'
                                            ? "bg-white text-[#2D2D2D] border-neutral-200 shadow-sm"
                                            : "bg-transparent text-[#9C9C9C] border-transparent hover:text-[#8B7CF6] hover:bg-white/60"
                                    )}
                                >
                                    Bệnh nhân ({notifications.filter(n => n.type === 'patient').length})
                                </button>
                                <button
                                    onClick={() => setFilter('lab')}
                                    className={cn(
                                        "px-4 py-2 text-xs font-semibold rounded-full border transition-all duration-150 cursor-pointer whitespace-nowrap",
                                        filter === 'lab'
                                            ? "bg-white text-[#2D2D2D] border-neutral-200 shadow-sm"
                                            : "bg-transparent text-[#9C9C9C] border-transparent hover:text-[#8B7CF6] hover:bg-white/60"
                                    )}
                                >
                                    Xét nghiệm ({notifications.filter(n => n.type === 'lab').length})
                                </button>
                            </div>

                            {/* Notifications List */}
                            <div className="space-y-4">
                                {filteredList.length > 0 ? (
                                    filteredList.map((item) => (
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
                                                getBgColor(item.type)
                                            )}>
                                                {getIcon(item.type)}
                                            </div>

                                            {/* Body */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className={cn(
                                                        "text-sm font-bold text-neutral-800",
                                                        item.read && "text-neutral-500 font-medium"
                                                    )}>
                                                        {item.title}
                                                    </h3>
                                                    {!item.read && (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] shrink-0" />
                                                    )}
                                                    {item.priority === 'high' && (
                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-red-600 uppercase tracking-wide">
                                                            Khẩn
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                                                    {item.content}
                                                </p>
                                                <span className="text-[10px] text-neutral-400 font-semibold block mt-2.5">
                                                    {item.time}
                                                </span>
                                            </div>

                                            {/* Right Actions */}
                                            <div className="flex items-center gap-1.5 self-center shrink-0">
                                                <button
                                                    onClick={() => handleToggleRead(item.id)}
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
                                                    onClick={() => handleDelete(item.id)}
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
                                        <p className="text-sm font-semibold">Không tìm thấy thông báo nào</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
