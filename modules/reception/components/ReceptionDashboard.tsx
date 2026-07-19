'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    Plus,
    Users,
    UserPlus,
    ListOrdered,
    CreditCard,
    AlertTriangle,
    Clock,
    Footprints,
    Ticket,
    ArrowRight,
    HeartPulse,
    Stethoscope,
    Bone,
    Sparkles,
    Baby,
    Activity,
    MapPin,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import {
    buildRecentActivities,
    buildReceptionStats,
    extractHighPriorityPatients,
    getTodayDateString,
    mapBackendToQueuePatient,
} from '@/modules/reception/utils/receptionMapper';
import type {
    HighPriorityPatient,
    QueuePatient,
    ReceptionPriority,
    ReceptionStat,
    ReceptionStatus,
    RecentActivity,
} from '@/modules/reception/types/reception.types';

const STAT_ICONS = {
    waiting: Users,
    registered: UserPlus,
    queues: ListOrdered,
    payment: CreditCard,
    emergency: AlertTriangle,
    avgTime: Clock,
    walkin: Footprints,
    reissue: Ticket,
} as const;

const SPECIALTY_ICONS = {
    emergency: HeartPulse,
    internal: Stethoscope,
    trauma: Bone,
    dermatology: Sparkles,
    obgyn: Baby,
    general: Activity,
} as const;

