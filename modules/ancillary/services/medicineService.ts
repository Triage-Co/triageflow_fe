import { apiClient } from '@/shared/services/apiClient';
import { Medicine, CreateMedicineDto, UpdateMedicineDto } from '@/shared/types/prescription.types';

export interface GetMedicinesParams {
    search?: string;
    is_active?: boolean;
    usage_route?: string;
    manufacturer?: string;
    page?: number;
    limit?: number;
    unit?: string;
    usage_route?: string;
    sort_by?: 'medicine_code' | 'medicine_name' | 'active_ingredient' | 'unit_price' | 'created_at';
    sort_order?: 'asc' | 'desc';
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
        created_at: new Date('2026-01-10').toISOString(),
        updated_at: new Date('2026-01-10').toISOString()
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
        created_at: new Date('2026-01-12').toISOString(),
        updated_at: new Date('2026-01-12').toISOString()
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
        created_at: new Date('2026-01-15').toISOString(),
        updated_at: new Date('2026-01-15').toISOString()
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
        created_at: new Date('2026-01-18').toISOString(),
        updated_at: new Date('2026-01-18').toISOString()
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
        created_at: new Date('2026-01-20').toISOString(),
        updated_at: new Date('2026-01-20').toISOString()
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
        created_at: new Date('2026-01-22').toISOString(),
        updated_at: new Date('2026-01-22').toISOString()
    },
    {
        medicine_id: 'med-7',
        medicine_code: 'MED-PAN-EXT',
        medicine_name: 'Panadol Extra (Đỏ)',
        active_ingredient: 'Paracetamol 500mg + Caffeine 65mg',
        unit: 'Vỉ',
        usage_route: 'Uống',
        unit_price: 15000,
        manufacturer: 'GSK',
        description: 'Giảm đau nhức đầu, giảm căng thẳng nhanh chóng',
        is_active: true,
        created_at: new Date('2026-01-25').toISOString(),
        updated_at: new Date('2026-01-25').toISOString()
    },
    {
        medicine_id: 'med-8',
        medicine_code: 'MED-BER-100',
        medicine_name: 'Berberin 100mg',
        active_ingredient: 'Berberin chloride',
        unit: 'Lọ',
        usage_route: 'Uống',
        unit_price: 28000,
        manufacturer: 'Dược TW3',
        description: 'Thuốc điều trị tiêu chảy, rối loạn tiêu hóa thảo dược',
        is_active: true,
        created_at: new Date('2026-01-28').toISOString(),
        updated_at: new Date('2026-01-28').toISOString()
    },
    {
        medicine_id: 'med-9',
        medicine_code: 'MED-SMC-3G',
        medicine_name: 'Smecta 3g (Bột pha uống)',
        active_ingredient: 'Diosmectite',
        unit: 'Gói',
        usage_route: 'Uống',
        unit_price: 5200,
        manufacturer: 'Ipsen',
        description: 'Bảo vệ niêm mạc tiêu hóa, điều trị tiêu chảy cấp',
        is_active: true,
        created_at: new Date('2026-02-01').toISOString(),
        updated_at: new Date('2026-02-01').toISOString()
    },
    {
        medicine_id: 'med-10',
        medicine_code: 'MED-TEL-180',
        medicine_name: 'Telfast HD 180mg',
        active_ingredient: 'Fexofenadin HCl',
        unit: 'Vỉ',
        usage_route: 'Uống',
        unit_price: 42000,
        manufacturer: 'Sanofi',
        description: 'Thuốc chống dị ứng, trị viêm mũi dị ứng và mày đay',
        is_active: true,
        created_at: new Date('2026-02-03').toISOString(),
        updated_at: new Date('2026-02-03').toISOString()
    },
    {
        medicine_id: 'med-11',
        medicine_code: 'MED-SAL-100',
        medicine_name: 'Ventolin Inhaler 100mcg',
        active_ingredient: 'Salbutamol',
        unit: 'Chai',
        usage_route: 'Xịt',
        unit_price: 95000,
        manufacturer: 'GSK',
        description: 'Bình xịt định liều giãn phế quản, cắt cơn hen cấp',
        is_active: true,
        created_at: new Date('2026-02-05').toISOString(),
        updated_at: new Date('2026-02-05').toISOString()
    },
    {
        medicine_id: 'med-12',
        medicine_code: 'MED-MDR-16',
        medicine_name: 'Medrol 16mg',
        active_ingredient: 'Methylprednisolon',
        unit: 'Viên',
        usage_route: 'Uống',
        unit_price: 11500,
        manufacturer: 'Pfizer',
        description: 'Kháng viêm corticoid trong các bệnh lý khớp và dị ứng nặng',
        is_active: false,
        created_at: new Date('2026-02-06').toISOString(),
        updated_at: new Date('2026-02-06').toISOString()
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
            console.error('[medicineService] API endpoint failed:', error);
            return [];
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
        const res = await apiClient.post<any>('/api/medicine', data);
        return res.data || res;
    },

    /**
     * Cập nhật loại thuốc (Roles: PHARMACIST, ADMIN)
     * PATCH /api/medicine/:id
     */
    async updateMedicine(id: string, data: UpdateMedicineDto): Promise<Medicine> {
        const res = await apiClient.patch<any>(`/api/medicine/${id}`, data);
        return res.data || res;
    },

    /**
     * Tắt hoạt động / Xóa mềm thuốc (Roles: PHARMACIST, ADMIN)
     * DELETE /api/medicine/:id
     */
    async deleteMedicine(id: string): Promise<Medicine> {
        const res = await apiClient.delete<any>(`/api/medicine/${id}`);
        return res.data || res;
    },

    /**
     * Khôi phục hoạt động cho thuốc đã tắt (Roles: PHARMACIST, ADMIN)
     * PATCH /api/medicine/:id/restore
     */
    async restoreMedicine(id: string): Promise<Medicine> {
        const res = await apiClient.patch<any>(`/api/medicine/${id}/restore`, {});
        return res.data || res;
    }
};

