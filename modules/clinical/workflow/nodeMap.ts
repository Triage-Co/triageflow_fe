import {
    FileText,
    CreditCard,
    Stethoscope,
    Microscope,
    Syringe,
    RefreshCw,
    CheckCircle2,
    Pill,
} from 'lucide-react';
import type { WorkflowStepStatus } from '@/modules/clinical/types/clinical.types';
import type { ServiceOrder } from '@/modules/clinical/types/serviceOrder.types';
import {
    getOrderDisplayName,
    getOrderRoomType,
    getOrderServiceCode,
    getServiceOrderId,
} from '@/modules/clinical/types/serviceOrder.types';
import type { DraftStep, FlowNode, NodeIcon } from './types';
import { asRecord } from './flowPickers';
import {
    isDefaultExamStepName,
    isExamPaymentStepName,
    isPaidPaymentStatus,
    isPaymentFlowNode,
    isPaymentStepName,
    normalizeStepLabel,
    shouldHideLiveFlowStep,
} from './stepIdentity';

export const DEFAULT_FULL_WORKFLOW: FlowNode[] = [
    { id: 'dat-kham', Icon: FileText, label: 'Đặt khám', status: 'completed' },
    { id: 'kham-benh', Icon: Stethoscope, label: 'Khám bệnh', status: 'pending' },
];

