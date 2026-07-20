import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import type { NotificationItem } from '../types/notification.types';

export interface NotificationState {
    notifications: NotificationItem[];
    isLoading: boolean;
    error: string | null;
    fetchNotifications: (token: string) => Promise<void>;
    toggleRead: (id: string) => void;
    markAllRead: () => void;
    deleteNotification: (id: string, token: string) => Promise<void>;
    deleteAllNotifications: (token: string) => Promise<void>;
    clearError: () => void;
}

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Vừa xong';
    if (diffMinutes < 60) return `${diffMinutes} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    isLoading: false,
    error: null,

    fetchNotifications: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await notificationService.getNotifications(token);
            if (res && res.data) {
                const mapped: NotificationItem[] = res.data.map((item) => ({
                    id: item.id,
                    content: item.message,
                    time: formatRelativeTime(item.created_at),
                    read: false,
                    createdAt: new Date(item.created_at),
                }));
                mapped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                set({ notifications: mapped, isLoading: false });
            } else {
                set({ notifications: [], isLoading: false });
            }
        } catch (err) {
            set({
                error: err instanceof Error ? err.message : 'Không thể tải thông báo.',
                isLoading: false,
            });
        }
    },

    toggleRead: (id: string) => {
        set((state) => ({
            notifications: state.notifications.map((n) =>
                n.id === id ? { ...n, read: !n.read } : n
            ),
        }));
    },

    markAllRead: () => {
        set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
    },

    deleteNotification: async (id: string, token: string) => {
        try {
            await notificationService.deleteNotification(id, token);
            set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
            }));
        } catch (err) {
            set({
                error: err instanceof Error ? err.message : 'Không thể xoá thông báo.',
            });
        }
    },

    deleteAllNotifications: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
            await notificationService.deleteAllNotifications(token);
            set({ notifications: [], isLoading: false });
        } catch (err) {
            set({
                error: err instanceof Error ? err.message : 'Không thể xoá tất cả thông báo.',
                isLoading: false,
            });
        }
    },

    clearError: () => set({ error: null }),
}));
