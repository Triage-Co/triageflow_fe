export interface ApiNotification {
    id?: string;
    notification_id?: string;
    account_id?: string;
    message?: string;
    content?: string;
    title?: string;
    created_at?: string;
    updated_at?: string;
    is_read?: boolean;
    read?: boolean;
}

export interface NotificationItem {
    id: string;
    content: string;
    time: string;
    read: boolean;
    createdAt: Date;
}
