import { apiClient } from '@/shared/services/apiClient';
import type { CallNextResponse } from '../types/queue.types';
import { normalizeQueueUpdatePayload } from '../utils/normalizeQueueUpdate';

export interface CallPatientDto {
    step_id: string;
    room_id: string;
    staff_id: string;
}

export type { CallNextResponse };

export const queueService = {
    /**
     * POST /api/queue/call-next
     *
     * Doctor calls the next PENDING queue for this step/room/staff.
     * Backend marks queue CALLING, finds next waiting (≤5), broadcasts
     * `doctor_queue_updated` to TV, and returns:
     * { room_info, current_patient, upcoming_patients }
     *
     * current_patient must not appear in upcoming_patients.
     */
    async callNextPatient(dto: CallPatientDto, token: string) {
        const res = await apiClient.post<CallNextResponse>('/api/queue/call-next', dto, {
            headers: { Authorization: `Bearer ${token}` },
            suppressLogError: true,
        });

        const raw = res?.data ?? res;
        const normalized = normalizeQueueUpdatePayload(raw);

        return {
            ...res,
            data: normalized ?? (raw as CallNextResponse),
        };
    },
};
