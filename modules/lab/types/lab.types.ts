export interface ShiftRoom {
    room_id: string;
    room_name: string;
    room_type: 'LABORATORY' | string;
    physical_room_id: string | null;
    specialty_id: string | null;
    created_at: string;
    updated_at: string;
    specialty: any | null;
}

export interface ShiftInfo {
    shift_id: string;
    staff_id: string;
    room_id: string;
    date: string;
    start_time: string;
    end_time: string;
    createdAt: string;
    updatedAt: string;
    physicalRoomId: string | null;
    room: ShiftRoom;
}

export interface ServingPatient {
    patient_id: string;
    full_name: string;
    dob: string;
    gender: string;
    phone?: string;
    citizen_id?: string;
}

export interface ServingStep {
    step_id: string;
    step_name: string;
    step_type: string;
    step_status: string;
    service_code: string | null;
}

export interface ServingQueueItem {
    queue_id: string;
    queue_number: string;
    serving_started_at: string;
    patient: ServingPatient;
    step: ServingStep;
    service_order: any;
}

export interface FinishedQueueItem {
    queue_id: string;
    queue_number: string;
    queue_type?: 'APPOINTMENT' | 'WALK_IN' | string;
    status: 'FINISHED' | string;
    serving_started_at?: string | null;
    finished_at?: string | null;
    duration_minutes?: number;
    refusal_reason?: string | null;
    patient: ServingPatient;
    step?: ServingStep;
    service_order?: any;
}

export interface QueuePatientItem {
    position?: number;
    queue_id: string;
    queue_number: string;
    patient_name: string;
    queue_type?: 'APPOINTMENT' | 'WALK_IN' | string;
    effective_score?: number;
    reasons?: string[];
    is_pinned?: boolean;
    enqueued_at?: string;
    waited_minutes?: number;
    eta_minutes?: number;
    eta_time?: string;
    missed_at?: string;
    finished_at?: string;
    duration_minutes?: number;
    refusal_reason?: string | null;
    status?: string;
    
    // Local UI overrides/states
    localStatus?: 'WAITING' | 'SERVING' | 'MISSING' | 'COMPLETED';
    resultValue?: string;
    resultNotes?: string;
    tubeType?: string;
    volume?: string;

    // Serving / finished nested objects fallback
    patient?: ServingPatient;
    step?: ServingStep;
    serving_started_at?: string;
    service_order?: any;
}

export interface RoomQueueData {
    room_id: string;
    expected_service_minutes: number;
    serving: ServingQueueItem | null;
    waiting: QueuePatientItem[];
    missing: QueuePatientItem[];
    finished?: FinishedQueueItem[];
}

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}

