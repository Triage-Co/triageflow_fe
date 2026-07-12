'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    UserPlus,
    Stethoscope,
    Shield,
    FlaskConical,
    Pill,
    CreditCard,
    UserCheck,
    ShieldCheck,
    Loader2,
    AlertCircle,
    Eye,
    Trash2,
    Filter,
    User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminStore } from '../store/adminStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { BanDuration } from '../types/admin.types';

/* ─── Config ────────────────────────────────────────────────────────────── */

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
    DOCTOR: { label: 'Bác sĩ', color: 'text-[#1E78FF]', bg: 'bg-[#E8F1FF]', border: 'border-[#D0E2FF]', icon: Stethoscope },
    NURSE: { label: 'Y tá', color: 'text-[#8B7CF6]', bg: 'bg-[#F5F2FF]', border: 'border-[#E0DCFB]', icon: Shield },
    RECEPTIONIST: { label: 'Lễ tân', color: 'text-[#00ACC1]', bg: 'bg-[#E0F7FA]', border: 'border-[#B2EBF2]', icon: UserCheck },
    LAB_STAFF: { label: 'Xét nghiệm', color: 'text-[#D81B60]', bg: 'bg-[#FCE4EC]', border: 'border-[#F8BBD0]', icon: FlaskConical },
    PHARMACY_STAFF: { label: 'Dược sĩ', color: 'text-[#43A047]', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', icon: Pill },
    CASHIER: { label: 'Thu ngân', color: 'text-[#FFB300]', bg: 'bg-[#FFF8E1]', border: 'border-[#FFE082]', icon: CreditCard },
    ADMIN: { label: 'Quản trị', color: 'text-[#E53935]', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', icon: ShieldCheck },
    USER: { label: 'Bệnh nhân', color: 'text-[#10B981]', bg: 'bg-[#E8F9EE]', border: 'border-[#C6F6D5]', icon: UserIcon },
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

export function AdminUsersPage() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const currentUser = useAuthStore((s) => s.user);
    const { accounts, isLoading, error, fetchAccounts, banAccount, unbanAccount, clearError } = useAdminStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        if (accessToken) {
            fetchAccounts(accessToken);
        }
    }, [accessToken, fetchAccounts]);

    const promptBanDuration = (): BanDuration | null => {
        const rawMinutes = window.prompt('Nhập thời gian khóa tài khoản (phút):', '150');
        if (rawMinutes === null) return null;

        const totalMinutes = Number(rawMinutes.trim());
        if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
            window.alert('Thời gian khóa phải là số phút lớn hơn 0.');
            return null;
        }

        const normalizedMinutes = Math.floor(totalMinutes);
        const hours = Math.floor(normalizedMinutes / 60);
        const minutes = normalizedMinutes % 60;
        return { hours, minutes };
    };

    const handleBan = async (id: string) => {
        if (!accessToken) return;
        const duration = promptBanDuration();
        if (!duration) return;

        setActionLoadingId(id);
        try {
            await banAccount(id, duration, accessToken);
        } catch {
            // Error managed by store
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleUnban = async (id: string) => {
        if (!accessToken) return;
        setActionLoadingId(id);
        try {
            await unbanAccount(id, accessToken);
        } catch {
            // Error managed by store
        } finally {
            setActionLoadingId(null);
        }
    };

    const filtered = accounts.filter((s) => {
        const name = s.profile?.user_name || s.user_name || '';
        const email = s.email || '';
        const matchesSearch =
            name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;

        let matchesStatus = true;
        if (statusFilter === 'ACTIVE') {
            matchesStatus = !s.isBanned;
        } else if (statusFilter === 'BANNED') {
            matchesStatus = s.isBanned;
        }

        return matchesSearch && matchesRole && matchesStatus;
    });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginatedAccounts = filtered.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── Title + Actions ── */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Quản lý người dùng
                                </h1>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => router.push('/admin/users/create')}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    Tạo người dùng
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2.5 bg-[#C6B9FF] hover:bg-[#b4a4fa] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm cursor-pointer">
                                    + Thêm bệnh án
                                </button>
                            </div>
                        </div>

                        {/* ── Error Alert ── */}
                        {error && (
                            <div className="flex items-center justify-between gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 mb-6">
                                <div className="flex items-center gap-2.5">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                    <span className="text-[13px] text-red-800 font-semibold">{error}</span>
                                </div>
                                <button
                                    onClick={clearError}
                                    className="text-[11px] font-bold text-red-800 hover:underline cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        )}

                        {/* ── Sắp xếp / Filter Panel ── */}
                        <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#EBEBEB] mb-6">
                            <div className="flex items-center gap-2 mb-4 text-[#2D2D2D]">
                                <Filter className="w-4 h-4 text-[#8B7CF6]" />
                                <span className="text-sm font-bold">Sắp xếp</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase">Vai trò</label>
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                        className="w-full text-xs text-[#2D2D2D] border border-neutral-200 rounded-xl px-3 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold"
                                    >
                                        <option value="ALL">Tất cả</option>
                                        <option value="DOCTOR">Bác sĩ</option>
                                        <option value="NURSE">Y tá / Điều dưỡng</option>
                                        <option value="RECEPTIONIST">Lễ tân</option>
                                        <option value="LAB_STAFF">Xét nghiệm</option>
                                        <option value="PHARMACY_STAFF">Dược sĩ</option>
                                        <option value="CASHIER">Thu ngân</option>
                                        <option value="ADMIN">Quản trị</option>
                                        <option value="USER">Bệnh nhân</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase">Trạng thái</label>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                        className="w-full text-xs text-[#2D2D2D] border border-neutral-200 rounded-xl px-3 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold"
                                    >
                                        <option value="ALL">Tất cả</option>
                                        <option value="ACTIVE">Hoạt động</option>
                                        <option value="BANNED">Đã khóa</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ── Search Bar ── */}
                        <div className="flex items-center gap-2 bg-[#F5F5F8] rounded-xl px-3.5 py-2.5 text-[12px] text-[#ADADAD] w-full sm:w-80 mb-6 border border-neutral-200/20">
                            <Search className="w-4 h-4 shrink-0 text-[#ADADAD]" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên hoặc email..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="bg-transparent flex-1 outline-none text-[#2D2D2D] placeholder-[#ADADAD] font-medium"
                            />
                        </div>

                        {/* ── Table ── */}
                        <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden shadow-sm">
                            {isLoading && accounts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                                    <p className="text-[13px] text-[#7B7B7B] font-bold">Đang tải danh sách người dùng...</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-neutral-50/80 border-b border-[#EBEBEB]">
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Họ và Tên</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Năm sinh</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Giới tính</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Vai trò</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Trạng thái</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {paginatedAccounts.map((staff, index) => {
                                            const accountId = staff.id || staff.account_id || staff.profile?.id || '';
                                            const displayName = staff.profile?.user_name || staff.user_name || staff.email.split('@')[0];
                                            const nameInitials = displayName.split(' ').slice(-2).map(n => n.charAt(0)).join('').toUpperCase() || '?';
                                            const roleCfg = ROLE_CONFIG[staff.role] ?? ROLE_CONFIG.ADMIN;
                                            const RoleIcon = roleCfg.icon;
                                            const isSelf = accountId === currentUser?.id;
                                            const canModify = !isSelf && staff.role !== 'ADMIN';

                                            const displayDobVal = staff.dob || staff.profile?.dob;
                                            const dobFormatted = displayDobVal ? formatDate(displayDobVal) : '15/03/1985';

                                            return (
                                                <tr key={accountId || staff.email || index} className="hover:bg-neutral-50/50 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center text-brand-500 font-bold text-[12px] shrink-0">
                                                                {nameInitials}
                                                            </div>
                                                            <div>
                                                                <span className="text-[13px] font-bold text-[#2D2D2D] block">{displayName}</span>
                                                                <span className="text-[11px] text-[#7B7B7B] font-medium block">{staff.email}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-[12px] text-[#2D2D2D] font-bold">{dobFormatted}</td>
                                                    <td className="px-5 py-4 text-[12px] text-[#2D2D2D] font-bold">
                                                        {displayGender(staff.gender || staff.profile?.gender)}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border',
                                                            roleCfg.color, roleCfg.bg, roleCfg.border
                                                        )}>
                                                            <RoleIcon className="w-3 h-3" />
                                                            {roleCfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md',
                                                            !staff.isBanned ? 'bg-[#E8F9EE] text-[#10B981]' : 'bg-[#FFEBEE] text-[#E53935]'
                                                        )}>
                                                            {!staff.isBanned ? 'Active' : 'Banned'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-end gap-2 text-neutral-400">
                                                            <button
                                                                onClick={() => {
                                                                    if (!accountId) return;
                                                                    router.push(`/admin/users/${accountId}`);
                                                                }}
                                                                disabled={!accountId}
                                                                className="p-1 hover:text-[#8B7CF6] transition-colors cursor-pointer"
                                                                title="Xem chi tiết"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            {canModify ? (
                                                                staff.isBanned ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (!accountId) return;
                                                                            handleUnban(accountId);
                                                                        }}
                                                                        disabled={!accountId || actionLoadingId === accountId}
                                                                        className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 cursor-pointer"
                                                                        title="Kích hoạt lại"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => {
                                                                            if (!accountId) return;
                                                                            handleBan(accountId);
                                                                        }}
                                                                        disabled={!accountId || actionLoadingId === accountId}
                                                                        className="p-1 text-red-500 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                                                                        title="Khóa tài khoản"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <span className="text-[11px] text-neutral-300 font-semibold select-none">Mặc định</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}

                            {!isLoading && filtered.length === 0 && (
                                <div className="flex items-center justify-center py-16">
                                    <p className="text-[13px] text-[#ADADAD] font-medium">Không tìm thấy nhân viên phù hợp.</p>
                                </div>
                            )}
                        </div>

                        {/* ── Pagination Controls ── */}
                        {filtered.length > 0 && (
                            <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                                <p className="text-[12px] text-[#ADADAD] font-bold">
                                    Hiển thị {Math.min(filtered.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filtered.length, currentPage * ITEMS_PER_PAGE)} trong số {filtered.length} người dùng
                                </p>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#7B7B7B] transition cursor-pointer"
                                        >
                                            Trước
                                        </button>
                                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                className={cn(
                                                    "w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg border transition cursor-pointer",
                                                    currentPage === p
                                                        ? "bg-[#8B7CF6] border-[#8B7CF6] text-white"
                                                        : "bg-white border-[#EBEBEB] text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6]"
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-[#7B7B7B] transition cursor-pointer"
                                        >
                                            Sau
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
