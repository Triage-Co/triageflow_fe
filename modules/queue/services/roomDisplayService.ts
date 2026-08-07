import { apiClient } from '@/shared/services/apiClient';
import { BackendQueuePatient } from '@/modules/clinical/services/clinicalService';
import type { RoomWaitingDisplayData, RoomInfo, QueuePatientItem } from '../types/queue.types';
import { roomService, type BackendRoom } from './roomService';

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

/** Current on TV: CALLING (just called) or IN_PROGRESS (examining) */
function isCurrentPatient(item: BackendQueuePatient): boolean {
    const queueStatus = (item.status || '').toUpperCase();
    const step = (item.step?.step_status || '').toUpperCase();
    return (
        queueStatus === 'CALLING' ||
        queueStatus === 'IN_PROGRESS' ||
        step === 'PROCESSING' ||
        step === 'IN_PROGRESS' ||
        step === 'ONGOING'
    );
}

/** Upcoming = PENDING only (must not include current CALLING/IN_PROGRESS) */
function isWaiting(item: BackendQueuePatient): boolean {
    const queueStatus = (item.status || '').toUpperCase();
    return queueStatus === 'PENDING' || queueStatus === 'WAITING';
}

export const roomDisplayService = {
    /**
     * GET /api/room — list all rooms
     */
    async getRooms(): Promise<BackendRoom[]> {
        return roomService.getRooms();
    },

    /**
     * Main method: fetch room info + live patient queue.
     *
     * - Room info: from GET /api/room list (find by roomId)
     * - Patients:  from GET /api/doctor/patients?date=TODAY (token required)
     */
    async getRoomDisplayData(
        roomId: string = '201',
        token?: string,
    ): Promise<RoomWaitingDisplayData> {
        try {
            // ── 1. Fetch room info from list ──────────────────────────────────
            const rooms = await this.getRooms();
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
                      doctorName: 'BS. Đang trực',
                      specialty: foundRoom.specialty?.specialty_name ?? 'Nội tổng quát',
                  }
                : {
                      roomId,
                      roomName: roomId.toUpperCase().startsWith('PHÒNG') ? roomId.toUpperCase() : `PHÒNG ${roomId.toUpperCase()}`,
                      department: 'KHOA KHÁM BỆNH',
                      doctorName: 'BS. Đang trực',
                      specialty: 'Khoa khám bệnh',
                  };

            // ── 2. Fetch patient queue (requires token) ────────────────────────
            if (!token) {
                return {
                    room: roomInfo,
                    currentPatient: null,
                    upcomingPatients: [],
                    lastUpdated: new Date().toISOString(),
                };
            }

            const todayStr = new Date().toISOString().slice(0, 10);
            const patientsRes = await apiClient
                .get<BackendQueuePatient[]>(`/api/doctor/patients?date=${todayStr}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    suppressLogError: true,
                })
                .catch(() => null);

            const patients: BackendQueuePatient[] = Array.isArray(patientsRes?.data)
                ? patientsRes!.data
                : [];

            if (patients.length === 0) {
                return {
                    room: roomInfo,
                    currentPatient: null,
                    upcomingPatients: [],
                    lastUpdated: new Date().toISOString(),
                };
            }

            // ── 3. Current = CALLING|IN_PROGRESS; Upcoming = PENDING ─────────────────────
            const current = patients.find(isCurrentPatient) ?? null;
            const currentId = current?.queue_id ? String(current.queue_id) : '';
            const currentNum = current?.queue_number ? String(current.queue_number).trim() : '';

            const waiting = patients.filter((p) => {
                if (!isWaiting(p)) return false;
                if (currentId && p.queue_id && String(p.queue_id) === currentId) return false;
                if (currentNum && String(p.queue_number).trim() === currentNum) return false;
                return true;
            });

            return {
                room: roomInfo,
                currentPatient: current ? mapPatient(current) : null,
                upcomingPatients: waiting.slice(0, 5).map(mapPatient),
                lastUpdated: new Date().toISOString(),
            };
        } catch (error) {
            console.warn('[roomDisplayService] Error fetching display data:', error);
            return {
                room: {
                    roomId,
                    roomName: `PHÒNG ${roomId.toUpperCase()}`,
                    department: 'KHOA KHÁM BỆNH',
                    doctorName: 'BS. Đang trực',
                    specialty: 'Khoa khám bệnh',
                },
                currentPatient: null,
                upcomingPatients: [],
                lastUpdated: new Date().toISOString(),
            };
        }
    },
};

