'use client';

import { Flag } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlaggableRule } from '../types/ruleFlag.types';

export type RuleFlagAccent = 'purple' | 'indigo';

interface RuleFlagChipPickerProps {
    rules: FlaggableRule[];
    selectedCodes: string[];
    onChange: (codes: string[]) => void;
    disabled?: boolean;
    compact?: boolean;
    isLoading?: boolean;
    accent?: RuleFlagAccent;
    className?: string;
    label?: string;
}

const ACCENT: Record<
    RuleFlagAccent,
    { selected: string; idle: string; label: string }
> = {
    purple: {
        selected: 'bg-[#8B7CF6] text-white border-[#8B7CF6] shadow-sm',
        idle: 'bg-white text-[#5B4EC9] border-[#EDE9FE] hover:border-[#8B7CF6]/50 hover:bg-[#F5F3FF]',
        label: 'text-[#5B4EC9]',
    },
    indigo: {
        selected: 'bg-indigo-600 text-white border-indigo-600 shadow-sm',
        idle: 'bg-white text-indigo-700 border-indigo-200/80 hover:border-indigo-300 hover:bg-indigo-50/70',
        label: 'text-indigo-700',
    },
};

export function RuleFlagChipPicker({
    rules,
    selectedCodes,
    onChange,
    disabled = false,
    compact = false,
    isLoading = false,
    accent = 'purple',
    className,
    label = 'Cờ ưu tiên',
}: RuleFlagChipPickerProps) {
    if (!isLoading && rules.length === 0) return null;

    const styles = ACCENT[accent];
    const selectedSet = new Set(selectedCodes.map((c) => c.toUpperCase()));

    const toggle = (code: string) => {
        if (disabled) return;
        const upper = code.toUpperCase();
        const next = selectedSet.has(upper)
            ? selectedCodes.filter((c) => c.toUpperCase() !== upper)
            : [...selectedCodes, upper];
        onChange(next);
    };

    return (
        <div className={cn(compact ? 'space-y-1' : 'space-y-2', className)}>
            <div className={cn('flex items-center gap-1.5 font-bold', compact ? 'text-[10px]' : 'text-[12px]', styles.label)}>
                <Flag className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                <span>{label}</span>
                {!compact && <span className="font-medium text-neutral-400">(tuỳ chọn)</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
                {isLoading && rules.length === 0 && (
                    <span className="text-[11px] font-medium text-neutral-400">
                        Đang tải cờ ưu tiên...
                    </span>
                )}
                {rules.map((rule) => {
                    const selected = selectedSet.has(rule.rule_code.toUpperCase());
                    return (
                        <button
                            key={rule.rule_code}
                            type="button"
                            disabled={disabled}
                            title={`${rule.name} · ${rule.rule_code}${rule.weight ? ` · +${rule.weight}` : ''}`}
                            onClick={() => toggle(rule.rule_code)}
                            className={cn(
                                'rounded-full border font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none',
                                compact
                                    ? 'px-2 py-0.5 text-[10px]'
                                    : 'px-2.5 py-1 text-[11px]',
                                selected ? styles.selected : styles.idle,
                            )}
                        >
                            {rule.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
