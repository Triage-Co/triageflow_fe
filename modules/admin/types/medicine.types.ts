export interface Medicine {
    medicine_id: string;
    medicine_code: string;
    medicine_name: string;
    active_ingredient?: string | null;
    unit?: string | null;
    usage_route?: string | null;
    unit_price: number;
    manufacturer?: string | null;
    description?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CreateMedicineDto {
    medicine_code: string;
    medicine_name: string;
    active_ingredient?: string;
    unit?: string;
    usage_route?: string;
    unit_price?: number;
    manufacturer?: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateMedicineDto {
    medicine_code?: string;
    medicine_name?: string;
    active_ingredient?: string;
    unit?: string;
    usage_route?: string;
    unit_price?: number;
    manufacturer?: string;
    description?: string;
    is_active?: boolean;
}

export interface QueryMedicineParams {
    search?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
}

export interface MedicineListMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
