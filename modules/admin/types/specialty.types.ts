export interface Specialty {
    specialty_id: string;
    specialty_code: string;
    specialty_name: string;
    description: string | null;
    is_active: boolean;
    createdAt?: string;
    updatedAt?: string;
    _count?: {
        rooms?: number;
        staffs?: number;
        queuePriorityRules?: number;
    };
}

export interface CreateSpecialtyDto {
    specialty_code: string;
    specialty_name: string;
    description?: string;
}

export interface UpdateSpecialtyDto {
    specialty_code?: string;
    specialty_name?: string;
    description?: string;
    is_active?: boolean;
}

export interface QuerySpecialtyParams {
    page?: number;
    limit?: number;
    is_active?: boolean;
    search?: string;
}

export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
