'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ExternalLink, Loader2, Package, Pencil, Plus, Power, PowerOff, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { useProcessStore } from '../store/processStore';
import type { ProcessTemplate } from '../types/process.types';
import type { CreateExamPackageDto, ExamPackage } from '../types/examPackage.types';
import { examPackageService, extractExamPackageList } from '../services/examPackageService';
import { getCompactPages } from '../utils/pagination';
import { getErrorMessage } from '../utils/errorMessage';
import { SoftDisableConfirmDialog } from './SoftDisableConfirmDialog';

const ITEMS_PER_PAGE = 10;

const EMPTY_FORM: CreateExamPackageDto = {
    package_name: '',
    description: '',
    price: 0,
    template_id: '',
};

function templateKey(t: ProcessTemplate): string {
    return String(t.template_id || t.id || '');
}

function templateName(t: ProcessTemplate): string {
    return t.name || templateKey(t);
}

function isTemplateActive(t: ProcessTemplate): boolean {
    if (t.is_active === false) return false;
    if (t.status === 'INACTIVE' || t.status === false) return false;
    return true;
}

export function AdminExamPackagesPage() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const { templates, fetchTemplates } = useProcessStore();

    const [packages, setPackages] = useState<ExamPackage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<ExamPackage | null>(null);
    const [form, setForm] = useState<CreateExamPackageDto>(EMPTY_FORM);
    const [formActive, setFormActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [togglingTarget, setTogglingTarget] = useState<ExamPackage | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [toggleError, setToggleError] = useState<string | null>(null);

    useEffect(() => {
        if (accessToken && templates.length === 0) void fetchTemplates(accessToken);
    }, [accessToken, templates.length, fetchTemplates]);

    const loadPackages = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await examPackageService.getPackages(accessToken, {
                is_active: showInactive ? undefined : true,
            });
            setPackages(extractExamPackageList(res?.data));
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải danh sách gói khám.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, showInactive]);

    useEffect(() => {
        void loadPackages();
    }, [loadPackages]);

    const activeTemplates = useMemo(() => templates.filter(isTemplateActive), [templates]);

    const templateNameFor = useCallback(
        (pkg: ExamPackage) => pkg.template?.template_name || templates.find((t) => templateKey(t) === pkg.template_id)?.name || '—',
        [templates]
    );

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return packages;
        return packages.filter((p) => (p.package_name || '').toLowerCase().includes(q));
    }, [packages, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = useMemo(
        () => filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
        [filtered, safePage]
    );

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM, template_id: activeTemplates[0] ? templateKey(activeTemplates[0]) : '' });
        setFormActive(true);
        setFormError(null);
        setIsModalOpen(true);
    };

    const openEdit = (pkg: ExamPackage) => {
        setEditing(pkg);
        setForm({
            package_name: pkg.package_name || '',
            description: pkg.description || '',
            price: Number(pkg.price) || 0,
            template_id: pkg.template_id || '',
        });
        setFormActive(pkg.is_active !== false);
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!accessToken) return;
        const name = form.package_name.trim();
        if (!name) {
            setFormError('Vui lòng nhập tên gói khám.');
            return;
        }
        if (name.length > 200) {
            setFormError('Tên gói khám tối đa 200 ký tự.');
            return;
        }
        const price = Number(form.price) || 0;
        if (!Number.isFinite(price) || price < 0) {
            setFormError('Giá gói khám không hợp lệ.');
            return;
        }
        if (!form.template_id) {
            setFormError('Vui lòng chọn quy trình khám (template).');
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const body = {
                package_name: name,
                description: form.description?.trim() || undefined,
                price,
                template_id: form.template_id,
            };
            if (editing) {
                await examPackageService.updatePackage(editing.package_id, { ...body, is_active: formActive }, accessToken);
            } else {
                await examPackageService.createPackage(body, accessToken);
            }
            setIsModalOpen(false);
            await loadPackages();
        } catch (err) {
            setFormError(getErrorMessage(err, 'Không thể lưu gói khám.'));
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
                await examPackageService.deletePackage(togglingTarget.package_id, accessToken);
            } else {
                await examPackageService.updatePackage(togglingTarget.package_id, { is_active: true }, accessToken);
            }
            setTogglingTarget(null);
            await loadPackages();
        } catch (err) {
            setToggleError(getErrorMessage(err, 'Không thể cập nhật trạng thái gói khám.'));
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6 pb-5">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] rounded-bl-[48px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 min-h-0 overflow-y-auto p-6">
                        <div className="max-w-6xl mx-auto space-y-5">
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div>
                                    <h1 className="text-xl font-bold text-neutral-900">Gói khám</h1>
                                    <p className="text-[13px] text-[#7B7B7B] font-medium mt-1">
                                        Gói khám gắn với quy trình khám bệnh (template) và giá bán.{' '}
                                        <Link href="/admin/process" className="text-brand-500 font-bold hover:underline inline-flex items-center gap-0.5">
                                            Mở quy trình khám
                                            <ExternalLink className="w-3 h-3" />
                                        </Link>
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={openCreate}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold cursor-pointer"
                                >
                                    <Plus className="w-4 h-4" />
                                    Thêm gói khám
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
                                        placeholder="Tìm theo tên gói khám..."
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
                                    <div className="p-12 text-center text-sm text-neutral-500">Chưa có gói khám nào.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-neutral-50 border-b border-neutral-200 text-left text-xs font-bold text-neutral-500 uppercase tracking-wide">
                                                <tr>
                                                    <th className="px-4 py-3">Tên gói khám</th>
                                                    <th className="px-4 py-3 text-right">Giá</th>
                                                    <th className="px-4 py-3">Quy trình (template)</th>
                                                    <th className="px-4 py-3">Trạng thái</th>
                                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-neutral-100">
                                                {paginated.map((pkg) => {
                                                    const active = pkg.is_active !== false;
                                                    return (
                                                        <tr key={pkg.package_id} className="hover:bg-neutral-50/80">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-lg bg-[#F5F2FF] border border-[#E0DCFB] flex items-center justify-center text-[#8B7CF6] shrink-0">
                                                                        <Package className="w-3.5 h-3.5" />
                                                                    </div>
                                                                    <div>
                                                                        <span className="font-semibold text-neutral-800">{pkg.package_name}</span>
                                                                        {pkg.description && (
                                                                            <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[260px] truncate">
                                                                                {pkg.description}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-medium">
                                                                {Number(pkg.price || 0).toLocaleString('vi-VN')}₫
                                                            </td>
                                                            <td className="px-4 py-3 text-neutral-600 text-[12px]">{templateNameFor(pkg)}</td>
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
                                                                        onClick={() => openEdit(pkg)}
                                                                        className="p-2 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-neutral-50 cursor-pointer"
                                                                        title="Sửa"
                                                                    >
                                                                        <Pencil className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setToggleError(null);
                                                                            setTogglingTarget(pkg);
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
                                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                                    <p className="text-[12px] text-[#ADADAD] font-bold">
                                        Hiển thị {Math.min(filtered.length, (safePage - 1) * ITEMS_PER_PAGE + 1)}
                                        {' - '}
                                        {Math.min(filtered.length, safePage * ITEMS_PER_PAGE)} trong số {filtered.length} gói khám
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
                        </div>
                    </div>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-neutral-100">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h2 className="font-bold text-neutral-900">{editing ? 'Cập nhật gói khám' : 'Thêm gói khám'}</h2>
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
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Tên gói khám *</label>
                                <input
                                    value={form.package_name}
                                    onChange={(e) => setForm((f) => ({ ...f, package_name: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    placeholder="Gói khám tổng quát cơ bản"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Giá *</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.price}
                                        onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Quy trình khám *</label>
                                    <select
                                        value={form.template_id}
                                        onChange={(e) => setForm((f) => ({ ...f, template_id: e.target.value }))}
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                    >
                                        <option value="">Chọn quy trình...</option>
                                        {activeTemplates.map((t) => (
                                            <option key={templateKey(t)} value={templateKey(t)}>
                                                {templateName(t)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Mô tả</label>
                                <textarea
                                    value={form.description || ''}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    rows={3}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium resize-none"
                                    placeholder="Bao gồm siêu âm, xét nghiệm máu cơ bản..."
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
                    entityName={togglingTarget.package_name}
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
