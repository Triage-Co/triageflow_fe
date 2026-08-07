export interface ExamPackageTemplateRef {
    template_id: string;
    template_name: string;
}

export interface ExamPackage {
    package_id: string;
    package_name: string;
    description?: string | null;
    price: number;
    is_active: boolean;
    template_id: string;
    template?: ExamPackageTemplateRef | null;
    created_at?: string;
    updated_at?: string;
}

export interface CreateExamPackageDto {
    package_name: string;
    description?: string;
    price: number;
    template_id: string;
    is_active?: boolean;
}

export interface UpdateExamPackageDto {
    package_name?: string;
    description?: string;
    price?: number;
    template_id?: string;
    is_active?: boolean;
}

export interface QueryExamPackageParams {
    is_active?: boolean;
}