const PRIORITY_STYLES: Record<ReceptionPriority, { pill: string; dot: string }> = {
    'Khẩn cấp': { pill: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]', dot: 'bg-[#EF4444]' },
    'Người cao tuổi': { pill: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]', dot: 'bg-[#3B82F6]' },
    'Ưu tiên': { pill: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]', dot: 'bg-[#F59E0B]' },
    'Thường': { pill: 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]', dot: 'bg-[#9CA3AF]' },
};

const STATUS_STYLES: Record<ReceptionStatus, string> = {
    'Đang khám': 'bg-[#ECFDF5] text-[#059669]',
    'Chờ khám': 'bg-[#EFF6FF] text-[#2563EB]',
    'Chờ TT': 'bg-[#FFFBEB] text-[#D97706]',
    'Đã TT': 'bg-[#ECFDF5] text-[#059669]',
    'Đã gọi': 'bg-[#F5F3FF] text-[#7C3AED]',
    'Check-in': 'bg-[#F3F4F6] text-[#6B7280]',
};

const ACTIVITY_DOT: Record<RecentActivity['type'], string> = {
    register: 'bg-[#3B82F6]',
    emergency: 'bg-[#EF4444]',
    payment: 'bg-[#10B981]',
    print: 'bg-[#8B7CF6]',
};

const QUICK_ACTIONS = [
    { id: 'register', label: 'Đăng ký mới', icon: UserPlus, bg: 'bg-[#E8FBF3]', color: 'text-[#059669]' },
    { id: 'print', label: 'In vé', icon: Ticket, bg: 'bg-[#EEF2FF]', color: 'text-[#4F46E5]' },
    { id: 'payment', label: 'Thanh toán', icon: CreditCard, bg: 'bg-[#FFF8EB]', color: 'text-[#D97706]' },
    { id: 'search', label: 'Tra cứu', icon: MapPin, bg: 'bg-[#ECFEFF]', color: 'text-[#0891B2]' },
] as const;

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function formatTodaySubtitle() {
    const now = new Date();
    const weekday = WEEKDAYS[now.getDay()];
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hour = now.getHours();
    const shift = hour < 12 ? 'Ca sáng' : hour < 18 ? 'Ca chiều' : 'Ca tối';
    return `${weekday}, ${dd}/${mm}/${yyyy} - ${shift}`;
}

function StatCard({ stat }: { stat: ReceptionStat }) {
    const Icon = STAT_ICONS[stat.icon];
    return (
        <div className="relative flex items-center gap-2 bg-white rounded-[12px] border border-[#EBEBEB] px-2.5 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.04)] h-[56px]">
            {stat.trend && (
                <span
                    className={cn(
                        'absolute top-1.5 right-1.5 text-[9px] font-bold leading-none',
                        stat.trend.positive ? 'text-[#10B981]' : 'text-[#EF4444]',
                    )}
                >
                    {stat.trend.value}
                </span>
            )}
            <div className={cn('w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0', stat.iconBg)}>
                <Icon className={cn('w-3.5 h-3.5', stat.iconColor)} strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1 pr-3">
                <p className="text-[15px] font-bold text-[#1F2937] leading-none tracking-tight">{stat.value}</p>
                <p className="text-[9px] text-[#9CA3AF] font-semibold mt-1 leading-tight line-clamp-2">{stat.label}</p>
            </div>
        </div>
    );
}

function PriorityBadge({ priority }: { priority: ReceptionPriority }) {
    const style = PRIORITY_STYLES[priority];
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border', style.pill)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />
            {priority}
        </span>
    );
}

function StatusBadge({ status }: { status: ReceptionStatus }) {
    return (
        <span className={cn('inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded-full', STATUS_STYLES[status])}>
            {status}
        </span>
    );
}

function SpecialtyCell({ patient }: { patient: QueuePatient }) {
    const Icon = SPECIALTY_ICONS[patient.specialtyIcon];
    const iconColors: Record<QueuePatient['specialtyIcon'], string> = {
        emergency: 'text-[#EF4444] bg-[#FEE2E2]',
        internal: 'text-[#10B981] bg-[#D1FAE5]',
        trauma: 'text-[#F59E0B] bg-[#FEF3C7]',
        dermatology: 'text-[#8B7CF6] bg-[#EDE9FE]',
        obgyn: 'text-[#EC4899] bg-[#FCE7F3]',
        general: 'text-[#6B7280] bg-[#F3F4F6]',
    };
    return (
        <div className="flex items-center gap-2">
            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', iconColors[patient.specialtyIcon])}>
                <Icon className="w-3 h-3" strokeWidth={2.25} />
            </div>
            <span className="text-[12px] font-medium text-[#4B5563]">{patient.specialty}</span>
        </div>
    );
}

export function ReceptionDashboard() {
    const subtitle = useMemo(() => formatTodaySubtitle(), []);
    const accessToken = useAuthStore((s) => s.accessToken);

    const [queuePatients, setQueuePatients] = useState<QueuePatient[]>([]);
    const [stats, setStats] = useState<ReceptionStat[]>([]);
    const [highPriority, setHighPriority] = useState<HighPriorityPatient[]>([]);
    const [activities, setActivities] = useState<RecentActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken) return;

        const fetchDashboard = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const today = getTodayDateString();

                const [queueRes, bookingRes] = await Promise.all([
                    receptionService.getQueueByDate(today, accessToken),
                    receptionService.getBookings(accessToken).catch(() => ({ data: [] as Record<string, unknown>[] })),
                ]);

                const mapped = queueRes.map(mapBackendToQueuePatient);
                const bookingCount = (bookingRes.data as unknown[])?.length ?? 0;

                setQueuePatients(mapped);
                setStats(buildReceptionStats(mapped, bookingCount));
                setHighPriority(extractHighPriorityPatients(mapped));
                setActivities(buildRecentActivities(mapped));
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu hàng đợi.');
                setQueuePatients([]);
                setStats(buildReceptionStats([], 0));
                setHighPriority([]);
                setActivities([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboard();
    }, [accessToken]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F2FF] py-6">
            <div className="flex-1 flex flex-col min-h-0 bg-white rounded-tl-[48px] rounded-bl-[48px] overflow-hidden shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-5 py-5 md:px-6 md:py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                        <h1 className="text-[20px] font-bold text-[#1F2937] tracking-tight leading-tight">
                            Tổng quan hôm nay
                        </h1>
                        <p className="text-[12px] text-[#9CA3AF] mt-1 font-medium">{subtitle}</p>
                    </div>
                    <Link
                        href="/reception/register"
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-[#8B7CF6] hover:bg-[#7C6FE0] text-white text-[12px] font-bold shadow-[0_2px_8px_rgba(139,124,246,0.35)] transition-colors shrink-0"
                    >
                        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Đăng ký bệnh nhân mới
                    </Link>
                </div>

                {error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 mb-5">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-red-800 font-bold">Lỗi tải dữ liệu</p>
                            <p className="text-xs text-red-700 font-medium mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 text-neutral-400 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                        <p className="text-sm font-semibold">Đang tải tổng quan...</p>
                    </div>
                ) : (
                <>
                {/* Stats — 8 cột full width như design */}
                <div className="grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 gap-2.5 mb-5">
                    {stats.map((stat) => (
                        <StatCard key={stat.label} stat={stat} />
                    ))}
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-5">
                    {/* Left column */}
                    <div className="space-y-5 min-w-0">
                        {/* Queue table */}
                        <div className="rounded-[12px] border border-[#EBEBEB] bg-white shadow-[0_1px_6px_rgba(0,0,0,0.04)] overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
                                <div className="flex items-center gap-2">
                                    <ListOrdered className="w-4 h-4 text-[#10B981] shrink-0" strokeWidth={2.25} />
                                    <h2 className="text-[15px] font-bold text-[#374151]">Hàng đợi hiện tại</h2>
                                    <span className="text-[11px] font-semibold text-[#059669] bg-[#D1FAE5] px-2.5 py-0.5 rounded-full">
                                        {queuePatients.length} bệnh nhân
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#10B981] hover:text-[#059669] transition-colors"
                                >
                                    Xem tất cả
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[680px]">
                                    <thead>
                                        <tr className="border-b border-[#F3F4F6] bg-[#FAFAFA]">
                                            {['Số vé', 'Bệnh nhân', 'Chuyên khoa', 'Ưu tiên', 'Trạng thái', 'Chờ', 'Thao tác'].map((col) => (
                                                <th
                                                    key={col}
                                                    className="text-left text-[11px] font-medium text-[#9CA3AF] px-5 py-3"
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queuePatients.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-5 py-12 text-center">
                                                    <p className="text-[13px] font-semibold text-[#9CA3AF]">
                                                        Chưa có bệnh nhân trong hàng đợi hôm nay
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                        queuePatients.map((patient, idx) => (
                                            <tr
                                                key={patient.id}
                                                className={cn(
                                                    'hover:bg-[#FAFAFF] transition-colors',
                                                    idx < queuePatients.length - 1 && 'border-b border-[#F9FAFB]',
                                                )}
                                            >
                                                <td className="px-5 py-3">
                                                    <span className="text-[12px] font-bold text-[#1F2937] font-mono tracking-tight">
                                                        {patient.ticketNo}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="text-[12px] font-semibold text-[#374151]">{patient.name}</span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <SpecialtyCell patient={patient} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <PriorityBadge priority={patient.priority} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <StatusBadge status={patient.status} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className="text-[12px] font-medium text-[#6B7280]">
                                                        {patient.waitMinutes} phút
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <Link
                                                        href={`/reception/${patient.id}`}
                                                        className="text-[11px] font-bold text-[#8B7CF6] hover:text-[#7C3AED] hover:underline transition-colors"
                                                    >
                                                        Chi tiết
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Quick actions */}
                        <div className="w-[40%] min-w-[240px] rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                            <h2 className="text-[14px] font-bold text-[#1F2937] mb-3">Thao tác nhanh</h2>
                            <div className="grid grid-cols-2 gap-2">
                                {QUICK_ACTIONS.map((action) => {
                                    const Icon = action.icon;
                                    const href =
                                        action.id === 'register'
                                            ? '/reception/register'
                                            : action.id === 'search'
                                              ? '/reception/search'
                                              : action.id === 'payment'
                                                ? '/reception/payment'
                                                : undefined;
                                    const className = cn(
                                        'flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] transition-opacity hover:opacity-90',
                                        action.bg,
                                    );
                                    if (href) {
                                        return (
                                            <Link key={action.id} href={href} className={className}>
                                                <Icon className={cn('w-4 h-4 shrink-0', action.color)} strokeWidth={2.25} />
                                                <span className={cn('text-[12px] font-bold', action.color)}>{action.label}</span>
                                            </Link>
                                        );
                                    }
                                    return (
                                        <button
                                            key={action.id}
                                            type="button"
                                            className={className}
                                        >
                                            <Icon className={cn('w-4 h-4 shrink-0', action.color)} strokeWidth={2.25} />
                                            <span className={cn('text-[12px] font-bold', action.color)}>{action.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Right column — fixed 300px như design */}
                    <div className="space-y-4">
                        {/* High priority */}
                        <div className="rounded-[12px] border border-[#FECACA] bg-[#FFF5F5] shadow-[0_1px_4px_rgba(239,68,68,0.06)] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[#FECACA]/50">
                                <h2 className="text-[14px] font-bold text-[#DC2626]">Ưu tiên cao</h2>
                            </div>
                            <div className="p-2 space-y-1.5">
                                {highPriority.length === 0 ? (
                                    <p className="text-[11px] text-[#9CA3AF] font-medium px-3 py-4 text-center">
                                        Không có ca ưu tiên
                                    </p>
                                ) : (
                                highPriority.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className="flex items-center justify-between gap-2 bg-white rounded-[8px] px-3 py-2 border border-[#FECACA]/30"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-bold text-[#1F2937] truncate">{patient.name}</p>
                                            <p className="text-[10px] text-[#9CA3AF] font-medium mt-0.5 truncate">
                                                {patient.ticketNo} · {patient.specialty}
                                            </p>
                                        </div>
                                        <PriorityBadge priority={patient.priority} />
                                    </div>
                                ))
                                )}
                            </div>
                        </div>

                        {/* Recent activity */}
                        <div className="rounded-[12px] border border-[#EBEBEB] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
                            <div className="px-4 py-3 border-b border-[#F3F4F6]">
                                <h2 className="text-[14px] font-bold text-[#1F2937]">Hoạt động gần đây</h2>
                            </div>
                            <div className="px-4 py-3">
                                {activities.length === 0 ? (
                                    <p className="text-[11px] text-[#9CA3AF] font-medium text-center py-4">
                                        Chưa có hoạt động gần đây
                                    </p>
                                ) : (
                                activities.map((activity, idx) => (
                                    <div key={activity.id} className="flex gap-2.5">
                                        <div className="flex flex-col items-center shrink-0 w-3">
                                            <div className={cn('w-2 h-2 rounded-full shrink-0 mt-1', ACTIVITY_DOT[activity.type])} />
                                            {idx < activities.length - 1 && (
                                                <div className="w-px flex-1 bg-[#E5E7EB] my-1" />
                                            )}
                                        </div>
                                        <div className={cn('flex-1 min-w-0', idx < activities.length - 1 && 'pb-3')}>
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-[11px] font-bold text-[#374151] leading-snug">{activity.title}</p>
                                                <span className="text-[10px] font-semibold text-[#9CA3AF] shrink-0 tabular-nums">
                                                    {activity.time}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-[#9CA3AF] font-medium mt-0.5">
                                                {activity.ticketNo} · {activity.patientName}
                                            </p>
                                        </div>
                                    </div>
                                ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                </>
                )}
                </div>
            </div>
        </div>
    );
}
