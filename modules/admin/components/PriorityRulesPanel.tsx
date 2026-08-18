'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ListOrdered, Loader2, Pencil, Plus, Power, PowerOff, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { extractList, queueAdminService } from '../services/queueAdminService';
import { specialtyService, extractSpecialtyList } from '../services/specialtyService';
import type { Specialty } from '../types/specialty.types';
import {
    QUEUE_RULE_TYPE_OPTIONS,
    type QueuePriorityRule,
    type QueueRuleType,
} from '../types/queueRule.types';
import { ROOM_TYPE_OPTIONS } from '../types/process.types';
import { getCompactPages } from '../utils/pagination';
import { getErrorMessage } from '../utils/errorMessage';
import { SoftDisableConfirmDialog } from './SoftDisableConfirmDialog';
import { PriorityRuleFormModal, type PriorityRuleFormValues } from './PriorityRuleFormModal';

const ITEMS_PER_PAGE = 6;

function roomTypeLabel(value?: string | null): string {
    if (!value) return 'Mọi loại phòng';
    return ROOM_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
}

function ruleTypeLabel(value: QueueRuleType): string {
    return QUEUE_RULE_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
}

function shortRuleTypeLabel(value: QueueRuleType): string {
    const MAP: Record<QueueRuleType, string> = {
        PATIENT_CATEGORY: 'Đối tượng ưu tiên',
        APPOINTMENT: 'Lịch hẹn đúng giờ',
        WALK_IN: 'Khách vãng lai',
        RETURNING: 'Quay lại sau CLS',
        MISSED_TURN: 'Lỡ lượt gọi',
        TRANSFER: 'Chuyển hội chẩn',
        QUICK_TASK: 'Thủ thuật nhanh',
        AGING: 'Cộng điểm chờ',
        REBALANCE: 'Cân bằng tải',
    };
    return MAP[value] || ruleTypeLabel(value);
}

