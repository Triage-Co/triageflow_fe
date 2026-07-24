'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Home,
    Loader2,
    AlertCircle,
    Plus,
    CalendarDays,
    Clock,
    Pencil,
    Trash2,
    UserCheck,
    X,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoomStore } from '../store/roomStore';
import { useShiftStore } from '../store/shiftStore';
import { useStaffStore } from '../store/staffStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { HospitalRoom, Specialty } from '../types/room.types';
import type { Shift } from '../types/shift.types';
import { roomService } from '../services/roomService';
import { isPastOrCompletedShift, validateShiftAssignment, filterEligibleStaffForRoom } from '../utils/shiftValidation';

/* ─── Role Badges Config ─────────────────────────────────────────────────── */

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    DOCTOR: { label: 'Bác sĩ', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    NURSE: { label: 'Y tá', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    RECEPTIONIST: { label: 'Lễ tân', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    LAB_STAFF: { label: 'Kỹ thuật viên XN', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100' },
    LAB_TECHNICIAN: { label: 'Kỹ thuật viên XN', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100' },
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

const getSpecialtyName = (room: HospitalRoom, specialties: Specialty[]): string => {
    if (room.specialty?.specialty_name) return room.specialty.specialty_name;
    const found = specialties.find((s) => s.specialty_id === room.specialty_id);
    if (found?.specialty_name) return found.specialty_name;
    if (room.specialty?.specialty_code) return room.specialty.specialty_code;
    if (found?.specialty_code) return found.specialty_code;
    if (room.specialty_id) return `ID: ${room.specialty_id.slice(0, 8)}…`;
    return 'Chưa xác định';
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminRoomDetailPage() {
    const router = useRouter();
    const params = useParams();
    const rawId = params.id;
    const roomId = Array.isArray(rawId) ? rawId[0] : rawId;

    const accessToken = useAuthStore((s) => s.accessToken);
    const { rooms, specialties, fetchRooms, fetchSpecialties } = useRoomStore();
    const { shifts, fetchShifts, createShift, updateShift, deleteShift } = useShiftStore();
    const { staffs, fetchStaffs } = useStaffStore();

    const [room, setRoom] = useState<HospitalRoom | null>(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);

    // Shift Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState({
        staff_id: '',
        date: '',
        start_time: '08:00',
        end_time: '17:00',
    });

    const [editingShift, setEditingShift] = useState<Shift | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        staff_id: '',
        date: '',
        start_time: '08:00',
        end_time: '17:00',
    });

    const [deletingShift, setDeletingShift] = useState<Shift | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (accessToken) {
            if (rooms.length === 0) fetchRooms(accessToken);
            if (specialties.length === 0) fetchSpecialties(accessToken);
            if (shifts.length === 0) fetchShifts(accessToken);
            if (staffs.length === 0) fetchStaffs(accessToken);
        }
    }, [accessToken, rooms.length, specialties.length, shifts.length, staffs.length, fetchRooms, fetchSpecialties, fetchShifts, fetchStaffs]);

    useEffect(() => {
        if (!accessToken || !roomId) return;
        const fromList = rooms.find((r) => r.room_id === roomId);

        const fetchDetail = async () => {
            try {
                setIsFetchingDetail(true);
                const res = await roomService.getRoomById(roomId, accessToken);
                if (res?.data) {
                    setRoom(res.data);
                }
            } catch {
                setRoom(fromList ?? null);
            } finally {
                setIsFetchingDetail(false);
            }
        };

        fetchDetail();
    }, [accessToken, roomId, rooms]);

    /* ── Lookup Helper ── */
    const getStaffInfo = (staffId: string) => {
        return staffs.find((s) => s.staff_id === staffId);
    };

    const getStaffSpecialtyName = (staffId: string) => {
        const staff = staffs.find((s) => s.staff_id === staffId);
        if (!staff || !staff.specialty_id) return 'Chưa phân loại';
        const found = specialties.find((s) => s.specialty_id === staff.specialty_id);
        return found?.specialty_name || found?.specialty_code || 'Chưa phân loại';
    };

    /* ── Handlers ── */
    const eligibleStaffs = filterEligibleStaffForRoom(staffs, room);

    const openCreateModal = () => {
        setCreateError(null);
        setCreateForm({
            staff_id: eligibleStaffs[0]?.staff_id || '',
            date: new Date().toISOString().split('T')[0],
            start_time: '08:00',
            end_time: '17:00',
        });
        setIsCreateModalOpen(true);
    };

    const handleCreateShift = async () => {
        if (!roomId || !createForm.staff_id || !createForm.date || !createForm.start_time || !createForm.end_time) {
            setCreateError('Vui lòng điền đầy đủ các thông tin ca trực.');
            return;
        }
        if (createForm.start_time >= createForm.end_time) {
            setCreateError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.');
            return;
        }

        const valErr = validateShiftAssignment({
            roomId,
            staffId: createForm.staff_id,
            date: createForm.date,
            rooms,
            staffs,
            specialties,
            shifts,
        });
        if (valErr) {
            setCreateError(valErr);
            return;
        }

        setIsCreating(true);
        setCreateError(null);
        try {
            await createShift(
                {
                    room_id: roomId,
                    staff_id: createForm.staff_id,
                    date: createForm.date,
                    start_time: createForm.start_time,
                    end_time: createForm.end_time,
                },
                accessToken || ''
            );
            setIsCreateModalOpen(false);
            if (accessToken) fetchShifts(accessToken);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Tạo ca trực thất bại.');
        } finally {
            setIsCreating(false);
        }
    };

    const openEditModal = (shift: Shift) => {
        setEditingShift(shift);
        setUpdateError(null);
        setEditForm({
            staff_id: shift.staff_id,
            date: shift.date ? shift.date.split('T')[0] : '',
            start_time: shift.start_time,
            end_time: shift.end_time,
        });
    };

    const handleUpdateShift = async () => {
        if (!editingShift || !accessToken || !roomId) return;
        if (!editForm.staff_id || !editForm.date || !editForm.start_time || !editForm.end_time) {
            setUpdateError('Vui lòng điền đầy đủ thông tin.');
            return;
        }
        if (editForm.start_time >= editForm.end_time) {
            setUpdateError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.');
            return;
        }

        const valErr = validateShiftAssignment({
            roomId,
            staffId: editForm.staff_id,
            date: editForm.date,
            excludeShiftId: editingShift.shift_id,
            rooms,
            staffs,
            specialties,
            shifts,
        });
        if (valErr) {
            setUpdateError(valErr);
            return;
        }

        setIsUpdating(true);
        setUpdateError(null);
        try {
            await updateShift(
                editingShift.shift_id,
                {
                    staff_id: editForm.staff_id,
                    date: editForm.date,
                    start_time: editForm.start_time,
                    end_time: editForm.end_time,
                },
                accessToken
            );
            setEditingShift(null);
            fetchShifts(accessToken);
        } catch (err) {
            setUpdateError(err instanceof Error ? err.message : 'Cập nhật ca trực thất bại.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteShift = async () => {
        if (!deletingShift || !accessToken) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await deleteShift(deletingShift.shift_id, accessToken);
            setDeletingShift(null);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Xóa ca trực thất bại.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isFetchingDetail) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
            </div>
        );
    }

    if (!room) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex items-center gap-3 mb-8">
                                <button
                                    onClick={() => router.push('/admin/rooms')}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Chi tiết phòng khám
                                </h1>
                            </div>
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <AlertCircle className="w-8 h-8 text-neutral-400" />
                                <p className="text-[14px] text-[#ADADAD] font-semibold">Không tìm thấy thông tin phòng khám.</p>
                                <button
                                    onClick={() => router.push('/admin/rooms')}
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

    const specName = room.specialty?.specialty_name || specialties.find((s) => s.specialty_id === room.specialty_id)?.specialty_name || 'N/A';
    const specCode = room.specialty?.specialty_code || specialties.find((s) => s.specialty_id === room.specialty_id)?.specialty_code || 'N/A';
    const roomShifts = shifts.filter((s) => s.room_id === room.room_id && !isPastOrCompletedShift(s));

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── Back + Title ── */}
                        <div className="flex items-center gap-3 mb-6">
                            <button
                                onClick={() => router.push('/admin/rooms')}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Chi tiết phòng khám & Lịch trực
                                </h1>
                                <p className="text-[13px] text-[#7B7B7B] font-medium mt-0.5">
                                    Quản lý thông tin và lịch phân công ca trực của nhân viên tại phòng
                                </p>
                            </div>
                        </div>

                        {/* ── Content Grid ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* ── Left Column: Room Info Card ── */}
                            <div className="lg:col-span-1 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm p-6 flex flex-col">
                                <div className="flex flex-col items-center justify-center gap-2 mb-6 pb-6 border-b border-neutral-100">
                                    <div className="w-16 h-16 rounded-2xl bg-[#F5F2FF] border-2 border-white flex items-center justify-center shadow-sm select-none">
                                        <Home className="w-8 h-8 text-[#8B7CF6]" />
                                    </div>
                                    <h2 className="text-[18px] font-bold text-[#2D2D2D] mt-1">{room.room_name}</h2>
                                    <span className="inline-flex items-center text-[10px] font-bold px-3 py-1 rounded-full border bg-[#F5F2FF] text-[#8B7CF6] border-[#E0DCFB]">
                                        {getSpecialtyName(room, specialties)}
                                    </span>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Tên phòng khám</label>
                                        <div className="text-xs font-bold text-[#2D2D2D] bg-[#F8F9FA] border border-neutral-100 rounded-xl px-3 py-2">
                                            {room.room_name}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Chuyên khoa</label>
                                        <div className="text-xs font-semibold text-neutral-600 bg-[#F8F9FA] border border-neutral-100 rounded-xl px-3 py-2">
                                            {specName} ({specCode})
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mã phòng (Room ID)</label>
                                        <div className="text-xs font-mono text-neutral-500 bg-[#F8F9FA] border border-neutral-100 rounded-xl px-3 py-2">
                                            {room.room_id}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Liên kết bản đồ</label>
                                        <div className="text-xs font-semibold text-neutral-500 bg-[#F8F9FA] border border-neutral-100 rounded-xl px-3 py-2">
                                            {room.physical_room_id || 'Chưa liên kết'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push('/admin/rooms')}
                                    className="w-full mt-6 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-[#2D2D2D] rounded-xl text-xs font-bold transition cursor-pointer text-center"
                                >
                                    Quay lại danh sách phòng
                                </button>
                            </div>

                            {/* ── Right Column: Shifts Management ── */}
                            <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EBEBEB] shadow-sm p-6 flex flex-col">
                                <div className="flex items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h2 className="text-[17px] font-bold text-[#2D2D2D]">Danh sách ca trực của phòng</h2>
                                        <p className="text-[12px] text-[#7B7B7B] font-medium mt-0.5">
                                            Tổng cộng {roomShifts.length} ca trực được phân công
                                        </p>
                                    </div>
                                    <button
                                        onClick={openCreateModal}
                                        className="flex items-center gap-2 px-3.5 py-2 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer shrink-0"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Thêm ca trực
                                    </button>
                                </div>

                                {/* Shift List Table */}
                                <div className="border border-[#EBEBEB] rounded-2xl overflow-hidden flex-1">
                                    {roomShifts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-16 gap-2">
                                            <CalendarDays className="w-8 h-8 text-neutral-300" />
                                            <p className="text-[13px] text-[#ADADAD] font-medium">Chưa có ca trực nào cho phòng này.</p>
                                            <button
                                                onClick={openCreateModal}
                                                className="mt-2 text-xs font-bold text-[#8B7CF6] hover:underline cursor-pointer"
                                            >
                                                + Thêm ca trực đầu tiên
                                            </button>
                                        </div>
                                    ) : (
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-neutral-50 border-b border-[#EBEBEB]">
                                                    <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[48px]">STT</th>
                                                    <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Nhân viên trực</th>
                                                    <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Chuyên khoa</th>
                                                    <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Ngày trực</th>
                                                    <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Giờ trực</th>
                                                    <th className="px-4 py-3 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right w-[100px]">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100">
                                                {roomShifts.map((shift, idx) => {
                                                    const staff = getStaffInfo(shift.staff_id);
                                                    const roleKey = (staff?.account?.role || 'NURSE').toUpperCase().replace(/^ROLE_/, '');
                                                    const roleCfg = ROLE_CONFIG[roleKey] || { label: roleKey, bg: 'bg-neutral-50', text: 'text-neutral-600', border: 'border-neutral-100' };

                                                    return (
                                                        <tr key={shift.shift_id} className="hover:bg-neutral-50/50 transition-colors group">
                                                            <td className="px-4 py-3.5 text-xs font-semibold text-[#7B7B7B]">
                                                                {idx + 1}
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-7 h-7 rounded-lg bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center text-[#8B7CF6] shrink-0">
                                                                        <UserCheck className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div>
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="text-xs font-bold text-[#2D2D2D]">
                                                                                {staff?.full_name || shift.staff_id}
                                                                            </span>
                                                                            <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border', roleCfg.bg, roleCfg.text, roleCfg.border)}>
                                                                                {roleCfg.label}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[10px] text-neutral-400 block font-mono">
                                                                            {staff?.account?.user_name || ''}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-1 rounded-full border bg-neutral-50 text-neutral-600 border-neutral-200">
                                                                    {getStaffSpecialtyName(shift.staff_id)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB]">
                                                                    <CalendarDays className="w-3 h-3" />
                                                                    {formatDate(shift.date)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <div className="flex items-center gap-1 text-xs font-semibold text-[#2D2D2D]">
                                                                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                                                    {shift.start_time} – {shift.end_time}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => openEditModal(shift)}
                                                                        title="Chỉnh sửa ca trực"
                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-[#8B7CF6] hover:border-[#8B7CF6]/30 hover:bg-[#F5F2FF] transition cursor-pointer"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setDeleteError(null); setDeletingShift(shift); }}
                                                                        title="Xóa ca trực"
                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
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
                        </div>

                    </div>
                </div>
            </div>

            {/* ── Backdrop ── */}
            {(isCreateModalOpen || !!editingShift || !!deletingShift) && (
                <div
                    className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] z-50"
                    onClick={() => { setIsCreateModalOpen(false); setEditingShift(null); setDeletingShift(null); }}
                />
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* ── Modal: Thêm ca trực ───────────────────────────── */}
            {/* ════════════════════════════════════════════════════ */}
            {isCreateModalOpen && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[90vh] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                        <div>
                            <h2 className="text-[17px] font-bold text-[#2D2D2D]">Thêm ca trực mới</h2>
                            <p className="text-[11px] text-[#ADADAD] font-medium mt-0.5">
                                Phân công nhân viên cho phòng: <span className="font-bold text-[#8B7CF6]">{room.room_name}</span>
                            </p>
                        </div>
                        <button onClick={() => setIsCreateModalOpen(false)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {createError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{createError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1 col-span-2">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Nhân viên trực *</label>
                            <select
                                value={createForm.staff_id}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, staff_id: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="">— Chọn nhân viên —</option>
                                {eligibleStaffs.map((st) => {
                                    const rKey = (st.account?.role || '').toUpperCase().replace(/^ROLE_/, '');
                                    const roleLabel = rKey === 'DOCTOR' ? 'Bác sĩ' : rKey === 'NURSE' ? 'Y tá' : rKey;
                                    const specName = getStaffSpecialtyName(st.staff_id);
                                    return (
                                        <option key={st.staff_id} value={st.staff_id}>
                                            {st.full_name} — {roleLabel} ({specName})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="space-y-1 col-span-2">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Ngày trực *</label>
                            <input
                                type="date"
                                value={createForm.date}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giờ bắt đầu *</label>
                            <input
                                type="time"
                                value={createForm.start_time}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, start_time: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giờ kết thúc *</label>
                            <input
                                type="time"
                                value={createForm.end_time}
                                onChange={(e) => setCreateForm((prev) => ({ ...prev, end_time: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-neutral-100 mt-1">
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
            {/* ── Modal: Chỉnh sửa ca trực ──────────────────────── */}
            {/* ════════════════════════════════════════════════════ */}
            {editingShift && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[90vh] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
                        <div>
                            <h2 className="text-[17px] font-bold text-[#2D2D2D]">Chỉnh sửa ca trực</h2>
                            <p className="text-[11px] text-[#ADADAD] font-medium mt-0.5">
                                Cập nhật thông tin ca trực cho phòng: <span className="font-bold text-[#8B7CF6]">{room.room_name}</span>
                            </p>
                        </div>
                        <button onClick={() => setEditingShift(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {updateError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{updateError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1 col-span-2">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Nhân viên trực *</label>
                            <select
                                value={editForm.staff_id}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, staff_id: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="">— Chọn nhân viên —</option>
                                {eligibleStaffs.map((st) => {
                                    const rKey = (st.account?.role || '').toUpperCase().replace(/^ROLE_/, '');
                                    const roleLabel = rKey === 'DOCTOR' ? 'Bác sĩ' : rKey === 'NURSE' ? 'Y tá' : rKey;
                                    const specName = getStaffSpecialtyName(st.staff_id);
                                    return (
                                        <option key={st.staff_id} value={st.staff_id}>
                                            {st.full_name} — {roleLabel} ({specName})
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="space-y-1 col-span-2">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Ngày trực *</label>
                            <input
                                type="date"
                                value={editForm.date}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giờ bắt đầu *</label>
                            <input
                                type="time"
                                value={editForm.start_time}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, start_time: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giờ kết thúc *</label>
                            <input
                                type="time"
                                value={editForm.end_time}
                                onChange={(e) => setEditForm((prev) => ({ ...prev, end_time: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-neutral-100 mt-1">
                        <button
                            onClick={() => setEditingShift(null)}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleUpdateShift}
                            disabled={isUpdating}
                            className="flex-1 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════ */}
            {/* ── Dialog: Xác nhận xóa ca trực ─────────────────── */}
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
                                Ca trực ngày <span className="font-bold text-[#2D2D2D]">{formatDate(deletingShift.date)}</span> ({deletingShift.start_time} – {deletingShift.end_time}) sẽ bị xóa vĩnh viễn khỏi phòng khám.
                            </p>
                        </div>
                    </div>

                    {deleteError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
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
