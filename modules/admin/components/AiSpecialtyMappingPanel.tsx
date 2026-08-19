'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Link2,
    Loader2,
    Pencil,
    Plus,
    Power,
    PowerOff,
    Search,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { Specialty } from '../types/specialty.types';
import type { AiSpecialty, CreateAiSpecialtyDto } from '../types/aiSpecialty.types';
import { extractSpecialtyList, specialtyService } from '../services/specialtyService';
import { aiSpecialtyService, extractAiSpecialtyList } from '../services/aiSpecialtyService';
import { getCompactPages } from '../utils/pagination';
import { getErrorMessage } from '../utils/errorMessage';
import { SoftDisableConfirmDialog } from './SoftDisableConfirmDialog';
import { AiSpecialtyMappingsDrawer } from './AiSpecialtyMappingsDrawer';

const ITEMS_PER_PAGE = 10;
const AI_CODE_PATTERN = /^sp_\d+$/i;

const EMPTY_FORM: CreateAiSpecialtyDto = {
    ai_code: '',
    ai_name: '',
    ai_name_vi: '',
    description: '',
};

function primarySpecialtyName(item: AiSpecialty): string {
    const primary = item.mappings?.find((m) => m.is_primary && m.is_active !== false);
    return primary?.specialty?.specialty_name || '—';
}

