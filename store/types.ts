// Global state types

export interface UIState {
    sidebarOpen: boolean;
    theme: 'light' | 'dark';
    notifications: Notification[];
}

export interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
}

// Add more state types as needed
