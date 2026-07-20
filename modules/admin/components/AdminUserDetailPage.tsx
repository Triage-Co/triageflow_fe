'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Stethoscope,
    Shield,
    FlaskConical,
    Pill,
    CreditCard,
    UserCheck,
    ShieldCheck,
    Loader2,
    User as UserIcon,
} from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { Account } from '../types/admin.types';
import { adminService } from '../services/adminService';

/* ─── Config ────────────────────────────────────────────────────────────── */

const ROLE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
    DOCTOR: { label: 'Bác sĩ', icon: Stethoscope },
    NURSE: { label: 'Y tá', icon: Shield },
    RECEPTIONIST: { label: 'Lễ tân', icon: UserCheck },
    LAB_STAFF: { label: 'Xét nghiệm', icon: FlaskConical },
    PHARMACY_STAFF: { label: 'Dược sĩ', icon: Pill },
    CASHIER: { label: 'Thu ngân', icon: CreditCard },
    ADMIN: { label: 'Quản trị', icon: ShieldCheck },
    USER: { label: 'Bệnh nhân', icon: UserIcon },
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${d}/${m}/${y}`;
    } catch {
        return dateStr;
    }
};

const displayGender = (genderVal?: string) => {
    if (!genderVal) return 'Khác';
    const g = genderVal.toUpperCase();
    if (g === 'MALE') return 'Nam';
    if (g === 'FEMALE') return 'Nữ';
    return 'Khác';
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminUserDetailPage() {
    const router = useRouter();
    const params = useParams();
    const rawId = params.id;
    const userId = Array.isArray(rawId) ? rawId[0] : rawId;

    const accessToken = useAuthStore((s) => s.accessToken);
    const { accounts, fetchAccounts } = useAdminStore();
    const [selectedUser, setSelectedUser] = useState<Account | null>(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);

    useEffect(() => {
        if (accessToken && accounts.length === 0) {
            fetchAccounts(accessToken);
        }
    }, [accessToken, accounts.length, fetchAccounts]);

    useEffect(() => {
        if (!accessToken || !userId) {
            return;
        }

        const fromList = accounts.find(
            (a) => a.id === userId || a.account_id === userId || a.profile?.id === userId
        );

        const fetchDetail = async () => {
            try {
                setIsFetchingDetail(true);
                const res = await adminService.getAccountById(userId, accessToken);
                if (res?.data) {
                    setSelectedUser(res.data);
                }
            } catch {
                // Fallback UI below will handle not-found/error state.
                setSelectedUser(fromList ?? null);
            } finally {
                setIsFetchingDetail(false);
            }
        };

        fetchDetail();
    }, [accessToken, userId, accounts]);

    if (isFetchingDetail) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
            </div>
        );
    }

    if (!selectedUser) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex items-center gap-3 mb-8">
                                <button
                                    onClick={() => router.push('/admin/users')}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Thông tin chi tiết
                                </h1>
                            </div>
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <p className="text-[14px] text-[#ADADAD] font-semibold">Không tìm thấy thông tin người dùng.</p>
                                <button
                                    onClick={() => router.push('/admin/users')}
                                    className="px-4 py-2 bg-[#8B7CF6] text-white rounded-xl text-xs font-bold hover:bg-[#7a6ae5] transition cursor-pointer"
                                >
                                    Quay lại danh sách
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const displayName = selectedUser.profile?.user_name || selectedUser.user_name || selectedUser.email.split('@')[0];
    const nameInitials = displayName.split(' ').slice(-2).map((n: string) => n.charAt(0)).join('').toUpperCase() || 'UN';
    const dobFormatted = (selectedUser.dob || selectedUser.profile?.dob)
        ? formatDate(selectedUser.dob || selectedUser.profile?.dob || '')
        : '15/3/1985';

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── Back + Title ── */}
                        <div className="flex items-center gap-3 mb-8">
                            <button
                                onClick={() => router.push('/admin/users')}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                Thông tin chi tiết
                            </h1>
                        </div>

                        {/* ── Detail Card ── */}
                        <div className="max-w-[540px] mx-auto bg-white rounded-3xl border border-[#EBEBEB] shadow-sm p-8">
                            {/* Avatar — no upload icon */}
                            <div className="flex flex-col items-center justify-center gap-2 mb-6">
                                <div className="w-20 h-20 rounded-full bg-[#C6B9FF]/40 text-[#8B7CF6] border-2 border-white flex items-center justify-center font-bold text-2xl select-none">
                                    {nameInitials}
                                </div>
                            </div>

                            {/* Fields */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-neutral-500 uppercase">Họ và Tên *</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            readOnly
                                            className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-neutral-500 uppercase">Số CCCD *</label>
                                        <input
                                            type="text"
                                            value={selectedUser.profile?.citizen_id || '0912345678'}
                                            readOnly
                                            className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-500 uppercase">Ngày Sinh *</label>
                                    <input
                                        type="text"
                                        value={dobFormatted}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-neutral-500 uppercase">Giới Tính *</label>
                                        <input
                                            type="text"
                                            value={displayGender(selectedUser.gender || selectedUser.profile?.gender)}
                                            readOnly
                                            className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-neutral-500 uppercase">Số Điện Thoại *</label>
                                        <input
                                            type="text"
                                            value={selectedUser.profile?.phone || '0912345678'}
                                            readOnly
                                            className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-500 uppercase">Email *</label>
                                    <input
                                        type="email"
                                        value={selectedUser.email}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-500 uppercase">Role *</label>
                                    <input
                                        type="text"
                                        value={ROLE_CONFIG[selectedUser.role]?.label || 'Quản trị viên'}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Action */}
                            <div className="mt-8 pt-6 border-t border-neutral-100">
                                <button
                                    onClick={() => router.push('/admin/users')}
                                    className="w-full py-3 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer text-center"
                                >
                                    Xác nhận
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
