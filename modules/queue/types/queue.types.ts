/** Queue lifecycle statuses used across TV + staff */
export type QueueStatus =
    | 'PENDING'
    | 'QUEUED'
    | 'CALLING'
    | 'CALLED'
    | 'SERVING'
    | 'IN_PROGRESS'
    | 'MISSING'
    | 'FINISHED'
    | 'COMPLETED'
    | 'SKIPPED'
    | 'CANCELLED'
    | 'DECLINED'
    | string;

/** SOD / SO status from BE serving payload */
export type ServiceOrderDetailStatus =
    | 'PENDING'
    | 'PAID'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | string;

export type ServiceOrderStatus =
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'PAID'
    | string;

export interface RoomInfo {
    roomId: string;
    roomName: string;
    department: string;
    doctorName: string;
    specialty: string;
}

export interface QueuePatientItem {
    id: string;
    queueNumber: string;
    patientName: string;
    status: QueueStatus;
    etaMinutes?: number;
    queueType?: string;
    priorityReasons?: string[];
}

export interface RoomWaitingDisplayData {
    room: RoomInfo;
    currentPatient: QueuePatientItem | null;
    upcomingPatients: QueuePatientItem[];
    lastUpdated: string;
}

/** Shared shape from POST /queue/call-next and socket broadcast (TV) */
export interface CallNextRoomInfo {
    room_name: string;
    specialty_name: string;
    doctor_name: string;
}

export interface CallNextPatient {
    queue_number: string | number;
    patient_name: string;
    status?: QueueStatus;
    queue_id?: string;
    eta_minutes?: number;
    queue_type?: string;
    priority_reasons?: string[];
}

export interface CallNextResponse {
    room_info: CallNextRoomInfo;
    current_patient: CallNextPatient | null;
    upcoming_patients: CallNextPatient[];
    /** Present on staff call-next / room GET — ignored by TV normalize */
    serving?: Serving | null;
    waiting?: WaitingEntry[];
    missing?: MissingEntry[];
    room_id?: string;
    expected_service_minutes?: number;
    timestamp?: string;
}

export interface CallNextRequestDto {
    room_id: string;
    staff_id: string;
    /** Omit = head of priority queue */
    step_id?: string;
}

/** @deprecated Use CallNextRequestDto — step_id is now optional */
export interface CallPatientDto {
    step_id: string;
    room_id: string;
    staff_id: string;
}

// ── Staff room queue (GET /queue/room/:roomId) ──────────────────────────────

export interface ServingPatient {
    patient_id: string;
    full_name: string;
    dob: string | null;
    gender: string;
}

export interface ServingStep {
    step_id: string;
    step_name: string;
    step_type: string;
    step_status: string;
    service_code: string | null;
}

export interface ServingServiceOrderDetail {
    service_order_detail_id: string;
    name: string | null;
    service_id: string;
    service_code: string | null;
    service_name: string | null;
    quantity: number;
    status: ServiceOrderDetailStatus;
}

export interface ServingServiceOrder {
    service_order_id: string;
    name: string;
    status: ServiceOrderStatus;
    details: ServingServiceOrderDetail[];
}

export interface Serving {
    queue_id: string;
    queue_number: string;
    serving_started_at: string | null;
    patient: ServingPatient | null;
    step: ServingStep | null;
    service_order: ServingServiceOrder | null;
}

export interface WaitingEntry {
    position: number;
    queue_id: string;
    queue_number: string;
    patient_name: string;
    queue_type: string;
    effective_score: number;
    reasons: string[];
    is_pinned: boolean;
    enqueued_at: string | null;
    waited_minutes: number;
    eta_minutes: number;
    eta_time: string | null;
    /** Optional step id when BE includes it for call-by-step */
    step_id?: string;
}

export interface MissingEntry {
    queue_id: string;
    queue_number: string;
    patient_name: string;
    missed_at: string | null;
    step_id?: string;
}

export interface RoomQueueData {
    room_id: string;
    expected_service_minutes: number;
    serving: Serving | null;
    waiting: WaitingEntry[];
    missing: MissingEntry[];
}

export interface QueueOverrideBody {
    action: 'PIN_TOP' | 'MOVE_TO_POSITION' | 'UNPIN' | string;
    position?: number;
    reason?: string;
}

export interface QueueTransferBody {
    step_id: string;
    to_room_id: string;
    staff_id?: string;
}

export interface QueueRefuseBody {
    reason?: string;
}

/** SOD statuses that still allow complete/refuse */
export const ACTIVE_SOD_STATUSES = new Set([
    'PENDING',
    'PAID',
    'IN_PROGRESS',
]);
