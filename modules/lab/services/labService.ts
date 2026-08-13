import { apiClient } from '@/shared/services/apiClient';
import { ShiftInfo, RoomQueueData } from '../types/lab.types';

export const labService = {
    /**
     * GET /api/shift/me
     * Lấy danh sách ca trực cá nhân của Staff đăng nhập.
     * Mặc định là ngày hôm nay nếu không truyền date.
     */
    async getMyShifts(date?: string): Promise<ShiftInfo[]> {
        const query = date ? `?date=${date}` : '';
        const res = await apiClient.get<ShiftInfo[]>(`/api/shift/me${query}`);
        return res.data;
    },

    /**
     * GET /api/queue/room/{roomId}
     * Xem chi tiết hàng chờ phòng khám dành cho Staff / Doctor (serving, waiting, missing).
     */
    async getRoomQueue(roomId: string): Promise<RoomQueueData> {
        const res = await apiClient.get<RoomQueueData>(`/api/queue/room/${roomId}`);
        return res.data;
    },

    /**
     * POST /api/queue/call-next
     * Bác sĩ gọi bệnh nhân tiếp theo vào phòng khám.
     */
    async callNext(data: { room_id: string; staff_id: string }): Promise<any> {
        const res = await apiClient.post<any>('/api/queue/call-next', data);
        return res.data;
    },

    /**
     * POST /api/queue/{queueId}/complete
     * Hoàn thành lượt SERVING tại phòng.
     */
    async completeQueue(queueId: string): Promise<any> {
        const res = await apiClient.post<any>(`/api/queue/${queueId}/complete`, {});
        return res.data;
    },

    /**
     * POST /api/queue/{queueId}/service-order-details/{detailId}/complete
     * Hoàn thành một Service Order Detail (queue vẫn SERVING).
     */
    async completeOrderDetail(queueId: string, detailId: string): Promise<any> {
        const res = await apiClient.post<any>(`/api/queue/${queueId}/service-order-details/${detailId}/complete`, {});
        return res.data;
    },

    /**
     * POST /api/queue/{queueId}/recall
     * Gọi lại bệnh nhân vắng mặt vào lại hàng chờ.
     */
    async recallQueue(queueId: string): Promise<any> {
        const res = await apiClient.post<any>(`/api/queue/${queueId}/recall`, {});
        return res.data;
    },

    /**
     * POST /api/queue/{queueId}/override
     * Can thiệp thứ tự hàng chờ (PIN_TOP, MOVE_TO_POSITION, UNPIN).
     */
    async overrideQueue(queueId: string, data: { action: string; position: number; reason: string }): Promise<any> {
        const res = await apiClient.post<any>(`/api/queue/${queueId}/override`, data);
        return res.data;
    }
};
