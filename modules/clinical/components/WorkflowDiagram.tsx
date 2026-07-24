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
    Loader2,
    AlertCircle,
    Pill,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient, WorkflowStepStatus } from '@/modules/clinical/types/clinical.types';
import type { ProcessTemplate, TemplateStep } from '@/modules/admin/types/process.types';
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
    patient?: Patient;
}

const DEFAULT_FULL_WORKFLOW: FlowNode[] = [
    { id: 'reception', Icon: FileText, label: 'Đăng ký & Phân loại', status: 'completed' },
    { id: 'consultation', Icon: Stethoscope, label: 'Khám chuyên khoa', status: 'current' },
    { id: 'lab', Icon: Microscope, label: 'Xét nghiệm Cận lâm sàng', status: 'pending' },
    { id: 'payment', Icon: CreditCard, label: 'Thanh toán viện phí', status: 'pending' },
    { id: 'done', Icon: CheckCircle2, label: 'Hoàn tất khám', status: 'pending' },
];

function getTemplateName(tpl?: ProcessTemplate | Record<string, unknown> | null): string {
    if (!tpl) return '';
    const rec = tpl as Record<string, unknown>;
    return (
        (tpl as ProcessTemplate).name ||
        (rec.template_name as string) ||
        (rec.flow_name as string) ||
        (rec.title as string) ||
        (rec.name as string) ||
        ''
    );
}

