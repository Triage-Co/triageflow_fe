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
    status: 'PROCESSING' | 'WAITING' | 'COMPLETED' | string;
}

export interface RoomWaitingDisplayData {
    room: RoomInfo;
    currentPatient: QueuePatientItem | null;
    upcomingPatients: QueuePatientItem[];
    lastUpdated: string;
}
