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
    }
};
