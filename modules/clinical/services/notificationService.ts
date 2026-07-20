import { apiClient } from '@/shared/services/apiClient';
import type { ApiNotification } from '../types/notification.types';

export const notificationService = {
    getNotifications: (token: string) =>
        apiClient.get<ApiNotification[]>('/api/notification', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteNotification: (id: string, token: string) =>
        apiClient.delete(`/api/notification/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    deleteAllNotifications: (token: string) =>
        apiClient.delete('/api/notification/all', {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
