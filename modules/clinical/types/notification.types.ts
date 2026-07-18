export interface ApiNotification {
    id: string;
    account_id: string;
    message: string;
    created_at: string;
    updated_at: string;
}

export interface NotificationItem {
    id: string;
    content: string;
    time: string;
    read: boolean;
    createdAt: Date;
}
