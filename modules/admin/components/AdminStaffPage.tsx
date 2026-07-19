'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    Plus,
    Loader2,
    AlertCircle,
    X,
    Filter,
    UserCheck,
    Pencil,
    Eye,
    Mail,
    Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStaffStore } from '../store/staffStore';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { Staff, CreateStaffDto, UpdateStaffDto } from '../types/staff.types';

/* ─── Role Badges Configuration ───────────────────────────────────────────── */

const ROLE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
    DOCTOR: { label: 'Bác sĩ', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    NURSE: { label: 'Điều dưỡng', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    RECEPTIONIST: { label: 'Lễ tân', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    LAB_STAFF: { label: 'Kỹ thuật viên XN', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    PHARMACY_STAFF: { label: 'Dược sĩ', bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100' },
    CASHIER: { label: 'Thu ngân', bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100' },
    ADMIN: { label: 'Quản trị viên', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
};

const getRoleBadge = (role: string) => {
    const config = ROLE_CONFIG[role.toUpperCase()] || { label: role, bg: 'bg-neutral-50', text: 'text-neutral-600', border: 'border-neutral-100' };
    return (
        <span className={cn('inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full border', config.bg, config.text, config.border)}>
            {config.label}
        </span>
    );
};

const getCompactPages = (totalPages: number): Array<number | 'ellipsis'> => {
    if (totalPages <= 6) {
        return Array.from({ length: totalPages }, (_, idx) => idx + 1);
    }

    return [1, 2, 'ellipsis', totalPages - 1, totalPages];
};

const normalizeRole = (role: string): CreateStaffDto['role'] => {
    const value = role.trim().toUpperCase() as CreateStaffDto['role'];
    return value;
};

const normalizeGender = (gender: string): CreateStaffDto['gender'] => {
    const value = gender.trim().toUpperCase() as CreateStaffDto['gender'];
    return value;
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminStaffPage() {
    const router = useRouter();
    const accessToken = useAuthStore((s) => s.accessToken);
    const {
        staffs,
        isLoading,
        error,
        fetchStaffs,
        createStaff,
        updateStaff,
        clearError,
    } = useStaffStore();
    const { specialties, fetchSpecialties } = useRoomStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Create Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState({
        user_name: '',
        password: '',
        full_name: '',
        email: '',
        role: 'DOCTOR',
        gender: 'MALE',
        phone: '',
        license_number: '',
        experience_years: '',
        specialty_id: '',
    });

    // Edit Modal states
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        user_name: '',
        password: '',
        full_name: '',
        email: '',
        role: 'DOCTOR',
        gender: 'MALE',
        phone: '',
        license_number: '',
        experience_years: '',
        specialty_id: '',
    });

    useEffect(() => {
        if (accessToken) {
            fetchStaffs(accessToken);
            fetchSpecialties(accessToken);
        }
    }, [accessToken, fetchStaffs, fetchSpecialties]);

    /* ── Helpers ─────────────────────────────────────────────── */

    const openEditModal = (staff: Staff) => {
        setEditForm({
            user_name: staff.account.user_name || '',
            password: '',
            full_name: staff.full_name,
            email: staff.account.email || '',
            role: staff.account.role || 'DOCTOR',
            gender: staff.account.gender || 'MALE',
            phone: staff.account.phone || '',
            license_number: staff.license_number || '',
            experience_years: staff.experience_years?.toString() || '',
            specialty_id: staff.specialty_id || (specialties[0]?.specialty_id || ''),
        });
        setEditError(null);
        setEditingStaff(staff);
    };

    /* ── Handlers ────────────────────────────────────────────── */

    const handleCreateStaff = async () => {
        if (!createForm.user_name.trim() ||
            !createForm.password.trim() ||
            !createForm.full_name.trim() ||
            !createForm.email.trim() ||
            !createForm.phone.trim()) {
            setCreateError('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
            return;
        }

        if (normalizeRole(createForm.role) === 'DOCTOR' && !createForm.specialty_id.trim()) {
            setCreateError('Vui lòng chọn chuyên khoa cho bác sĩ.');
            return;
        }

        setIsCreating(true);
        setCreateError(null);

        const data: CreateStaffDto = {
            user_name: createForm.user_name.trim(),
            password: createForm.password,
            full_name: createForm.full_name.trim(),
            email: createForm.email.trim(),
            role: normalizeRole(createForm.role),
            gender: normalizeGender(createForm.gender),
            phone: createForm.phone.trim(),
        };

        if (data.role === 'DOCTOR' || data.role === 'NURSE') {
            if (createForm.license_number.trim()) {
                data.license_number = createForm.license_number.trim();
            }
            if (createForm.experience_years.trim()) {
                data.experience_years = createForm.experience_years.trim();
            }
        }

        if (data.role === 'DOCTOR' && createForm.specialty_id.trim()) {
            data.specialty_id = createForm.specialty_id.trim();
        }

        try {
            await createStaff(data, accessToken || '');
            setIsCreateModalOpen(false);
            setCreateForm({
                user_name: '',
                password: '',
                full_name: '',
                email: '',
                role: 'DOCTOR',
                gender: 'MALE',
                phone: '',
                license_number: '',
                experience_years: '',
                specialty_id: specialties[0]?.specialty_id || '',
            });
            if (accessToken) {
                await fetchStaffs(accessToken);
            }
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Tạo tài khoản nhân viên thất bại.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUpdateStaff = async () => {
        if (!editingStaff) return;

        if (!editForm.user_name.trim() ||
            !editForm.full_name.trim() ||
            !editForm.email.trim() ||
            !editForm.phone.trim()) {
            setEditError('Vui lòng điền đầy đủ các thông tin bắt buộc (*).');
            return;
        }

        setIsUpdating(true);
        setEditError(null);

        const data: UpdateStaffDto = {
            user_name: editForm.user_name.trim(),
            full_name: editForm.full_name.trim(),
            email: editForm.email.trim(),
            role: normalizeRole(editForm.role),
            gender: normalizeGender(editForm.gender),
            phone: editForm.phone.trim(),
        };

        if (editForm.password.trim()) {
            data.password = editForm.password;
        }

        if (data.role === 'DOCTOR' || data.role === 'NURSE') {
            data.license_number = editForm.license_number.trim() || undefined;
            data.experience_years = editForm.experience_years.trim() || undefined;
        } else {
            data.license_number = undefined;
            data.experience_years = undefined;
        }

        if (data.role === 'DOCTOR') {
            data.specialty_id = editForm.specialty_id.trim() || undefined;
        } else {
            data.specialty_id = undefined;
        }

        try {
            await updateStaff(editingStaff.staff_id, data, accessToken || '');
            setEditingStaff(null);
            if (accessToken) {
                await fetchStaffs(accessToken);
            }
        } catch (err) {
            setEditError(err instanceof Error ? err.message : 'Cập nhật thông tin nhân viên thất bại.');
        } finally {
            setIsUpdating(false);
        }
    };

    /* ── Computed ─────────────────────────────────────────────── */

    const filteredStaffs = staffs.filter((staff) => {
        const searchLower = searchQuery.toLowerCase();
        const fullName = String(staff.full_name || '').toLowerCase();
        const email = String(staff.account?.email || '').toLowerCase();
        const userName = String(staff.account?.user_name || '').toLowerCase();
        const matchesSearch =
            fullName.includes(searchLower) ||
            email.includes(searchLower) ||
            userName.includes(searchLower);
        const matchesRole = roleFilter === 'ALL' || staff.account?.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const sortedStaffs = [...filteredStaffs].sort((a, b) =>
        String(a.full_name || '').localeCompare(String(b.full_name || ''), undefined, { sensitivity: 'base' })
    );

    const totalPages = Math.ceil(sortedStaffs.length / ITEMS_PER_PAGE);
    const paginatedStaffs = sortedStaffs.slice(
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
                                    Quản lý nhân viên
                                </h1>
                            </div>
                            <button
                                onClick={() => {
                                    setIsCreateModalOpen(true);
                                    setCreateForm({
                                        user_name: '',
                                        password: '',
                                        full_name: '',
                                        email: '',
                                        role: 'DOCTOR',
                                        gender: 'MALE',
                                        phone: '',
                                        license_number: '',
                                        experience_years: '',
                                        specialty_id: specialties[0]?.specialty_id || '',
                                    });
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm nhân viên
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
                                <span className="text-sm font-bold">Bộ lọc nhân viên</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase">Vai trò</label>
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                        className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                                    >
                                        <option value="ALL">Tất cả vai trò</option>
                                        <option value="DOCTOR">Bác sĩ</option>
                                        <option value="NURSE">Điều dưỡng</option>
                                        <option value="RECEPTIONIST">Lễ tân</option>
                                        <option value="LAB_STAFF">Kỹ thuật viên Xét nghiệm</option>
                                        <option value="PHARMACY_STAFF">Dược sĩ</option>
                                        <option value="CASHIER">Thu ngân</option>
                                        <option value="ADMIN">Quản trị viên</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase">Tìm kiếm</label>
                                    <div className="flex items-center gap-2 bg-white rounded-xl px-3.5 py-2 border border-neutral-200 text-xs">
                                        <Search className="w-4 h-4 shrink-0 text-[#ADADAD]" />
                                        <input
                                            type="text"
                                            placeholder="Tìm kiếm theo họ tên, email, tên tài khoản..."
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
                            {isLoading && staffs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                    <p className="text-[13px] text-[#7B7B7B] font-bold">Đang tải danh sách nhân viên...</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-neutral-50/80 border-b border-[#EBEBEB]">
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[80px]">STT</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Họ và tên</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Tên tài khoản</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Vai trò</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Số điện thoại / Email</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right w-[150px]">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {paginatedStaffs.map((staff, index) => (
                                            <tr key={staff.staff_id || index} className="hover:bg-neutral-50/50 transition-colors group">
                                                <td className="px-5 py-4 text-[13px] font-semibold text-[#7B7B7B]">
                                                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center shrink-0 overflow-hidden">
                                                            {staff.account?.avatar ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={staff.account.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <UserCheck className="w-4 h-4 text-[#8B7CF6]" />
                                                            )}
                                                        </div>
                                                        <span className="text-[13px] font-bold text-[#2D2D2D]">{staff.full_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4 text-[13px] text-[#7B7B7B] font-mono">
                                                    {staff.account?.user_name || 'N/A'}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {getRoleBadge(staff.account?.role || '')}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2D2D2D]">
                                                            <Phone className="w-3.5 h-3.5 text-neutral-400" />
                                                            {staff.account?.phone || 'N/A'}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[11px] text-[#7B7B7B] font-medium">
                                                            <Mail className="w-3.5 h-3.5 text-neutral-400" />
                                                            {staff.account?.email || 'N/A'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => router.push(`/admin/staff/${staff.staff_id}`)}
                                                            title="Xem chi tiết nhân viên"
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-[#8B7CF6] hover:border-[#8B7CF6]/30 hover:bg-[#F5F2FF] transition cursor-pointer"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(staff)}
                                                            title="Chỉnh sửa nhân viên"
                                                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-[#8B7CF6] hover:border-[#8B7CF6]/30 hover:bg-[#F5F2FF] transition cursor-pointer"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}

                            {!isLoading && filteredStaffs.length === 0 && (
                                <div className="flex items-center justify-center py-16">
                                    <p className="text-[13px] text-[#ADADAD] font-medium">Không tìm thấy nhân viên phù hợp.</p>
                                </div>
                            )}
                        </div>

                        {/* ── Pagination Controls ── */}
                        {filteredStaffs.length > 0 && (
                            <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                                <p className="text-[12px] text-[#ADADAD] font-bold">
                                    Hiển thị {Math.min(filteredStaffs.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredStaffs.length, currentPage * ITEMS_PER_PAGE)} trong số {filteredStaffs.length} nhân viên
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
            {(isCreateModalOpen || !!editingStaff) && (
                <div
                    className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] z-50"
                    onClick={() => {
                        setIsCreateModalOpen(false);
                        setEditingStaff(null);
                    }}
                />
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* ── Modal: Thêm nhân viên mới ─────────────────────────── */}
            {/* ════════════════════════════════════════════════════════ */}
            {isCreateModalOpen && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] max-h-[90vh] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4 overflow-y-auto">
                    <div className="flex items-center justify-between shrink-0 pb-2 border-b border-neutral-100">
                        <h2 className="text-[18px] font-bold text-[#2D2D2D]">Thêm nhân viên mới</h2>
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
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Tên tài khoản *</label>
                            <input
                                type="text"
                                placeholder="Ví dụ: NguyenVanAn"
                                value={createForm.user_name}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, user_name: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Mật khẩu *</label>
                            <input
                                type="password"
                                placeholder="••••••"
                                value={createForm.password}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Họ và tên *</label>
                            <input
                                type="text"
                                placeholder="Ví dụ: Nguyễn Văn An"
                                value={createForm.full_name}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, full_name: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-bold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Email *</label>
                            <input
                                type="email"
                                placeholder="an.nguyen@example.com"
                                value={createForm.email}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Vai trò *</label>
                            <select
                                value={createForm.role}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, role: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="DOCTOR">Bác sĩ</option>
                                <option value="NURSE">Điều dưỡng</option>
                                <option value="RECEPTIONIST">Lễ tân</option>
                                <option value="LAB_STAFF">Kỹ thuật viên Xét nghiệm</option>
                                <option value="PHARMACY_STAFF">Dược sĩ</option>
                                <option value="CASHIER">Thu ngân</option>
                                <option value="ADMIN">Quản trị viên</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giới tính *</label>
                            <select
                                value={createForm.gender}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, gender: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Số điện thoại *</label>
                            <input
                                type="text"
                                placeholder="Ví dụ: 0912345678"
                                value={createForm.phone}
                                onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        {/* Additional fields for Doctors / Nurses */}
                        {(createForm.role === 'DOCTOR' || createForm.role === 'NURSE') && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Số chứng chỉ hành nghề</label>
                                <input
                                    type="text"
                                    placeholder="Ví dụ: VN-123456"
                                    value={createForm.license_number}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, license_number: e.target.value }))}
                                    className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                                />
                            </div>
                        )}

                        {(createForm.role === 'DOCTOR' || createForm.role === 'NURSE') && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Số năm kinh nghiệm</label>
                                <input
                                    type="number"
                                    placeholder="Ví dụ: 5"
                                    value={createForm.experience_years}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, experience_years: e.target.value }))}
                                    className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                                />
                            </div>
                        )}

                        {createForm.role === 'DOCTOR' && (
                            <div className="space-y-1.5 col-span-2">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Chuyên khoa phụ trách</label>
                                <select
                                    value={createForm.specialty_id}
                                    onChange={(e) => setCreateForm(prev => ({ ...prev, specialty_id: e.target.value }))}
                                    className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                                >
                                    {specialties.map((sp) => (
                                        <option key={sp.specialty_id} value={sp.specialty_id}>
                                            {sp.specialty_name || sp.specialty_code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-4 pt-4 border-t border-neutral-100 shrink-0">
                        <button
                            onClick={() => setIsCreateModalOpen(false)}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleCreateStaff}
                            disabled={isCreating}
                            className="flex-1 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Tạo tài khoản
                        </button>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* ── Modal: Chỉnh sửa nhân viên ───────────────────────── */}
            {/* ════════════════════════════════════════════════════════ */}
            {editingStaff && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] max-h-[90vh] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-4 overflow-y-auto">
                    <div className="flex items-center justify-between shrink-0 pb-2 border-b border-neutral-100">
                        <div>
                            <h2 className="text-[18px] font-bold text-[#2D2D2D]">Chỉnh sửa nhân viên</h2>
                            <p className="text-[11px] text-[#ADADAD] font-medium mt-0.5">{editingStaff.staff_id}</p>
                        </div>
                        <button onClick={() => setEditingStaff(null)} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {editError && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{editError}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Tên tài khoản *</label>
                            <input
                                type="text"
                                value={editForm.user_name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, user_name: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Mật khẩu (Nhập nếu muốn đổi)</label>
                            <input
                                type="password"
                                placeholder="••••••"
                                value={editForm.password}
                                onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Họ và tên *</label>
                            <input
                                type="text"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-bold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Email *</label>
                            <input
                                type="email"
                                value={editForm.email}
                                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Vai trò *</label>
                            <select
                                value={editForm.role}
                                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="DOCTOR">Bác sĩ</option>
                                <option value="NURSE">Điều dưỡng</option>
                                <option value="RECEPTIONIST">Lễ tân</option>
                                <option value="LAB_STAFF">Kỹ thuật viên Xét nghiệm</option>
                                <option value="PHARMACY_STAFF">Dược sĩ</option>
                                <option value="CASHIER">Thu ngân</option>
                                <option value="ADMIN">Quản trị viên</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giới tính *</label>
                            <select
                                value={editForm.gender}
                                onChange={(e) => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="MALE">Nam</option>
                                <option value="FEMALE">Nữ</option>
                                <option value="OTHER">Khác</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Số điện thoại *</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                            />
                        </div>

                        {/* Additional fields for Doctors / Nurses */}
                        {(editForm.role === 'DOCTOR' || editForm.role === 'NURSE') && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Số chứng chỉ hành nghề</label>
                                <input
                                    type="text"
                                    value={editForm.license_number}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, license_number: e.target.value }))}
                                    className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                                />
                            </div>
                        )}

                        {(editForm.role === 'DOCTOR' || editForm.role === 'NURSE') && (
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Số năm kinh nghiệm</label>
                                <input
                                    type="number"
                                    value={editForm.experience_years}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, experience_years: e.target.value }))}
                                    className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D]"
                                />
                            </div>
                        )}

                        {editForm.role === 'DOCTOR' && (
                            <div className="space-y-1.5 col-span-2">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Chuyên khoa phụ trách</label>
                                <select
                                    value={editForm.specialty_id}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, specialty_id: e.target.value }))}
                                    className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                                >
                                    {specialties.map((sp) => (
                                        <option key={sp.specialty_id} value={sp.specialty_id}>
                                            {sp.specialty_name || sp.specialty_code}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3 mt-4 pt-4 border-t border-neutral-100 shrink-0">
                        <button
                            onClick={() => setEditingStaff(null)}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleUpdateStaff}
                            disabled={isUpdating}
                            className="flex-1 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Lưu thay đổi
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
