'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Loader2,
    AlertCircle,
    Eye,
    Trash2,
    Clock,
    ShieldOff,
    X,
    User as UserIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdminStore } from '../store/adminStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { BanDuration } from '../types/admin.types';
import { getCompactPages } from '../utils/pagination';

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const getAccountDisplayName = (account: { profile?: { user_name?: string } | null; user_name?: string; email?: string }) =>
    (account.profile?.user_name || account.user_name || account.email?.split('@')[0] || '').trim();

const displayGender = (genderVal?: string) => {
    if (!genderVal) return '—';
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
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BANNED'>('ALL');
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7;

    // Ban Modal states
    const [banTargetId, setBanTargetId] = useState<string | null>(null);
    const [banMinutes, setBanMinutes] = useState<string>('150');
    const [banPreset, setBanPreset] = useState<string>('CUSTOM');
    const [isBanning, setIsBanning] = useState(false);
    const [banError, setBanError] = useState<string | null>(null);

    const BAN_PRESETS = [
        { label: '30 phút', value: '30' },
        { label: '1 giờ', value: '60' },
        { label: '3 giờ', value: '180' },
        { label: '1 ngày', value: '1440' },
        { label: '7 ngày', value: '10080' },
        { label: '30 ngày', value: '43200' },
    ];

    useEffect(() => {
        if (accessToken) {
            void fetchAccounts(accessToken);
        }
    }, [accessToken, fetchAccounts]);

    const openBanModal = (id: string) => {
        setBanTargetId(id);
        setBanPreset('150');
        setBanMinutes('150');
        setBanError(null);
    };

    const closeBanModal = () => {
        setBanTargetId(null);
        setBanError(null);
    };

    const handleBan = async () => {
        if (!accessToken || !banTargetId) return;

        const totalMinutes = Number(banMinutes.trim());
        if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
            setBanError('Thời gian khóa phải là số phút lớn hơn 0.');
            return;
        }

        const normalizedMinutes = Math.floor(totalMinutes);
        const hours = Math.floor(normalizedMinutes / 60);
        const minutes = normalizedMinutes % 60;
        const duration: BanDuration = { hours, minutes };

        setIsBanning(true);
        setBanError(null);
        try {
            await banAccount(banTargetId, duration, accessToken);
            closeBanModal();
        } catch (err) {
            setBanError(err instanceof Error ? err.message : 'Khóa tài khoản thất bại.');
        } finally {
            setIsBanning(false);
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

    const filtered = accounts
        .filter((s) => {
            const name = getAccountDisplayName(s);
            const email = s.email || '';
            const phone = s.profile?.phone || '';
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch =
                !q ||
                name.toLowerCase().includes(q) ||
                email.toLowerCase().includes(q) ||
                phone.toLowerCase().includes(q);

            let matchesStatus = true;
            if (statusFilter === 'ACTIVE') {
                matchesStatus = !s.isBanned;
            } else if (statusFilter === 'BANNED') {
                matchesStatus = s.isBanned;
            }

            return matchesSearch && matchesStatus;
        })
        .toSorted((a, b) => {
            return getAccountDisplayName(a).localeCompare(getAccountDisplayName(b), 'vi', {
                sensitivity: 'base',
            });
        });

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedAccounts = filtered.slice(
        (safePage - 1) * ITEMS_PER_PAGE,
        safePage * ITEMS_PER_PAGE
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-transparent pt-6 pb-5">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] rounded-bl-[48px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 min-h-0 overflow-y-auto p-6">
                        {/* ── Title ── */}
                        <div className="mb-6">
                            <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                Quản lý người dùng
                            </h1>
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

                        {/* ── Toolbar: Search & Filters ── */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            {/* Search Bar */}
                            <div className="flex items-center gap-2.5 bg-[#F5F5F8] rounded-xl px-3.5 py-2.5 text-[12.5px] w-full sm:w-80 border border-neutral-200/60 shadow-xs focus-within:border-[#8B7CF6] focus-within:bg-white transition-all">
                                <Search className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên, email hoặc SĐT..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="bg-transparent flex-1 outline-none text-[#1F2937] placeholder-[#9CA3AF] font-medium"
                                />
                            </div>

                            {/* Inline Filters */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                <div className={cn(
                                    "flex items-center gap-2 bg-[#F5F5F8] border rounded-xl px-3.5 py-2 text-[12.5px] transition-all shadow-xs",
                                    statusFilter !== 'ALL'
                                        ? "border-[#8B7CF6] bg-[#8B7CF6]/5"
                                        : "border-neutral-200/60 hover:border-neutral-300 focus-within:border-[#8B7CF6] focus-within:bg-white"
                                )}>
                                    <span className="text-[11.5px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">Trạng thái:</span>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => { setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'BANNED'); setCurrentPage(1); }}
                                        className="bg-transparent font-bold text-[#2D2D2D] outline-none cursor-pointer pr-1"
                                    >
                                        <option value="ALL">Tất cả</option>
                                        <option value="ACTIVE">Đang hoạt động</option>
                                        <option value="BANNED">Đã khóa</option>
                                    </select>
                                </div>

                                {(statusFilter !== 'ALL' || searchQuery) && (
                                    <button
                                        onClick={() => {
                                            setStatusFilter('ALL');
                                            setSearchQuery('');
                                            setCurrentPage(1);
                                        }}
                                        className="text-[11.5px] font-bold text-[#8B7CF6] hover:underline cursor-pointer px-2 py-1"
                                    >
                                        Xoá lọc
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Table ── */}
                        <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden shadow-sm">
                            {isLoading && accounts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                    <p className="text-[13px] text-[#7B7B7B] font-bold">Đang tải danh sách người dùng...</p>
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="flex items-center justify-center py-16">
                                    <p className="text-[13px] text-[#ADADAD] font-medium">Không tìm thấy người dùng phù hợp.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-neutral-50/80 border-b border-[#EBEBEB]">
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[64px]">STT</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Họ và Tên</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[160px]">Số điện thoại</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[120px]">Giới tính</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[150px]">Trạng thái</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right w-[100px]">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {paginatedAccounts.map((staff, index) => {
                                            const accountId = staff.id || staff.account_id || staff.profile?.id || '';
                                            const displayName = getAccountDisplayName(staff) || '—';
                                            const nameInitials = displayName.split(' ').slice(-2).map(n => n.charAt(0)).join('').toUpperCase() || '?';
                                            const isSelf = accountId === currentUser?.id;
                                            const canModify = !isSelf && staff.role !== 'ADMIN';
                                            const phoneVal = staff.profile?.phone || '—';

                                            return (
                                                <tr key={accountId || staff.email || index} className="hover:bg-neutral-50/50 transition-colors">
                                                    <td className="px-5 py-4 text-[13px] font-semibold text-[#7B7B7B]">
                                                        {(safePage - 1) * ITEMS_PER_PAGE + index + 1}
                                                    </td>
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
                                                    <td className="px-5 py-4 text-[12px] text-[#2D2D2D] font-bold">
                                                        {phoneVal}
                                                    </td>
                                                    <td className="px-5 py-4 text-[12px] text-[#2D2D2D] font-bold">
                                                        {displayGender(staff.gender || staff.profile?.gender)}
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-md border whitespace-nowrap',
                                                            !staff.isBanned
                                                                ? 'bg-[#E8F9EE] text-[#10B981] border-[#C6F6D5]'
                                                                : 'bg-[#FFEBEE] text-[#E53935] border-[#FFCDD2]'
                                                        )}>
                                                            {!staff.isBanned ? 'Đang hoạt động' : 'Đã khóa'}
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
                                                                            void handleUnban(accountId);
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
                                                                            openBanModal(accountId);
                                                                        }}
                                                                        disabled={!accountId}
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
                        </div>

                    </div>

                    {/* ── Fixed Bottom Pagination Controls ── */}
                    {filtered.length > 0 && (
                        <div className="px-6 py-4 border-t border-neutral-100 bg-white flex items-center justify-between shrink-0">
                            <p className="text-[12px] text-[#ADADAD] font-bold">
                                Hiển thị {Math.min(filtered.length, (safePage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filtered.length, safePage * ITEMS_PER_PAGE)} trong số {filtered.length} người dùng
                            </p>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={safePage === 1}
                                        className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Trước
                                    </button>
                                    {getCompactPages(safePage, totalPages).map((page, idx) => (
                                        page === 'ellipsis' ? (
                                            <span key={`ellipsis-${idx}`} className="px-1 text-sm font-bold text-[#ADADAD] select-none">...</span>
                                        ) : (
                                            <button
                                                key={page}
                                                onClick={() => setCurrentPage(page)}
                                                className={cn(
                                                    "w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg border transition cursor-pointer",
                                                    safePage === page
                                                        ? "bg-[#8B7CF6] border-[#8B7CF6] text-white"
                                                        : "bg-white border-[#EBEBEB] text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6]"
                                                )}
                                            >
                                                {page}
                                            </button>
                                        )
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={safePage === totalPages}
                                        className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Sau
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ══ Backdrop ══ */}
            {!!banTargetId && (
                <div
                    className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] z-50"
                    onClick={closeBanModal}
                />
            )}

            {/* ══ Ban Modal ══ */}
            {!!banTargetId && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                <ShieldOff className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-[16px] font-bold text-[#2D2D2D]">Khóa tài khoản</h2>
                                <p className="text-[11px] text-[#ADADAD] font-medium mt-0.5">Chọn thời hạn khóa bên dưới</p>
                            </div>
                        </div>
                        <button onClick={closeBanModal} className="text-neutral-400 hover:text-neutral-600 cursor-pointer mt-0.5">
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>

                    {/* Presets */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-neutral-400 uppercase">Chọn nhanh</p>
                        <div className="grid grid-cols-3 gap-2">
                            {BAN_PRESETS.map((p) => (
                                <button
                                    key={p.value}
                                    onClick={() => { setBanPreset(p.value); setBanMinutes(p.value); }}
                                    className={cn(
                                        'py-2 rounded-xl border text-[12px] font-bold transition cursor-pointer',
                                        banPreset === p.value
                                            ? 'bg-red-500 border-red-500 text-white shadow-sm'
                                            : 'bg-white border-neutral-200 text-neutral-600 hover:border-red-200 hover:text-red-500 hover:bg-red-50'
                                    )}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom input */}
                    <div className="space-y-1.5">
                        <p className="text-[11px] font-bold text-neutral-400 uppercase">Hoặc nhập số phút tùy chỉnh</p>
                        <div className="flex items-center gap-2 bg-[#F8F9FA] rounded-xl px-3.5 py-2.5 border border-neutral-200 focus-within:border-red-300 transition">
                            <Clock className="w-4 h-4 text-neutral-400 shrink-0" />
                            <input
                                type="number"
                                min={1}
                                placeholder="Ví dụ: 150"
                                value={banMinutes}
                                onChange={(e) => { setBanMinutes(e.target.value); setBanPreset('CUSTOM'); }}
                                className="bg-transparent flex-1 outline-none text-[13px] font-bold text-[#2D2D2D] placeholder-neutral-300"
                            />
                            <span className="text-[11px] font-bold text-neutral-400">phút</span>
                        </div>
                        {banMinutes && Number(banMinutes) > 0 && (
                            <p className="text-[11px] text-[#8B7CF6] font-semibold pl-1">
                                ≈ {Math.floor(Number(banMinutes) / 60) > 0 ? `${Math.floor(Number(banMinutes) / 60)} giờ ` : ''}{Number(banMinutes) % 60 > 0 ? `${Number(banMinutes) % 60} phút` : ''}
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {banError && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{banError}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1 border-t border-neutral-100">
                        <button
                            onClick={closeBanModal}
                            disabled={isBanning}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleBan}
                            disabled={isBanning || !banMinutes}
                            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                            {isBanning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Xác nhận khóa
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

