'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Flag, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlaggableRule } from '../types/ruleFlag.types';

export type RuleFlagAccent = 'purple' | 'indigo';

interface RuleFlagChipPickerProps {
    rules: FlaggableRule[];
    selectedCodes: string[];
    /** Auto-applied rule_codes from the engine (shown once, Vietnamese, no remove). */
    appliedCodes?: string[];
    onChange: (codes: string[]) => void;
    disabled?: boolean;
    compact?: boolean;
    isLoading?: boolean;
    accent?: RuleFlagAccent;
    className?: string;
    label?: string;
    hideAdd?: boolean;
    /** Refresh catalog when the popover opens (admin may have added flags). */
    onRefreshRules?: (opts?: { silent?: boolean }) => void | Promise<void>;
}

/** Engine noise: already covered by queue_type badge, or matches everyone. */
const HIDDEN_APPLIED_CODES = new Set([
    'WALK_IN_BASE',
    'WALK_IN',
    'APPOINTMENT_ON_TIME',
]);

/**
 * Auto chips on a patient card: only built-in detections (age / triage / transfer).
 * Admin catalog flags (WHEELCHAIR, …) appear only after staff attaches them.
 */
const SYSTEM_AUTO_CHIP_CODES = new Set([
    'PEDIATRIC',
    'PEDIATRIC_ACUTE',
    'GERIATRIC',
    'TRIAGE_HIGH',
    'TRANSFER_PRIORITY',
]);

const FALLBACK_RULE_NAMES: Record<string, string> = {
    PEDIATRIC: 'Nhi khoa thường',
    PEDIATRIC_ACUTE: 'Nhi khoa cấp tính',
    GERIATRIC: 'Lão khoa',
    TRIAGE_HIGH: 'Ưu tiên từ Triage',
    APPOINTMENT_ON_TIME: 'Lịch hẹn đúng giờ',
    WALK_IN_BASE: 'Bệnh nhân vãng lai',
    RETURNING_INTERLEAVE: 'Bệnh nhân trả kết quả CLS',
    QUICK_TASK_INTERLEAVE: 'Thủ thuật / Việc nhanh',
    TRANSFER_PRIORITY: 'Chuyển phòng hội chẩn',
};

const ACCENT: Record<
    RuleFlagAccent,
    { selected: string; idle: string; label: string; add: string; panel: string }
> = {
    purple: {
        selected: 'bg-[#8B7CF6] text-white border-[#8B7CF6]',
        idle: 'bg-white text-[#5B4EC9] border-[#EDE9FE] hover:border-[#8B7CF6]/50 hover:bg-[#F5F3FF]',
        label: 'text-[#5B4EC9]',
        add: 'border-[#DDD6FE] text-[#5B4EC9] hover:bg-[#F5F3FF]',
        panel: 'border-[#EDE9FE]',
    },
    indigo: {
        selected: 'bg-indigo-600 text-white border-indigo-600',
        idle: 'bg-white text-indigo-700 border-indigo-200/80 hover:border-indigo-300 hover:bg-indigo-50/70',
        label: 'text-indigo-700',
        add: 'border-indigo-200 text-indigo-700 hover:bg-indigo-50',
        panel: 'border-indigo-100',
    },
};

