'use client';

import { useEffect, useState, useTransition } from 'react';
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
    Loader2,
    AlertCircle,
    Pill,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStepStatus } from '@/modules/clinical/types/clinical.types';
import { Button } from '@/shared/components/ui/Button';
import { clinicalService } from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/store/authStore';

type NodeIcon = typeof FileText;

interface FlowNode {
    id: string;
    Icon: NodeIcon;
    status: WorkflowStepStatus;
    label: string;
    roomName?: string;
    staffName?: string;
}

interface WorkflowDiagramProps {
    patientId: string;
}

function getIconForStep(specialtyName: string, roomName: string, label: string): NodeIcon {
    const s = (specialtyName || '').toLowerCase();
    const r = (roomName || '').toLowerCase();
    const l = (label || '').toLowerCase();

    if (s.includes('tiếp đón') || s.includes('đăng ký') || l.includes('tiếp đón') || l.includes('đăng ký') || l.includes('tiếp nhận') || r.includes('tiếp đón')) {
        return FileText;
    }
    if (s.includes('thanh toán') || s.includes('thu ngân') || l.includes('thanh toán') || l.includes('thu ngân') || l.includes('viện phí') || r.includes('thu ngân') || r.includes('thanh toán')) {
        return CreditCard;
    }
    if (s.includes('xét nghiệm') || s.includes('siêu âm') || s.includes('x-quang') || s.includes('chẩn đoán') || s.includes('phòng lab') || s.includes('cận lâm sàng') || l.includes('xét nghiệm') || l.includes('siêu âm') || l.includes('cận lâm sàng')) {
        return Microscope;
    }
    if (s.includes('thủ thuật') || s.includes('tiêm') || s.includes('truyền') || l.includes('thủ thuật') || l.includes('tiêm')) {
        return Syringe;
    }
    if (s.includes('dược') || s.includes('thuốc') || l.includes('dược') || l.includes('thuốc') || l.includes('phát thuốc')) {
        return Pill;
    }
    if (l.includes('tái khám') || l.includes('lịch hẹn')) {
        return RefreshCw;
    }
    if (l.includes('hoàn tất') || l.includes('kết thúc') || l.includes('done')) {
        return CheckCircle2;
    }
    return Stethoscope;
}

function mapStepStatus(status?: string): WorkflowStepStatus {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED' || s === 'SUCCESSED') return 'completed';
    if (s === 'IN_PROGRESS' || s === 'PROCESSING' || s === 'ONGOING') return 'current';
    return 'pending';
}

function nodeStyles(status: WorkflowStepStatus) {
    switch (status) {
        case 'completed':
            return {
                ring: 'bg-[#10B981] shadow-[0_0_0_4px_rgba(16,185,129,0.15)] border-transparent text-white',
                line: 'bg-[#10B981]',
            };
        case 'current':
            return {
                ring: 'bg-[#1A73E8] shadow-[0_0_0_4px_rgba(26,115,232,0.2)] border-transparent text-white',
                line: 'bg-[#1A73E8]',
            };
        default:
            return {
                ring: 'bg-[#F3F4F6] border border-[#E5E7EB] text-[#9CA3AF]',
                line: 'bg-[#E5E7EB]',
            };
    }
}

function FlowIcon({ node }: { node: FlowNode }) {
    const styles = nodeStyles(node.status);

    return (
        <div className="group relative flex flex-col items-center">
            <div
                className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer',
                    styles.ring
                )}
            >
                <node.Icon className="w-5 h-5" strokeWidth={2.2} />
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2.5 hidden group-hover:flex flex-col items-center z-50">
                <div className="bg-[#1E293B] text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
                    <p className="font-bold text-[#F8FAFC]">{node.label}</p>
                    {node.roomName && <p className="text-[#94A3B8] font-normal text-[10px] mt-0.5">Phòng: {node.roomName}</p>}
                    {node.staffName && <p className="text-[#94A3B8] font-normal text-[10px]">Nhân viên: {node.staffName}</p>}
                </div>
                <div className="w-2 h-2 bg-[#1E293B] rotate-45 -mt-1"></div>
            </div>
            <span className="text-[11px] font-bold text-neutral-600 mt-1.5 max-w-[120px] text-center truncate">
                {node.label}
            </span>
        </div>
    );
}

