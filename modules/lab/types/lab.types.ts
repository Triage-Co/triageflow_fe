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

export interface QueuePatientItem {
    position: number;
    queue_id: string;
    queue_number: string;
    patient_name: string;
    queue_type: 'APPOINTMENT' | 'WALK_IN' | string;
    effective_score: number;
    reasons: string[];
    is_pinned: boolean;
    enqueued_at: string;
    waited_minutes: number;
    eta_minutes: number;
    eta_time: string;
    
    // Local UI overrides/states
    localStatus?: 'WAITING' | 'SERVING' | 'MISSING' | 'COMPLETED';
    resultValue?: string;
    resultNotes?: string;
    tubeType?: string;
    volume?: string;
}

export interface RoomQueueData {
    room_id: string;
    expected_service_minutes: number;
    serving: QueuePatientItem | null;
    waiting: QueuePatientItem[];
    missing: QueuePatientItem[];
}

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}
