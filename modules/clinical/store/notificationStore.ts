import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import type { ApiNotification, NotificationItem } from '../types/notification.types';

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
    if (Number.isNaN(date.getTime())) return dateStr || '';
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

    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function extractNotificationList(raw: unknown): ApiNotification[] {
    if (Array.isArray(raw)) return raw as ApiNotification[];
    if (!raw || typeof raw !== 'object') return [];
    const root = raw as Record<string, unknown>;
    if (Array.isArray(root.data)) return root.data as ApiNotification[];
    const nested = root.data;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const nestedRec = nested as Record<string, unknown>;
        if (Array.isArray(nestedRec.data)) return nestedRec.data as ApiNotification[];
        if (Array.isArray(nestedRec.items)) return nestedRec.items as ApiNotification[];
        if (Array.isArray(nestedRec.notifications)) {
            return nestedRec.notifications as ApiNotification[];
        }
    }
    if (Array.isArray(root.items)) return root.items as ApiNotification[];
    if (Array.isArray(root.notifications)) return root.notifications as ApiNotification[];
    return [];
}

function mapApiNotification(item: ApiNotification, index: number): NotificationItem | null {
    const id = String(item.id || item.notification_id || '').trim();
    if (!id && !item.message && !item.content && !item.title) return null;

    const content = String(
        item.message || item.content || item.title || 'Thông báo hệ thống'
    ).trim();
    const createdRaw = item.created_at || item.updated_at || '';
    const createdAt = createdRaw ? new Date(createdRaw) : new Date();

    return {
        id: id || `notif-${index}-${createdAt.getTime()}`,
        content,
        time: formatRelativeTime(createdAt.toISOString()),
        read: Boolean(item.is_read ?? item.read ?? false),
        createdAt,
    };
}

export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],
    isLoading: false,
    error: null,

    fetchNotifications: async (token: string) => {
        set({ isLoading: true, error: null });
        try {
            const res = await notificationService.getNotifications(token);
            const list = extractNotificationList(res?.data ?? res);
            const mapped = list
                .map(mapApiNotification)
                .filter((n): n is NotificationItem => Boolean(n));
            mapped.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            set({ notifications: mapped, isLoading: false });
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
