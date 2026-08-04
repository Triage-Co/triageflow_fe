/** Queue lifecycle: PENDING → CALLING → IN_PROGRESS → COMPLETED */
export type QueueStatus =
    | 'PENDING'
    | 'CALLING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'SKIPPED'
    | 'CANCELLED'
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
}

export interface RoomWaitingDisplayData {
    room: RoomInfo;
    currentPatient: QueuePatientItem | null;
    upcomingPatients: QueuePatientItem[];
    lastUpdated: string;
}

/** Shared shape from POST /queue/call-next and socket broadcast */
export interface CallNextRoomInfo {
    room_name: string;
    specialty_name: string;
    doctor_name: string;
}

export interface CallNextPatient {
    queue_number: string | number;
    patient_name: string;
    /** Present when backend includes lifecycle status */
    status?: QueueStatus;
    queue_id?: string;
}

export interface CallNextResponse {
    room_info: CallNextRoomInfo;
    current_patient: CallNextPatient | null;
    upcoming_patients: CallNextPatient[];
}