export function RuleFlagChipPicker({
    rules,
    selectedCodes,
    appliedCodes = [],
    onChange,
    disabled = false,
    compact = false,
    isLoading = false,
    accent = 'purple',
    className,
    label = 'Cờ ưu tiên',
    hideAdd = false,
    onRefreshRules,
}: RuleFlagChipPickerProps) {
    const [open, setOpen] = useState(false);
    const addRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 280, maxH: 320 });

    const styles = ACCENT[accent];
    const selectedSet = new Set(selectedCodes.map((c) => c.toUpperCase()));
    const nameByCode = new Map<string, string>(Object.entries(FALLBACK_RULE_NAMES));
    for (const rule of rules) {
        nameByCode.set(rule.rule_code.toUpperCase(), rule.name);
    }
    const labelFor = (code: string) => nameByCode.get(code.toUpperCase()) ?? code;

    const autoCodes = [
        ...new Set(
            appliedCodes
                .map((c) => c.trim().toUpperCase())
                .filter(
                    (c) =>
                        Boolean(c) &&
                        SYSTEM_AUTO_CHIP_CODES.has(c) &&
                        !HIDDEN_APPLIED_CODES.has(c) &&
                        !/^(AGING|PINNED|HOLD_|INTERLEAVE)/i.test(c),
                ),
        ),
    ];
    const autoOnlyCodes = autoCodes.filter((c) => !selectedSet.has(c));
    const selectedRules = rules.filter((r) => selectedSet.has(r.rule_code.toUpperCase()));
    const selectedOrphans = [...selectedSet].filter(
        (c) => !rules.some((r) => r.rule_code.toUpperCase() === c),
    );
    const hasChips =
        selectedRules.length > 0 || autoOnlyCodes.length > 0 || selectedOrphans.length > 0;

    const toggle = (code: string) => {
        if (disabled) return;
        const upper = code.toUpperCase();
        const next = selectedSet.has(upper)
            ? selectedCodes.filter((c) => c.toUpperCase() !== upper)
            : [...selectedCodes, upper];
        onChange(next);
    };

    const placePanel = () => {
        const rect = addRef.current?.getBoundingClientRect();
        if (!rect) return;
        const width = Math.min(320, Math.max(240, window.innerWidth - 24));
        let left = rect.left;
        if (left + width > window.innerWidth - 8) {
            left = Math.max(8, window.innerWidth - width - 8);
        }
        const gap = 6;
        const margin = 8;
        const belowSpace = window.innerHeight - rect.bottom - gap - margin;
        const aboveSpace = rect.top - gap - margin;
        const openBelow = belowSpace >= 180 || belowSpace >= aboveSpace;
        const maxH = Math.min(420, Math.max(160, openBelow ? belowSpace : aboveSpace));
        const top = openBelow ? rect.bottom + gap : Math.max(margin, rect.top - maxH - gap);
        setPanelPos({ top, left, width, maxH });
    };

    useLayoutEffect(() => {
        if (!open) return;
        placePanel();
    }, [open, rules.length]);

    useEffect(() => {
        if (!open) return;
        void onRefreshRules?.({ silent: true });
    }, [open, onRefreshRules]);

    useEffect(() => {
        if (!open) return;
        const onWin = () => placePanel();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        const onPointer = (e: MouseEvent) => {
            const t = e.target as Node;
            if (addRef.current?.contains(t) || panelRef.current?.contains(t)) return;
            setOpen(false);
        };
        window.addEventListener('resize', onWin);
        window.addEventListener('scroll', onWin, true);
        window.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onPointer);
        return () => {
            window.removeEventListener('resize', onWin);
            window.removeEventListener('scroll', onWin, true);
            window.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onPointer);
        };
    }, [open]);

    if (!isLoading && rules.length === 0 && !hasChips) return null;

    return (
        <div className={cn(compact ? 'space-y-1' : 'space-y-2', className)}>
            {!compact && (
                <div className={cn('flex items-center gap-1.5 font-bold text-[12px]', styles.label)}>
                    <Flag className="w-3.5 h-3.5" />
                    <span>{label}</span>
                    <span className="font-medium text-neutral-400">(tuỳ chọn)</span>
                    {selectedRules.length > 0 && (
                        <span className="ml-0.5 rounded-full bg-neutral-100 px-1.5 py-0 text-[10px] font-black text-neutral-500">
                            {selectedRules.length}
                        </span>
                    )}
                </div>
            )}

            <div className="flex items-center gap-1 min-w-0">
                {hasChips && (
                    <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {autoOnlyCodes.map((code) => (
                        <span
                            key={`auto-${code}`}
                            title={`${labelFor(code)} · hệ thống tự gắn`}
                            className={cn(
                                'inline-flex shrink-0 items-center rounded-full border font-bold',
                                compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]',
                                styles.idle,
                            )}
                        >
                            {labelFor(code)}
                        </span>
                    ))}
                    {selectedRules.map((rule) => (
                        <span
                            key={rule.rule_code}
                            title={rule.name}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-0.5 rounded-full border font-bold',
                                compact ? 'pl-2 pr-0.5 py-0.5 text-[10px]' : 'pl-2.5 pr-1 py-0.5 text-[11px]',
                                styles.selected,
                            )}
                        >
                            {rule.name}
                            <button
                                type="button"
                                disabled={disabled}
                                aria-label={`Bỏ ${rule.name}`}
                                onClick={() => toggle(rule.rule_code)}
                                className="rounded-full p-0.5 opacity-80 hover:bg-white/20 disabled:pointer-events-none"
                            >
                                <X className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                            </button>
                        </span>
                    ))}
                    {selectedOrphans.map((code) => (
                        <span
                            key={`orphan-${code}`}
                            title={labelFor(code)}
                            className={cn(
                                'inline-flex shrink-0 items-center gap-0.5 rounded-full border font-bold',
                                compact ? 'pl-2 pr-0.5 py-0.5 text-[10px]' : 'pl-2.5 pr-1 py-0.5 text-[11px]',
                                styles.selected,
                            )}
                        >
                            {labelFor(code)}
                            <button
                                type="button"
                                disabled={disabled}
                                aria-label={`Bỏ ${labelFor(code)}`}
                                onClick={() => toggle(code)}
                                className="rounded-full p-0.5 opacity-80 hover:bg-white/20 disabled:pointer-events-none"
                            >
                                <X className={compact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
                            </button>
                        </span>
                    ))}
                    </div>
                )}

                {!hideAdd && (
                    <button
                        ref={addRef}
                        type="button"
                        disabled={disabled || isLoading}
                        aria-expanded={open}
                        aria-haspopup="listbox"
                        aria-label="Gắn hoặc gỡ cờ ưu tiên"
                        title="Gắn hoặc gỡ cờ ưu tiên"
                        onClick={() => setOpen((v) => !v)}
                        className={cn(
                            'inline-flex shrink-0 items-center justify-center gap-px rounded-full border bg-white font-bold transition-colors disabled:opacity-50',
                            compact ? 'h-6 px-1.5' : 'h-7 px-2',
                            styles.add,
                        )}
                    >
                        <Plus className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.5} />
                        <Flag className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} strokeWidth={2.5} />
                    </button>
                )}
            </div>

            {open &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={panelRef}
                        role="listbox"
                        aria-multiselectable
                        style={{
                            position: 'fixed',
                            top: panelPos.top,
                            left: panelPos.left,
                            width: panelPos.width,
                            maxHeight: panelPos.maxH,
                            zIndex: 200,
                        }}
                        className={cn(
                            'flex flex-col overflow-hidden rounded-xl border bg-white shadow-lg',
                            styles.panel,
                        )}
                    >
                        <p className="shrink-0 border-b border-neutral-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                            {rules.length} cờ gắn tay
                        </p>
                        <div
                            className="overflow-y-scroll overscroll-contain py-1"
                            style={{ maxHeight: Math.max(120, panelPos.maxH - 36) }}
                        >
                        {isLoading && rules.length === 0 && (
                            <p className="px-3 py-2 text-[11px] font-medium text-neutral-400">
                                Đang tải cờ ưu tiên...
                            </p>
                        )}
                        {rules.map((rule) => {
                            const selected = selectedSet.has(rule.rule_code.toUpperCase());
                            return (
                                <button
                                    key={rule.rule_code}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    disabled={disabled}
                                    onClick={() => toggle(rule.rule_code)}
                                    className={cn(
                                        'flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-semibold transition-colors disabled:opacity-50',
                                        selected
                                            ? 'bg-indigo-50/80 text-indigo-800'
                                            : 'text-neutral-700 hover:bg-neutral-50',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                                            selected
                                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                                : 'border-neutral-300 bg-white',
                                        )}
                                    >
                                        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate">{rule.name}</span>
                                    {typeof rule.weight === 'number' && rule.weight > 0 && (
                                        <span className="shrink-0 text-[10px] font-bold text-neutral-400">
                                            +{rule.weight}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        </div>
                    </div>,
                    document.body,
                )}
        </div>
    );
}