export function AiSpecialtyMappingPanel() {
    const accessToken = useAuthStore((s) => s.accessToken);

    const [items, setItems] = useState<AiSpecialty[]>([]);
    const [hospitalSpecialties, setHospitalSpecialties] = useState<Specialty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<AiSpecialty | null>(null);
    const [form, setForm] = useState<CreateAiSpecialtyDto>(EMPTY_FORM);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [togglingTarget, setTogglingTarget] = useState<AiSpecialty | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [toggleError, setToggleError] = useState<string | null>(null);

    const [mappingTarget, setMappingTarget] = useState<AiSpecialty | null>(null);

    const loadItems = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await aiSpecialtyService.getAiSpecialties(accessToken, { page: 1, limit: 500 });
            const { data } = extractAiSpecialtyList(res?.data);
            setItems(data);
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải danh sách mã AI specialty.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken]);

    const loadHospitalSpecialties = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await specialtyService.getSpecialties(accessToken, { page: 1, limit: 500, is_active: true });
            const { data } = extractSpecialtyList(res?.data);
            setHospitalSpecialties(data);
        } catch {
            // dropdown stays empty if this fails
        }
    }, [accessToken]);

    useEffect(() => {
        void loadItems();
        void loadHospitalSpecialties();
    }, [loadItems, loadHospitalSpecialties]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return items.filter((item) => {
            if (!showInactive && item.is_active === false) return false;
            if (!q) return true;
            return (
                item.ai_code.toLowerCase().includes(q) ||
                item.ai_name.toLowerCase().includes(q) ||
                (item.ai_name_vi || '').toLowerCase().includes(q)
            );
        });
    }, [items, searchQuery, showInactive]);

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

    const openEdit = (item: AiSpecialty) => {
        setEditing(item);
        setForm({
            ai_code: item.ai_code,
            ai_name: item.ai_name,
            ai_name_vi: item.ai_name_vi || '',
            description: item.description || '',
        });
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!accessToken) return;
        const ai_code = form.ai_code.trim();
        const ai_name = form.ai_name.trim();
        if (!AI_CODE_PATTERN.test(ai_code)) {
            setFormError('Mã AI phải có dạng sp_<số>, ví dụ sp_12.');
            return;
        }
        if (!ai_name) {
            setFormError('Vui lòng nhập tên tiếng Anh (ai_name).');
            return;
        }

        setIsSaving(true);
        setFormError(null);
        try {
            const body: CreateAiSpecialtyDto = {
                ai_code,
                ai_name,
                ai_name_vi: form.ai_name_vi?.trim() || undefined,
                description: form.description?.trim() || undefined,
            };
            if (editing) {
                await aiSpecialtyService.updateAiSpecialty(editing.ai_specialty_id, body, accessToken);
            } else {
                await aiSpecialtyService.createAiSpecialty(body, accessToken);
            }
            setIsModalOpen(false);
            await loadItems();
        } catch (err) {
            setFormError(getErrorMessage(err, 'Không thể lưu mã AI specialty.'));
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
                await aiSpecialtyService.deleteAiSpecialty(togglingTarget.ai_specialty_id, accessToken);
            } else {
                await aiSpecialtyService.updateAiSpecialty(
                    togglingTarget.ai_specialty_id,
                    { is_active: true },
                    accessToken
                );
            }
            setTogglingTarget(null);
            await loadItems();
        } catch (err) {
            setToggleError(getErrorMessage(err, 'Không thể cập nhật trạng thái mã AI.'));
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <p className="text-[13px] text-[#7B7B7B] font-medium">
                    Danh mục mã Infermedica và khoa bệnh viện primary dùng khi AI gợi ý chuyên khoa.
                </p>
                <button
                    type="button"
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Thêm mã AI
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
                        placeholder="Tìm theo mã hoặc tên Infermedica..."
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
                    <div className="p-12 text-center text-sm text-neutral-500">Chưa có mã AI specialty nào.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200 text-left text-xs font-bold text-neutral-500 uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3">Mã AI</th>
                                    <th className="px-4 py-3">Tên EN / VI</th>
                                    <th className="px-4 py-3">Khoa primary</th>
                                    <th className="px-4 py-3">Mapping</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {paginated.map((item) => {
                                    const active = item.is_active !== false;
                                    const mappingCount = item.mappings?.length ?? 0;
                                    return (
                                        <tr key={item.ai_specialty_id} className="hover:bg-neutral-50/80">
                                            <td className="px-4 py-3 font-mono text-xs text-neutral-600">{item.ai_code}</td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-neutral-800">{item.ai_name}</span>
                                                {item.ai_name_vi && (
                                                    <p className="text-[11px] text-neutral-400 mt-0.5">{item.ai_name_vi}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-neutral-700 font-medium">
                                                {primarySpecialtyName(item)}
                                            </td>
                                            <td className="px-4 py-3 text-neutral-500">{mappingCount}</td>
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
                                                        onClick={() => setMappingTarget(item)}
                                                        className="p-2 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-neutral-50 cursor-pointer"
                                                        title="Quản lý mapping"
                                                    >
                                                        <Link2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(item)}
                                                        className="p-2 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-neutral-50 cursor-pointer"
                                                        title="Sửa"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setToggleError(null);
                                                            setTogglingTarget(item);
                                                        }}
                                                        className={cn(
                                                            'p-2 rounded-lg hover:bg-neutral-50 cursor-pointer',
                                                            active
                                                                ? 'text-neutral-400 hover:text-red-500'
                                                                : 'text-neutral-400 hover:text-emerald-600'
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
                        {Math.min(filtered.length, safePage * ITEMS_PER_PAGE)} trong số {filtered.length} mã AI
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
                                {editing ? 'Cập nhật mã AI specialty' : 'Thêm mã AI specialty'}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"
                            >
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
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Mã AI *</label>
                                <input
                                    value={form.ai_code}
                                    onChange={(e) => setForm((f) => ({ ...f, ai_code: e.target.value.toLowerCase() }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium font-mono"
                                    placeholder="sp_12"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Tên tiếng Anh *</label>
                                <input
                                    value={form.ai_name}
                                    onChange={(e) => setForm((f) => ({ ...f, ai_name: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    placeholder="Cardiologist"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Tên tiếng Việt</label>
                                <input
                                    value={form.ai_name_vi || ''}
                                    onChange={(e) => setForm((f) => ({ ...f, ai_name_vi: e.target.value }))}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                    placeholder="Bác sĩ tim mạch"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Mô tả</label>
                                <textarea
                                    value={form.description || ''}
                                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                    rows={3}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium resize-none"
                                    placeholder="Mã chuyên khoa Infermedica..."
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
                    entityName={`${togglingTarget.ai_code} · ${togglingTarget.ai_name_vi || togglingTarget.ai_name}`}
                    isActive={togglingTarget.is_active !== false}
                    isSubmitting={isToggling}
                    error={toggleError}
                    onConfirm={() => void handleToggleActive()}
                    onCancel={() => setTogglingTarget(null)}
                />
            )}

            {mappingTarget && (
                <AiSpecialtyMappingsDrawer
                    item={mappingTarget}
                    hospitalSpecialties={hospitalSpecialties}
                    accessToken={accessToken}
                    onClose={() => setMappingTarget(null)}
                    onChanged={() => void loadItems()}
                />
            )}
        </div>
    );
}
