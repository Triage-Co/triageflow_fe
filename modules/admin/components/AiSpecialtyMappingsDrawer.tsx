'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, Plus, Power, PowerOff, Star, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Specialty } from '../types/specialty.types';
import type { AiSpecialty, AiSpecialtyMapping } from '../types/aiSpecialty.types';
import { aiSpecialtyService, extractAiSpecialtyMappings } from '../services/aiSpecialtyService';
import { getErrorMessage } from '../utils/errorMessage';

interface AiSpecialtyMappingsDrawerProps {
    item: AiSpecialty;
    hospitalSpecialties: Specialty[];
    accessToken: string | null;
    onClose: () => void;
    onChanged: () => void;
}

function mappingSpecialtyId(m: AiSpecialtyMapping): string {
    return m.specialty_id || m.specialty?.specialty_id || '';
}

export function AiSpecialtyMappingsDrawer({
    item,
    hospitalSpecialties,
    accessToken,
    onClose,
    onChanged,
}: AiSpecialtyMappingsDrawerProps) {
    const [mappings, setMappings] = useState<AiSpecialtyMapping[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [isAdding, setIsAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('');
    const [addAsPrimary, setAddAsPrimary] = useState(false);
    const [addSortOrder, setAddSortOrder] = useState(0);
    const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

    const load = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await aiSpecialtyService.getMappings(item.ai_specialty_id, accessToken);
            setMappings(extractAiSpecialtyMappings(res?.data));
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải danh sách mapping.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, item.ai_specialty_id]);

    useEffect(() => {
        void load();
    }, [load]);

    const mappedIds = useMemo(
        () => new Set(mappings.map(mappingSpecialtyId).filter(Boolean)),
        [mappings]
    );

    const availableSpecialties = useMemo(
        () =>
            hospitalSpecialties.filter(
                (sp) => sp.is_active !== false && !mappedIds.has(sp.specialty_id)
            ),
        [hospitalSpecialties, mappedIds]
    );

    const openAdd = () => {
        setAddError(null);
        setSelectedSpecialtyId(availableSpecialties[0]?.specialty_id || '');
        setAddAsPrimary(mappings.filter((m) => m.is_active !== false).length === 0);
        setAddSortOrder(mappings.length);
        setIsAdding(true);
    };

    const handleAdd = async () => {
        if (!accessToken || !selectedSpecialtyId) return;
        setIsSubmittingAdd(true);
        setAddError(null);
        try {
            await aiSpecialtyService.createMapping(
                item.ai_specialty_id,
                {
                    specialty_id: selectedSpecialtyId,
                    is_primary: addAsPrimary,
                    sort_order: addSortOrder,
                },
                accessToken
            );
            setIsAdding(false);
            await load();
            onChanged();
        } catch (err) {
            setAddError(getErrorMessage(err, 'Không thể gắn khoa bệnh viện.'));
        } finally {
            setIsSubmittingAdd(false);
        }
    };

    const handleSetPrimary = async (mapping: AiSpecialtyMapping) => {
        if (!accessToken || mapping.is_primary) return;
        setBusyId(mapping.mapping_id);
        setError(null);
        try {
            await aiSpecialtyService.updateMapping(
                item.ai_specialty_id,
                mapping.mapping_id,
                { is_primary: true },
                accessToken
            );
            await load();
            onChanged();
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể đặt khoa primary.'));
        } finally {
            setBusyId(null);
        }
    };

    const handleToggleActive = async (mapping: AiSpecialtyMapping) => {
        if (!accessToken) return;
        setBusyId(mapping.mapping_id);
        setError(null);
        try {
            await aiSpecialtyService.updateMapping(
                item.ai_specialty_id,
                mapping.mapping_id,
                { is_active: !mapping.is_active },
                accessToken
            );
            await load();
            onChanged();
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể cập nhật trạng thái mapping.'));
        } finally {
            setBusyId(null);
        }
    };

    const handleSortOrderBlur = async (mapping: AiSpecialtyMapping, raw: string) => {
        if (!accessToken) return;
        const next = Number(raw);
        if (!Number.isInteger(next) || next < 0 || next === mapping.sort_order) return;
        setBusyId(mapping.mapping_id);
        setError(null);
        try {
            await aiSpecialtyService.updateMapping(
                item.ai_specialty_id,
                mapping.mapping_id,
                { sort_order: next },
                accessToken
            );
            await load();
            onChanged();
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể cập nhật thứ tự.'));
        } finally {
            setBusyId(null);
        }
    };

    const handleDelete = async (mapping: AiSpecialtyMapping) => {
        if (!accessToken) return;
        setBusyId(mapping.mapping_id);
        setError(null);
        try {
            await aiSpecialtyService.deleteMapping(item.ai_specialty_id, mapping.mapping_id, accessToken);
            await load();
            onChanged();
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể xóa mapping.'));
        } finally {
            setBusyId(null);
        }
    };

    const displayName = (m: AiSpecialtyMapping) => {
        const fromNested = m.specialty?.specialty_name;
        if (fromNested) return fromNested;
        const match = hospitalSpecialties.find((sp) => sp.specialty_id === mappingSpecialtyId(m));
        return match?.specialty_name || mappingSpecialtyId(m);
    };

    const displayCode = (m: AiSpecialtyMapping) => {
        const fromNested = m.specialty?.specialty_code;
        if (fromNested) return fromNested;
        const match = hospitalSpecialties.find((sp) => sp.specialty_id === mappingSpecialtyId(m));
        return match?.specialty_code || '';
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                    <div>
                        <h2 className="font-bold text-neutral-900">Mapping khoa bệnh viện</h2>
                        <p className="text-xs text-neutral-500 font-medium mt-0.5">
                            {item.ai_code} · {item.ai_name_vi || item.ai_name}
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {error && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 whitespace-pre-line">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{error}</span>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={openAdd}
                        disabled={!item.is_active || availableSpecialties.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Plus className="w-4 h-4" />
                        Gắn khoa bệnh viện
                    </button>
                    {!item.is_active && (
                        <p className="text-[11px] text-neutral-400 font-medium">
                            Không thể thêm mapping khi mã AI đang tắt.
                        </p>
                    )}

                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="w-6 h-6 animate-spin text-[#8B7CF6]" />
                        </div>
                    ) : mappings.length === 0 ? (
                        <p className="text-sm text-neutral-500 text-center py-8">Chưa gắn khoa bệnh viện nào.</p>
                    ) : (
                        <div className="space-y-2">
                            {mappings.map((m) => {
                                const busy = busyId === m.mapping_id;
                                return (
                                    <div
                                        key={m.mapping_id}
                                        className="border border-neutral-200 rounded-xl px-3.5 py-2.5 space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-neutral-800 truncate">{displayName(m)}</p>
                                                <p className="text-[11px] font-mono text-neutral-400">{displayCode(m)}</p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    {m.is_primary && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-100">
                                                            Primary
                                                        </span>
                                                    )}
                                                    <span
                                                        className={cn(
                                                            'text-[10px] font-bold px-1.5 py-0.5 rounded-full border',
                                                            m.is_active
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                                : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                                                        )}
                                                    >
                                                        {m.is_active ? 'Đang hoạt động' : 'Ngừng'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => void handleSetPrimary(m)}
                                                    disabled={busy || m.is_primary || !m.is_active}
                                                    className={cn(
                                                        'w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition cursor-pointer disabled:opacity-40',
                                                        m.is_primary ? 'text-amber-500' : 'text-neutral-400 hover:text-amber-500'
                                                    )}
                                                    title="Đặt primary"
                                                >
                                                    <Star className={cn('w-3.5 h-3.5', m.is_primary && 'fill-amber-400')} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleToggleActive(m)}
                                                    disabled={busy}
                                                    className={cn(
                                                        'w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition cursor-pointer disabled:opacity-50',
                                                        m.is_active ? 'text-neutral-400 hover:text-red-500' : 'text-neutral-400 hover:text-emerald-600'
                                                    )}
                                                    title={m.is_active ? 'Tắt mapping' : 'Bật mapping'}
                                                >
                                                    {busy ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : m.is_active ? (
                                                        <PowerOff className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Power className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void handleDelete(m)}
                                                    disabled={busy}
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-red-500 hover:bg-neutral-50 transition cursor-pointer disabled:opacity-50"
                                                    title="Xóa mapping"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <label className="flex items-center gap-2 text-[11px] font-bold text-neutral-500">
                                            Thứ tự
                                            <input
                                                type="number"
                                                min={0}
                                                defaultValue={m.sort_order}
                                                key={`${m.mapping_id}-${m.sort_order}`}
                                                onBlur={(e) => void handleSortOrderBlur(m, e.target.value)}
                                                className="w-16 border border-neutral-200 rounded-lg px-2 py-1 text-xs font-medium"
                                            />
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {isAdding && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
                    onClick={() => setIsAdding(false)}
                >
                    <div
                        className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-neutral-100"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h3 className="font-bold text-neutral-900">Gắn khoa bệnh viện</h3>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="p-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-3">
                            {addError && (
                                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 whitespace-pre-line">
                                    {addError}
                                </div>
                            )}
                            {availableSpecialties.length === 0 ? (
                                <p className="text-sm text-neutral-500">Không còn khoa nào để gắn.</p>
                            ) : (
                                <>
                                    <select
                                        value={selectedSpecialtyId}
                                        onChange={(e) => setSelectedSpecialtyId(e.target.value)}
                                        className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                    >
                                        {availableSpecialties.map((sp) => (
                                            <option key={sp.specialty_id} value={sp.specialty_id}>
                                                {sp.specialty_name} ({sp.specialty_code})
                                            </option>
                                        ))}
                                    </select>
                                    <label className="flex items-center gap-2 text-xs font-bold text-neutral-600">
                                        Thứ tự
                                        <input
                                            type="number"
                                            min={0}
                                            value={addSortOrder}
                                            onChange={(e) => setAddSortOrder(Number(e.target.value) || 0)}
                                            className="w-20 border border-neutral-200 rounded-lg px-2 py-1.5 text-sm font-medium"
                                        />
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={addAsPrimary}
                                            onChange={(e) => setAddAsPrimary(e.target.checked)}
                                        />
                                        Đặt làm khoa primary
                                    </label>
                                </>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleAdd()}
                                disabled={isSubmittingAdd || !selectedSpecialtyId}
                                className="px-4 py-2 rounded-xl bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                            >
                                {isSubmittingAdd && <Loader2 className="w-4 h-4 animate-spin" />}
                                Gắn
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