function Connector({ status }: { status: WorkflowStepStatus }) {
    const styles = nodeStyles(status);
    return <div className={cn('w-0.5 h-6 mx-auto rounded-full', styles.line)} />;
}

export function WorkflowDiagram({ patientId }: WorkflowDiagramProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [isLoading, startFetch] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [flowData, setFlowData] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        if (!accessToken || !patientId) return;

        const load = async () => {
            startFetch(async () => {
                try {
                    setError(null);
                    const res = await clinicalService.getActiveFlowByPatientId(patientId, accessToken);
                    const record = res.data as Record<string, unknown>;
                    const list = (record && typeof record === 'object' && Array.isArray(record.data))
                        ? record.data
                        : Array.isArray(record) ? record : [];
                    if (list.length > 0) {
                        setFlowData(list[0] as Record<string, unknown>);
                    } else {
                        setFlowData(null);
                    }
                } catch (err) {
                    console.error('Failed to fetch active flow:', err);
                    setError('Không thể tải quy trình.');
                }
            });
        };

        load();
    }, [patientId, accessToken]);

    // Build the complete list of steps dynamically
    const dynamicSteps: FlowNode[] = [];

    // API Steps
    if (flowData) {
        const rawSteps = (flowData.steps as unknown[]) || [];
        rawSteps.forEach((stepItem, index) => {
            const step = stepItem as Record<string, unknown>;
            const status = mapStepStatus(step.step_status as string);
            const specialtyInfo = step.specialty_info as Record<string, unknown> | undefined;
            const roomInfo = step.room_info as Record<string, unknown> | undefined;
            const staffInfo = step.staff_info as Record<string, unknown> | undefined;

            const specialtyName = (specialtyInfo?.specialty_name as string) || '';
            const roomName = (roomInfo?.room_name as string) || '';
            const staffName = (staffInfo?.full_name as string) || '';
            const label = specialtyName || roomName || `Bước ${index + 1}`;

            dynamicSteps.push({
                id: (step.step_id as string) || `api-step-${index}`,
                Icon: getIconForStep(specialtyName, roomName, label),
                status,
                label,
                roomName,
                staffName,
            });
        });
    } else {
        // Fallback to static mockup nodes if no active flow
        dynamicSteps.push({
            id: 'reception',
            Icon: FileText,
            label: 'Tiếp nhận',
            status: 'completed',
        });
        dynamicSteps.push({
            id: 'payment',
            Icon: CreditCard,
            label: 'Thanh toán',
            status: 'completed',
        });
        dynamicSteps.push({
            id: 'consultation',
            Icon: Stethoscope,
            label: 'Khám bệnh',
            status: 'current',
        });
        dynamicSteps.push({
            id: 'recall',
            Icon: RefreshCw,
            label: 'Tái khám',
            status: 'pending',
        });
        dynamicSteps.push({
            id: 'done',
            Icon: CheckCircle2,
            label: 'Hoàn tất',
            status: 'pending',
        });
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-[24px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center min-h-[350px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                <p className="text-xs font-semibold text-neutral-500 mt-3">Đang tải quy trình...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50/50 border border-red-100 rounded-[24px] p-5 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-red-700">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[24px] border border-neutral-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 flex flex-col items-center w-full max-w-[280px] mx-auto select-none">
            <div className="flex flex-col items-center w-full space-y-1">
                {dynamicSteps.map((node, idx) => (
                    <div key={node.id} className="flex flex-col items-center w-full">
                        <FlowIcon node={node} />
                        {idx < dynamicSteps.length - 1 && (
                            <Connector status={node.status} />
                        )}
                    </div>
                ))}
            </div>

            {/* Template selector footer */}
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
