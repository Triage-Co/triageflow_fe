'use client';

import {
    FileText,
    CreditCard,
    Stethoscope,
    Microscope,
    Syringe,
    RefreshCw,
    CheckCircle2,
    Plus,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStepStatus } from '@/modules/clinical/types/clinical.types';
import { Button } from '@/shared/components/ui/Button';

type NodeIcon = typeof FileText;

interface FlowNode {
    Icon: NodeIcon;
    status: WorkflowStepStatus;
    label: string;
}

const MAIN_NODES: FlowNode[] = [
    { Icon: FileText, status: 'completed', label: 'Tiếp nhận' },
    { Icon: CreditCard, status: 'completed', label: 'Thanh toán' },
    { Icon: Stethoscope, status: 'current', label: 'Khám bệnh' },
];

const BRANCH_NODES: FlowNode[] = [
    { Icon: Microscope, status: 'pending', label: 'Cận lâm sàng' },
    { Icon: Syringe, status: 'pending', label: 'Thủ thuật' },
];

const TAIL_NODES: FlowNode[] = [
    { Icon: RefreshCw, status: 'pending', label: 'Tái khám' },
    { Icon: CheckCircle2, status: 'pending', label: 'Hoàn tất' },
];

function nodeStyles(status: WorkflowStepStatus) {
    switch (status) {
        case 'completed':
            return {
                ring: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]',
                icon: 'text-white',
                line: 'bg-emerald-400',
            };
        case 'current':
            return {
                ring: 'bg-brand-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]',
                icon: 'text-white',
                line: 'bg-brand-400',
            };
        default:
            return {
                ring: 'bg-neutral-100 border border-neutral-200',
                icon: 'text-neutral-400',
                line: 'bg-neutral-200',
            };
    }
}

function FlowIcon({ node, size = 'md' }: { node: FlowNode; size?: 'md' | 'sm' }) {
    const styles = nodeStyles(node.status);
    const dim = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
    const iconDim = size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]';

    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center shrink-0 transition-colors',
                dim,
                styles.ring
            )}
            title={node.label}
        >
            <node.Icon className={cn(iconDim, styles.icon)} strokeWidth={2} />
        </div>
    );
}

function Connector({ status }: { status: WorkflowStepStatus }) {
    const styles = nodeStyles(status);
    return <div className={cn('w-0.5 h-5 mx-auto rounded-full', styles.line)} />;
}

export function WorkflowDiagram() {
    return (
        <div className="bg-white rounded-[24px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 flex flex-col items-center">
            {/* Main vertical path */}
            <div className="flex flex-col items-center">
                {MAIN_NODES.map((node, idx) => (
                    <div key={node.label} className="flex flex-col items-center">
                        <FlowIcon node={node} />
                        {idx < MAIN_NODES.length - 1 && (
                            <Connector status={node.status === 'completed' ? 'completed' : 'pending'} />
                        )}
                    </div>
                ))}
            </div>

            {/* Branching section */}
            <Connector status="current" />
            <div className="w-full rounded-[16px] border border-neutral-100 bg-neutral-50/80 px-4 py-3">
                <div className="flex items-center justify-center gap-6">
                    {BRANCH_NODES.map((node) => (
                        <FlowIcon key={node.label} node={node} size="sm" />
                    ))}
                </div>
            </div>

            {/* Tail path */}
            <Connector status="pending" />
            <div className="flex flex-col items-center">
                {TAIL_NODES.map((node, idx) => (
                    <div key={node.label} className="flex flex-col items-center">
                        <FlowIcon node={node} />
                        {idx < TAIL_NODES.length - 1 && <Connector status="pending" />}
                    </div>
                ))}
            </div>

            {/* Template selector */}
            <div className="w-full mt-6 pt-5 border-t border-neutral-100 flex items-center gap-2">
                <button
                    type="button"
                    className="flex-1 flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-[14px] border border-neutral-200 bg-white text-xs font-medium text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                    <span>Chọn mẫu quy trình</span>
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                </button>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-10 w-10 p-0 rounded-[14px] shrink-0 border-neutral-200"
                    aria-label="Thêm mẫu quy trình"
                >
                    <Plus className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
