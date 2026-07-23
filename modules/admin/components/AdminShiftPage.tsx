'use client';

import { useState, useEffect } from 'react';
import {
    Plus,
    Loader2,
    AlertCircle,
    X,
    Filter,
    CalendarDays,
    Trash2,
    AlertTriangle,
    Eye,
    Clock,
    Home,
    UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShiftStore } from '../store/shiftStore';
import { useStaffStore } from '../store/staffStore';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { useRouter } from 'next/navigation';
import type { Shift, CreateShiftDto } from '../types/shift.types';

/* ─── Role Badges Config ─────────────────────────────────────────────────── */

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    DOCTOR: { label: 'Bác sĩ', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    NURSE: { label: 'Y tá', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    RECEPTIONIST: { label: 'Lễ tân', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    LAB_STAFF: { label: 'Kỹ thuật viên XN', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100' },
    PHARMACY_STAFF: { label: 'Dược sĩ', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    CASHIER: { label: 'Thu ngân', bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100' },
    ADMIN: { label: 'Quản trị viên', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
};

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const toDateKey = (dateValue: string): string => {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const toTimestamp = (dateValue: string): number => {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return 0;
    return date.getTime();
};

const getCompactPages = (totalPages: number): Array<number | 'ellipsis'> => {
    if (totalPages <= 6) {
        return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    return [1, 2, 'ellipsis', totalPages - 1, totalPages];
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminShiftPage() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);

    const { shifts, isLoading, error, fetchShifts, createShift, deleteShift, clearError } = useShiftStore();
    const { staffs, fetchStaffs } = useStaffStore();
    const { rooms, fetchRooms } = useRoomStore();

    const [roomFilter, setRoomFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Room Staff Detail Modal
    const [selectedRoomShift, setSelectedRoomShift] = useState<{
        room_id: string;
        date: string;
        start_time: string;
        end_time: string;
    } | null>(null);

    // Create Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState<CreateShiftDto>({
        staff_id: '',
        room_id: '',
        date: '',
        start_time: '08:00',
        end_time: '17:00',
    });

    // Delete Confirm
    const [deletingShift, setDeletingShift] = useState<Shift | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (accessToken) {
            fetchShifts(accessToken);
            fetchStaffs(accessToken);
            fetchRooms(accessToken);
        }
    }, [accessToken, fetchShifts, fetchStaffs, fetchRooms]);

    /* ── Lookup helpers ── */

    const getStaffName = (staffId: string) => {
        const staff = staffs.find((s) => s.staff_id === staffId);
        return staff?.full_name || staffId || '';
    };

    const getRoomName = (roomId: string) => {
        const room = rooms.find((r) => r.room_id === roomId);
        return room?.room_name || roomId || '';
    };

    const getStaffsForRoomShift = (roomId: string, dateStr: string) => {
        const shiftDateKey = toDateKey(dateStr);
        const matchingShifts = shifts.filter(
            (s) => s.room_id === roomId && toDateKey(s.date) === shiftDateKey
        );
        const staffIds = new Set(matchingShifts.map((s) => s.staff_id));
        return staffs.filter((st) => staffIds.has(st.staff_id));
    };

    /* ── Handlers ── */

    const openCreateModal = () => {
        setCreateError(null);
        setCreateForm({
            staff_id: staffs[0]?.staff_id || '',
            room_id: rooms[0]?.room_id || '',
            date: new Date().toISOString().split('T')[0],
            start_time: '08:00',
            end_time: '17:00',
        });
        setIsCreateModalOpen(true);
    };

    const handleCreateShift = async () => {
        if (!createForm.staff_id || !createForm.room_id || !createForm.date || !createForm.start_time || !createForm.end_time) {
            setCreateError('Vui lòng điền đầy đủ tất cả các trường thông tin.');
            return;
        }
        if (createForm.start_time >= createForm.end_time) {
            setCreateError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.');
            return;
        }
        setIsCreating(true);
        setCreateError(null);
        try {
            await createShift(createForm, accessToken || '');
            setIsCreateModalOpen(false);
            if (accessToken) await fetchShifts(accessToken);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Tạo ca trực thất bại.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteShift = async () => {
        if (!deletingShift) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await deleteShift(deletingShift.shift_id, accessToken || '');
            setDeletingShift(null);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Xóa ca trực thất bại.');
        } finally {
            setIsDeleting(false);
        }
    };

    /* ── Computed ── */

    const filteredShifts = shifts.filter((shift) => {
        const matchesRoom = roomFilter === 'ALL' || shift.room_id === roomFilter;

        const shiftDate = toDateKey(shift.date);
        const matchesDate = dateFilter === '' || shiftDate === dateFilter;

        return matchesRoom && matchesDate;
    });

    const sortedShifts = [...filteredShifts].sort((a, b) => {
        const roomA = String(getRoomName(a.room_id) || '').toLowerCase();
        const roomB = String(getRoomName(b.room_id) || '').toLowerCase();
        const byRoom = roomA.localeCompare(roomB, 'vi');

        if (byRoom !== 0) return byRoom;

        // Same room: show newer shifts first.
        return toTimestamp(b.date) - toTimestamp(a.date);
    });

    const totalPages = Math.ceil(sortedShifts.length / ITEMS_PER_PAGE);
    const paginatedShifts = sortedShifts.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    /* ── Render ── */

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* ── Title + Actions ── */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Quản lý ca trực
                                </h1>
                                <p className="text-[13px] text-[#7B7B7B] font-medium mt-1">
                                    Tạo và theo dõi lịch trực của nhân viên theo phòng khám
                                </p>
                            </div>
                            <button
                                onClick={openCreateModal}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
                            >
                                <Plus className="w-4 h-4" />
                                Tạo ca trực
                            </button>
                        </div>

                        {/* ── Error Alert ── */}
                        {error && (
                            <div className="flex items-center justify-between gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 mb-6">
                                <div className="flex items-center gap-2.5">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                    <span className="text-[13px] text-red-800 font-semibold">{error}</span>
                                </div>
                                <button onClick={clearError} className="text-[11px] font-bold text-red-800 hover:underline cursor-pointer">
                                    Đóng
                                </button>
                            </div>
                        )}

                        {/* ── Filter Panel ── */}
                        <div className="bg-[#F8F9FA] rounded-2xl p-5 border border-[#EBEBEB] mb-6">
                            <div className="flex items-center gap-2 mb-4 text-[#2D2D2D]">
                                <Filter className="w-4 h-4 text-[#8B7CF6]" />
                                <span className="text-sm font-bold">Bộ lọc ca trực</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase">Lọc theo phòng trực</label>
                                    <select
                                        value={roomFilter}
                                        onChange={(e) => { setRoomFilter(e.target.value); setCurrentPage(1); }}
                                        className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                                    >
                                        <option value="ALL">Tất cả phòng</option>
                                        {rooms.map((room) => (
                                            <option key={room.room_id} value={room.room_id}>
                                                {room.room_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase">Lọc theo ngày</label>
                                    <input
                                        type="date"
                                        value={dateFilter}
                                        onChange={(e) => { setDateFilter(e.target.value); setCurrentPage(1); }}
                                        className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                                    />
                                </div>
                            </div>
                            {(dateFilter || roomFilter !== 'ALL') && (
                                <button
                                    onClick={() => {
                                        setDateFilter('');
                                        setRoomFilter('ALL');
                                        setCurrentPage(1);
                                    }}
                                    className="mt-3 text-[11px] font-bold text-[#8B7CF6] hover:underline cursor-pointer"
                                >
                                    Xoá bộ lọc
                                </button>
                            )}
                        </div>

                        {/* ── Table ── */}
                        <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden shadow-sm">
                            {isLoading && shifts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                    <p className="text-[13px] text-[#7B7B7B] font-bold">Đang tải danh sách ca trực...</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-neutral-50/80 border-b border-[#EBEBEB]">
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[64px]">STT</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Phòng trực</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Ngày trực</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Ca làm việc</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right w-[120px]">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {paginatedShifts.map((shift, index) => (
                                            <tr key={shift.shift_id} className="hover:bg-neutral-50/50 transition-colors group">
                                                <td className="px-5 py-4 text-[13px] font-semibold text-[#7B7B7B]">
                                                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <button
                                                        onClick={() => setSelectedRoomShift({
                                                            room_id: shift.room_id,
                                                            date: shift.date,
                                                            start_time: shift.start_time,
                                                            end_time: shift.end_time,
                                                        })}
                                                        className="flex items-center gap-2 group/btn cursor-pointer text-left"
                                                    >
                                                        <div className="w-8 h-8 rounded-xl bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center shrink-0 group-hover/btn:bg-[#8B7CF6] transition-colors">
                                                            <Home className="w-4 h-4 text-[#8B7CF6] group-hover/btn:text-white transition-colors" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[13px] font-bold text-[#2D2D2D] group-hover/btn:text-[#8B7CF6] transition-colors block">
                                                                {getRoomName(shift.room_id)}
                                                            </span>
                                                            <span className="text-[10px] text-[#8B7CF6] font-semibold opacity-0 group-hover/btn:opacity-100 transition-opacity">
                                                                Xem danh sách nhân viên →
                                                            </span>
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="inline-flex items-center text-[12px] font-bold px-2.5 py-1 rounded-lg bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB]">
                                                        {formatDate(shift.date)}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2D2D2D]">
                                                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                                        {shift.start_time} – {shift.end_time}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => setSelectedRoomShift({
                                                                room_id: shift.room_id,
                                                                date: shift.date,
                                                                start_time: shift.start_time,
                                                                end_time: shift.end_time,
                                                            })}
                                                            title="Xem danh sách nhân viên trực"
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-[#8B7CF6] hover:border-[#8B7CF6]/30 hover:bg-[#F5F2FF] transition cursor-pointer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setDeleteError(null); setDeletingShift(shift); }}
                                                            title="Xóa ca trực"
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {!isLoading && filteredShifts.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-16 gap-2">
                                    <CalendarDays className="w-8 h-8 text-neutral-300" />
                                    <p className="text-[13px] text-[#ADADAD] font-medium">Không có ca trực nào phù hợp.</p>
                                </div>
                            )}
                        </div>

                        {/* ── Pagination ── */}
                        {filteredShifts.length > 0 && (
                            <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                                <p className="text-[12px] text-[#ADADAD] font-bold">
                                    Hiển thị {Math.min(filteredShifts.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} – {Math.min(filteredShifts.length, currentPage * ITEMS_PER_PAGE)} trong số {filteredShifts.length} ca trực
                                </p>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                        >
                                            Trước
                                        </button>
                                        {getCompactPages(totalPages).map((page, idx) => (
                                            page === 'ellipsis' ? (
                                                <span key={`ellipsis-${idx}`} className="px-1 text-sm font-bold text-[#ADADAD] select-none">...</span>
                                            ) : (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={cn(
                                                        'w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg border transition cursor-pointer',
                                                        currentPage === page
                                                            ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                                                            : 'bg-white border-[#EBEBEB] text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6]'
                                                    )}
                                                >
                                                    {page}
                                                </button>
                                            )
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
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
            </div>

            {/* ── Backdrop ── */}
            {(isCreateModalOpen || !!deletingShift || !!selectedRoomShift) && (
                <div
                    className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] z-50"
                    onClick={() => { setIsCreateModalOpen(false); setDeletingShift(null); setSelectedRoomShift(null); }}
                />
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* ── Modal: Danh sách nhân viên trực phòng ─────────── */}
            {/* ════════════════════════════════════════════════════ */}
            {selectedRoomShift && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] max-h-[90vh] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center text-[#8B7CF6]">
                                <Home className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-[18px] font-bold text-[#2D2D2D]">
                                    {getRoomName(selectedRoomShift.room_id)}
                                </h2>
                                <p className="text-[12px] text-[#7B7B7B] font-semibold mt-0.5">
                                    Ngày trực: <span className="text-[#8B7CF6] font-bold">{formatDate(selectedRoomShift.date)}</span> (
                                    {selectedRoomShift.start_time} – {selectedRoomShift.end_time})
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setSelectedRoomShift(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Staff List */}
                    <div className="space-y-3 my-1">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                            Nhân viên phân công trực phòng ({getStaffsForRoomShift(selectedRoomShift.room_id, selectedRoomShift.date).length})
                        </span>

                        {getStaffsForRoomShift(selectedRoomShift.room_id, selectedRoomShift.date).length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 gap-2 bg-[#F8F9FA] rounded-2xl border border-dashed border-neutral-200">
                                <UserCheck className="w-7 h-7 text-neutral-300" />
                                <p className="text-xs text-neutral-400 font-semibold">Chưa tìm thấy thông tin nhân viên phân công.</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                                {getStaffsForRoomShift(selectedRoomShift.room_id, selectedRoomShift.date).map((staff) => {
                                    const roleKey = (staff.account?.role || 'NURSE').toUpperCase().replace(/^ROLE_/, '');
                                    const roleCfg = ROLE_CONFIG[roleKey] || { label: roleKey, bg: 'bg-neutral-50', text: 'text-neutral-600', border: 'border-neutral-100' };

                                    return (
                                        <div
                                            key={staff.staff_id}
                                            className="flex items-center justify-between p-3.5 bg-[#F8F9FA] hover:bg-[#F5F2FF]/60 rounded-2xl border border-[#EBEBEB] transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center text-[#8B7CF6] shrink-0">
                                                    <UserCheck className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-bold text-[#2D2D2D]">{staff.full_name}</span>
                                                        <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full border', roleCfg.bg, roleCfg.text, roleCfg.border)}>
                                                            {roleCfg.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[11px] text-[#7B7B7B] font-medium mt-1">
                                                        <span>Email: {staff.account?.email || 'N/A'}</span>
                                                        {staff.account?.phone && <span>· SĐT: {staff.account.phone}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer Action */}
                    <div className="pt-3 border-t border-neutral-100 flex justify-end">
                        <button
                            onClick={() => setSelectedRoomShift(null)}
                            className="px-5 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                            Đóng
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* ── Modal: Tạo ca trực ────────────────────────────── */}
            {/* ════════════════════════════════════════════════════ */}
            {isCreateModalOpen && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-h-[90vh] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4 overflow-y-auto">
                    <div className="flex items-center justify-between shrink-0 pb-2 border-b border-neutral-100">
                        <div>
                            <h2 className="text-[18px] font-bold text-[#2D2D2D]">Tạo ca trực mới</h2>
                            <p className="text-[11px] text-[#ADADAD] font-medium mt-0.5">Phân công nhân viên trực tại phòng khám</p>
                        </div>
                        <button onClick={() => setIsCreateModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {createError && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{createError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Nhân viên trực *</label>
                            <select
                                value={createForm.staff_id}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, staff_id: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="">— Chọn nhân viên —</option>
                                {staffs.map((staff) => (
                                    <option key={staff.staff_id} value={staff.staff_id}>
                                        {staff.full_name} ({staff.account?.role || ''})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5 col-span-2">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Phòng trực *</label>
                            <select
                                value={createForm.room_id}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, room_id: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="">— Chọn phòng khám —</option>
                                {rooms.map((room) => (
                                    <option key={room.room_id} value={room.room_id}>
                                        {room.room_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1.5 col-span-2">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Ngày trực *</label>
                            <input
                                type="date"
                                value={createForm.date}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giờ bắt đầu *</label>
                            <input
                                type="time"
                                value={createForm.start_time}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, start_time: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giờ kết thúc *</label>
                            <input
                                type="time"
                                value={createForm.end_time}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, end_time: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>
                    </div>

                    {/* Preview */}
                    {createForm.staff_id && createForm.room_id && createForm.date && (
                        <div className="bg-[#F5F2FF] rounded-xl p-3.5 border border-[#E0DCFB] text-[12px] text-[#5B4ED6] font-semibold space-y-1">
                            <p className="font-bold text-[#2D2D2D] mb-1.5">Xem trước thông tin ca trực</p>
                            <p>👤 {getStaffName(createForm.staff_id)}</p>
                            <p>🏥 {getRoomName(createForm.room_id)}</p>
                            <p>📅 {formatDate(createForm.date)}</p>
                            <p>🕐 {createForm.start_time} – {createForm.end_time}</p>
                        </div>
                    )}

                    <div className="flex gap-3 mt-2 pt-4 border-t border-neutral-100 shrink-0">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleCreateShift}
                            disabled={isCreating}
                            className="flex-1 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Tạo ca trực
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* ── Dialog: Xác nhận xóa ─────────────────────────── */}
            {/* ════════════════════════════════════════════════════ */}
            {deletingShift && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-[16px] font-bold text-[#2D2D2D]">Xác nhận xóa ca trực</h2>
                            <p className="text-[13px] text-[#7B7B7B] mt-1.5 leading-relaxed">
                                Ca trực ngày <span className="font-bold text-[#2D2D2D]">{formatDate(deletingShift.date)}</span>{' '}
                                ({deletingShift.start_time} – {deletingShift.end_time}) của{' '}
                                <span className="font-bold text-[#2D2D2D]">{getStaffName(deletingShift.staff_id)}</span> sẽ bị xóa vĩnh viễn.
                            </p>
                        </div>
                    </div>

                    {deleteError && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{deleteError}</span>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={() => setDeletingShift(null)}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleDeleteShift}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Xóa ca trực
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
