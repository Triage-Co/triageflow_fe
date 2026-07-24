'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, CalendarDays, Clock } from 'lucide-react';
import { useStaffStore } from '../store/staffStore';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { shiftService } from '../services/shiftService';
import type { Shift } from '../types/shift.types';

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── Page Shell (module-level) ─────────────────────────────────────────── */

function PageShell({
    onBack,
    children,
}: {
    onBack: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="flex items-center gap-3 mb-8">
                            <button
                                onClick={onBack}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">Chi tiết ca trực</h1>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function AdminShiftDetailPage() {
    const router = useRouter();
    const params = useParams();
    const rawId = params.id;
    const shiftId = Array.isArray(rawId) ? rawId[0] : rawId;

    const accessToken = useAuthStore((s) => s.accessToken);
    const { staffs, fetchStaffs } = useStaffStore();
    const { rooms, fetchRooms } = useRoomStore();

    const [shift, setShift] = useState<Shift | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const goBack = () => router.push('/admin/shift');

    useEffect(() => {
        if (accessToken) {
            if (staffs.length === 0) fetchStaffs(accessToken);
            if (rooms.length === 0) fetchRooms(accessToken);
        }
    }, [accessToken, staffs.length, rooms.length, fetchStaffs, fetchRooms]);

    useEffect(() => {
        if (!accessToken || !shiftId) return;
        const load = async () => {
            try {
                setIsLoading(true);
                const res = await shiftService.getShiftById(shiftId, accessToken);
                setShift(res.data);
            } catch {
                setFetchError('Không thể tải thông tin ca trực.');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [accessToken, shiftId]);

    const isStaffsLoading = useStaffStore((s) => s.isLoading);

    const getStaffInfo = (staffId: string) => {
        if (!staffId) return undefined;
        return staffs.find(
            (s) =>
                s.staff_id === staffId ||
                (s as unknown as Record<string, unknown>).id === staffId ||
                (s as unknown as Record<string, unknown>).account_id === staffId ||
                s.account?.email === staffId ||
                s.account?.user_name === staffId
        );
    };

    const getStaffName = (staffId: string) => {
        const staff = getStaffInfo(staffId);
        if (staff?.full_name) return staff.full_name;
        if (isStaffsLoading) return 'Đang tải...';
        return 'Nhân viên trực';
    };

    const getRoomName = (roomId: string) => rooms.find((r) => r.room_id === roomId)?.room_name ?? roomId;

    if (isLoading) {
        return (
            <PageShell onBack={goBack}>
                <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                </div>
            </PageShell>
        );
    }

    if (fetchError || !shift) {
        return (
            <PageShell onBack={goBack}>
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <AlertCircle className="w-8 h-8 text-neutral-400" />
                    <p className="text-[14px] text-[#ADADAD] font-semibold">{fetchError ?? 'Không tìm thấy ca trực.'}</p>
                    <button
                        onClick={goBack}
                        className="px-4 py-2 bg-[#8B7CF6] text-white rounded-xl text-xs font-bold hover:bg-[#7a6ae5] transition cursor-pointer"
                    >
                        Quay lại danh sách
                    </button>
                </div>
            </PageShell>
        );
    }

    const fields: { label: string; value: string; mono?: boolean }[] = [
        { label: 'Mã ca trực', value: shift.shift_id, mono: true },
        { label: 'Nhân viên phụ trách', value: getStaffName(shift.staff_id) },
        { label: 'Phòng trực', value: getRoomName(shift.room_id) },
        { label: 'Ngày trực', value: formatDate(shift.date) },
        { label: 'Giờ bắt đầu', value: shift.start_time },
        { label: 'Giờ kết thúc', value: shift.end_time },
        { label: 'Ngày tạo', value: shift.createdAt ? formatDateTime(shift.createdAt) : 'N/A' },
        { label: 'Cập nhật lần cuối', value: shift.updatedAt ? formatDateTime(shift.updatedAt) : 'N/A' },
    ];

    return (
        <PageShell onBack={goBack}>
            <div className="max-w-[560px] mx-auto bg-white rounded-3xl border border-[#EBEBEB] shadow-sm p-8">
                {/* Header */}
                <div className="flex flex-col items-center justify-center gap-3 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#F5F2FF] border-2 border-white shadow-sm flex items-center justify-center">
                        <CalendarDays className="w-7 h-7 text-[#8B7CF6]" />
                    </div>
                    <div className="text-center">
                        <p className="text-[18px] font-bold text-[#2D2D2D]">{getStaffName(shift.staff_id)}</p>
                        <p className="text-[13px] text-[#7B7B7B] font-medium mt-0.5">{getRoomName(shift.room_id)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB]">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {formatDate(shift.date)}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <Clock className="w-3.5 h-3.5" />
                            {shift.start_time} – {shift.end_time}
                        </span>
                    </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-2 gap-4">
                    {fields.map(({ label, value, mono }) => (
                        <div
                            key={label}
                            className={label === 'Mã ca trực' ? 'col-span-2 space-y-1.5' : 'col-span-2 sm:col-span-1 space-y-1.5'}
                        >
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">{label}</label>
                            <input
                                type="text"
                                value={value}
                                readOnly
                                className={`w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none text-neutral-500 bg-[#F8F9FA] cursor-not-allowed ${mono ? 'font-mono' : 'font-semibold'}`}
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-100">
                    <button
                        onClick={goBack}
                        className="w-full py-3 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                    >
                        Quay lại danh sách ca trực
                    </button>
                </div>
            </div>
        </PageShell>
    );
}
