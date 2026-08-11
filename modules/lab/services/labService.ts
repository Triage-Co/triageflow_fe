import { apiClient } from '@/shared/services/apiClient';
import { queueService } from '@/modules/queue/services/queueService';
import type { RoomQueueData } from '@/modules/queue/types/queue.types';
import type { ShiftInfo } from '../types/lab.types';

export const labService = {
    async getMyShifts(date?: string): Promise<ShiftInfo[]> {
        const query = date ? `?date=${date}` : '';
        const res = await apiClient.get<ShiftInfo[]>(`/api/shift/me${query}`);
        return res.data;
    },

    async getRoomQueue(roomId: string): Promise<RoomQueueData> {
        return queueService.getRoomQueue(roomId);
    },

    async callNext(data: { room_id: string; staff_id: string; step_id?: string }) {
        const res = await queueService.callNext(data);
        return res.staffQueue ?? res.data;
    },

    async completeQueue(queueId: string) {
        return queueService.completeStep(queueId);
    },

    async recallQueue(queueId: string) {
        return queueService.recall(queueId);
    },

    async overrideQueue(
        queueId: string,
        data: { action: string; position?: number; reason?: string },
    ) {
        return queueService.override(queueId, data);
    },

    async missQueue(queueId: string) {
        return queueService.miss(queueId);
    },
};