export function PriorityRulesPanel({ createTrigger }: { createTrigger?: number } = {}) {
    const accessToken = useAuthStore((s) => s.accessToken);

    const [rules, setRules] = useState<QueuePriorityRule[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [ruleTypeFilter, setRuleTypeFilter] = useState<string>('');
    const [showInactive, setShowInactive] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<QueuePriorityRule | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [togglingTarget, setTogglingTarget] = useState<QueuePriorityRule | null>(null);
    const [isToggling, setIsToggling] = useState(false);
    const [toggleError, setToggleError] = useState<string | null>(null);

    const openCreate = () => {
        setEditing(null);
        setFormError(null);
        setIsModalOpen(true);
    };

    useEffect(() => {
        if (createTrigger && createTrigger > 0) {
            openCreate();
        }
    }, [createTrigger]);

    const loadRules = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await queueAdminService.getRules(accessToken, {
                rule_type: (ruleTypeFilter as QueueRuleType) || undefined,
                is_active: showInactive ? undefined : true,
            });
            setRules(extractList<QueuePriorityRule>(res?.data));
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải danh sách quy tắc ưu tiên.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, ruleTypeFilter, showInactive]);

    const loadSpecialties = useCallback(async () => {
        if (!accessToken) return;
        try {
            const res = await specialtyService.getSpecialties(accessToken, { page: 1, limit: 500, is_active: true });
            const { data } = extractSpecialtyList(res?.data);
            setSpecialties(data);
        } catch {
            // non-blocking — specialty dropdown just stays empty if this fails
        }
    }, [accessToken]);

    useEffect(() => {
        void loadRules();
    }, [loadRules]);

    useEffect(() => {
        void loadSpecialties();
    }, [loadSpecialties]);

    const filtered = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rules;
        return rules.filter((r) => {
            const code = (r.rule_code || '').toLowerCase();
            const name = (r.name || '').toLowerCase();
            return code.includes(q) || name.includes(q);
        });
    }, [rules, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = useMemo(
        () => filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
        [filtered, safePage]
    );

    const openEdit = (rule: QueuePriorityRule) => {
        setEditing(rule);
        setFormError(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (values: PriorityRuleFormValues) => {
        if (!accessToken) return;
        setIsSaving(true);
        setFormError(null);
        try {
            if (editing) {
                const { rule_code: _ignored, ...updateBody } = values;
                await queueAdminService.updateRule(editing.rule_id, updateBody, accessToken);
            } else {
                await queueAdminService.createRule(
                    {
                        rule_code: values.rule_code,
                        name: values.name,
                        description: values.description,
                        rule_type: values.rule_type,
                        weight: values.weight,
                        aging_rate: values.aging_rate,
                        max_aging: values.max_aging,
                        conditions: values.conditions,
                        params: values.params,
                        room_type: values.room_type,
                        specialty_id: values.specialty_id,
                    },
                    accessToken
                );
            }
            setIsModalOpen(false);
            await loadRules();
        } catch (err) {
            setFormError(getErrorMessage(err, 'Không thể lưu quy tắc ưu tiên.'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleToggleActive = async () => {
        if (!accessToken || !togglingTarget) return;
        setIsToggling(true);
        setToggleError(null);
        try {
            const willDeactivate = togglingTarget.is_active !== false;
            if (willDeactivate) {
                await queueAdminService.deactivateRule(togglingTarget.rule_id, accessToken);
            } else {
                await queueAdminService.updateRule(togglingTarget.rule_id, { is_active: true }, accessToken);
            }
            setTogglingTarget(null);
            await loadRules();
        } catch (err) {
            setToggleError(getErrorMessage(err, 'Không thể cập nhật trạng thái quy tắc.'));
        } finally {
            setIsToggling(false);
        }
    };

    return (
        <div className="space-y-5">
            <div>
                <h2 className="text-[15px] font-bold text-neutral-900 flex items-center gap-2">
                    <ListOrdered className="w-4 h-4 text-brand-500" />
                    Quy tắc ưu tiên hàng chờ
                </h2>
                <p className="text-[12px] text-[#7B7B7B] font-medium mt-1">
                    Cấu hình trọng số ưu tiên, cộng điểm theo thời gian chờ và điều kiện áp dụng.
                </p>
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
                        placeholder="Tìm theo mã hoặc tên quy tắc..."
                        className="flex-1 text-sm outline-none bg-transparent"
                    />
                </div>
                <select
                    value={ruleTypeFilter}
                    onChange={(e) => {
                        setRuleTypeFilter(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="text-sm font-medium border border-neutral-200 rounded-xl px-3 py-2 bg-white text-neutral-700"
                >
                    <option value="">Tất cả loại quy tắc</option>
                    {QUEUE_RULE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
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
                    <div className="p-12 text-center text-sm text-neutral-500">Chưa có quy tắc ưu tiên nào.</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-neutral-50 border-b border-neutral-200 text-left text-xs font-bold text-neutral-500 uppercase tracking-wide">
                            <tr>
                                <th className="px-3.5 py-3 whitespace-nowrap">Mã</th>
                                <th className="px-3.5 py-3">Tên quy tắc</th>
                                <th className="px-3.5 py-3 whitespace-nowrap">Loại</th>
                                <th className="px-3 py-3 text-center whitespace-nowrap">Trọng số</th>
                                <th className="px-3 py-3 text-center whitespace-nowrap">Aging</th>
                                <th className="px-3.5 py-3 whitespace-nowrap">Phòng</th>
                                <th className="px-3.5 py-3 whitespace-nowrap">Chuyên khoa</th>
                                <th className="px-3.5 py-3 whitespace-nowrap">Trạng thái</th>
                                <th className="px-3.5 py-3 text-right whitespace-nowrap">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {paginated.map((rule) => {
                                const active = rule.is_active !== false;
                                return (
                                    <tr key={rule.rule_id} className="hover:bg-neutral-50/80">
                                        <td className="px-3.5 py-3 font-mono text-xs text-neutral-600 whitespace-nowrap">{rule.rule_code}</td>
                                        <td className="px-3.5 py-3">
                                            <span className="font-semibold text-neutral-800">{rule.name}</span>
                                            {rule.description && (
                                                <p className="text-[11px] text-neutral-400 mt-0.5 max-w-[200px] truncate">
                                                    {rule.description}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-3.5 py-3 text-neutral-600 text-[12px] whitespace-nowrap">{shortRuleTypeLabel(rule.rule_type)}</td>
                                        <td className="px-3 py-3 text-center font-mono text-xs font-bold whitespace-nowrap">{rule.weight}</td>
                                        <td className="px-3 py-3 text-center font-mono text-xs text-neutral-500 whitespace-nowrap">
                                            {rule.aging_rate}/{rule.max_aging}
                                        </td>
                                        <td className="px-3.5 py-3 text-neutral-600 text-[12px] whitespace-nowrap">{roomTypeLabel(rule.room_type)}</td>
                                        <td className="px-3.5 py-3 text-neutral-600 text-[12px] whitespace-nowrap">
                                            {rule.specialty?.specialty_name || '—'}
                                        </td>
                                        <td className="px-3.5 py-3 whitespace-nowrap">
                                            <span
                                                className={cn(
                                                    'text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap inline-flex items-center',
                                                    active
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                        : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                                                )}
                                            >
                                                {active ? 'Đang hoạt động' : 'Ngừng'}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-3 whitespace-nowrap">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(rule)}
                                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-[#8B7CF6] hover:bg-neutral-50 cursor-pointer"
                                                    title="Sửa"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setToggleError(null);
                                                        setTogglingTarget(rule);
                                                    }}
                                                    className={cn(
                                                        'p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer',
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
                )}
            </div>

            {filtered.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                    <p className="text-[12px] text-[#ADADAD] font-bold">
                        Hiển thị {Math.min(filtered.length, (safePage - 1) * ITEMS_PER_PAGE + 1)}
                        {' - '}
                        {Math.min(filtered.length, safePage * ITEMS_PER_PAGE)} trong số {filtered.length} quy tắc
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
                <PriorityRuleFormModal
                    editing={editing}
                    specialties={specialties}
                    isSaving={isSaving}
                    error={formError}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={(values) => void handleSubmit(values)}
                />
            )}

            {togglingTarget && (
                <SoftDisableConfirmDialog
                    entityName={togglingTarget.name}
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
