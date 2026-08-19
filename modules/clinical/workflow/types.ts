import type { Patient, WorkflowStepStatus } from '@/modules/clinical/types/clinical.types';
import type { LucideIcon } from 'lucide-react';

export type NodeIcon = LucideIcon;

export interface DraftStep {
    tempId: string;
    step_name: string;
    specialty_id: string;
    room_id: string;
    staff_id: string;
    service_code: string;
    room_type: string;
    doctor_name?: string;
    template_id?: string;
    template_step_id?: string;
    step_type?: string;
    requires_payment?: boolean;
    depends_on?: string[];
}

export interface ServiceOption {
    service_id: string;
    service_code: string;
    service_name: string;
    is_active?: boolean;
}

export interface FlowNode {
    id: string;
    Icon: NodeIcon;
    status: WorkflowStepStatus;
    label: string;
    roomName?: string;
    staffName?: string;
    isPayment?: boolean;
    detail?: {
        source: 'live' | 'draft' | 'default' | 'service-order';
        stepStatus?: string;
        roomId?: string;
        specialtyName?: string;
        specialtyId?: string;
        staffId?: string;
        paymentStatus?: string;
        docNo?: string;
        serviceOrderId?: string;
        serviceCode?: string;
        totalPrice?: number;
    };
}

export interface WorkflowDiagramProps {
    patientId: string;
    patient?: Patient;
    refreshKey?: number;
    onFlowResolved?: (info: { flowId: string; bookingId: string }) => void;
    onFlowChanged?: (flow: Record<string, unknown> | null) => void;
}

export interface SpecialtyOption {
    id: string;
    name: string;
}

export const STEP_STATUS_EDIT_OPTIONS = [
    { value: 'PENDING', label: 'Chờ thực hiện' },
    { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
    { value: 'COMPLETED', label: 'Hoàn tất' },
    { value: 'DECLINED', label: 'Từ chối' },
    { value: 'CANCELLED', label: 'Đã hủy' },
] as const;