function getIconForStep(specialtyName: string, roomName: string, label: string): NodeIcon {
    const s = (specialtyName || '').toLowerCase();
    const r = (roomName || '').toLowerCase();
    const l = (label || '').toLowerCase();

    if (s.includes('tiếp đón') || s.includes('đăng ký') || l.includes('tiếp đón') || l.includes('đăng ký') || l.includes('tiếp nhận') || r.includes('tiếp đón') || l.includes('reception')) {
        return FileText;
    }
    if (s.includes('thanh toán') || s.includes('thu ngân') || l.includes('thanh toán') || l.includes('thu ngân') || l.includes('viện phí') || r.includes('thu ngân') || r.includes('thanh toán') || l.includes('cashier')) {
        return CreditCard;
    }
    if (s.includes('xét nghiệm') || s.includes('siêu âm') || s.includes('x-quang') || s.includes('chẩn đoán') || s.includes('phòng lab') || s.includes('cận lâm sàng') || l.includes('xét nghiệm') || l.includes('siêu âm') || l.includes('cận lâm sàng') || l.includes('lab')) {
        return Microscope;
    }
    if (s.includes('thủ thuật') || s.includes('tiêm') || s.includes('truyền') || l.includes('thủ thuật') || l.includes('tiêm')) {
        return Syringe;
    }
    if (s.includes('dược') || s.includes('thuốc') || l.includes('dược') || l.includes('thuốc') || l.includes('phát thuốc') || l.includes('pharmacy')) {
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

function determineStepStatus(
    index: number,
    rawFlowSteps: unknown[],
    templateStepsCount: number,
    isPatientDone?: boolean
): WorkflowStepStatus {
    if (isPatientDone) return 'completed';

    if (Array.isArray(rawFlowSteps) && rawFlowSteps.length > 0) {
        const rawStep = rawFlowSteps[index] as Record<string, unknown> | undefined;
        if (rawStep) {
            const st = ((rawStep.step_status as string) || '').toUpperCase();
            const paySt = ((rawStep.payment_status as string) || '').toUpperCase();

            if (st === 'COMPLETED' || st === 'DONE' || st === 'SUCCESSED' || st === 'FINISHED' || paySt === 'SUCCESSED') {
                return 'completed';
            }
            if (st === 'PROCESSING' || st === 'IN_PROGRESS' || st === 'CURRENT' || st === 'DOING' || st === 'EXAMINING' || st === 'ACTIVE') {
                return 'current';
            }
        }
    }

    // Fallback theo vị trí thứ tự:
    // Bước 0 (Đăng ký & Phân loại) → Xanh lá (Đã xong)
    // Bước 1 (Khám chuyên khoa) → Xanh dương (Đang thực hiện)
    // Bước còn lại (Làm xét nghiệm, Thanh toán...) → Xám (Chờ)
    if (index === 0) return 'completed';
    if (index === 1) return 'current';
    return 'pending';
}

function nodeStyles(status: WorkflowStepStatus) {
    switch (status) {
        case 'completed':
            return {
                ring: 'bg-[#10B981] shadow-[0_0_0_4px_rgba(16,185,129,0.2)] border-transparent text-white',
                line: 'bg-[#10B981]',
            };
        case 'current':
            return {
                ring: 'bg-[#2563EB] shadow-[0_0_0_4px_rgba(37,99,235,0.25)] border-transparent text-white',
                line: 'bg-[#2563EB]',
            };
        default:
            return {
                ring: 'bg-[#F1F5F9] border border-[#CBD5E1] text-[#94A3B8]',
                line: 'bg-[#E2E8F0]',
            };
    }
}

function FlowIcon({ node, isFirst }: { node: FlowNode; isFirst?: boolean }) {
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
            <div
                className={cn(
                    'absolute hidden group-hover:flex flex-col items-center z-50',
                    isFirst ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
                )}
            >
                {isFirst && <div className="w-2 h-2 bg-[#1E293B] rotate-45 -mb-1 z-10" />}
                <div className="bg-[#1E293B] text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
                    <p className="font-bold text-[#F8FAFC]">{node.label}</p>
                    {node.roomName && <p className="text-[#94A3B8] font-normal text-[10px] mt-0.5">Phòng: {node.roomName}</p>}
                    {node.staffName && <p className="text-[#94A3B8] font-normal text-[10px]">Nhân viên: {node.staffName}</p>}
                </div>
                {!isFirst && <div className="w-2 h-2 bg-[#1E293B] rotate-45 -mt-1" />}
            </div>
            <span className="text-[11px] font-bold text-neutral-600 mt-1.5 max-w-[140px] text-center truncate">
                {node.label}
            </span>
        </div>
    );
}

function Connector({ status }: { status: WorkflowStepStatus }) {
    const styles = nodeStyles(status);
    return <div className={cn('w-0.5 h-6 mx-auto rounded-full', styles.line)} />;
}

export function WorkflowDiagram({ patientId, patient }: WorkflowDiagramProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [isLoading, startFetch] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [flowData, setFlowData] = useState<Record<string, unknown> | null>(null);
    const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    useEffect(() => {
        if (!accessToken || !patientId) return;

        const loadData = async () => {
            startFetch(async () => {
                try {
                    setError(null);
                    // Fetch Active Flow
                    const flowRes = await clinicalService.getActiveFlowByPatientId(patientId, accessToken);
                    let flowObj: Record<string, unknown> | null = null;
                    if (flowRes?.data) {
                        const raw = flowRes.data as unknown;
                        if (Array.isArray(raw) && raw.length > 0) {
                            const list = raw as Record<string, unknown>[];
                            flowObj = list.find((item) => ((item.status as string) || '').toUpperCase() === 'IN_PROGRESS') || list[0];
                        } else if (raw && typeof raw === 'object') {
                            const rec = raw as Record<string, unknown>;
                            if (Array.isArray(rec.data) && rec.data.length > 0) {
                                const list = rec.data as Record<string, unknown>[];
                                flowObj = list.find((item) => ((item.status as string) || '').toUpperCase() === 'IN_PROGRESS') || list[0];
                            } else if (rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)) {
                                flowObj = rec.data as Record<string, unknown>;
                            } else {
                                flowObj = rec;
                            }
                        }
                    }
                    setFlowData(flowObj);

                    // Fetch Templates
                    try {
                        const tplRes = await clinicalService.getProcessTemplates(accessToken);
                        let tplList: ProcessTemplate[] = [];
                        if (tplRes?.data) {
                            const tData = tplRes.data as unknown;
                            if (Array.isArray(tData)) {
                                tplList = tData as ProcessTemplate[];
                            } else if (tData && typeof tData === 'object') {
                                const rec = tData as Record<string, unknown>;
                                if (Array.isArray(rec.data)) {
                                    tplList = rec.data as ProcessTemplate[];
                                } else if (Array.isArray(rec.templates)) {
                                    tplList = rec.templates as ProcessTemplate[];
                                }
                            }
                        }
                        setTemplates(tplList);
                    } catch {
                        // ignore template fetch error if any
                    }
                } catch (err) {
                    console.error('Failed to fetch active flow:', err);
                    setError('Không thể tải quy trình.');
                }
            });
        };

        loadData();
    }, [patientId, accessToken]);

    const handleSelectTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);
    };

    // Determine active template and current steps to render
    const activeTemplateId =
        selectedTemplateId ||
        (flowData?.template_id as string) ||
        (patient?.templateId as string) ||
        (templates[0]?.template_id || templates[0]?.id || '');

    const activeTemplate = templates.find(
        (t) => (t.template_id || t.id) === activeTemplateId
    ) || templates[0];

    const rawFlowSteps = (flowData?.steps as unknown[]) || [];
    const dynamicSteps: FlowNode[] = [];

    const isPatientDone = patient?.status === 'Đã khám';

    if (activeTemplate && activeTemplate.steps && activeTemplate.steps.length > 0) {
        // Render step names directly from Admin's process template
        activeTemplate.steps.forEach((tStep: TemplateStep, index: number) => {
            const rawStep = (rawFlowSteps[index] as Record<string, unknown> | undefined);
            const status = determineStepStatus(index, rawFlowSteps, activeTemplate.steps.length, isPatientDone);
            const roomInfo = rawStep?.room_info as Record<string, unknown> | undefined;
            const staffInfo = rawStep?.staff_info as Record<string, unknown> | undefined;

            const roomName = (roomInfo?.room_name as string) || tStep.room_type;
            const staffName = (staffInfo?.full_name as string) || '';
            const label = tStep.step_name || `Bước ${index + 1}`;

            dynamicSteps.push({
                id: tStep.template_step_id || (rawStep?.step_id as string) || `tpl-step-${index}`,
                Icon: getIconForStep(tStep.room_type, roomName, label),
                status,
                label,
                roomName,
                staffName,
            });
        });
    } else if (rawFlowSteps.length > 0) {
        // Fallback to raw flow steps if no active template steps exist
        rawFlowSteps.forEach((stepItem, index) => {
            const step = stepItem as Record<string, unknown>;
            const status = determineStepStatus(index, rawFlowSteps, rawFlowSteps.length, isPatientDone);
            const specialtyInfo = step.specialty_info as Record<string, unknown> | undefined;
            const roomInfo = step.room_info as Record<string, unknown> | undefined;
            const staffInfo = step.staff_info as Record<string, unknown> | undefined;

            const specialtyName = (specialtyInfo?.specialty_name as string) || '';
            const roomName = (roomInfo?.room_name as string) || '';
            const staffName = (staffInfo?.full_name as string) || '';
            const label = (step.step_name as string) || specialtyName || roomName || `Bước ${index + 1}`;

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
        // Fallback to full standard workflow steps
        dynamicSteps.push(...DEFAULT_FULL_WORKFLOW);
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
                        <FlowIcon node={node} isFirst={idx === 0} />
                        {idx < dynamicSteps.length - 1 && (
                            <Connector status={node.status} />
                        )}
                    </div>
                ))}
            </div>

            {/* Template Selector Footer */}
            {templates.length > 0 && (
                <div className="w-full mt-6 pt-5 border-t border-neutral-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                            Quy trình mẫu:
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB]">
                            {dynamicSteps.length} bước
                        </span>
                    </div>
                    <div className="relative w-full">
                        <select
                            value={activeTemplateId}
                            onChange={(e) => handleSelectTemplate(e.target.value)}
                            className="w-full appearance-none px-3.5 py-2.5 pr-8 rounded-[14px] border border-neutral-200 bg-white text-xs font-bold text-neutral-800 hover:border-[#8B7CF6] focus:border-[#8B7CF6] focus:outline-none transition-colors cursor-pointer"
                        >
                            {templates.map((tpl) => {
                                const tplId = tpl.template_id || tpl.id || '';
                                const name = getTemplateName(tpl) || `Mẫu quy trình (${tpl.steps?.length || 0} bước)`;
                                return (
                                    <option key={tplId || name} value={tplId}>
                                        {name} ({tpl.steps?.length || 0} bước)
                                    </option>
                                );
                            })}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>
            )}
        </div>
    );
}
