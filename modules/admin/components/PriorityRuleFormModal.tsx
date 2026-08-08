'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Specialty } from '../types/specialty.types';
import {
    QUEUE_RULE_TYPE_OPTIONS,
    type CreatePriorityRuleDto,
    type QueuePriorityRule,
    type QueueRuleType,
    type UpdatePriorityRuleDto,
} from '../types/queueRule.types';
import { ROOM_TYPE_OPTIONS } from '../types/process.types';

export interface PriorityRuleFormValues {
    rule_code: string;
    name: string;
    description?: string;
    rule_type: QueueRuleType;
    weight?: number;
    aging_rate?: number;
    max_aging?: number;
    conditions?: Record<string, unknown>;
    params?: Record<string, unknown>;
    room_type?: string;
    specialty_id?: string;
    is_active?: boolean;
}

export interface PriorityRuleFormModalProps {
    editing: QueuePriorityRule | null;
    specialties: Specialty[];
    isSaving: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (values: PriorityRuleFormValues) => void;
}

interface FormState {
    rule_code: string;
    name: string;
    description: string;
    rule_type: QueueRuleType;
    weight: string;
    aging_rate: string;
    max_aging: string;
    room_type: string;
    specialty_id: string;
    conditions_json: string;
    params_json: string;
    is_active: boolean;
}

function toFormState(editing: QueuePriorityRule | null): FormState {
    if (!editing) {
        return {
            rule_code: '',
            name: '',
            description: '',
            rule_type: 'PATIENT_CATEGORY',
            weight: '0',
            aging_rate: '0',
            max_aging: '0',
            room_type: '',
            specialty_id: '',
            conditions_json: '',
            params_json: '',
            is_active: true,
        };
    }
    return {
        rule_code: editing.rule_code || '',
        name: editing.name || '',
        description: editing.description || '',
        rule_type: editing.rule_type,
        weight: String(editing.weight ?? 0),
        aging_rate: String(editing.aging_rate ?? 0),
        max_aging: String(editing.max_aging ?? 0),
        room_type: editing.room_type || '',
        specialty_id: editing.specialty_id || '',
        conditions_json: editing.conditions ? JSON.stringify(editing.conditions, null, 2) : '',
        params_json: editing.params ? JSON.stringify(editing.params, null, 2) : '',
        is_active: editing.is_active !== false,
    };
}

function parseJsonField(raw: string, fieldLabel: string): Record<string, unknown> | undefined {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    let parsed: unknown;
    try {
        parsed = JSON.parse(trimmed);
    } catch {
        throw new Error(`${fieldLabel} không phải JSON hợp lệ.`);
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`${fieldLabel} phải là một object JSON (ví dụ: { "key": "value" }).`);
    }
    return parsed as Record<string, unknown>;
}

