'use client';

import { useEffect, useState } from 'react';
import {
    Users,
    UserPlus,
    ListOrdered,
    CreditCard,
    AlertTriangle,
    Clock,
    Loader2,
    AlertCircle,
    Activity,
} from 'lucide-react';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import {
    getTodayDateString,
    mapBackendToQueuePatient,
} from '@/modules/reception/utils/receptionMapper';
import { buildStatsSummary } from '@/modules/reception/utils/receptionStats';
import type { ReceptionStatsSummary } from '@/modules/reception/types/reception.types';
import { ReceptionBackLink, ReceptionPageShell } from '@/modules/reception/components/ReceptionPageShell';

const STAT_CARDS: {
    key: keyof ReceptionStatsSummary;
    label: string;
    icon: typeof Users;
    color: string;
    bg: string;
}[] = [
    { key: 'totalQueue', label: 'Tổng hàng đợi', icon: ListOrdered, color: 'text-[#10B981]', bg: 'bg-[#D1FAE5]' },
    { key: 'waiting', label: 'Đang chờ khám', icon: Users, color: 'text-[#3B82F6]', bg: 'bg-[#DBEAFE]' },
    { key: 'inExam', label: 'Đang khám', icon: Activity, color: 'text-[#8B7CF6]', bg: 'bg-[#EDE9FE]' },
    { key: 'paymentPending', label: 'Chờ thanh toán', icon: CreditCard, color: 'text-[#F59E0B]', bg: 'bg-[#FEF3C7]' },
    { key: 'paid', label: 'Đã thanh toán', icon: CreditCard, color: 'text-[#059669]', bg: 'bg-[#D1FAE5]' },
    { key: 'bookings', label: 'Booking hôm nay', icon: UserPlus, color: 'text-[#10B981]', bg: 'bg-[#D1FAE5]' },
    { key: 'flows', label: 'Luồng khám (Flow)', icon: ListOrdered, color: 'text-[#6366F1]', bg: 'bg-[#E0E7FF]' },
    { key: 'transactions', label: 'Giao dịch', icon: CreditCard, color: 'text-[#0891B2]', bg: 'bg-[#CFFAFE]' },
    { key: 'emergency', label: 'Ca khẩn cấp', icon: AlertTriangle, color: 'text-[#EF4444]', bg: 'bg-[#FEE2E2]' },
    { key: 'avgWaitMinutes', label: 'Chờ TB (phút)', icon: Clock, color: 'text-[#8B7CF6]', bg: 'bg-[#F3E8FF]' },
];

export function ReceptionStatsView() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [summary, setSummary] = useState<ReceptionStatsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken) return;

        const load = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const today = getTodayDateString();

                const [queueRes, bookingRes, flowRes, txRes] = await Promise.all([
                    receptionService.getQueueByDate(today, accessToken),
                    receptionService.getBookings(accessToken).catch(() => ({ data: [] })),
                    receptionService.getFlows(accessToken).catch(() => ({ data: [] })),
                    receptionService.getTransactions(accessToken).catch(() => ({ data: [] })),
                ]);

                const queue = queueRes.map(mapBackendToQueuePatient);
                setSummary(
                    buildStatsSummary(
                        queue,
                        bookingRes.data?.length ?? 0,
                        flowRes.data?.length ?? 0,
                        txRes.data?.length ?? 0,
                    ),
                );
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải thống kê.');
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [accessToken]);

    return (
        <ReceptionPageShell maxWidth="max-w-5xl">
            <ReceptionBackLink />
            <h1 className="text-[20px] font-bold text-[#1F2937]">Thống kê hôm nay</h1>
            <p className="text-[12px] text-[#9CA3AF] mt-1 mb-6">
                Tổng hợp từ Queue, Booking, Flow và Transaction API.
            </p>

            {error && (
                <div className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center py-20 gap-3 text-neutral-400">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                    <p className="text-sm font-semibold">Đang tải thống kê...</p>
                </div>
            ) : summary ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
                        <div
                            key={key}
                            className="rounded-[12px] border border-[#EBEBEB] bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                        >
                            <div className={`w-8 h-8 rounded-[8px] ${bg} flex items-center justify-center mb-2`}>
                                <Icon className={`w-4 h-4 ${color}`} strokeWidth={2.25} />
                            </div>
                            <p className="text-[22px] font-bold text-[#1F2937] leading-none">
                                {summary[key]}
                            </p>
                            <p className="text-[10px] text-[#9CA3AF] font-semibold mt-1.5 leading-tight">{label}</p>
                        </div>
                    ))}
                </div>
            ) : null}
        </ReceptionPageShell>
    );
}
