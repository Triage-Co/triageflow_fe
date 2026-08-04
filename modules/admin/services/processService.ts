import { apiClient } from '@/shared/services/apiClient';
import type { ProcessTemplate, CreateTemplateDto, UpdateTemplateDto } from '../types/process.types';

export const processService = {
    getTemplates: async (token: string) => {
        return apiClient.get<ProcessTemplate[]>('/api/template', {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    getTemplateById: async (id: string, token: string) => {
        return apiClient.get<ProcessTemplate>(`/api/template/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    getTemplateByName: async (name: string, token: string) => {
        return apiClient.get<ProcessTemplate>(`/api/template/name/${encodeURIComponent(name)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    createTemplate: async (data: CreateTemplateDto, token: string) => {
        return apiClient.post<ProcessTemplate>('/api/template', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    updateTemplate: async (id: string, data: UpdateTemplateDto, token: string) => {
        return apiClient.patch<ProcessTemplate>(`/api/template/${id}`, data, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },

    deleteTemplate: async (id: string, token: string) => {
        return apiClient.delete<void>(`/api/template/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
    },
};
