'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Loader2,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    Stethoscope,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { CreateSpecialtyDto, Specialty } from '../types/specialty.types';
import { extractSpecialtyList, specialtyService } from '../services/specialtyService';
import { getCompactPages } from '../utils/pagination';
import { getErrorMessage } from '../utils/errorMessage';
import { SoftDisableConfirmDialog } from './SoftDisableConfirmDialog';

const ITEMS_PER_PAGE = 10;

const EMPTY_FORM: CreateSpecialtyDto = {
    specialty_code: '',
    specialty_name: '',
    description: '',
};

export function HospitalSpecialtiesPanel() {
    const accessToken = useAuthStore((s) => s.accessToken);

    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<Specialty | null>(null);
    const [form, setForm] = useState<CreateSpecialtyDto>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [togglingTarget, setTogglingTarget] = useState<Specialty | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [toggleError, setToggleError] = useState<string | null>(null);

    const loadSpecialties = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await specialtyService.getSpecialties(accessToken, { page: 1, limit: 500 });
            const { data } = extractSpecialtyList(res?.data);
            setSpecialties(data);
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải danh sách chuyên khoa.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    useEffect(() => {
        void loadSpecialties();
    }, [loadSpecialties]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return specialties.filter((sp) => {
            if (!showInactive && sp.is_active === false) return false;
            if (!q) return true;
            const code = (sp.specialty_code || '').toLowerCase();
            const name = (sp.specialty_name || '').toLowerCase();
            return code.includes(q) || name.includes(q);
        });
    }, [specialties, searchQuery, showInactive]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = useMemo(
        () => filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
        [filtered, safePage]
    );

    const openCreate = () => {
        setEditing(null);
        setForm(EMPTY_FORM);
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEdit = (sp: Specialty) => {
        setEditing(sp);
        setForm({
            specialty_code: sp.specialty_code || '',
            specialty_name: sp.specialty_name || '',
            description: sp.description || '',
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!accessToken) return;
        const code = form.specialty_code.trim().toUpperCase();
        const name = form.specialty_name.trim();
        if (!code || !/^[A-Z0-9_]+$/.test(code)) {
            setFormError('Mã chuyên khoa bắt buộc, chỉ gồm chữ in hoa, số và dấu gạch dưới.');
            return;
        }
        if (!name) {
            setFormError('Vui lòng nhập tên chuyên khoa.');
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            if (editing) {
                await specialtyService.updateSpecialty(
                    editing.specialty_id,
                    { specialty_code: code, specialty_name: name, description: form.description?.trim() || undefined },
                    accessToken
                );
            } else {
                await specialtyService.createSpecialty(
                    { specialty_code: code, specialty_name: name, description: form.description?.trim() || undefined },
                    accessToken
                );
            }
            setIsModalOpen(false);
            await loadSpecialties();
        } catch (err) {
            setFormError(getErrorMessage(err, 'Không thể lưu chuyên khoa.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async () => {
        if (!accessToken || !togglingTarget) return;
        setIsToggling(true);
        setToggleError(null);
        try {
            if (togglingTarget.is_active) {
                await specialtyService.deleteSpecialty(togglingTarget.specialty_id, accessToken);
            } else {
                await specialtyService.updateSpecialty(
                    togglingTarget.specialty_id,
                    { is_active: true },
                    accessToken
                );
            }
            setTogglingTarget(null);
            await loadSpecialties();
        } catch (err) {
            setToggleError(getErrorMessage(err, 'Không thể cập nhật trạng thái chuyên khoa.'));
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <p className="text-[13px] text-[#7B7B7B] font-medium">
                    Danh mục chuyên khoa dùng cho phòng khám, nhân sự và quy tắc hàng chờ.
                </p>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Thêm chuyên khoa
                </button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-xl px-3 py-2 max-w-md flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-neutral-400" />
                    <input
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        placeholder="Tìm theo mã hoặc tên chuyên khoa..."
                        className="flex-1 text-sm outline-none bg-transparent"
                    />
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 select-none cursor-pointer bg-white border border-neutral-200 rounded-xl px-3 py-2.5">
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => {
                            setShowInactive(e.target.checked);
                            setCurrentPage(1);
                        }}
                    />
                    Hiện đã tắt
                </label>
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 whitespace-pre-line">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center gap-2 text-neutral-500">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                        <span className="text-sm font-medium">Đang tải...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-sm text-neutral-500">Chưa có chuyên khoa nào.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200 text-left text-xs font-bold text-neutral-500 uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3">Mã</th>
                                    <th className="px-4 py-3">Tên chuyên khoa</th>
                                    <th className="px-4 py-3">Mô tả</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {paginated.map((sp) => {
                                    const active = sp.is_active !== false;
                                    return (
                                        <tr key={sp.specialty_id} className="hover:bg-neutral-50/80">
                                            <td className="px-4 py-3 font-mono text-xs text-neutral-600">
                                                {sp.specialty_code}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center text-[#8B7CF6] shrink-0">
                                                        <Stethoscope className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="font-semibold text-neutral-800">{sp.specialty_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-500 max-w-[280px] truncate">
                                                {sp.description || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={cn(
                                                        'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                                        active
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                            : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                                                    )}
                                                >
                                                    {active ? 'Đang hoạt động' : 'Ngừng'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(sp)}
                                                        className="p-2 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-neutral-50 cursor-pointer"
                                                        title="Sửa"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setToggleError(null);
                                                            setTogglingTarget(sp);
                                                        }}
                                                        className={cn(
                                                            'p-2 rounded-lg hover:bg-neutral-50 cursor-pointer',
                                                            active ? 'text-neutral-400 hover:text-red-500' : 'text-neutral-400 hover:text-emerald-600'
                                                        )}
                                                        title={active ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                                    >
                                                        {active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {filtered.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                    <p className="text-[12px] text-[#ADADAD] font-bold">
                        Hiển thị {Math.min(filtered.length, (safePage - 1) * ITEMS_PER_PAGE + 1)}
                        {' - '}
                        {Math.min(filtered.length, safePage * ITEMS_PER_PAGE)} trong số {filtered.length} chuyên khoa
                    </p>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                disabled={safePage === 1}
                                className="px-3 py-1.5 text-xs font-bold border border-[#EBEBEB] rounded-lg bg-white text-[#7B7B7B] hover:bg-[#8B7CF6]/5 hover:text-[#8B7CF6] disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                            >
                                Trước
                            </button>
                            {getCompactPages(safePage, totalPages).map((page, idx) =>
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
                                            safePage === page
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
                                disabled={safePage === totalPages}
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
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-neutral-100">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h2 className="font-bold text-neutral-900">
                                {editing ? 'Cập nhật chuyên khoa' : 'Thêm chuyên khoa'}
                            </h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {formError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-line">
                                    {formError}
                                </div>
                            )}
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                    Mã chuyên khoa *
                                </label>
                                <input
                                    value={form.specialty_code}
                                    onChange={(e) => setForm((f) => ({ ...f, specialty_code: e.target.value.toUpperCase() }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium font-mono"
                                    placeholder="NOI_TONG_QUAT"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                    Tên chuyên khoa *
                                </label>
                                <input
                                    value={form.specialty_name}
                                    onChange={(e) => setForm((f) => ({ ...f, specialty_name: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    placeholder="VD: Nội tổng quát"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                    Mô tả
                                </label>
                                <textarea
                                    value={form.description || ''}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    rows={3}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium resize-none"
                                    placeholder="Mô tả ngắn về chuyên khoa..."
                                />
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end">
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
                                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
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
                    entityName={togglingTarget.specialty_name}
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
