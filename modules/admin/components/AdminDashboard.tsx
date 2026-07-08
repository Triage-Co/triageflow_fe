'use client';

import {
    Users,
    Clock,
    CheckCircle2,
    Activity,
    TrendingUp,
    Stethoscope,
    FlaskConical,
    Pill,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Mock Data ──────────────────────────────────────────────────────────── */

const STATS = [
    { label: 'Tổng BN hôm nay', value: 127, change: '+12%', up: true, icon: Users, color: 'text-brand-500', bg: 'bg-brand-50' },
    { label: 'Đang chờ khám', value: 34, change: '-8%', up: false, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Đã hoàn thành', value: 89, change: '+15%', up: true, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Nhân viên online', value: 23, change: '+2', up: true, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
];

const WEEKLY_DATA = [
    { day: 'T2', value: 95 },
    { day: 'T3', value: 110 },
    { day: 'T4', value: 88 },
    { day: 'T5', value: 134 },
    { day: 'T6', value: 127 },
    { day: 'T7', value: 72 },
    { day: 'CN', value: 45 },
];

const RECENT_ACTIVITIES = [
    { time: '14:32', text: 'BN Nguyễn Thị Hà đã thanh toán viện phí', type: 'payment' },
    { time: '14:28', text: 'BS. Trần Minh Đức hoàn thành khám cho BN #1047', type: 'complete' },
    { time: '14:15', text: 'Kết quả XN máu của BN Lê Văn Phúc đã có', type: 'lab' },
    { time: '13:58', text: 'BN Phạm Thị Mai đăng ký khám mới qua Kiosk', type: 'register' },
    { time: '13:45', text: 'Dược sĩ Hoàng Lan đã phát thuốc cho BN #1039', type: 'pharmacy' },
    { time: '13:30', text: 'Hệ thống AI phân luồng BN Trần Quốc Bảo → Khoa Nội', type: 'ai' },
];

const DEPT_STATUS = [
    { name: 'Phòng khám Nội tổng quát', icon: Stethoscope, waiting: 12, serving: 3, color: 'text-brand-500', bg: 'bg-brand-50' },
    { name: 'Khoa Xét nghiệm', icon: FlaskConical, waiting: 8, serving: 5, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Khoa Dược', icon: Pill, waiting: 5, serving: 2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Thu ngân', icon: CreditCard, waiting: 3, serving: 1, color: 'text-amber-600', bg: 'bg-amber-50' },
];

/* ─── Helper ─────────────────────────────────────────────────────────────── */

function getActivityDot(type: string) {
    switch (type) {
        case 'payment': return 'bg-emerald-500';
        case 'complete': return 'bg-brand-500';
        case 'lab': return 'bg-blue-500';
        case 'register': return 'bg-amber-500';
        case 'pharmacy': return 'bg-teal-500';
        case 'ai': return 'bg-purple-500';
        default: return 'bg-neutral-400';
    }
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminDashboard() {
    const maxValue = Math.max(...WEEKLY_DATA.map(d => d.value));

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* ── Gradient bg matching EMR style ── */}
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── Title ── */}
                        <div className="mb-6">
                            <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                Admin Dashboard
                            </h1>
                            <p className="text-[13px] text-[#7B7B7B] mt-1 font-medium">
                                Tổng quan hoạt động hệ thống TriageFlowOPD hôm nay.
                            </p>
                        </div>

                        {/* ── Stat Cards ── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            {STATS.map((stat) => {
                                const Icon = stat.icon;
                                return (
                                    <div
                                        key={stat.label}
                                        className="bg-white rounded-2xl border border-[#EBEBEB] p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', stat.bg)}>
                                                <Icon className={cn('w-5 h-5', stat.color)} />
                                            </div>
                                            <div className={cn(
                                                'flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full',
                                                stat.up
                                                    ? 'text-emerald-700 bg-emerald-50'
                                                    : 'text-red-600 bg-red-50'
                                            )}>
                                                {stat.up
                                                    ? <ArrowUpRight className="w-3 h-3" />
                                                    : <ArrowDownRight className="w-3 h-3" />
                                                }
                                                {stat.change}
                                            </div>
                                        </div>
                                        <p className="text-[28px] font-bold text-[#2D2D2D] leading-none">{stat.value}</p>
                                        <p className="text-[11px] text-[#9C9C9C] font-semibold mt-1.5 uppercase tracking-wider">{stat.label}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Chart + Activity ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">
                            {/* Weekly chart */}
                            <div className="lg:col-span-3 bg-white rounded-2xl border border-[#EBEBEB] p-5">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h3 className="text-[14px] font-bold text-[#2D2D2D]">Lượt khám theo tuần</h3>
                                        <p className="text-[11px] text-[#9C9C9C] font-medium mt-0.5">Tuần 28/06 – 04/07/2026</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                                        <TrendingUp className="w-3 h-3" />
                                        +8.5% so với tuần trước
                                    </div>
                                </div>

                                <div className="flex items-end gap-3 h-44">
                                    {WEEKLY_DATA.map((d, i) => {
                                        const height = (d.value / maxValue) * 100;
                                        const isToday = i === 4; // Friday
                                        return (
                                            <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                                                <span className="text-[10px] font-bold text-[#7B7B7B]">{d.value}</span>
                                                <div
                                                    className={cn(
                                                        'w-full rounded-t-lg transition-all duration-500',
                                                        isToday
                                                            ? 'bg-gradient-to-t from-brand-500 to-brand-400'
                                                            : 'bg-[#EEEDFC] hover:bg-brand-200'
                                                    )}
                                                    style={{ height: `${height}%` }}
                                                />
                                                <span className={cn(
                                                    'text-[10px] font-bold',
                                                    isToday ? 'text-brand-500' : 'text-[#9C9C9C]'
                                                )}>{d.day}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Recent activity */}
                            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EBEBEB] p-5">
                                <h3 className="text-[14px] font-bold text-[#2D2D2D] mb-4">Hoạt động gần đây</h3>
                                <div className="space-y-4">
                                    {RECENT_ACTIVITIES.map((act, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className="flex flex-col items-center mt-1">
                                                <span className={cn('w-2 h-2 rounded-full shrink-0', getActivityDot(act.type))} />
                                                {i < RECENT_ACTIVITIES.length - 1 && (
                                                    <div className="w-px h-6 bg-neutral-100 mt-1" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[12px] text-[#2D2D2D] font-semibold leading-relaxed">{act.text}</p>
                                                <p className="text-[10px] text-[#ADADAD] font-medium mt-0.5">{act.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── Department Status ── */}
                        <div>
                            <h3 className="text-[14px] font-bold text-[#2D2D2D] mb-4">Trạng thái khoa / phòng</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {DEPT_STATUS.map((dept) => {
                                    const Icon = dept.icon;
                                    return (
                                        <div
                                            key={dept.name}
                                            className="bg-white rounded-2xl border border-[#EBEBEB] p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow"
                                        >
                                            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', dept.bg)}>
                                                <Icon className={cn('w-4.5 h-4.5', dept.color)} />
                                            </div>
                                            <p className="text-[12px] font-bold text-[#2D2D2D] mb-3">{dept.name}</p>
                                            <div className="flex items-center gap-4">
                                                <div>
                                                    <p className="text-[20px] font-bold text-amber-600 leading-none">{dept.waiting}</p>
                                                    <p className="text-[9px] text-[#ADADAD] font-bold uppercase tracking-wider mt-1">Đang chờ</p>
                                                </div>
                                                <div className="w-px h-8 bg-neutral-100" />
                                                <div>
                                                    <p className="text-[20px] font-bold text-emerald-600 leading-none">{dept.serving}</p>
                                                    <p className="text-[9px] text-[#ADADAD] font-bold uppercase tracking-wider mt-1">Đang khám</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
