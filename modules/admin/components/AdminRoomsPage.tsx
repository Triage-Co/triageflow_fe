'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    Loader2,
    AlertCircle,
    X,
    Filter,
    Home,
    Pencil,
    Trash2,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { HospitalRoom } from '../types/room.types';

/* ─── Specialty Mapping Dictionary ─────────────────────────────────────────── */

export const SPECIALTY_MAP: Record<string, { name: string; color: string; bg: string; border: string }> = {
    '67906e4a-2a6f-4760-a794-e17c24924c80': { name: 'Khoa Nội tổng quát', color: 'text-[#1E78FF]', bg: 'bg-[#E8F1FF]', border: 'border-[#D0E2FF]' },
    '344d49b9-e191-4a85-8bbd-09afe8315b70': { name: 'Khoa Ngoại tổng quát', color: 'text-[#8B7CF6]', bg: 'bg-[#F5F2FF]', border: 'border-[#E0DCFB]' },
    'f4825efc-8ba7-4db2-a994-94d3bcabc835': { name: 'Khoa Nhi', color: 'text-[#D81B60]', bg: 'bg-[#FCE4EC]', border: 'border-[#F8BBD0]' },
    'ac75f9ca-4079-4d65-bf0b-474334af3f68': { name: 'Khoa Tai Mũi Họng', color: 'text-[#00ACC1]', bg: 'bg-[#E0F7FA]', border: 'border-[#B2EBF2]' },
    '082650f9-be60-48c3-8039-f6d48ad11144': { name: 'Khoa Răng Hàm Mặt', color: 'text-[#43A047]', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]' },
};

