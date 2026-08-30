'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ArrowUpRight,
    Activity,
    AlertCircle,
    CalendarCheck,
    CheckCircle2,
    Clock,
    FlaskConical,
    Loader2,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { dashboardService, type DashboardSummary } from '../services/dashboardService';
import { CONGESTION_STYLES } from '../hooks/useQueueHeatmap';
import { getErrorMessage } from '../utils/errorMessage';

const POLL_MS = 60_000;

const KPI_CARDS: { key: keyof DashboardSummary['kpis']; label: string; icon: React.ElementType; color: string; bg: string }[] = [
    { key: 'queue_waiting', label: 'Đang chờ', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'queue_serving', label: 'Đang phục vụ', icon: Activity, color: 'text-brand-500', bg: 'bg-brand-50' },
    { key: 'completed_today', label: 'Hoàn thành hôm nay', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'staff_on_shift_today', label: 'Nhân viên trực hôm nay', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'rooms_with_shift_today', label: 'Phòng có ca trực', icon: CalendarCheck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { key: 'active_services', label: 'Dịch vụ đang hoạt động', icon: FlaskConical, color: 'text-teal-600', bg: 'bg-teal-50' },
];

function formatTime(iso: string | null): string {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

export function AdminDashboard() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadSummary = useCallback(async () => {
        if (!accessToken) return;
        setError(null);
        try {
            const res = await dashboardService.getSummary(accessToken);
            setSummary(res.data);
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải dữ liệu tổng quan.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        void loadSummary();
        const timer = window.setInterval(() => void loadSummary(), POLL_MS);
        return () => window.clearInterval(timer);
    }, [loadSummary]);

    const kpis = summary?.kpis;
    const busiestRooms = summary?.busiest_rooms || [];

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">Admin Dashboard</h1>
                                <p className="text-[13px] text-[#7B7B7B] mt-1 font-medium">
                                    Tổng quan hoạt động hệ thống TriageFlowOPD theo thời gian thực.
                                    {summary?.generated_at && ` · Cập nhật ${formatTime(summary.generated_at)}`}
                                </p>
                            </div>
                            <Link
                                href="/admin/map?heatmap=1"
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-bold cursor-pointer shrink-0"
                            >
                                Xem heatmap hàng chờ
                                <ArrowUpRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 whitespace-pre-line mb-6">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-24 text-neutral-500">
                                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                                <span className="text-sm font-medium">Đang tải dữ liệu...</span>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                    {KPI_CARDS.map((card) => {
                                        const Icon = card.icon;
                                        const value = kpis ? kpis[card.key] : undefined;
                                        return (
                                            <div
                                                key={card.key}
                                                className="bg-white rounded-2xl border border-[#EBEBEB] p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow"
                                            >
                                                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', card.bg)}>
                                                    <Icon className={cn('w-5 h-5', card.color)} />
                                                </div>
                                                <p className="text-[28px] font-bold text-[#2D2D2D] leading-none">
                                                    {value ?? '—'}
                                                </p>
                                                <p className="text-[11px] text-[#9C9C9C] font-semibold mt-1.5 uppercase tracking-wider">
                                                    {card.label}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div>
                                    <h3 className="text-[14px] font-bold text-[#2D2D2D] mb-4">Phòng đang tải cao nhất</h3>
                                    {busiestRooms.length === 0 ? (
                                        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-8 text-center text-sm text-neutral-500">
                                            Chưa có dữ liệu hàng chờ hôm nay.
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {busiestRooms.map((room) => {
                                                const style = CONGESTION_STYLES[room.congestion_level];
                                                return (
                                                    <div
                                                        key={room.room_id}
                                                        className="bg-white rounded-2xl border border-[#EBEBEB] p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-shadow"
                                                    >
                                                        <div className="flex items-start justify-between gap-2 mb-3">
                                                            <p className="text-[13px] font-bold text-[#2D2D2D] leading-snug">{room.room_name}</p>
                                                            {style && (
                                                                <span
                                                                    className={cn(
                                                                        'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                                                                        style.badge
                                                                    )}
                                                                >
                                                                    {style.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div>
                                                                <p className="text-[20px] font-bold text-amber-600 leading-none">
                                                                    {room.waiting_count}
                                                                </p>
                                                                <p className="text-[9px] text-[#ADADAD] font-bold uppercase tracking-wider mt-1">
                                                                    Đang chờ
                                                                </p>
                                                            </div>
                                                            <div className="w-px h-8 bg-neutral-100" />
                                                            <div>
                                                                <p className="text-[20px] font-bold text-brand-500 leading-none">
                                                                    {room.eta_full_queue_minutes}
                                                                </p>
                                                                <p className="text-[9px] text-[#ADADAD] font-bold uppercase tracking-wider mt-1">
                                                                    Phút chờ (ETA)
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
        </div>
    );
}
