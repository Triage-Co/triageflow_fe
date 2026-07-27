export interface TemplateStep {
    template_step_id: string;
    step_name: string;
    room_type: string;
    requires_payment: boolean;
    depends_on: string[];
    sub_steps?: string[];
}

export interface ProcessTemplate {
    template_id?: string;
    id?: string;
    name: string;
    status?: 'ACTIVE' | 'INACTIVE' | boolean;
    is_active?: boolean;
    usage_count?: number;
    steps: TemplateStep[];
    created_at?: string;
    updated_at?: string;
}

export interface CreateTemplateDto {
    name: string;
    steps: TemplateStep[];
}

export interface UpdateTemplateDto {
    name?: string;
    steps?: TemplateStep[];
    is_active?: boolean;
    status?: 'ACTIVE' | 'INACTIVE';
}

export const ROOM_TYPE_OPTIONS = [
    { value: 'RECEPTION', label: 'Tiếp đón / Đăng ký', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'TRIAGE', label: 'Phân loại bệnh', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'CONSULTATION', label: 'Khám bác sĩ / Chuyên khoa', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'TREATMENT', label: 'Điều trị / Thủ thuật', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
    { value: 'LAB', label: 'Xét nghiệm', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'IMAGING', label: 'Chẩn đoán hình ảnh (X-quang/CT)', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' },
    { value: 'PHARMACY', label: 'Nhà thuốc / Cấp phát thuốc', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'CASHIER', label: 'Thu ngân / Thanh toán', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
    { value: 'ADMIN', label: 'Quản trị / Hành chính', badgeColor: 'bg-slate-50 text-slate-700 border-slate-200' },
] as const;
