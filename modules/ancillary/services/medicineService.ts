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

export const MOCK_MEDICINES: Medicine[] = [
    {
        medicine_id: 'med-1',
        medicine_code: 'MED-PAR-500',
        medicine_name: 'Paracetamol 500mg',
        active_ingredient: 'Paracetamol',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 5000,
        manufacturer: 'Dược Hậu Giang',
        description: 'Giảm đau nhẹ đến vừa, hạ sốt nhanh chóng',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        medicine_id: 'med-2',
        medicine_code: 'MED-NEX-40',
        medicine_name: 'Nexium Mups 40mg',
        active_ingredient: 'Esomeprazol',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 18500,
        manufacturer: 'AstraZeneca',
        description: 'Điều trị trào ngược dạ dày thực quản, viêm loét dạ dày',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        medicine_id: 'med-3',
        medicine_code: 'MED-GAV-10',
        medicine_name: 'Gaviscon Dual Action (10ml)',
        active_ingredient: 'Sodium alginate + Sodium bicarbonate',
        unit: 'Gói',
        usage_route: 'Uống',
        unit_price: 12000,
        manufacturer: 'Reckitt Benckiser',
        description: 'Giảm ợ nóng, ợ chua, trào ngược axit dạ dày',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        medicine_id: 'med-4',
        medicine_code: 'MED-PHO-20',
        medicine_name: 'Phosphalugel (Huyền dịch uống)',
        active_ingredient: 'Aluminium phosphate 20%',
        unit: 'Gói',
        usage_route: 'Uống',
        unit_price: 9500,
        manufacturer: 'Boehringer Ingelheim',
        description: 'Thuốc trung hòa axit dạ dày, giảm rát thượng vị',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        medicine_id: 'med-5',
        medicine_code: 'MED-AMX-500',
        medicine_name: 'Amoxicillin 500mg',
        active_ingredient: 'Amoxicillin',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 4500,
        manufacturer: 'Mekophar',
        description: 'Kháng sinh nhóm penicillin điều trị nhiễm khuẩn hô hấp',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        medicine_id: 'med-6',
        medicine_code: 'MED-AUG-1G',
        medicine_name: 'Augmentin 1g',
        active_ingredient: 'Amoxicillin + Clavulanic acid',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 24000,
        manufacturer: 'GSK (GlaxoSmithKline)',
        description: 'Kháng sinh phổ rộng điều trị nhiễm khuẩn tai mũi họng',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

export const medicineService = {
    /**
     * Tra cứu danh sách thuốc (All Authenticated Users)
     * GET /api/medicine?search=...&is_active=true&usage_route=...&manufacturer=...&page=1&limit=20
     */
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

            if (list.length > 0) return list;
            // Empty API result is valid (no matches) — do not fall back to mock when filters used
            if (params?.search || params?.usage_route || params?.manufacturer) return list;
        } catch (error) {
            console.warn('[medicineService] API endpoint failed, falling back to mock medicine catalog:', error);
        }

        // Return filtered mock list if API fails or returns empty
        let list = [...MOCK_MEDICINES];
        if (params?.is_active !== undefined) {
            list = list.filter((m) => m.is_active === params.is_active);
        }
        if (params?.usage_route) {
            const route = params.usage_route.toLowerCase();
            list = list.filter((m) => (m.usage_route || '').toLowerCase() === route);
        }
        if (params?.manufacturer) {
            const mfr = params.manufacturer.toLowerCase();
            list = list.filter((m) => (m.manufacturer || '').toLowerCase().includes(mfr));
        }
        if (params?.search) {
            const s = params.search.toLowerCase();
            list = list.filter(
                (m) =>
                    m.medicine_name.toLowerCase().includes(s) ||
                    m.medicine_code.toLowerCase().includes(s) ||
                    m.active_ingredient.toLowerCase().includes(s)
            );
        }

        return list;
    },

    async getRoutes(): Promise<string[]> {
        try {
            const res = await apiClient.get<any>('/api/medicine/routes', { suppressLogError: true });
            const data = res?.data ?? res;
            if (Array.isArray(data)) return data.filter(Boolean);
            if (Array.isArray(data?.data)) return data.data.filter(Boolean);
        } catch {
            // fallback below
        }
        return [...new Set(MOCK_MEDICINES.map((m) => m.usage_route).filter(Boolean))];
    },

    async getManufacturers(): Promise<string[]> {
        try {
            const res = await apiClient.get<any>('/api/medicine/manufacturers', { suppressLogError: true });
            const data = res?.data ?? res;
            if (Array.isArray(data)) return data.filter(Boolean);
            if (Array.isArray(data?.data)) return data.data.filter(Boolean);
        } catch {
            // fallback below
        }
        return [...new Set(MOCK_MEDICINES.map((m) => m.manufacturer || '').filter(Boolean))];
    },

    /**
     * Tạo loại thuốc mới (Roles: PHARMACIST, ADMIN, DOCTOR)
     * POST /api/medicine
     */
    async createMedicine(data: CreateMedicineDto): Promise<Medicine> {
        try {
            const res = await apiClient.post<any>('/api/medicine', data, { suppressLogError: true });
            return res.data || res;
        } catch (error) {
            console.warn('[medicineService] API create failed, adding to mock list:', error);
            const newMed: Medicine = {
                medicine_id: `med-${Date.now()}`,
                medicine_code: data.medicine_code,
                medicine_name: data.medicine_name,
                active_ingredient: data.active_ingredient,
                unit: data.unit,
                usage_route: data.usage_route,
                unit_price: data.unit_price,
                manufacturer: data.manufacturer,
                description: data.description,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            MOCK_MEDICINES.unshift(newMed);
            return newMed;
        }
    }
};
