import { apiClient } from '@/shared/services/apiClient';
import type { Flow } from '../types/process.types';

export const processService = {
    /**
     * Fetch all flows in the system (for Admin/Staff monitoring)
     */
    getFlows: async (token: string) => {
        const response = await apiClient.get<Flow[]>('/api/flow', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response;
    },

    /**
     * Get a specific flow by ID (for staff/admin)
     */
    getFlowById: async (id: string, token: string) => {
        const response = await apiClient.get<Flow>(`/api/flow/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response;
    },

    /**
     * Get flow by step ID (for user/patient)
     */
    getFlowByStepId: async (stepId: string, token: string) => {
        const response = await apiClient.get<Flow>(`/api/flow/account/step/${stepId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response;
    },

    /**
     * Get all flows of currently logged-in user
     */
    getMyFlows: async (token: string) => {
        const response = await apiClient.get<Flow[]>('/api/flow/account', {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response;
    },
};