export function PriorityRuleFormModal({
    editing,
    specialties,
    isSaving,
    error,
    onClose,
    onSubmit,
}: PriorityRuleFormModalProps) {
    const [form, setForm] = useState<FormState>(() => toFormState(editing));
    const [localError, setLocalError] = useState<string | null>(null);

    const specialtyOptions = (() => {
        const list = [...specialties];
        if (editing?.specialty_id && !list.some((s) => s.specialty_id === editing.specialty_id)) {
            if (editing.specialty) {
                list.push({ ...editing.specialty, is_active: true });
            }
        }
        return list;
    })();

    const handleSubmit = () => {
        setLocalError(null);
        const code = form.rule_code.trim().toUpperCase();
        const name = form.name.trim();

        if (!editing) {
            if (!code || !/^[A-Z0-9_]+$/.test(code)) {
                setLocalError('Mã quy tắc bắt buộc, chỉ gồm chữ in hoa, số và dấu gạch dưới.');
                return;
            }
        }
        if (!name) {
            setLocalError('Vui lòng nhập tên quy tắc.');
            return;
        }
        if (!form.rule_type) {
            setLocalError('Vui lòng chọn loại quy tắc.');
            return;
        }

        const weight = form.weight.trim() === '' ? 0 : Number(form.weight);
        const agingRate = form.aging_rate.trim() === '' ? 0 : Number(form.aging_rate);
        const maxAging = form.max_aging.trim() === '' ? 0 : Number(form.max_aging);

        if (!Number.isInteger(weight) || weight < -100 || weight > 100) {
            setLocalError('Trọng số (weight) phải là số nguyên trong khoảng -100 đến 100.');
            return;
        }
        if (!Number.isFinite(agingRate) || agingRate < 0 || agingRate > 10) {
            setLocalError('Điểm tăng theo thời gian (aging_rate) phải trong khoảng 0 đến 10.');
            return;
        }
        if (!Number.isFinite(maxAging) || maxAging < 0 || maxAging > 100) {
            setLocalError('Giới hạn aging tối đa (max_aging) phải trong khoảng 0 đến 100.');
            return;
        }

        let conditions: Record<string, unknown> | undefined;
        let params: Record<string, unknown> | undefined;
        try {
            conditions = parseJsonField(form.conditions_json, 'Điều kiện áp dụng (conditions)');
            params = parseJsonField(form.params_json, 'Tham số bổ sung (params)');
        } catch (err) {
            setLocalError(err instanceof Error ? err.message : 'JSON không hợp lệ.');
            return;
        }

        onSubmit({
            rule_code: code,
            name,
            description: form.description.trim() || undefined,
            rule_type: form.rule_type,
            weight,
            aging_rate: agingRate,
            max_aging: maxAging,
            conditions,
            params,
            room_type: form.room_type || undefined,
            specialty_id: form.specialty_id || undefined,
            is_active: editing ? form.is_active : undefined,
        });
    };

    const displayError = localError || error;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-neutral-100 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 shrink-0">
                    <h2 className="font-bold text-neutral-900">
                        {editing ? 'Cập nhật quy tắc ưu tiên' : 'Thêm quy tắc ưu tiên'}
                    </h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto flex-1">
                    {displayError && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-line">
                            {displayError}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                Mã quy tắc {!editing && '*'}
                            </label>
                            <input
                                value={form.rule_code}
                                disabled={!!editing}
                                onChange={(e) => setForm((f) => ({ ...f, rule_code: e.target.value.toUpperCase() }))}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium font-mono disabled:bg-neutral-50 disabled:text-neutral-400"
                                placeholder="PEDIATRIC_CUSTOM"
                            />
                            {editing && (
                                <p className="text-[10px] text-neutral-400 font-semibold mt-1">Không thể đổi mã sau khi tạo.</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Tên quy tắc *</label>
                            <input
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                                placeholder="Ưu tiên trẻ em dưới 6 tuổi"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Mô tả</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            rows={2}
                            className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium resize-none"
                            placeholder="Cộng thêm điểm cho bệnh nhân nhi..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Loại quy tắc *</label>
                            <select
                                value={form.rule_type}
                                onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value as QueueRuleType }))}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                            >
                                {QUEUE_RULE_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Chuyên khoa</label>
                            <select
                                value={form.specialty_id}
                                onChange={(e) => setForm((f) => ({ ...f, specialty_id: e.target.value }))}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                            >
                                <option value="">Áp dụng mọi chuyên khoa</option>
                                {specialtyOptions.map((sp) => (
                                    <option key={sp.specialty_id} value={sp.specialty_id}>
                                        {sp.specialty_name}
                                        {sp.is_active === false ? ' (đã tắt)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">Loại phòng</label>
                        <select
                            value={form.room_type}
                            onChange={(e) => setForm((f) => ({ ...f, room_type: e.target.value }))}
                            className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                        >
                            <option value="">Áp dụng mọi loại phòng</option>
                            {ROOM_TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                Trọng số (-100…100)
                            </label>
                            <input
                                type="number"
                                min={-100}
                                max={100}
                                value={form.weight}
                                onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                Điểm/phút chờ (0…10)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={form.aging_rate}
                                onChange={(e) => setForm((f) => ({ ...f, aging_rate: e.target.value }))}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                Aging tối đa (0…100)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={form.max_aging}
                                onChange={(e) => setForm((f) => ({ ...f, max_aging: e.target.value }))}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                Điều kiện áp dụng (JSON)
                            </label>
                            <textarea
                                value={form.conditions_json}
                                onChange={(e) => setForm((f) => ({ ...f, conditions_json: e.target.value }))}
                                rows={4}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-mono resize-none"
                                placeholder={'{ "age": { "lt": 6 } }'}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-neutral-500 uppercase block mb-1">
                                Tham số bổ sung (JSON)
                            </label>
                            <textarea
                                value={form.params_json}
                                onChange={(e) => setForm((f) => ({ ...f, params_json: e.target.value }))}
                                rows={4}
                                className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-xs font-mono resize-none"
                                placeholder={'{ "hold_positions": 3 }'}
                            />
                        </div>
                    </div>

                    {editing && (
                        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                                className="accent-brand-500"
                            />
                            Đang hoạt động
                        </label>
                    )}
                </div>
                <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold cursor-pointer"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                    >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Lưu
                    </button>
                </div>
            </div>
        </div>
    );
}
