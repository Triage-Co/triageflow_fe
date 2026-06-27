import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { UIState, Notification } from './types';

interface UIActions {
    toggleSidebar: () => void;
    setSidebarOpen: (open: boolean) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    addNotification: (notification: Omit<Notification, 'id'>) => void;
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
}

type UIStore = UIState & UIActions;

const initialState: UIState = {
    sidebarOpen: false,
    theme: 'light',
    notifications: [],
};

export const useUIStore = create<UIStore>()(
    devtools((set) => ({
        ...initialState,
        toggleSidebar: () =>
            set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setTheme: (theme) => set({ theme }),
        addNotification: (notification) =>
            set((state) => ({
                notifications: [
                    ...state.notifications,
                    {
                        ...notification,
                        id: Date.now().toString(),
                    },
                ],
            })),
        removeNotification: (id) =>
            set((state) => ({
                notifications: state.notifications.filter((n) => n.id !== id),
            })),
        clearNotifications: () => set({ notifications: [] }),
    }))
);
