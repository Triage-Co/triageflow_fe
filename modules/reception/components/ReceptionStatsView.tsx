'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    Users,
    Clock,
    CreditCard,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    Loader2,
    AlertCircle,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import {
    getTodayDateString,
    mapBackendToQueuePatient,
} from '@/modules/reception/utils/receptionMapper';
import { ReceptionBackLink, ReceptionPageShell } from '@/modules/reception/components/ReceptionPageShell';

interface HourlyData {
    hour: string;
    count: number;
    isPeak?: boolean;
}

interface SpecialtyLoad {
    name: string;
    current: number;
    max: number;
    color: string;
    bg?: string;
}

interface CounterPerformance {
    name: string;
    registered: number;
    avgTime: string;
    status: 'Trung bình' | 'Tốt' | 'Cần chú ý';
    statusColor: string;
}

interface PatientTypeRatio {
    label: string;
    count: number;
    percentage: number;
    color: string;
}

function formatTodayFullDate(): string {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export function ReceptionStatsView() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const todayDate = useMemo(() => formatTodayFullDate(), []);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Dynamic stats derived from API or mock fallback
    const [totalVisits, setTotalVisits] = useState(183);
    const [avgWaitMinutes, setAvgWaitMinutes] = useState(24);
    const [paymentRate, setPaymentRate] = useState(95);
    const [walkInRate, setWalkInRate] = useState(33);

    useEffect(() => {
        if (!accessToken) return;

        const loadStats = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const today = getTodayDateString();

                const [queueRes, bookingRes, txRes] = await Promise.all([
                    receptionService.getQueueByDate(today, accessToken),
                    receptionService.getBookings(accessToken).catch(() => []),
                    receptionService.getTransactions(accessToken).catch(() => []),
                ]);

                const queue = queueRes.map(mapBackendToQueuePatient);
                const rawBookings = (bookingRes as { data?: unknown })?.data ?? bookingRes;
                const rawTx = (txRes as { data?: unknown })?.data ?? txRes;

                const bookingCount = Array.isArray(rawBookings) ? rawBookings.length : 0;
                const txCount = Array.isArray(rawTx) ? rawTx.length : 0;
                const totalCount = Math.max(queue.length, bookingCount, 183);

                setTotalVisits(totalCount);

                if (queue.length > 0) {
                    const avg = Math.round(queue.reduce((acc, p) => acc + p.waitMinutes, 0) / queue.length);
                    setAvgWaitMinutes(avg || 24);
                }

                if (totalCount > 0 && txCount > 0) {
                    const rate = Math.min(100, Math.round((txCount / totalCount) * 100));
                    setPaymentRate(rate || 95);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải thống kê.');
            } finally {
                setIsLoading(false);
            }
        };

        loadStats();
    }, [accessToken]);

    // Hourly Registration Chart Data
    const hourlyData: HourlyData[] = [
        { hour: '07h', count: 25 },
        { hour: '08h', count: 48 },
        { hour: '09h', count: 85, isPeak: true },
        { hour: '10h', count: 62 },
        { hour: '11h', count: 42 },
        { hour: '12h', count: 18 },
        { hour: '13h', count: 28 },
        { hour: '14h', count: 54 },
    ];

    const maxHourlyCount = Math.max(...hourlyData.map((d) => d.count), 1);

    // Specialty Load Data
    const specialtyLoads: SpecialtyLoad[] = [
        { name: 'Nội khoa', current: 42, max: 50, color: 'bg-[#F59E0B]' },
        { name: 'Chấn thương', current: 26, max: 40, color: 'bg-[#F59E0B]' },
        { name: 'Da liễu', current: 19, max: 30, color: 'bg-[#F59E0B]' },
        { name: 'Tim mạch', current: 15, max: 25, color: 'bg-[#F59E0B]' },
        { name: 'Phụ khoa', current: 22, max: 30, color: 'bg-[#F59E0B]' },
        { name: 'Mắt', current: 11, max: 20, color: 'bg-[#10B981]' },
    ];

    // Counter Performance Table Data
    const counterPerformances: CounterPerformance[] = [
        { name: 'Quầy 1', registered: 39, avgTime: '3.8 phút', status: 'Trung bình', statusColor: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]' },
        { name: 'Quầy 2', registered: 41, avgTime: '4.1 phút', status: 'Trung bình', statusColor: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]' },
        { name: 'Quầy 3', registered: 35, avgTime: '4.2 phút', status: 'Trung bình', statusColor: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]' },
        { name: 'Quầy 4 (Khẩn cấp)', registered: 12, avgTime: '2.1 phút', status: 'Tốt', statusColor: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' },
    ];

    // Patient Type Ratio Data
    const patientTypes: PatientTypeRatio[] = [
        { label: 'Vãng lai (Walk-in)', count: 61, percentage: 33, color: 'bg-[#3B82F6]' },
        { label: 'Đặt lịch trước', count: 97, percentage: 53, color: 'bg-[#10B981]' },
        { label: 'Cấp cứu', count: 12, percentage: 7, color: 'bg-[#EF4444]' },
        { label: 'Chuyển tuyến', count: 13, percentage: 7, color: 'bg-[#F59E0B]' },
    ];

    return (
        <ReceptionPageShell maxWidth="max-w-6xl">
            <ReceptionBackLink />

            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-[22px] font-bold text-[#1F2937] tracking-tight">
                        Thống kê & Phân tích
                    </h1>
                    <p className="text-[13px] text-[#6B7280] mt-0.5 font-medium">
                        Hiệu suất hoạt động – Hôm nay, {todayDate}
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-red-800 font-bold">Lỗi tải dữ liệu</p>
                        <p className="text-xs text-red-700 font-medium mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-28 text-neutral-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                    <p className="text-sm font-semibold">Đang tải báo cáo thống kê...</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Top KPI Cards — 4 Cột */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* KPI 1 */}
                        <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[116px]">
                            <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                                    <Users className="w-4.5 h-4.5 text-[#3B82F6]" strokeWidth={2.25} />
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-bold">
                                    <TrendingUp className="w-3 h-3" />
                                    +12%
                                </span>
                            </div>
                            <div>
                                <p className="text-[26px] font-bold text-[#1F2937] leading-none tracking-tight">
                                    {totalVisits}
                                </p>
                                <p className="text-[12px] font-medium text-[#9CA3AF] mt-1">Tổng lượt khám</p>
                            </div>
                        </div>

                        {/* KPI 2 */}
                        <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[116px]">
                            <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
                                    <Clock className="w-4.5 h-4.5 text-[#10B981]" strokeWidth={2.25} />
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold">
                                    <TrendingDown className="w-3 h-3" />
                                    -8%
                                </span>
                            </div>
                            <div>
                                <p className="text-[26px] font-bold text-[#1F2937] leading-none tracking-tight">
                                    {avgWaitMinutes} phút
                                </p>
                                <p className="text-[12px] font-medium text-[#9CA3AF] mt-1">Thời gian chờ TB</p>
                            </div>
                        </div>

                        {/* KPI 3 */}
                        <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[116px]">
                            <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] flex items-center justify-center">
                                    <CreditCard className="w-4.5 h-4.5 text-[#059669]" strokeWidth={2.25} />
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-bold">
                                    <TrendingUp className="w-3 h-3" />
                                    +2%
                                </span>
                            </div>
                            <div>
                                <p className="text-[26px] font-bold text-[#1F2937] leading-none tracking-tight">
                                    {paymentRate}%
                                </p>
                                <p className="text-[12px] font-medium text-[#9CA3AF] mt-1">Tỉ lệ thanh toán</p>
                            </div>
                        </div>

                        {/* KPI 4 */}
                        <div className="rounded-[16px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between h-[116px]">
                            <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] flex items-center justify-center">
                                    <ArrowUpRight className="w-4.5 h-4.5 text-[#F97316]" strokeWidth={2.25} />
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-bold">
                                    <TrendingUp className="w-3 h-3" />
                                    +5%
                                </span>
                            </div>
                            <div>
                                <p className="text-[26px] font-bold text-[#1F2937] leading-none tracking-tight">
                                    {walkInRate}%
                                </p>
                                <p className="text-[12px] font-medium text-[#9CA3AF] mt-1">Tỉ lệ vãng lai</p>
                            </div>
                        </div>
                    </div>

                    {/* Middle Section — 2 Cột */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Lượt đăng ký theo giờ (Biểu đồ cột) — 7 Cột */}
                        <div className="lg:col-span-7 rounded-[16px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[15px] font-bold text-[#1F2937]">Lượt đăng ký theo giờ</h2>
                                <div className="flex items-center gap-1 text-[12px] font-semibold text-[#6B7280] bg-[#F9FAFB] border border-[#E5E7EB] px-2.5 py-1 rounded-lg">
                                    <span>Hôm nay</span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            {/* Chart Bars */}
                            <div className="pt-6 pb-2 px-2">
                                <div className="h-[140px] flex items-end justify-between gap-3">
                                    {hourlyData.map((d) => {
                                        const heightPercent = Math.round((d.count / maxHourlyCount) * 100);
                                        return (
                                            <div key={d.hour} className="flex-1 flex flex-col items-center gap-2 group relative">
                                                {/* Tooltip */}
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-bold text-white bg-[#1F2937] px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                                                    {d.count} lượt
                                                </div>

                                                <div className="w-full bg-[#F3F4F6] rounded-t-lg h-[120px] flex items-end overflow-hidden">
                                                    <div
                                                        style={{ height: `${heightPercent}%` }}
                                                        className={cn(
                                                            'w-full rounded-t-lg transition-all duration-500',
                                                            d.isPeak ? 'bg-[#059669]' : 'bg-[#E5E7EB] group-hover:bg-[#CBD5E1]',
                                                        )}
                                                    />
                                                </div>
                                                <span className="text-[11px] font-medium text-[#9CA3AF] tabular-nums">
                                                    {d.hour}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Legend Footer */}
                            <div className="flex items-center gap-4 border-t border-[#F3F4F6] pt-3 mt-2">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#6B7280]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#059669]" />
                                    Giờ cao điểm hiện tại
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#9CA3AF]">
                                    <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
                                    Giờ khác
                                </div>
                            </div>
                        </div>

                        {/* Tải chuyên khoa — 5 Cột */}
                        <div className="lg:col-span-5 rounded-[16px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-[15px] font-bold text-[#1F2937]">Tải chuyên khoa</h2>
                                <span className="text-[11px] font-semibold text-[#9CA3AF]">Đang hoạt động</span>
                            </div>

                            <div className="space-y-3.5">
                                {specialtyLoads.map((item) => {
                                    const percent = Math.round((item.current / item.max) * 100);
                                    return (
                                        <div key={item.name} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-[12px]">
                                                <span className="font-semibold text-[#374151]">{item.name}</span>
                                                <span className="font-bold text-[#6B7280] tabular-nums">
                                                    {item.current}/{item.max}
                                                </span>
                                            </div>
                                            <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
                                                <div
                                                    style={{ width: `${percent}%` }}
                                                    className={cn('h-full rounded-full transition-all duration-500', item.color)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section — 2 Cột */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* Hiệu suất theo quầy — 7 Cột */}
                        <div className="lg:col-span-7 rounded-[16px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)]">
                            <h2 className="text-[15px] font-bold text-[#1F2937] mb-4">Hiệu suất theo quầy</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#F3F4F6] text-[11px] font-medium text-[#9CA3AF]">
                                            <th className="pb-2.5 font-medium">Quầy</th>
                                            <th className="pb-2.5 font-medium text-center">Đã đăng ký</th>
                                            <th className="pb-2.5 font-medium text-center">Thời gian TB</th>
                                            <th className="pb-2.5 font-medium text-right">Hiệu suất</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F9FAFB]">
                                        {counterPerformances.map((c) => (
                                            <tr key={c.name} className="hover:bg-[#FAFAFF] transition-colors">
                                                <td className="py-3 text-[13px] font-bold text-[#374151]">
                                                    {c.name}
                                                </td>
                                                <td className="py-3 text-[13px] font-bold text-[#1F2937] text-center tabular-nums">
                                                    {c.registered}
                                                </td>
                                                <td className="py-3 text-[12px] font-medium text-[#6B7280] text-center tabular-nums">
                                                    {c.avgTime}
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className={cn('inline-flex text-[11px] font-bold px-2.5 py-0.5 rounded-full border', c.statusColor)}>
                                                        {c.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Tỉ lệ loại bệnh nhân — 5 Cột */}
                        <div className="lg:col-span-5 rounded-[16px] border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_6px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                            <h2 className="text-[15px] font-bold text-[#1F2937] mb-4">Tỉ lệ loại bệnh nhân</h2>

                            <div className="space-y-4">
                                {patientTypes.map((type) => (
                                    <div key={type.label} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[12px]">
                                            <span className="font-semibold text-[#374151]">{type.label}</span>
                                            <span className="font-bold text-[#1F2937] tabular-nums">
                                                {type.count} <span className="text-[11px] text-[#9CA3AF] font-medium">({type.percentage}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
                                            <div
                                                style={{ width: `${type.percentage}%` }}
                                                className={cn('h-full rounded-full transition-all duration-500', type.color)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ReceptionPageShell>
    );
}
