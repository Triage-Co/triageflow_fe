import type {
    MissingEntry,
    RoomQueueData as SharedRoomQueueData,
    Serving,
    ServingPatient,
    ServingStep,
    WaitingEntry,
} from '@/modules/queue/types/queue.types';

export type {
    MissingEntry,
    Serving,
    ServingPatient,
    ServingStep,
    WaitingEntry,
};

export interface ShiftRoom {
    room_id: string;
    room_name: string;
    room_type: 'LABORATORY' | string;
    physical_room_id: string | null;
    specialty_id: string | null;
    created_at: string;
    updated_at: string;
    specialty: unknown | null;
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

/** @deprecated Prefer WaitingEntry / Serving from queue.types — kept for legacy lab modals */
export interface QueuePatientItem {
    position?: number;
    queue_id: string;
    queue_number: string;
    patient_name: string;
    queue_type?: 'APPOINTMENT' | 'WALK_IN' | string;
    effective_score?: number;
    reasons?: string[];
    is_pinned?: boolean;
    enqueued_at?: string | null;
    waited_minutes?: number;
    eta_minutes?: number;
    eta_time?: string | null;
    missed_at?: string | null;
    localStatus?: 'WAITING' | 'SERVING' | 'MISSING' | 'COMPLETED';
    resultValue?: string;
    resultNotes?: string;
    tubeType?: string;
    volume?: string;
    patient?: ServingPatient | null;
    step?: ServingStep | null;
    serving_started_at?: string | null;
    service_order?: Serving['service_order'];
}

export type RoomQueueData = SharedRoomQueueData;

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
}