export function getIconForStep(specialtyName: string, roomName: string, label: string): NodeIcon {
    const s = (specialtyName || '').toLowerCase();
    const r = (roomName || '').toLowerCase();
    const l = (label || '').toLowerCase();

    if (
        s.includes('tiếp đón') ||
        s.includes('đăng ký') ||
        l.includes('tiếp đón') ||
        l.includes('đăng ký') ||
        l.includes('tiếp nhận') ||
        r.includes('tiếp đón') ||
        l.includes('reception')
    ) {
        return FileText;
    }
    if (
        s.includes('thanh toán') ||
        s.includes('thu ngân') ||
        l.includes('thanh toán') ||
        l.includes('thu ngân') ||
        l.includes('viện phí') ||
        r.includes('thu ngân') ||
        r.includes('thanh toán') ||
        l.includes('cashier')
    ) {
        return CreditCard;
    }
    if (
        s.includes('xét nghiệm') ||
        s.includes('siêu âm') ||
        s.includes('x-quang') ||
        s.includes('chẩn đoán') ||
        s.includes('phòng lab') ||
        s.includes('cận lâm sàng') ||
        l.includes('xét nghiệm') ||
        l.includes('siêu âm') ||
        l.includes('cận lâm sàng') ||
        l.includes('lab')
    ) {
        return Microscope;
    }
    if (
        s.includes('thủ thuật') ||
        s.includes('tiêm') ||
        s.includes('truyền') ||
        l.includes('thủ thuật') ||
        l.includes('tiêm')
    ) {
        return Syringe;
    }
    if (
        s.includes('dược') ||
        s.includes('thuốc') ||
        l.includes('dược') ||
        l.includes('thuốc') ||
        l.includes('phát thuốc') ||
        l.includes('pharmacy')
    ) {
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

export function mapStepStatusToNodeStatus(
    stepStatus: string,
    _isPatientDone?: boolean,
    paymentStatus?: string,
    stepName?: string
): WorkflowStepStatus {
    const st = (stepStatus || '').toUpperCase().trim();
    const name = stepName || '';
    const isPaymentLike = isPaymentStepName(name) || isExamPaymentStepName(name);

    if (st === 'DECLINED') {
        return 'declined';
    }

    if (isPaymentLike && isPaidPaymentStatus(paymentStatus)) {
        return 'completed';
    }

    if (['COMPLETED', 'DONE', 'SUCCESSED', 'FINISHED'].includes(st)) {
        return 'completed';
    }

    if ((st === 'CANCELLED' || st === 'CANCELED') && isExamPaymentStepName(name)) {
        return 'completed';
    }

    if (['IN_PROGRESS', 'PROCESSING', 'CURRENT', 'DOING', 'EXAMINING', 'ACTIVE', 'ONGOING'].includes(st)) {
        return 'current';
    }

    return 'pending';
}

export function nodeStyles(status: WorkflowStepStatus) {
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
        case 'declined':
            return {
                ring: 'bg-[#E11D48] shadow-[0_0_0_4px_rgba(225,29,72,0.2)] border-transparent text-white',
                line: 'bg-[#E11D48]',
            };
        case 'pending':
        default:
            return {
                ring: 'bg-[#F1F5F9] border border-[#CBD5E1] text-[#94A3B8]',
                line: 'bg-[#E2E8F0]',
            };
    }
}

export function buildDynamicSteps(input: {
    selectedTemplateId: string;
    draftSteps: DraftStep[];
    hasLiveSteps: boolean;
    orderedFlowSteps: unknown[];
    pendingOrders: ServiceOrder[];
    rooms: Array<{ room_id: string; room_name: string }>;
    isPatientDone: boolean;
    getStaffOnDutyForRoom: (roomId: string) => string;
    resolveLiveStepStaff: (step: Record<string, unknown>) => {
        staffName: string;
        staffId: string;
    };
}): FlowNode[] {
    const {
        selectedTemplateId,
        draftSteps,
        hasLiveSteps,
        orderedFlowSteps,
        pendingOrders,
        rooms,
        isPatientDone,
        getStaffOnDutyForRoom,
        resolveLiveStepStaff,
    } = input;

    const dynamicSteps: FlowNode[] = [];

    const appendLiveSteps = () => {
        const seenIds = new Set<string>();

        orderedFlowSteps.forEach((stepItem, index) => {
            const step = stepItem as Record<string, unknown>;
            const stepStatus = ((step.step_status as string) || '').toUpperCase();
            if (shouldHideLiveFlowStep(step)) return;

            const stepId = (step.step_id as string) || `api-step-${index}`;
            if (seenIds.has(stepId)) return;
            seenIds.add(stepId);

            const specialtyInfo = step.specialty_info as Record<string, unknown> | undefined;
            const roomInfo = step.room_info as Record<string, unknown> | undefined;

            const specialtyName = (specialtyInfo?.specialty_name as string) || '';
            const roomName = (roomInfo?.room_name as string) || '';
            const rawLabel =
                (typeof step.step_name === 'string' && step.step_name.trim()) ||
                roomName ||
                specialtyName ||
                `Bước ${index + 1}`;
            let label = rawLabel;

            if (isDefaultExamStepName(rawLabel)) {
                const bits = [roomName, specialtyName].filter(Boolean);
                if (bits.length > 0) label = `${rawLabel} · ${bits.join(' · ')}`;
            }

            const paymentStatus = String(step.payment_status || '');
            const status = mapStepStatusToNodeStatus(
                stepStatus,
                isPatientDone,
                paymentStatus,
                rawLabel
            );

            const { staffName, staffId: resolvedStaffId } = resolveLiveStepStaff(step);
            const roomType = String(
                (roomInfo?.room_type as string) || (step.room_type as string) || ''
            );
            const isPayment = isPaymentFlowNode({
                label: rawLabel,
                stepType: String(step.step_type || ''),
                roomType,
            });

            dynamicSteps.push({
                id: stepId,
                Icon: getIconForStep(specialtyName, roomName, rawLabel),
                status,
                label,
                roomName,
                staffName,
                isPayment,
                detail: {
                    source: 'live',
                    stepStatus,
                    roomId: (step.room_id as string) || (roomInfo?.room_id as string) || '',
                    specialtyName,
                    specialtyId: (specialtyInfo?.specialty_id as string) || '',
                    staffId: resolvedStaffId,
                    paymentStatus: (step.payment_status as string) || '',
                    docNo: String(step.docNo || ''),
                },
            });
        });
    };

    const appendPendingServiceOrders = () => {
        const existingLabels = new Set(dynamicSteps.map((n) => normalizeStepLabel(n.label)));
        const existingCodes = new Set(
            dynamicSteps
                .map((n) => (n.detail?.serviceCode || '').trim().toLowerCase())
                .filter(Boolean)
        );
        const existingOrderIds = new Set(
            orderedFlowSteps
                .map((item) => {
                    const rec = asRecord(item);
                    return typeof rec?.service_order_id === 'string'
                        ? rec.service_order_id.trim()
                        : '';
                })
                .filter(Boolean)
        );

        const sorted = [...pendingOrders].sort((a, b) => {
            const at = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
            return at - bt;
        });

        for (const order of sorted) {
            const id = getServiceOrderId(order);
            if (!id) continue;
            if (existingOrderIds.has(id)) continue;
            const status = String(order.status || '').toUpperCase();
            if (status === 'CANCELLED' || status === 'CANCELED') continue;

            const code = getOrderServiceCode(order).toLowerCase();
            const rawName = (order.name || getOrderDisplayName(order) || '').trim();
            const labelKey = normalizeStepLabel(rawName);
            if (code && existingCodes.has(code)) continue;
            if (labelKey && existingLabels.has(labelKey)) continue;

            const roomType = getOrderRoomType(order);
            const paymentStatus = String(order.payment_status || '');
            const nodeStatus = mapStepStatusToNodeStatus(
                String(order.status || 'PENDING'),
                isPatientDone,
                paymentStatus,
                rawName
            );

            dynamicSteps.push({
                id: `so-${id}`,
                Icon: getIconForStep('', roomType, rawName),
                status: nodeStatus,
                label: rawName,
                roomName: order.room_info?.room_name || roomType || undefined,
                staffName: undefined,
                isPayment: isPaymentFlowNode({ label: rawName, roomType }),
                detail: {
                    source: 'service-order',
                    stepStatus: String(order.status || 'PENDING'),
                    roomId: order.room_id || order.room_info?.room_id || '',
                    paymentStatus,
                    serviceOrderId: id,
                    serviceCode: code || undefined,
                    totalPrice:
                        typeof order.total_price === 'number' ? order.total_price : undefined,
                },
            });

            if (code) existingCodes.add(code);
            if (labelKey) existingLabels.add(labelKey);
        }
    };

    if (selectedTemplateId && draftSteps.length > 0) {
        if (hasLiveSteps) {
            appendLiveSteps();
        }
        draftSteps.forEach((dStep: DraftStep, index: number) => {
            const roomObj = rooms.find((r) => r.room_id === dStep.room_id);
            const label = dStep.step_name || `Bước ${index + 1}`;
            dynamicSteps.push({
                id: dStep.tempId,
                Icon: getIconForStep(dStep.room_type, roomObj?.room_name || dStep.room_type, label),
                status: 'pending',
                label,
                roomName: roomObj?.room_name || 'Chưa phân phòng',
                staffName: getStaffOnDutyForRoom(dStep.room_id) || 'Chưa phân công',
                isPayment: isPaymentFlowNode({
                    label,
                    stepType: dStep.step_type,
                    roomType: dStep.room_type,
                }),
                detail: {
                    source: 'draft',
                    stepStatus: 'NOT_STARTED',
                    roomId: dStep.room_id,
                    specialtyId: dStep.specialty_id,
                    staffId: dStep.staff_id,
                    paymentStatus: 'N/A',
                    docNo: 'N/A',
                },
            });
        });
    } else if (hasLiveSteps) {
        appendLiveSteps();
        appendPendingServiceOrders();
    } else {
        dynamicSteps.push(...DEFAULT_FULL_WORKFLOW);
        appendPendingServiceOrders();
    }

    return dynamicSteps;
}
