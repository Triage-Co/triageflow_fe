'use client';

import React, { useState } from 'react';
import {
    CheckCircle2,
    Package,
    AlertTriangle,
    Check,
    Bell,
    Settings,
    X,
} from 'lucide-react';

export interface NotificationBannerItem {
    id: string;
    title: string;
    content: string;
    time: string;
    read: boolean;
    type: 'checkin' | 'pharmacy' | 'inventory' | 'emergency' | 'payment';
}

const INITIAL_BANNERS: NotificationBannerItem[] = [
    {
        id: 'b1',
        title: 'Bệnh nhân đã check-in',
        content: 'Nguyễn Văn An (P001) đã check-in thành công',
        time: '2 phút trước',
        read: false,
        type: 'checkin',
    },
    {
        id: 'b2',
        title: 'Thuốc sẵn sàng',
        content: 'Đơn thuốc RX-2024-002 đã được chuẩn bị xong',
        time: '5 phút trước',
        read: false,
        type: 'pharmacy',
    },
    {
        id: 'b3',
        title: 'Tồn kho thấp',
        content: 'Amoxicillin 500mg còn 45 viên, cần đặt hàng',
        time: '15 phút trước',
        read: false,
        type: 'inventory',
    },
    {
        id: 'b4',
        title: 'Bệnh nhân cấp cứu',
        content: 'Lê Thị Hương (E001) - Ưu tiên cao đã đến',
        time: '20 phút trước',
        read: false,
        type: 'emergency',
    },
    {
        id: 'b5',
        title: 'Thanh toán xác nhận',
        content: 'Thanh toán cho đơn RX-2024-001 đã được xác nhận',
        time: '25 phút trước',
        read: false,
        type: 'payment',
    },
];

export function NotificationPanel() {
    const [banners, setBanners] = useState<NotificationBannerItem[]>(INITIAL_BANNERS);

    // Notification Toggles State (Screenshot 1 bottom section)
    const [settings, setSettings] = useState({
        checkin: true,
        inventory: true,
        emergency: true,
        lateRx: true,
    });

    const handleMarkAllRead = () => {
        setBanners((prev) => prev.map((b) => ({ ...b, read: true })));
    };

    const toggleSetting = (key: keyof typeof settings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const getBannerStyle = (type: NotificationBannerItem['type']) => {
        switch (type) {
            case 'checkin':
            case 'payment':
                return {
                    bg: 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950',
                    iconBg: 'bg-emerald-100 text-emerald-600',
                    icon: CheckCircle2,
                };
            case 'pharmacy':
                return {
                    bg: 'bg-blue-50/60 border-blue-200/80 text-blue-950',
                    iconBg: 'bg-blue-100 text-blue-600',
                    icon: Package,
                };
            case 'inventory':
                return {
                    bg: 'bg-amber-50/60 border-amber-200/80 text-amber-950',
                    iconBg: 'bg-amber-100 text-amber-600',
                    icon: AlertTriangle,
                };
            case 'emergency':
                return {
                    bg: 'bg-red-50/60 border-red-200/80 text-red-950',
                    iconBg: 'bg-red-100 text-red-600',
                    icon: AlertTriangle,
                };
            default:
                return {
                    bg: 'bg-slate-50 border-slate-200 text-slate-900',
                    iconBg: 'bg-slate-100 text-slate-600',
                    icon: Bell,
                };
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-y-auto bg-white rounded-tl-[48px] rounded-bl-[48px] p-6 md:p-10">
            <div className="max-w-5xl w-full mx-auto space-y-8">
                {/* ── Page Header ── */}
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-800 tracking-tight">
                            Thông Báo
                        </h1>
                        <p className="text-xs lg:text-sm text-slate-400 font-medium mt-1">
                            Cập nhật hoạt động và cảnh báo
                        </p>
                    </div>

                    <button
                        onClick={handleMarkAllRead}
                        className="px-5 py-2.5 rounded-[14px] bg-[#8B7CF6] hover:bg-[#7C6CF5] text-white text-xs font-bold shadow-md shadow-purple-500/20 transition cursor-pointer active:scale-95 flex items-center gap-2"
                    >
                        <span>Đánh Dấu Đã Đọc Tất Cả</span>
                    </button>
                </div>

                {/* ── Section 1: Full-Width Colored Banner Notifications matching Screenshot 1 ── */}
                <div className="space-y-3.5">
                    {banners.map((item) => {
                        const style = getBannerStyle(item.type);
                        const IconComponent = style.icon;

                        return (
                            <div
                                key={item.id}
                                className={`p-4 md:p-5 rounded-[20px] border flex items-center justify-between gap-4 transition duration-200 shadow-sm ${style.bg}`}
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${style.iconBg}`}>
                                        <IconComponent className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-sm text-slate-900 tracking-tight">{item.title}</h4>
                                        <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">{item.content}</p>
                                    </div>
                                </div>

                                <span className="text-xs font-semibold text-slate-400 shrink-0 tabular-nums">
                                    {item.time}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* ── Section 2: Cài Đặt Thông Báo matching Screenshot 1 bottom card ── */}
                <div className="bg-white rounded-[24px] border border-slate-200/80 p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] space-y-6">
                    <div className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-bold text-slate-800 text-base">Cài Đặt Thông Báo</h3>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {/* Toggle 1 */}
                        <div className="py-4 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Thông báo bệnh nhân check-in</span>
                            <button
                                onClick={() => toggleSetting('checkin')}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                                    settings.checkin ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Toggle 2 */}
                        <div className="py-4 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Cảnh báo tồn kho thấp</span>
                            <button
                                onClick={() => toggleSetting('inventory')}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                                    settings.inventory ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Toggle 3 */}
                        <div className="py-4 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Thông báo bệnh nhân cấp cứu</span>
                            <button
                                onClick={() => toggleSetting('emergency')}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                                    settings.emergency ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>

                        {/* Toggle 4 */}
                        <div className="py-4 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">Thông báo đơn thuốc trễ</span>
                            <button
                                onClick={() => toggleSetting('lateRx')}
                                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                                    settings.lateRx ? 'bg-blue-600 justify-end' : 'bg-slate-300 justify-start'
                                }`}
                            >
                                <span className="w-4 h-4 rounded-full bg-white shadow-sm" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
