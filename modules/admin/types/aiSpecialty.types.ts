export interface AiSpecialtyMappedHospital {
    specialty_id: string;
    specialty_code: string;
    specialty_name: string;
    is_active: boolean;
}

export interface AiSpecialtyMapping {
    mapping_id: string;
    ai_specialty_id: string;
    specialty_id: string;
    is_primary: boolean;
    sort_order: number;
    is_active: boolean;
    createdAt?: string;
    updatedAt?: string;
    specialty?: AiSpecialtyMappedHospital | null;
}

export interface AiSpecialty {
    ai_specialty_id: string;
    ai_code: string;
    ai_name: string;
    ai_name_vi: string | null;
    description: string | null;
    is_active: boolean;
    createdAt?: string;
    updatedAt?: string;
    mappings?: AiSpecialtyMapping[];
}

export interface CreateAiSpecialtyDto {
    ai_code: string;
    ai_name: string;
    ai_name_vi?: string;
    description?: string;
}

export interface UpdateAiSpecialtyDto {
    ai_code?: string;
    ai_name?: string;
    ai_name_vi?: string;
    description?: string;
    is_active?: boolean;
}

export interface QueryAiSpecialtyParams {
    page?: number;
    limit?: number;
    is_active?: boolean;
    search?: string;
}

export interface CreateAiSpecialtyMappingDto {
    specialty_id: string;
    is_primary?: boolean;
    sort_order?: number;
}

export interface UpdateAiSpecialtyMappingDto {
    specialty_id?: string;
    is_primary?: boolean;
    sort_order?: number;
    is_active?: boolean;
}
