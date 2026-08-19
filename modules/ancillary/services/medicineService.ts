import { apiClient } from '@/shared/services/apiClient';
import { Medicine, CreateMedicineDto } from '@/shared/types/prescription.types';

export interface GetMedicinesParams {
    search?: string;
    is_active?: boolean;
    usage_route?: string;
    manufacturer?: string;
    page?: number;
    limit?: number;
}

export const medicineService = {

    async getMedicines(params?: GetMedicinesParams): Promise<Medicine[]> {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.is_active !== undefined) queryParams.append('is_active', String(params.is_active));
        if (params?.usage_route) queryParams.append('usage_route', params.usage_route);
        if (params?.manufacturer) queryParams.append('manufacturer', params.manufacturer);
        if (params?.page) queryParams.append('page', String(params.page));
        if (params?.limit) queryParams.append('limit', String(params.limit));

        const queryString = queryParams.toString();
        const url = `/api/medicine${queryString ? `?${queryString}` : ''}`;

        try {
            const res = await apiClient.get<any>(url, { suppressLogError: true });
            const responseData: any = res;
            let list: Medicine[] = [];
            if (Array.isArray(responseData)) list = responseData;
            else if (Array.isArray(responseData?.data)) list = responseData.data;
            else if (responseData?.data?.items && Array.isArray(responseData.data.items)) list = responseData.data.items;
            else if (responseData?.items && Array.isArray(responseData.items)) list = responseData.items;

            return list;
        } catch (error) {
            console.error('[medicineService] API getMedicines failed:', error);
            return [];
        }
    },

    async getRoutes(): Promise<string[]> {
        try {
            const res = await apiClient.get<any>('/api/medicine/routes', { suppressLogError: true });
            const data = res?.data ?? res;
            if (Array.isArray(data)) return data.filter(Boolean);
            if (Array.isArray(data?.data)) return data.data.filter(Boolean);
        } catch (error) {
            console.warn('[medicineService] API getRoutes failed:', error);
        }
        return [];
    },

    async getManufacturers(): Promise<string[]> {
        try {
            const res = await apiClient.get<any>('/api/medicine/manufacturers', { suppressLogError: true });
            const data = res?.data ?? res;
            if (Array.isArray(data)) return data.filter(Boolean);
            if (Array.isArray(data?.data)) return data.data.filter(Boolean);
        } catch (error) {
            console.warn('[medicineService] API getManufacturers failed:', error);
        }
        return [];
    },

    async createMedicine(data: CreateMedicineDto): Promise<Medicine> {
        const res = await apiClient.post<any>('/api/medicine', data);
        return res?.data || res;
    }
};
