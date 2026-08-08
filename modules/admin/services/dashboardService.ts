import { apiClient } from '@/shared/services/apiClient';
import type { CongestionLevel } from '../hooks/useQueueHeatmap';

export interface DashboardKpis {
    rooms_with_shift_today: number;
    active_services: number;
    queue_waiting: number;
    queue_serving: number;
    completed_today: number;
    staff_on_shift_today: number;
}

export interface DashboardBusiestRoom {
    room_id: string;
    room_name: string;
    waiting_count: number;
    eta_full_queue_minutes: number;
    congestion_level: CongestionLevel;
}

export interface DashboardSummary {
    generated_at: string;
    kpis: DashboardKpis;
    busiest_rooms: DashboardBusiestRoom[];
    links?: { heatmap?: string };
}

export const dashboardService = {
    getSummary: (token: string) =>
        apiClient.get<DashboardSummary>('/api/admin/dashboard/summary', {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
