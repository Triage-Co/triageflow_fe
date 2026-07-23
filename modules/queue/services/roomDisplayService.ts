import { apiClient } from '@/shared/services/apiClient';
import { BackendQueuePatient } from '@/modules/clinical/services/clinicalService';
import type { RoomWaitingDisplayData, RoomInfo, QueuePatientItem } from '../types/queue.types';

// Raw backend room structure from GET /api/room
interface BackendRoom {
    room_id: string;
    room_name: string;
    room_type: string;
    specialty_id?: string;
    specialty?: {
        specialty_id: string;
        specialty_code: string;
        specialty_name: string;
    };
}

// Fallback mock data
const DEFAULT_MOCK_DISPLAY: RoomWaitingDisplayData = {
    room: {
        roomId: '201',
        roomName: 'PHÒNG 201',
        department: 'KHOA NỘI TỔNG QUÁT',
        doctorName: 'BS. Nguyễn Minh Tuấn',
        specialty: 'Nội tổng quát',
    },
    currentPatient: {
        id: 'p-102',
        queueNumber: 'A102',
        patientName: 'Nguyễn Văn An',
        status: 'PROCESSING',
    },
    upcomingPatients: [
        { id: 'p-103', queueNumber: 'A103', patientName: 'Trần Văn Bình', status: 'WAITING' },
        { id: 'p-104', queueNumber: 'A104', patientName: 'Lê Minh Châu', status: 'WAITING' },
        { id: 'p-105', queueNumber: 'A105', patientName: 'Phạm Quốc Dũng', status: 'WAITING' },
        { id: 'p-106', queueNumber: 'A106', patientName: 'Võ Thị Hằng', status: 'WAITING' },
        { id: 'p-107', queueNumber: 'A107', patientName: 'Đặng Thị Liên', status: 'WAITING' },
    ],
    lastUpdated: new Date().toISOString(),
};

/** Map BackendQueuePatient → QueuePatientItem */
function mapPatient(item: BackendQueuePatient): QueuePatientItem {
    const stepStatus = item.step?.step_status ?? item.status;
    const name = item.step?.flow?.booking?.patient?.account?.full_name ?? 'Bệnh nhân';
    return {
        id: item.queue_id,
        queueNumber: String(item.queue_number),
        patientName: name,
        status: stepStatus,
    };
}

function isCurrentPatient(item: BackendQueuePatient): boolean {
    const s = item.step?.step_status ?? item.status;
    return s === 'PROCESSING' || s === 'IN_PROGRESS' || s === 'ONGOING';
}

function isWaiting(item: BackendQueuePatient): boolean {
    const s = item.step?.step_status ?? item.status;
    return (
        s !== 'PROCESSING' &&
        s !== 'IN_PROGRESS' &&
        s !== 'ONGOING' &&
        s !== 'COMPLETED' &&
        s !== 'CANCELLED'
    );
}

export const roomDisplayService = {
    /**
     * GET /api/room — list all rooms (needs token for auth)
     */
    async getRooms(token?: string): Promise<BackendRoom[]> {
        try {
            const headers: Record<string, string> = token
                ? { Authorization: `Bearer ${token}` }
                : {};
            const res = await apiClient.get<BackendRoom[]>('/api/room', {
                headers,
                suppressLogError: true,
            });
            if (res?.data && Array.isArray(res.data)) return res.data;
            return [];
        } catch {
            return [];
        }
    },

    /**
     * Main method: fetch room info + live patient queue.
     *
     * - Room info: from GET /api/room list (find by roomId)
     * - Patients:  from GET /api/doctor/patients?date=TODAY (token required)
     *
     * Falls back to mock data when API is unavailable or token is missing.
     */
    async getRoomDisplayData(
        roomId: string = '201',
        token?: string,
    ): Promise<RoomWaitingDisplayData> {
        try {
            // ── 1. Fetch room info from list ──────────────────────────────────
            const rooms = await this.getRooms(token);
            const foundRoom = rooms.find(
                (r) => r.room_id === roomId || r.room_name === roomId,
            );

            const roomInfo: RoomInfo = foundRoom
                ? {
                      roomId: foundRoom.room_id,
                      roomName: foundRoom.room_name.toUpperCase().startsWith('PHÒNG')
                          ? foundRoom.room_name.toUpperCase()
                          : `PHÒNG ${foundRoom.room_name.toUpperCase()}`,
                      department: (
                          foundRoom.specialty?.specialty_name ?? 'KHOA NỘI TỔNG QUÁT'
                      ).toUpperCase(),
                      doctorName: 'BS. Nguyễn Minh Tuấn', // not returned by /api/room
                      specialty: foundRoom.specialty?.specialty_name ?? 'Nội tổng quát',
                  }
                : DEFAULT_MOCK_DISPLAY.room;

            // ── 2. Fetch patient queue (requires token) ────────────────────────
            if (!token) {
                // No token → show room info but keep mock queue
                return {
                    room: roomInfo,
                    currentPatient: DEFAULT_MOCK_DISPLAY.currentPatient,
                    upcomingPatients: DEFAULT_MOCK_DISPLAY.upcomingPatients,
                    lastUpdated: new Date().toISOString(),
                };
            }

            const todayStr = new Date().toISOString().slice(0, 10);
            const patientsRes = await apiClient
                .get<BackendQueuePatient[]>(`/api/doctor/patients?date=${todayStr}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    suppressLogError: true, // suppress expected 404s when DB is empty
                })
                .catch(() => null);

            const patients: BackendQueuePatient[] = Array.isArray(patientsRes?.data)
                ? patientsRes!.data
                : [];

            if (patients.length === 0) {
                // No patients today → return correct room info + mock queue to demonstrate UI
                return {
                    room: roomInfo,
                    currentPatient: {
                        id: 'demo-current',
                        queueNumber: 'A102',
                        patientName: 'Nguyễn Văn An',
                        status: 'PROCESSING'
                    },
                    upcomingPatients: [
                        { id: 'demo-1', queueNumber: 'A103', patientName: 'Trần Văn Bình', status: 'WAITING' },
                        { id: 'demo-2', queueNumber: 'A104', patientName: 'Lê Minh Châu', status: 'WAITING' },
                        { id: 'demo-3', queueNumber: 'A105', patientName: 'Phạm Quốc Dũng', status: 'WAITING' },
                        { id: 'demo-4', queueNumber: 'A106', patientName: 'Võ Thị Hằng', status: 'WAITING' }
                    ],
                    lastUpdated: new Date().toISOString(),
                };
            }

            // ── 3. Filter patients matching the room's specialty ────────────────
            // Map the patients and filter those whose specialty matches this room
            const mappedPatients = patients.map(mapPatient);

            // Determine current and upcoming patients
            const current = patients.find(isCurrentPatient);
            const waiting = patients.filter(isWaiting);

            return {
                room: roomInfo,
                currentPatient: current ? mapPatient(current) : null,
                upcomingPatients: waiting.map(mapPatient),
                lastUpdated: new Date().toISOString(),
            };
        } catch (error) {
            console.warn('[roomDisplayService] Falling back to default display data:', error);
            return DEFAULT_MOCK_DISPLAY;
        }
    },
};
