'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search,
    UserPlus,
    Loader2,
    AlertCircle,
    X,
    Filter,
    UserCheck,
    Pencil,
    Trash2,
    Eye,
    Stethoscope,
    Shield,
    FlaskConical,
    Pill,
    ShieldCheck,
    CreditCard,
    Clock,
    ShieldOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStaffStore } from '../store/staffStore';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { Staff, CreateStaffDto, UpdateStaffDto } from '../types/staff.types';
import type { BanDuration } from '../types/admin.types';
import { getCompactPages } from '../utils/pagination';
import { validateStaffForm, validateStaffField, type StaffValidationInput } from '@/shared/utils/validators';

/* ─── Role Badges Configuration ────────────────────────────────────────────── */

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
    DOCTOR: { label: 'Bác sĩ', color: 'text-[#1E78FF]', bg: 'bg-[#E8F1FF]', border: 'border-[#D0E2FF]', icon: Stethoscope },
    NURSE: { label: 'Y tá / Điều dưỡng', color: 'text-[#8B7CF6]', bg: 'bg-[#F5F2FF]', border: 'border-[#E0DCFB]', icon: Shield },
    RECEPTIONIST: { label: 'Lễ tân', color: 'text-[#00ACC1]', bg: 'bg-[#E0F7FA]', border: 'border-[#B2EBF2]', icon: UserCheck },
    LAB_STAFF: { label: 'Kỹ thuật viên XN', color: 'text-[#D81B60]', bg: 'bg-[#FCE4EC]', border: 'border-[#F8BBD0]', icon: FlaskConical },
    LAB_TECHNICIAN: { label: 'Kỹ thuật viên XN', color: 'text-[#D81B60]', bg: 'bg-[#FCE4EC]', border: 'border-[#F8BBD0]', icon: FlaskConical },
    PHARMACY_STAFF: { label: 'Dược sĩ', color: 'text-[#43A047]', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', icon: Pill },
    PHARMACIST: { label: 'Dược sĩ', color: 'text-[#43A047]', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', icon: Pill },
    CASHIER: { label: 'Thu ngân', color: 'text-[#FB8C00]', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', icon: CreditCard },
    ADMIN: { label: 'Quản trị', color: 'text-[#E53935]', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', icon: ShieldCheck },
};

/** Thứ tự hiển thị theo role (không gồm USER/bệnh nhân). */
const ROLE_SORT_ORDER = [
    'ADMIN',
    'DOCTOR',
    'LAB_TECHNICIAN',
    'PHARMACIST',
    'NURSE',
    'RECEPTIONIST',
    'CASHIER',
] as const;

const displayGender = (genderVal?: string) => {
    if (!genderVal) return '—';
    const g = genderVal.toUpperCase();
    if (g === 'MALE') return 'Nam';
    if (g === 'FEMALE') return 'Nữ';
    return 'Khác';
};

const normalizeStaffRole = (role?: string) => {
    const raw = (role || '').toUpperCase().replace(/^ROLE_/, '');
    if (raw === 'LAB_STAFF') return 'LAB_TECHNICIAN';
    if (raw === 'PHARMACY_STAFF') return 'PHARMACIST';
    return raw;
};

const getRoleSortIndex = (role?: string) => {
    const idx = ROLE_SORT_ORDER.indexOf(normalizeStaffRole(role) as (typeof ROLE_SORT_ORDER)[number]);
    return idx === -1 ? ROLE_SORT_ORDER.length : idx;
};

const getStaffDisplayName = (staff: {
    full_name?: string;
    account?: { user_name?: string; email?: string } | null;
}) => (staff.full_name || staff.account?.user_name || staff.account?.email || '').trim();

const getRoleBadge = (role: string) => {
    const normalized = normalizeStaffRole(role);
    const config = ROLE_CONFIG[normalized] || {
        label: role || '—',
        color: 'text-neutral-600',
        bg: 'bg-neutral-50',
        border: 'border-neutral-100',
        icon: UserCheck,
    };
    const RoleIcon = config.icon;
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full border', config.color, config.bg, config.border)}>
            <RoleIcon className="w-3 h-3" />
            {config.label}
        </span>
    );
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
        banStaff,
        unbanStaff,
        clearError,
    } = useStaffStore();
    const { specialties, fetchSpecialties } = useRoomStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 7;

    // View Detail Modal state
    const [viewingStaff, setViewingStaff] = useState<Staff | null>(null);

    // Create Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string>>({});
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
    const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
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

    // Ban Modal states
    const [banTargetStaff, setBanTargetStaff] = useState<Staff | null>(null);
    const [banMinutes, setBanMinutes] = useState<string>('150');
    const [banPreset, setBanPreset] = useState<string>('CUSTOM');
    const [isBanning, setIsBanning] = useState(false);
    const [banError, setBanError] = useState<string | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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
            void fetchStaffs(accessToken);
            void fetchSpecialties(accessToken);
        }
    }, [accessToken, fetchStaffs, fetchSpecialties]);

    /* ── Helpers ─────────────────────────────────────────────── */

    const openCreateModal = () => {
        setCreateError(null);
        setCreateFieldErrors({});
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
        setIsCreateModalOpen(true);
    };

    const openEditModal = (staff: Staff) => {
        if (normalizeStaffRole(staff.account?.role) === 'ADMIN') return;
        setEditFieldErrors({});
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

    const openBanModal = (staff: Staff) => {
        if (normalizeStaffRole(staff.account?.role) === 'ADMIN') return;
        setBanTargetStaff(staff);
        setBanPreset('150');
        setBanMinutes('150');
        setBanError(null);
    };

    const closeBanModal = () => {
        setBanTargetStaff(null);
        setBanError(null);
    };

    const handleBlurCreate = (field: keyof StaffValidationInput) => {
        const err = validateStaffField(field, createForm[field], createForm, false);
        setCreateFieldErrors((prev) => ({ ...prev, [field]: err || '' }));
    };

    const handleBlurEdit = (field: keyof StaffValidationInput) => {
        const err = validateStaffField(
            field,
            editForm[field],
            { ...editForm, email: editingStaff?.account.email },
            true,
        );
        setEditFieldErrors((prev) => ({ ...prev, [field]: err || '' }));
    };

    /* ── Handlers ────────────────────────────────────────────── */

    const handleCreateStaff = async () => {
        const valRes = validateStaffForm({
            user_name: createForm.user_name,
            password: createForm.password,
            full_name: createForm.full_name,
            email: createForm.email,
            phone: createForm.phone,
            role: createForm.role,
            gender: createForm.gender,
            license_number: createForm.license_number,
            experience_years: createForm.experience_years,
            specialty_id: createForm.specialty_id,
        }, false);

        if (!valRes.isValid) {
            setCreateFieldErrors(valRes.fieldErrors);
            setCreateError(valRes.error);
            return;
        }

        setCreateFieldErrors({});
        setIsCreating(true);
        setCreateError(null);

        let sendRole = createForm.role;
        if (sendRole === 'PHARMACY_STAFF') sendRole = 'PHARMACIST';
        if (sendRole === 'LAB_STAFF') sendRole = 'LAB_TECHNICIAN';

        const data: CreateStaffDto = {
            user_name: createForm.user_name.trim(),
            password: createForm.password,
            full_name: createForm.full_name.trim(),
            email: createForm.email.trim(),
            role: sendRole,
            gender: createForm.gender,
            phone: createForm.phone.trim(),
        };

        if (createForm.role === 'DOCTOR' || createForm.role === 'NURSE') {
            if (createForm.license_number.trim()) {
                data.license_number = createForm.license_number.trim();
            }
            if (createForm.experience_years.trim()) {
                data.experience_years = Number(createForm.experience_years);
            }
        }

        if (createForm.role === 'DOCTOR' && createForm.specialty_id) {
            data.specialty_id = createForm.specialty_id;
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
        if (normalizeStaffRole(editingStaff.account?.role) === 'ADMIN') return;

        const valRes = validateStaffForm({
            user_name: editForm.user_name,
            password: editForm.password,
            full_name: editForm.full_name,
            email: editForm.email || editingStaff.account.email,
            phone: editForm.phone,
            role: editForm.role,
            gender: editForm.gender,
            license_number: editForm.license_number,
            experience_years: editForm.experience_years,
            specialty_id: editForm.specialty_id,
        }, true);

        if (!valRes.isValid) {
            setEditFieldErrors(valRes.fieldErrors);
            setEditError(valRes.error);
            return;
        }

        setEditFieldErrors({});
        setIsUpdating(true);
        setEditError(null);

        let sendRole = editForm.role;
        if (sendRole === 'PHARMACY_STAFF') sendRole = 'PHARMACIST';
        if (sendRole === 'LAB_STAFF') sendRole = 'LAB_TECHNICIAN';

        const data: UpdateStaffDto = {
            user_name: editForm.user_name.trim(),
            full_name: editForm.full_name.trim(),
            role: sendRole,
            gender: editForm.gender,
            phone: editForm.phone.trim(),
        };

        if (editForm.role === 'DOCTOR' || editForm.role === 'NURSE') {
            data.license_number = editForm.license_number.trim() || undefined;
            data.experience_years = editForm.experience_years.trim() ? Number(editForm.experience_years) : undefined;
        } else {
            data.license_number = undefined;
            data.experience_years = undefined;
        }

        if (editForm.role === 'DOCTOR') {
            data.specialty_id = editForm.specialty_id || undefined;
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

    const handleBanStaff = async () => {
        if (!banTargetStaff || !accessToken) return;
        if (normalizeStaffRole(banTargetStaff.account?.role) === 'ADMIN') return;

        const totalMinutes = Number(banMinutes.trim());
        if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
            setBanError('Thời gian khóa phải là số phút lớn hơn 0.');
            return;
        }

        const normalizedMinutes = Math.floor(totalMinutes);
        const duration: BanDuration = {
            hours: Math.floor(normalizedMinutes / 60),
            minutes: normalizedMinutes % 60,
        };

        setIsBanning(true);
        setBanError(null);
        try {
            await banStaff(banTargetStaff.staff_id, duration, accessToken);
            closeBanModal();
        } catch (err) {
            setBanError(err instanceof Error ? err.message : 'Khóa tài khoản thất bại.');
        } finally {
            setIsBanning(false);
        }
    };

    const handleUnbanStaff = async (staff: Staff) => {
        if (!accessToken) return;
        if (normalizeStaffRole(staff.account?.role) === 'ADMIN') return;

        setActionLoadingId(staff.staff_id);
        try {
            await unbanStaff(staff.staff_id, accessToken);
        } catch (err) {
            setBanError(err instanceof Error ? err.message : 'Mở khóa tài khoản thất bại.');
        } finally {
            setActionLoadingId(null);
        }
    };

    /* ── Computed ─────────────────────────────────────────────── */

    const filteredStaffs = staffs.filter((staff) => {
        const fullName = getStaffDisplayName(staff);
        const email = staff.account?.email || '';
        const userName = staff.account?.user_name || '';
        const q = searchQuery.toLowerCase();

        const matchesSearch =
            fullName.toLowerCase().includes(q) ||
            email.toLowerCase().includes(q) ||
            userName.toLowerCase().includes(q);

        const staffRole = normalizeStaffRole(staff.account?.role);
        // Bỏ USER khỏi màn nhân viên nếu lọt vào danh sách staff
        if (staffRole === 'USER') return false;

        const filterRole = normalizeStaffRole(roleFilter);
        const matchesRole = roleFilter === 'ALL' || staffRole === filterRole;

        let matchesStatus = true;
        if (statusFilter === 'ACTIVE') {
            matchesStatus = !staff.account?.is_banned;
        } else if (statusFilter === 'BANNED') {
            matchesStatus = Boolean(staff.account?.is_banned);
        }

        return matchesSearch && matchesRole && matchesStatus;
    });

    const sortedStaffs = filteredStaffs.toSorted((a, b) => {
        const roleDiff = getRoleSortIndex(a.account?.role) - getRoleSortIndex(b.account?.role);
        if (roleDiff !== 0) return roleDiff;
        return getStaffDisplayName(a).localeCompare(getStaffDisplayName(b), 'vi', {
            sensitivity: 'base',
        });
    });

    const totalPages = Math.ceil(sortedStaffs.length / ITEMS_PER_PAGE);
    const paginatedStaffs = sortedStaffs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    /* ── Render ──────────────────────────────────────────────── */

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
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
                                <UserPlus className="w-4 h-4" />
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

                        {/* ── Toolbar: Search & Filters ── */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            {/* Search Bar */}
                            <div className="flex items-center gap-2.5 bg-[#F5F5F8] rounded-xl px-3.5 py-2.5 text-[12.5px] w-full sm:w-80 border border-neutral-200/60 shadow-xs focus-within:border-[#8B7CF6] focus-within:bg-white transition-all">
                                <Search className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo tên hoặc email..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                    className="bg-transparent flex-1 outline-none text-[#1F2937] placeholder-[#9CA3AF] font-medium"
                                />
                            </div>

                            {/* Inline Filters */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Trạng thái filter */}
                                <div className={cn(
                                    "flex items-center gap-2 bg-[#F5F5F8] border rounded-xl px-3.5 py-2 text-[12.5px] transition-all shadow-xs",
                                    statusFilter !== 'ALL'
                                        ? "border-[#8B7CF6] bg-[#8B7CF6]/5"
                                        : "border-neutral-200/60 hover:border-neutral-300 focus-within:border-[#8B7CF6] focus-within:bg-white"
                                )}>
                                    <span className="text-[11.5px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">Trạng thái:</span>
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                        className="bg-transparent font-bold text-[#2D2D2D] outline-none cursor-pointer pr-1"
                                    >
                                        <option value="ALL">Tất cả</option>
                                        <option value="ACTIVE">Đang hoạt động</option>
                                        <option value="BANNED">Đã khóa</option>
                                    </select>
                                </div>

                                {/* Vai trò filter */}
                                <div className={cn(
                                    "flex items-center gap-2 bg-[#F5F5F8] border rounded-xl px-3.5 py-2 text-[12.5px] transition-all shadow-xs",
                                    roleFilter !== 'ALL'
                                        ? "border-[#8B7CF6] bg-[#8B7CF6]/5"
                                        : "border-neutral-200/60 hover:border-neutral-300 focus-within:border-[#8B7CF6] focus-within:bg-white"
                                )}>
                                    <span className="text-[11.5px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">Vai trò:</span>
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                        className="bg-transparent font-bold text-[#2D2D2D] outline-none cursor-pointer pr-1"
                                    >
                                        <option value="ALL">Tất cả vai trò</option>
                                        <option value="DOCTOR">Bác sĩ</option>
                                        <option value="NURSE">Y tá / Điều dưỡng</option>
                                        <option value="RECEPTIONIST">Lễ tân</option>
                                        <option value="LAB_TECHNICIAN">Kỹ thuật viên Xét nghiệm</option>
                                        <option value="PHARMACIST">Dược sĩ</option>
                                    </select>
                                </div>

                                {/* Xoá lọc */}
                                {(statusFilter !== 'ALL' || roleFilter !== 'ALL' || searchQuery) && (
                                    <button
                                        onClick={() => {
                                            setStatusFilter('ALL');
                                            setRoleFilter('ALL');
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
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Họ và Tên</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Giới tính</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Vai trò</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Trạng thái</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {paginatedStaffs.map((staff, index) => {
                                            const displayName = getStaffDisplayName(staff) || '—';
                                            const nameInitials = displayName.split(' ').slice(-2).map((n) => n.charAt(0)).join('').toUpperCase() || '?';
                                            const isBanned = Boolean(staff.account?.is_banned);
                                            const isAdmin = normalizeStaffRole(staff.account?.role) === 'ADMIN';
                                            return (
                                                <tr key={staff.staff_id || index} className="hover:bg-neutral-50/50 transition-colors">
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-brand-50 border-2 border-brand-100 flex items-center justify-center text-brand-500 font-bold text-[12px] shrink-0">
                                                                {nameInitials}
                                                            </div>
                                                            <div>
                                                                <span className="text-[13px] font-bold text-[#2D2D2D] block">{displayName}</span>
                                                                <span className="text-[11px] text-[#7B7B7B] font-medium block">{staff.account?.email || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-[12px] text-[#2D2D2D] font-bold">
                                                        {displayGender(staff.account?.gender)}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        {getRoleBadge(staff.account?.role || '')}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md',
                                                            !isBanned ? 'bg-[#E8F9EE] text-[#10B981]' : 'bg-[#FFEBEE] text-[#E53935]'
                                                        )}>
                                                            {!isBanned ? 'Đang hoạt động' : 'Đã khóa'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-end gap-2 text-neutral-400">
                                                            <button
                                                                onClick={() => setViewingStaff(staff)}
                                                                title="Xem chi tiết nhân viên"
                                                                className="p-1 hover:text-[#8B7CF6] transition-colors cursor-pointer"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            {isAdmin ? (
                                                                <span className="text-[11px] text-neutral-300 font-semibold select-none">Mặc định</span>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => openEditModal(staff)}
                                                                        title="Chỉnh sửa nhân viên"
                                                                        className="p-1 hover:text-[#8B7CF6] transition-colors cursor-pointer"
                                                                    >
                                                                        <Pencil className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    {isBanned ? (
                                                                        <button
                                                                            onClick={() => handleUnbanStaff(staff)}
                                                                            disabled={actionLoadingId === staff.staff_id}
                                                                            className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-50 cursor-pointer"
                                                                            title="Mở khóa tài khoản"
                                                                        >
                                                                            {actionLoadingId === staff.staff_id ? (
                                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                            ) : (
                                                                                <Trash2 className="w-3.5 h-3.5 text-emerald-600" />
                                                                            )}
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => openBanModal(staff)}
                                                                            className="p-1 text-red-500 hover:text-red-600 cursor-pointer"
                                                                            title="Khóa tài khoản"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}

                            {!isLoading && filteredStaffs.length === 0 && (
                                <div className="flex items-center justify-center py-16">
                                    <p className="text-[13px] text-[#ADADAD] font-medium">Không tìm thấy nhân viên phù hợp.</p>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* ── Fixed Bottom Pagination Controls ── */}
                    {filteredStaffs.length > 0 && (
                        <div className="px-6 py-4 border-t border-neutral-100 bg-white flex items-center justify-between shrink-0">
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
                                    {getCompactPages(currentPage, totalPages).map((page, idx) => (
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

            {/* ════════════════════════════════════════════════════════ */}
            {/* ── Backdrops ────────────────────────────────────────── */}
            {/* ════════════════════════════════════════════════════════ */}
            {(isCreateModalOpen || !!editingStaff || !!banTargetStaff || !!viewingStaff) && (
                <div
                    className="fixed inset-0 bg-neutral-900/40 backdrop-blur-[2px] z-50"
                    onClick={() => {
                        setIsCreateModalOpen(false);
                        setEditingStaff(null);
                        setViewingStaff(null);
                        closeBanModal();
                    }}
                />
            )}

            {/* ════════════════════════════════════════════════════════ */}
            {/* ── Modal: Chi tiết nhân viên ─────────────────────────── */}
            {/* ════════════════════════════════════════════════════════ */}
            {viewingStaff && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[620px] max-h-[90vh] bg-white rounded-3xl shadow-2xl p-6 sm:p-8 z-[60] flex flex-col gap-6 overflow-y-auto animate-in zoom-in-95 duration-150">
                    {/* Header */}
                    <div className="flex items-start justify-between pb-4 border-b border-neutral-100 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-[#F5F2FF] border border-[#8B7CF6]/20 flex items-center justify-center text-[#8B7CF6] shrink-0 overflow-hidden shadow-xs">
                                {viewingStaff.account?.avatar ? (
                                    <img src={viewingStaff.account.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <UserCheck className="w-7 h-7" />
                                )}
                            </div>
                            <div>
                                <h2 className="text-[18px] font-bold text-[#2D2D2D] leading-tight">
                                    {viewingStaff.full_name}
                                </h2>
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    {getRoleBadge(viewingStaff.account?.role || '')}
                                    {viewingStaff.account?.is_banned ? (
                                        <span className="inline-flex items-center text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border bg-[#FFEBEE] text-[#E53935] border-[#FFCDD2]">
                                            Đã khóa
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border bg-[#E8F9EE] text-[#10B981] border-[#C6F6D5]">
                                            Đang hoạt động
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setViewingStaff(null)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Họ và tên</label>
                            <div className="text-xs font-bold text-neutral-800 bg-[#F8F9FA] border border-neutral-150 rounded-xl px-3.5 py-2.5">
                                {viewingStaff.full_name || '—'}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Tên tài khoản</label>
                            <div className="text-xs font-semibold text-neutral-700 bg-[#F8F9FA] border border-neutral-150 rounded-xl px-3.5 py-2.5 font-mono">
                                {viewingStaff.account?.user_name || '—'}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Email</label>
                            <div className="text-xs font-semibold text-neutral-700 bg-[#F8F9FA] border border-neutral-150 rounded-xl px-3.5 py-2.5 truncate">
                                {viewingStaff.account?.email || '—'}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Số điện thoại</label>
                            <div className="text-xs font-semibold text-neutral-700 bg-[#F8F9FA] border border-neutral-150 rounded-xl px-3.5 py-2.5">
                                {viewingStaff.account?.phone || '—'}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Giới tính</label>
                            <div className="text-xs font-semibold text-neutral-700 bg-[#F8F9FA] border border-neutral-150 rounded-xl px-3.5 py-2.5">
                                {displayGender(viewingStaff.account?.gender)}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Mã nhân viên</label>
                            <div className="text-xs font-mono text-neutral-600 bg-[#F8F9FA] border border-neutral-150 rounded-xl px-3.5 py-2.5 truncate">
                                {viewingStaff.staff_id}
                            </div>
                        </div>

                        {(viewingStaff.account?.role === 'DOCTOR' || viewingStaff.account?.role === 'NURSE') && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Số chứng chỉ hành nghề</label>
                                    <div className="text-xs font-semibold text-neutral-700 bg-[#F8F9FA] border border-neutral-150 rounded-xl px-3.5 py-2.5">
                                        {viewingStaff.license_number || 'Chưa cung cấp'}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Số năm kinh nghiệm</label>
                                    <div className="text-xs font-semibold text-neutral-700 bg-[#F8F9FA] border border-neutral-150 rounded-xl px-3.5 py-2.5">
                                        {viewingStaff.experience_years !== null ? `${viewingStaff.experience_years} năm` : 'Chưa cung cấp'}
                                    </div>
                                </div>
                            </>
                        )}

                        {viewingStaff.account?.role === 'DOCTOR' && (
                            <div className="space-y-1 sm:col-span-2">
                                <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Chuyên khoa</label>
                                <div className="text-xs font-bold text-[#8B7CF6] bg-[#F5F2FF] border border-[#8B7CF6]/20 rounded-xl px-3.5 py-2.5">
                                    {(() => {
                                        const sp = specialties.find(s => s.specialty_id === viewingStaff.specialty_id);
                                        return sp ? (sp.specialty_name || sp.specialty_code) : 'Chưa chỉ định';
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100 shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewingStaff(null)}
                            className="px-5 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 transition cursor-pointer"
                        >
                            Đóng
                        </button>
                        {normalizeStaffRole(viewingStaff.account?.role) !== 'ADMIN' && (
                            <button
                                type="button"
                                onClick={() => {
                                    const st = viewingStaff;
                                    setViewingStaff(null);
                                    openEditModal(st);
                                }}
                                className="px-5 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                            >
                                Chỉnh sửa
                            </button>
                        )}
                    </div>
                </div>
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
                                onChange={(e) => {
                                    setCreateForm(prev => ({ ...prev, user_name: e.target.value }));
                                    setCreateFieldErrors(prev => ({ ...prev, user_name: '' }));
                                }}
                                onBlur={() => handleBlurCreate('user_name')}
                                className={cn(
                                    "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] transition-colors",
                                    createFieldErrors.user_name ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                )}
                            />
                            {createFieldErrors.user_name && (
                                <p className="text-[10.5px] font-semibold text-red-500">{createFieldErrors.user_name}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Mật khẩu *</label>
                            <input
                                type="password"
                                placeholder="••••••"
                                value={createForm.password}
                                onChange={(e) => {
                                    setCreateForm(prev => ({ ...prev, password: e.target.value }));
                                    setCreateFieldErrors(prev => ({ ...prev, password: '' }));
                                }}
                                onBlur={() => handleBlurCreate('password')}
                                className={cn(
                                    "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] transition-colors",
                                    createFieldErrors.password ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                )}
                            />
                            {createFieldErrors.password && (
                                <p className="text-[10.5px] font-semibold text-red-500">{createFieldErrors.password}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Họ và tên *</label>
                            <input
                                type="text"
                                placeholder="Ví dụ: Nguyễn Văn An"
                                value={createForm.full_name}
                                onChange={(e) => {
                                    setCreateForm(prev => ({ ...prev, full_name: e.target.value }));
                                    setCreateFieldErrors(prev => ({ ...prev, full_name: '' }));
                                }}
                                onBlur={() => handleBlurCreate('full_name')}
                                className={cn(
                                    "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-bold text-[#2D2D2D] transition-colors",
                                    createFieldErrors.full_name ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                )}
                            />
                            {createFieldErrors.full_name && (
                                <p className="text-[10.5px] font-semibold text-red-500">{createFieldErrors.full_name}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Email *</label>
                            <input
                                type="email"
                                placeholder="an.nguyen@example.com"
                                value={createForm.email}
                                onChange={(e) => {
                                    setCreateForm(prev => ({ ...prev, email: e.target.value }));
                                    setCreateFieldErrors(prev => ({ ...prev, email: '' }));
                                }}
                                onBlur={() => handleBlurCreate('email')}
                                className={cn(
                                    "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] transition-colors",
                                    createFieldErrors.email ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                )}
                            />
                            {createFieldErrors.email && (
                                <p className="text-[10.5px] font-semibold text-red-500">{createFieldErrors.email}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Vai trò *</label>
                            <select
                                value={createForm.role}
                                onChange={(e) => {
                                    const nextRole = e.target.value;
                                    setCreateForm(prev => ({
                                        ...prev,
                                        role: nextRole,
                                        specialty_id: nextRole === 'DOCTOR' ? (prev.specialty_id || specialties[0]?.specialty_id || '') : '',
                                    }));
                                }}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="DOCTOR">Bác sĩ</option>
                                <option value="NURSE">Y tá / Điều dưỡng</option>
                                <option value="RECEPTIONIST">Lễ tân</option>
                                <option value="LAB_TECHNICIAN">Kỹ thuật viên Xét nghiệm</option>
                                <option value="PHARMACIST">Dược sĩ</option>
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
                                onChange={(e) => {
                                    setCreateForm(prev => ({ ...prev, phone: e.target.value }));
                                    setCreateFieldErrors(prev => ({ ...prev, phone: '' }));
                                }}
                                onBlur={() => handleBlurCreate('phone')}
                                className={cn(
                                    "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] transition-colors",
                                    createFieldErrors.phone ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                )}
                            />
                            {createFieldErrors.phone && (
                                <p className="text-[10.5px] font-semibold text-red-500">{createFieldErrors.phone}</p>
                            )}
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
                                    onChange={(e) => {
                                        setCreateForm(prev => ({ ...prev, experience_years: e.target.value }));
                                        setCreateFieldErrors(prev => ({ ...prev, experience_years: '' }));
                                    }}
                                    onBlur={() => handleBlurCreate('experience_years')}
                                    className={cn(
                                        "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] transition-colors",
                                        createFieldErrors.experience_years ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                    )}
                                />
                                {createFieldErrors.experience_years && (
                                    <p className="text-[10.5px] font-semibold text-red-500">{createFieldErrors.experience_years}</p>
                                )}
                            </div>
                        )}

                        {createForm.role === 'DOCTOR' && (
                            <div className="space-y-1.5 col-span-2">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Chuyên khoa phụ trách *</label>
                                <select
                                    value={createForm.specialty_id}
                                    onChange={(e) => {
                                        setCreateForm(prev => ({ ...prev, specialty_id: e.target.value }));
                                        setCreateFieldErrors(prev => ({ ...prev, specialty_id: '' }));
                                    }}
                                    onBlur={() => handleBlurCreate('specialty_id')}
                                    className={cn(
                                        "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-white transition-colors",
                                        createFieldErrors.specialty_id ? "border-red-400 bg-red-50/20" : "border-neutral-200"
                                    )}
                                >
                                    <option value="">— Chọn chuyên khoa —</option>
                                    {specialties.map((sp) => (
                                        <option key={sp.specialty_id} value={sp.specialty_id}>
                                            {sp.specialty_name || sp.specialty_code}
                                        </option>
                                    ))}
                                </select>
                                {createFieldErrors.specialty_id && (
                                    <p className="text-[10.5px] font-semibold text-red-500">{createFieldErrors.specialty_id}</p>
                                )}
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
                                onChange={(e) => {
                                    setEditForm(prev => ({ ...prev, user_name: e.target.value }));
                                    setEditFieldErrors(prev => ({ ...prev, user_name: '' }));
                                }}
                                onBlur={() => handleBlurEdit('user_name')}
                                className={cn(
                                    "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] transition-colors",
                                    editFieldErrors.user_name ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                )}
                            />
                            {editFieldErrors.user_name && (
                                <p className="text-[10.5px] font-semibold text-red-500">{editFieldErrors.user_name}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Họ và tên *</label>
                            <input
                                type="text"
                                value={editForm.full_name}
                                onChange={(e) => {
                                    setEditForm(prev => ({ ...prev, full_name: e.target.value }));
                                    setEditFieldErrors(prev => ({ ...prev, full_name: '' }));
                                }}
                                onBlur={() => handleBlurEdit('full_name')}
                                className={cn(
                                    "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-bold text-[#2D2D2D] transition-colors",
                                    editFieldErrors.full_name ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                )}
                            />
                            {editFieldErrors.full_name && (
                                <p className="text-[10.5px] font-semibold text-red-500">{editFieldErrors.full_name}</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Email (Không thể thay đổi)</label>
                            <input
                                type="email"
                                value={editForm.email}
                                readOnly
                                disabled
                                className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed select-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Vai trò *</label>
                            <select
                                value={editForm.role}
                                onChange={(e) => {
                                    const nextRole = e.target.value;
                                    setEditForm(prev => ({
                                        ...prev,
                                        role: nextRole,
                                        specialty_id: nextRole === 'DOCTOR' ? (prev.specialty_id || specialties[0]?.specialty_id || '') : '',
                                    }));
                                }}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            >
                                <option value="DOCTOR">Bác sĩ</option>
                                <option value="NURSE">Y tá / Điều dưỡng</option>
                                <option value="RECEPTIONIST">Lễ tân</option>
                                <option value="LAB_TECHNICIAN">Kỹ thuật viên Xét nghiệm</option>
                                <option value="PHARMACIST">Dược sĩ</option>
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
                                onChange={(e) => {
                                    setEditForm(prev => ({ ...prev, phone: e.target.value }));
                                    setEditFieldErrors(prev => ({ ...prev, phone: '' }));
                                }}
                                onBlur={() => handleBlurEdit('phone')}
                                className={cn(
                                    "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] transition-colors",
                                    editFieldErrors.phone ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                )}
                            />
                            {editFieldErrors.phone && (
                                <p className="text-[10.5px] font-semibold text-red-500">{editFieldErrors.phone}</p>
                            )}
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
                                    onChange={(e) => {
                                        setEditForm(prev => ({ ...prev, experience_years: e.target.value }));
                                        setEditFieldErrors(prev => ({ ...prev, experience_years: '' }));
                                    }}
                                    onBlur={() => handleBlurEdit('experience_years')}
                                    className={cn(
                                        "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] transition-colors",
                                        editFieldErrors.experience_years ? "border-red-400 bg-red-50/20" : "border-neutral-200 bg-white"
                                    )}
                                />
                                {editFieldErrors.experience_years && (
                                    <p className="text-[10.5px] font-semibold text-red-500">{editFieldErrors.experience_years}</p>
                                )}
                            </div>
                        )}

                        {editForm.role === 'DOCTOR' && (
                            <div className="space-y-1.5 col-span-2">
                                <label className="text-[11px] font-bold text-neutral-500 uppercase">Chuyên khoa phụ trách *</label>
                                <select
                                    value={editForm.specialty_id}
                                    onChange={(e) => {
                                        setEditForm(prev => ({ ...prev, specialty_id: e.target.value }));
                                        setEditFieldErrors(prev => ({ ...prev, specialty_id: '' }));
                                    }}
                                    onBlur={() => handleBlurEdit('specialty_id')}
                                    className={cn(
                                        "w-full text-xs border rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none font-semibold text-[#2D2D2D] bg-white transition-colors",
                                        editFieldErrors.specialty_id ? "border-red-400 bg-red-50/20" : "border-neutral-200"
                                    )}
                                >
                                    <option value="">— Chọn chuyên khoa —</option>
                                    {specialties.map((sp) => (
                                        <option key={sp.specialty_id} value={sp.specialty_id}>
                                            {sp.specialty_name || sp.specialty_code}
                                        </option>
                                    ))}
                                </select>
                                {editFieldErrors.specialty_id && (
                                    <p className="text-[10.5px] font-semibold text-red-500">{editFieldErrors.specialty_id}</p>
                                )}
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

            {/* ════════════════════════════════════════════════════════ */}
            {/* ── Modal: Khóa tài khoản ────────────────────────────── */}
            {/* ════════════════════════════════════════════════════════ */}
            {!!banTargetStaff && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] bg-white rounded-3xl shadow-2xl p-6 z-[60] flex flex-col gap-5">
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

                    {banError && (
                        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{banError}</span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-1 border-t border-neutral-100">
                        <button
                            onClick={closeBanModal}
                            disabled={isBanning}
                            className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleBanStaff}
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
