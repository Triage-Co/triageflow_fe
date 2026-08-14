'use client';

import { cn } from '@/lib/utils';
import type { FlowNode } from '@/modules/clinical/workflow/types';
import { nodeStyles } from '@/modules/clinical/workflow/nodeMap';

export function FlowIcon({
    node,
    isFirst,
    onClick,
}: {
    node: FlowNode;
    isFirst?: boolean;
    onClick?: () => void;
}) {
    const styles = nodeStyles(node.status);
    const compact = Boolean(node.isPayment);

    return (
        <div className={cn('group relative flex flex-col items-center', compact && 'opacity-90')}>
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    'rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer',
                    compact ? 'w-7 h-7' : 'w-11 h-11',
                    styles.ring,
                    compact &&
                        (node.status === 'completed'
                            ? 'shadow-[0_0_0_3px_rgba(16,185,129,0.18)]'
                            : node.status === 'current'
                              ? 'shadow-[0_0_0_3px_rgba(37,99,235,0.2)]'
                              : '')
                )}
                title="Xem chi tiết bước"
            >
                <node.Icon
                    className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'}
                    strokeWidth={compact ? 2 : 2.2}
                />
            </button>

            <div
                className={cn(
                    'absolute hidden group-hover:flex flex-col items-center z-50',
                    isFirst ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
                )}
            >
                {isFirst && <div className="w-2 h-2 bg-[#1E293B] rotate-45 -mb-1 z-10" />}
                <div className="bg-[#1E293B] text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
                    <p className="font-bold text-[#F8FAFC]">{node.label}</p>
                    {node.roomName && (
                        <p className="text-[#94A3B8] font-normal text-[10px] mt-0.5">
                            Phòng: {node.roomName}
                        </p>
                    )}
                    {!node.isPayment && node.staffName ? (
                        <p className="text-[#94A3B8] font-normal text-[10px]">
                            Nhân viên: {node.staffName}
                        </p>
                    ) : null}
                </div>
                {!isFirst && <div className="w-2 h-2 bg-[#1E293B] rotate-45 -mt-1" />}
            </div>
            <span
                className={cn(
                    'font-bold text-center truncate',
                    compact
                        ? 'text-[9px] text-neutral-500 mt-1 max-w-[96px]'
                        : 'text-[11px] text-neutral-600 mt-1.5 max-w-[140px]'
                )}
            >
                {node.label}
            </span>
        </div>
    );
}
