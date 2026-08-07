import type { Specialty } from './room.types';
import type { ServiceRoomType } from './service.types';

/** Matches backend Prisma QueueRuleTypeEnum */
export type QueueRuleType =
    | 'PATIENT_CATEGORY'
    | 'APPOINTMENT'
    | 'WALK_IN'
    | 'RETURNING'
    | 'MISSED_TURN'
    | 'TRANSFER'
    | 'QUICK_TASK'
    | 'AGING'
    | 'REBALANCE';

export const QUEUE_RULE_TYPE_OPTIONS: { value: QueueRuleType; label: string }[] = [
    { value: 'PATIENT_CATEGORY', label: 'Đối tượng ưu tiên (nhi, lão khoa, thai phụ...)' },
    { value: 'APPOINTMENT', label: 'Có lịch hẹn đúng giờ' },
    { value: 'WALK_IN', label: 'Khách vãng lai (baseline)' },
    { value: 'RETURNING', label: 'Quay lại sau CLS' },
    { value: 'MISSED_TURN', label: 'Lỡ lượt gọi' },
    { value: 'TRANSFER', label: 'Chuyển phòng hội chẩn' },
    { value: 'QUICK_TASK', label: 'Thủ thuật nhanh' },
    { value: 'AGING', label: 'Cộng điểm theo thời gian chờ' },
    { value: 'REBALANCE', label: 'Cân bằng tải giữa các phòng' },
];

export interface QueuePriorityRule {
    rule_id: string;
    rule_code: string;
    name: string;
    description?: string | null;
    rule_type: QueueRuleType;
    conditions?: Record<string, unknown> | null;
    weight: number;
    aging_rate: number;
    max_aging: number;
    params?: Record<string, unknown> | null;
    room_type?: ServiceRoomType | string | null;
    specialty_id?: string | null;
    specialty?: Specialty | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CreatePriorityRuleDto {
    rule_code: string;
    name: string;
    description?: string;
    rule_type: QueueRuleType;
    weight?: number;
    aging_rate?: number;
    max_aging?: number;
    conditions?: Record<string, unknown>;
    params?: Record<string, unknown>;
    room_type?: ServiceRoomType | string;
    specialty_id?: string;
}

export interface UpdatePriorityRuleDto {
    name?: string;
    description?: string;
    rule_type?: QueueRuleType;
    weight?: number;
    aging_rate?: number;
    max_aging?: number;
    conditions?: Record<string, unknown>;
    params?: Record<string, unknown>;
    room_type?: ServiceRoomType | string;
    specialty_id?: string;
    is_active?: boolean;
}

export interface QueryPriorityRuleParams {
    rule_type?: QueueRuleType;
    is_active?: boolean;
    room_type?: ServiceRoomType | string;
    specialty_id?: string;
}

/** Matches backend Prisma StepTypeEnum */
export type StepType =
    | 'REGISTRATION'
    | 'TRIAGE'
    | 'CLINICAL'
    | 'PROCEDURE'
    | 'LAB_TEST'
    | 'IMAGING'
    | 'FUNCTIONAL_EXPLORATION'
    | 'PAYMENT'
    | 'DISPENSING'
    | 'OTHER';

export const STEP_TYPE_LABELS: Record<StepType, string> = {
    REGISTRATION: 'Đăng ký',
    TRIAGE: 'Phân loại/Đo sinh hiệu',
    CLINICAL: 'Khám lâm sàng',
    PROCEDURE: 'Thủ thuật',
    LAB_TEST: 'Xét nghiệm',
    IMAGING: 'Chẩn đoán hình ảnh',
    FUNCTIONAL_EXPLORATION: 'Thăm dò chức năng',
    PAYMENT: 'Thanh toán',
    DISPENSING: 'Phát thuốc',
    OTHER: 'Khác',
};

export interface RoomServiceStat {
    id: string;
    room_id: string;
    step_type: StepType;
    ema_duration_sec: number | null;
    sample_count: number;
    default_duration_sec: number;
    updated_at?: string;
    room?: { room_id: string; room_name: string };
}
