'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Pencil, Pill, Plus, Power, PowerOff, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { CreateMedicineDto, Medicine, MedicineListMeta } from '../types/medicine.types';
import { extractMedicineList, medicineAdminService } from '../services/medicineAdminService';
import { getCompactPages } from '../utils/pagination';
import { getErrorMessage } from '../utils/errorMessage';
import { SoftDisableConfirmDialog } from './SoftDisableConfirmDialog';

const LIMIT = 7;

const EMPTY_FORM: CreateMedicineDto = {
    medicine_code: '',
    medicine_name: '',
    active_ingredient: '',
    unit: '',
    usage_route: '',
    unit_price: 0,
    manufacturer: '',
    description: '',
};

export function AdminMedicinesPage() {
    const accessToken = useAuthStore((s) => s.accessToken);

    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [meta, setMeta] = useState<MedicineListMeta | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [currentPage, setCurrentPage] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Medicine | null>(null);
    const [form, setForm] = useState<CreateMedicineDto>(EMPTY_FORM);
    const [formActive, setFormActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [togglingTarget, setTogglingTarget] = useState<Medicine | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [toggleError, setToggleError] = useState<string | null>(null);

    // Debounce free-text search before it drives a server round-trip.
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearch(searchInput.trim());
            setCurrentPage(1);
        }, 400);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    const loadMedicines = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await medicineAdminService.getMedicines(accessToken, {
                page: currentPage,
                limit: LIMIT,
                search: search || undefined,
                is_active: statusFilter === 'ALL' ? undefined : statusFilter === 'ACTIVE' ? true : false,
            });
            const { data, meta: pageMeta } = extractMedicineList(res);
            setMedicines(data);
            setMeta(pageMeta || null);
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải danh mục thuốc.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, currentPage, search, statusFilter]);

    useEffect(() => {
        void loadMedicines();
    }, [loadMedicines]);

    const totalPages = meta?.totalPages || 1;
    const total = meta?.total ?? medicines.length;

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormActive(true);
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEdit = (medicine: Medicine) => {
        setEditing(medicine);
        setForm({
            medicine_code: medicine.medicine_code || '',
            medicine_name: medicine.medicine_name || '',
            active_ingredient: medicine.active_ingredient || '',
            unit: medicine.unit || '',
            usage_route: medicine.usage_route || '',
            unit_price: Number(medicine.unit_price) || 0,
            manufacturer: medicine.manufacturer || '',
            description: medicine.description || '',
        });
        setFormActive(medicine.is_active !== false);
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!accessToken) return;
        const code = form.medicine_code.trim().toUpperCase();
        const name = form.medicine_name.trim();
        if (!code || !/^[A-Z0-9_-]+$/.test(code)) {
            setFormError('Mã thuốc bắt buộc, chỉ gồm chữ in hoa, số, gạch dưới và gạch ngang.');
            return;
        }
        if (code.length > 64) {
            setFormError('Mã thuốc tối đa 64 ký tự.');
            return;
        }
        if (!name) {
            setFormError('Vui lòng nhập tên thuốc.');
            return;
        }
        if (name.length > 200) {
            setFormError('Tên thuốc tối đa 200 ký tự.');
            return;
        }
        const price = Number(form.unit_price) || 0;
        if (!Number.isFinite(price) || price < 0) {
            setFormError('Đơn giá không hợp lệ.');
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const body = {
                medicine_code: code,
                medicine_name: name,
                active_ingredient: form.active_ingredient?.trim() || undefined,
                unit: form.unit?.trim() || undefined,
                usage_route: form.usage_route?.trim() || undefined,
                unit_price: price,
                manufacturer: form.manufacturer?.trim() || undefined,
                description: form.description?.trim() || undefined,
            };
            if (editing) {
                await medicineAdminService.updateMedicine(
                    editing.medicine_id,
                    { ...body, is_active: formActive },
                    accessToken
                );
            } else {
                await medicineAdminService.createMedicine(body, accessToken);
            }
            setIsModalOpen(false);
            await loadMedicines();
        } catch (err) {
            setFormError(getErrorMessage(err, 'Không thể lưu thông tin thuốc.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async () => {
        if (!accessToken || !togglingTarget) return;
        setIsToggling(true);
        setToggleError(null);
        try {
            if (togglingTarget.is_active !== false) {
                await medicineAdminService.deleteMedicine(togglingTarget.medicine_id, accessToken);
            } else {
                await medicineAdminService.restoreMedicine(togglingTarget.medicine_id, accessToken);
            }
            setTogglingTarget(null);
            await loadMedicines();
        } catch (err) {
            setToggleError(getErrorMessage(err, 'Không thể cập nhật trạng thái thuốc.'));
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 min-h-0 overflow-y-auto p-6">
                        {/* ── Title + Actions ── */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Danh mục thuốc
                                </h1>
                                <p className="text-[13px] text-[#7B7B7B] font-medium mt-1">
                                    Danh mục thuốc dùng cho kê đơn và cấp phát tại nhà thuốc
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openCreate}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm thuốc
                            </button>
                        </div>

                        {/* ── Toolbar: Search & Filters ── */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                            {/* Search Bar */}
                            <div className="flex items-center gap-2.5 bg-[#F5F5F8] rounded-xl px-3.5 py-2.5 text-[12.5px] w-full sm:w-80 border border-neutral-200/60 shadow-xs focus-within:border-[#8B7CF6] focus-within:bg-white transition-all">
                                <Search className="w-4 h-4 shrink-0 text-[#9CA3AF]" />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    placeholder="Tìm theo mã, tên hoặc hoạt chất..."
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
                                        onChange={(e) => {
                                            setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE');
                                            setCurrentPage(1);
                                        }}
                                        className="bg-transparent font-bold text-[#2D2D2D] outline-none cursor-pointer pr-1"
                                    >
                                        <option value="ALL">Tất cả</option>
                                        <option value="ACTIVE">Đang hoạt động</option>
                                        <option value="INACTIVE">Ngừng hoạt động</option>
                                    </select>
                                </div>

                                {(statusFilter !== 'ALL' || searchInput) && (
                                    <button
                                        onClick={() => {
                                            setStatusFilter('ALL');
                                            setSearchInput('');
                                            setSearch('');
                                            setCurrentPage(1);
                                        }}
                                        className="text-[11.5px] font-bold text-[#8B7CF6] hover:underline cursor-pointer px-2 py-1"
                                    >
                                        Xoá lọc
                                    </button>
                                )}
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 whitespace-pre-line mb-6">
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* ── Table Content ── */}
                        <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden shadow-sm">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                                    <span className="text-[13px] text-[#7B7B7B] font-bold">Đang tải danh mục thuốc...</span>
                                </div>
                            ) : medicines.length === 0 ? (
                                <div className="flex items-center justify-center py-16">
                                    <p className="text-[13px] text-[#ADADAD] font-medium">Không tìm thấy thuốc phù hợp.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-neutral-50/80 border-b border-[#EBEBEB]">
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[64px]">STT</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider w-[120px]">Mã</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Tên thuốc</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Hoạt chất</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Đơn vị</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Đường dùng</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right">Đơn giá</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider">Trạng thái</th>
                                            <th className="px-5 py-3.5 text-[11px] font-bold text-[#7B7B7B] uppercase tracking-wider text-right w-[100px]">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {medicines.map((medicine, index) => {
                                            const active = medicine.is_active !== false;
                                            return (
                                                <tr key={medicine.medicine_id} className="hover:bg-neutral-50/50 transition-colors group">
                                                    <td className="px-5 py-4 text-[13px] font-semibold text-[#7B7B7B]">
                                                        {(currentPage - 1) * LIMIT + index + 1}
                                                    </td>
                                                    <td className="px-5 py-4 font-mono text-[12px] text-[#7B7B7B]">
                                                        {medicine.medicine_code}
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-xl bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center text-[#8B7CF6] shrink-0">
                                                                <Pill className="w-4 h-4" />
                                                            </div>
                                                            <span className="text-[13px] font-bold text-[#2D2D2D]">{medicine.medicine_name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-4 text-[12px] text-[#7B7B7B] max-w-[180px] truncate">
                                                        {medicine.active_ingredient || '—'}
                                                    </td>
                                                    <td className="px-5 py-4 text-[12px] text-[#7B7B7B]">
                                                        {medicine.unit || '—'}
                                                    </td>
                                                    <td className="px-5 py-4 text-[12px] text-[#7B7B7B]">
                                                        {medicine.usage_route || '—'}
                                                    </td>
                                                    <td className="px-5 py-4 text-right text-[12.5px] font-bold text-[#2D2D2D]">
                                                        {Number(medicine.unit_price || 0).toLocaleString('vi-VN')}₫
                                                    </td>
                                                    <td className="px-5 py-4 whitespace-nowrap">
                                                        <span
                                                            className={cn(
                                                                'text-[10px] font-bold px-3 py-1 rounded-full border whitespace-nowrap inline-flex items-center',
                                                                active
                                                                    ? 'bg-[#E8F9EE] text-[#10B981] border-[#C6F6D5]'
                                                                    : 'bg-[#FFEBEE] text-[#E53935] border-[#FFCDD2]'
                                                            )}
                                                        >
                                                            {active ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-4">
                                                        <div className="flex items-center justify-end gap-2 text-neutral-400">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEdit(medicine)}
                                                                className="p-1 hover:text-[#8B7CF6] transition-colors cursor-pointer"
                                                                title="Chỉnh sửa thuốc"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setToggleError(null);
                                                                    setTogglingTarget(medicine);
                                                                }}
                                                                className={cn(
                                                                    'p-1 transition-colors cursor-pointer',
                                                                    active ? 'hover:text-red-600' : 'hover:text-emerald-600'
                                                                )}
                                                                title={active ? 'Vô hiệu hóa' : 'Khôi phục'}
                                                            >
                                                                {active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
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

                    {/* ── Fixed Bottom Pagination Controls ── */}
                    {total > 0 && (
                        <div className="px-6 py-4 border-t border-neutral-100 bg-white flex items-center justify-between shrink-0">
                            <p className="text-[12px] text-[#ADADAD] font-bold">
                                Hiển thị {Math.min(total, (currentPage - 1) * LIMIT + 1)} - {Math.min(total, currentPage * LIMIT)} trong số {total} thuốc
                            </p>
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Trước
                                    </button>
                                    {getCompactPages(currentPage, totalPages).map((page, idx) =>
                                        page === 'ellipsis' ? (
                                            <span key={`ellipsis-${idx}`} className="px-1 text-sm font-bold text-[#ADADAD] select-none">
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
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
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Sau
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-neutral-100 max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
                            <h2 className="font-bold text-neutral-900">{editing ? 'Cập nhật thuốc' : 'Thêm thuốc'}</h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    const target = e.target as HTMLElement;
                                    if (!target || target.tagName.toLowerCase() === 'textarea') return;
                                    e.preventDefault();
                                    const container = e.currentTarget;
                                    const focusable = Array.from(
                                        container.querySelectorAll<HTMLElement>(
                                            'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]), select:not([disabled]), textarea:not([disabled])'
                                        )
                                    );
                                    const index = focusable.indexOf(target);
                                    if (index > -1 && index + 1 < focusable.length) {
                                        focusable[index + 1].focus();
                                    }
                                }
                            }}
                            className="p-5 space-y-4 overflow-y-auto flex-1"
                        >
                            {formError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-line">
                                    {formError}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Mã thuốc *</label>
                                    <input
                                        value={form.medicine_code}
                                        onChange={(e) => setForm((f) => ({ ...f, medicine_code: e.target.value.toUpperCase() }))}
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium font-mono"
                                        placeholder="MED-PAR-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Đơn giá (VNĐ)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.unit_price}
                                        onChange={(e) => setForm((f) => ({ ...f, unit_price: Number(e.target.value) }))}
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Tên thuốc *</label>
                                <input
                                    value={form.medicine_name}
                                    onChange={(e) => setForm((f) => ({ ...f, medicine_name: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    placeholder="Paracetamol 500mg"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Hoạt chất</label>
                                    <input
                                        value={form.active_ingredient || ''}
                                        onChange={(e) => setForm((f) => ({ ...f, active_ingredient: e.target.value }))}
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                        placeholder="Paracetamol"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Đơn vị</label>
                                    <input
                                        value={form.unit || ''}
                                        onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                        placeholder="Viên"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Đường dùng</label>
                                    <input
                                        value={form.usage_route || ''}
                                        onChange={(e) => setForm((f) => ({ ...f, usage_route: e.target.value }))}
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                        placeholder="Uống"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Nhà sản xuất</label>
                                <input
                                    value={form.manufacturer || ''}
                                    onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    placeholder="Dược Hậu Giang"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Mô tả / Lưu ý</label>
                                <textarea
                                    value={form.description || ''}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    rows={2}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium resize-none"
                                />
                            </div>
                            {editing && (
                                <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                                    <input
                                        type="checkbox"
                                        checked={formActive}
                                        onChange={(e) => setFormActive(e.target.checked)}
                                        className="accent-brand-500"
                                    />
                                    Đang hoạt động
                                </label>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={isSaving}
                                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                            >
                                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {togglingTarget && (
                <SoftDisableConfirmDialog
                    entityName={togglingTarget.medicine_name}
                    isActive={togglingTarget.is_active !== false}
                    isSubmitting={isToggling}
                    error={toggleError}
                    onConfirm={() => void handleToggleActive()}
                    onCancel={() => setTogglingTarget(null)}
                />
            )}
        </div>
    );
}