const getSpecialtyDetails = (id: string) => {
    return SPECIALTY_MAP[id] || {
        name: `Chuyên khoa ${id.slice(0, 8)}`,
        color: 'text-neutral-500',
        bg: 'bg-neutral-50',
        border: 'border-neutral-200'
    };
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminRoomsPage() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const { rooms, isLoading, error, fetchRooms, createRoom, updateRoom, deleteRoom, clearError } = useRoomStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [specialtyFilter, setSpecialtyFilter] = useState('ALL');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Create Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState({
        room_name: '',
        specialty_id: '67906e4a-2a6f-4760-a794-e17c24924c80',
        custom_specialty_id: '',
    });

    // Edit Modal states
    const [editingRoom, setEditingRoom] = useState<HospitalRoom | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        room_name: '',
        specialty_id: '',
        custom_specialty_id: '',
    });

    // Delete Confirm states
    const [deletingRoom, setDeletingRoom] = useState<HospitalRoom | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        if (accessToken) {
            fetchRooms(accessToken);
        }
    }, [accessToken, fetchRooms]);

    /* ── Helpers ─────────────────────────────────────────────── */

    const openEditModal = (room: HospitalRoom) => {
        const isKnown = Object.keys(SPECIALTY_MAP).includes(room.specialty_id);
        setEditForm({
            room_name: room.room_name,
            specialty_id: isKnown ? room.specialty_id : 'CUSTOM',
            custom_specialty_id: isKnown ? '' : room.specialty_id,
        });
        setEditError(null);
        setEditingRoom(room);
    };

    const openDeleteModal = (room: HospitalRoom) => {
        setDeleteError(null);
        setDeletingRoom(room);
    };

    /* ── Handlers ────────────────────────────────────────────── */

    const handleCreateRoom = async () => {
        const specId = createForm.specialty_id === 'CUSTOM'
            ? createForm.custom_specialty_id.trim()
            : createForm.specialty_id;

        if (!createForm.room_name.trim() || !specId) {
            setCreateError('Vui lòng điền đầy đủ thông tin bắt buộc.');
            return;
        }

        setIsCreating(true);
        setCreateError(null);
        try {
            await createRoom({ room_name: createForm.room_name, specialty_id: specId }, accessToken || '');
            setIsCreateModalOpen(false);
            setCreateForm({ room_name: '', specialty_id: '67906e4a-2a6f-4760-a794-e17c24924c80', custom_specialty_id: '' });
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Tạo phòng khám thất bại.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateRoom = async () => {
        if (!editingRoom) return;

        const specId = editForm.specialty_id === 'CUSTOM'
            ? editForm.custom_specialty_id.trim()
            : editForm.specialty_id;

        if (!editForm.room_name.trim() || !specId) {
            setEditError('Vui lòng điền đầy đủ thông tin bắt buộc.');
            return;
        }

        setIsUpdating(true);
        setEditError(null);
        try {
            await updateRoom(editingRoom.room_id, { room_name: editForm.room_name, specialty_id: specId }, accessToken || '');
            setEditingRoom(null);
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'Cập nhật phòng khám thất bại.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeleteRoom = async () => {
        if (!deletingRoom) return;

        setIsDeleting(true);
        setDeleteError(null);
        try {
            await deleteRoom(deletingRoom.room_id, accessToken || '');
            setDeletingRoom(null);
            // Reset to page 1 if current page becomes empty after deletion
            const newTotal = filteredRooms.length - 1;
            const newTotalPages = Math.ceil(newTotal / ITEMS_PER_PAGE);
            if (currentPage > newTotalPages && newTotalPages > 0) {
                setCurrentPage(newTotalPages);
            }
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Xóa phòng khám thất bại.');
        } finally {
            setIsDeleting(false);
        }
    };

    /* ── Computed ─────────────────────────────────────────────── */

    const filteredRooms = rooms.filter((room) => {
        const matchesSearch = room.room_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            room.room_id.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSpecialty = specialtyFilter === 'ALL' || room.specialty_id === specialtyFilter;
        return matchesSearch && matchesSpecialty;
    });

    const totalPages = Math.ceil(filteredRooms.length / ITEMS_PER_PAGE);
    const paginatedRooms = filteredRooms.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    /* ── Render ──────────────────────────────────────────────── */

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">

                        {/* ── Title + Actions ── */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Quản lý phòng khám
                                </h1>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Tạo phòng mới
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
                                <span className="text-sm font-bold">Bộ lọc phòng</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase">Chuyên khoa</label>
                                    <select
                                        value={specialtyFilter}
                                        onChange={(e) => { setSpecialtyFilter(e.target.value); setCurrentPage(1); }}
                                        className="w-full text-xs text-[#2D2D2D] border border-neutral-200 rounded-xl px-3 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold"
                                    >
                                        <option value="ALL">Tất cả chuyên khoa</option>
                                        {Object.entries(SPECIALTY_MAP).map(([id, info]) => (
                                            <option key={id} value={id}>{info.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase">Tìm kiếm phòng</label>
                                    <div className="flex items-center gap-2 bg-white rounded-xl px-3.5 py-2 border border-neutral-200 text-xs">
                                        <Search className="w-4 h-4 shrink-0 text-[#ADADAD]" />
                                        <input
                                            type="text"
                                            placeholder="Nhập tên phòng hoặc Room ID..."
                                            value={searchQuery}
                                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                            className="bg-transparent flex-1 outline-none text-[#2D2D2D] placeholder-[#ADADAD] font-semibold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Table Content ── */}
                        <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden shadow-sm">
                            {isLoading && rooms.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                    <p className="text-[13px] text-[#7B7B7B] font-bold">Đang tải danh sách phòng khám...</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-neutral-50/80 border-b border-[#EBEBEB]">
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Tên phòng</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Chuyên khoa</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Mã Room ID</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Mã Physical Room</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {paginatedRooms.map((room, index) => {
                                            const specInfo = getSpecialtyDetails(room.specialty_id);
                                            return (
                                                <tr key={room.room_id || index} className="hover:bg-neutral-50/50 transition-colors group">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center shrink-0">
                                                                <Home className="w-4 h-4 text-[#8B7CF6]" />
                                                            </div>
                                                            <span className="text-[13px] font-bold text-[#2D2D2D]">{room.room_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={cn(
                                                            'inline-flex items-center text-[10px] font-bold px-3 py-1 rounded-full border',
                                                            specInfo.color, specInfo.bg, specInfo.border
                                                        )}>
                                                            {specInfo.name}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4 text-[12px] text-[#7B7B7B] font-mono">{room.room_id}</td>
                                                    <td className="px-5 py-4 text-[12px] text-neutral-400 font-medium">
                                                        {room.physical_room_id || 'Chưa liên kết bản đồ'}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => openEditModal(room)}
                                                                title="Chỉnh sửa phòng"
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-[#8B7CF6] hover:border-[#8B7CF6]/30 hover:bg-[#F5F2FF] transition cursor-pointer"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteModal(room)}
                                                                title="Xóa phòng"
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
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

                            {!isLoading && filteredRooms.length === 0 && (
                                <div className="flex items-center justify-center py-16">
                                    <p className="text-[13px] text-[#ADADAD] font-medium">Không tìm thấy phòng khám phù hợp.</p>
                                </div>
                            )}
                        </div>

                        {/* ── Pagination Controls ── */}
                        {filteredRooms.length > 0 && (
                            <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                                <p className="text-[12px] text-[#ADADAD] font-bold">
                                    Hiển thị {Math.min(filteredRooms.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredRooms.length, currentPage * ITEMS_PER_PAGE)} trong số {filteredRooms.length} phòng
                                </p>
                                {totalPages > 1 && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                        >
                                            Trước
                                        </button>
                                        {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                className={cn(
                                                    'w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg border transition cursor-pointer',
                                                    currentPage === p
                                                        ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                                                        : 'bg-white border-[#EBEBEB] text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6]'
                                                )}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

            {/* ════════════════════════════════════════════════════════ */}
            {/* ── Backdrops ────────────────────────────────────────── */}
            {/* ════════════════════════════════════════════════════════ */}
            {(isCreateModalOpen || !!editingRoom || !!deletingRoom) && (
                <div
                    className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] z-50"
                    onClick={() => {
                        setIsCreateModalOpen(false);
                        setEditingRoom(null);
                        setDeletingRoom(null);
                    }}
                />
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* ── Modal: Tạo phòng mới ─────────────────────────────── */}
            {/* ════════════════════════════════════════════════════════ */}
            {isCreateModalOpen && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-h-[90vh] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4 overflow-y-auto">
                    <div className="flex items-center justify-between shrink-0 pb-2 border-b border-neutral-100">
                        <h2 className="text-[18px] font-bold text-[#2D2D2D]">Tạo phòng khám mới</h2>
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

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Tên phòng *</label>
                            <input
                                type="text"
                                placeholder="Ví dụ: Phòng 105"
                                value={createForm.room_name}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, room_name: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA]/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Chuyên khoa phụ trách *</label>
                            <select
                                value={createForm.specialty_id}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, specialty_id: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                {Object.entries(SPECIALTY_MAP).map(([id, info]) => (
                                    <option key={id} value={id}>{info.name}</option>
                                ))}
                                <option value="CUSTOM">Khác (Nhập mã ID thủ công)...</option>
                            </select>
                        </div>
                        {createForm.specialty_id === 'CUSTOM' && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Mã Specialty ID *</label>
                                <input
                                    type="text"
                                    placeholder="Nhập mã UUID chuyên khoa"
                                    value={createForm.custom_specialty_id}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, custom_specialty_id: e.target.value }))}
                                    className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA]/50"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-2 pt-4 border-t border-neutral-100">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleCreateRoom}
                            disabled={isCreating}
                            className="flex-1 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Tạo phòng
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* ── Modal: Chỉnh sửa phòng ───────────────────────────── */}
            {/* ════════════════════════════════════════════════════════ */}
            {editingRoom && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-h-[90vh] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4 overflow-y-auto">
                    <div className="flex items-center justify-between shrink-0 pb-2 border-b border-neutral-100">
                        <div>
                            <h2 className="text-[18px] font-bold text-[#2D2D2D]">Chỉnh sửa phòng</h2>
                            <p className="text-[11px] text-[#ADADAD] font-medium mt-0.5">{editingRoom.room_id}</p>
                        </div>
                        <button onClick={() => setEditingRoom(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {editError && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{editError}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Tên phòng *</label>
                            <input
                                type="text"
                                value={editForm.room_name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, room_name: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA]/50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Chuyên khoa phụ trách *</label>
                            <select
                                value={editForm.specialty_id}
                                onChange={(e) => setEditForm(prev => ({ ...prev, specialty_id: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                {Object.entries(SPECIALTY_MAP).map(([id, info]) => (
                                    <option key={id} value={id}>{info.name}</option>
                                ))}
                                <option value="CUSTOM">Khác (Nhập mã ID thủ công)...</option>
                            </select>
                        </div>
                        {editForm.specialty_id === 'CUSTOM' && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Mã Specialty ID *</label>
                                <input
                                    type="text"
                                    placeholder="Nhập mã UUID chuyên khoa"
                                    value={editForm.custom_specialty_id}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, custom_specialty_id: e.target.value }))}
                                    className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA]/50"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-2 pt-4 border-t border-neutral-100">
                        <button
                            onClick={() => setEditingRoom(null)}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleUpdateRoom}
                            disabled={isUpdating}
                            className="flex-1 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* ── Dialog: Xác nhận xóa ─────────────────────────────── */}
            {/* ════════════════════════════════════════════════════════ */}
            {deletingRoom && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-[16px] font-bold text-[#2D2D2D]">Xác nhận xóa phòng</h2>
                            <p className="text-[13px] text-[#7B7B7B] mt-1 leading-relaxed">
                                Bạn có chắc chắn muốn xóa phòng{' '}
                                <span className="font-bold text-[#2D2D2D]">{deletingRoom.room_name}</span> không?
                                Hành động này không thể hoàn tác.
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
                            onClick={() => setDeletingRoom(null)}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleDeleteRoom}
                            disabled={isDeleting}
                            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Xóa phòng
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
