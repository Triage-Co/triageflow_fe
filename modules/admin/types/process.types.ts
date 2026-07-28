export interface TemplateStep {
    template_step_id: string;
    step_name: string;
    room_type: string;
    step_type: string;
    service_code: string;
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

export const LEGACY_ROOM_TYPE_MAP: Record<string, string> = {
    TRIAGE: 'TRIAGE_AREA',
    CONSULTATION: 'CLINICAL_ROOM',
    TREATMENT: 'PROCEDURE_ROOM',
    LAB: 'LABORATORY',
    IMAGING: 'IMAGING_ROOM',
    ADMIN: 'OTHER',
};

const ALLOWED_ROOM_TYPES = new Set([
    'RECEPTION',
    'TRIAGE_AREA',
    'CLINICAL_ROOM',
    'PROCEDURE_ROOM',
    'LABORATORY',
    'IMAGING_ROOM',
    'FUNCTIONAL_EXPLORATION',
    'PHARMACY',
    'CASHIER',
    'EMPTY',
    'OTHER',
]);

export function normalizeRoomType(roomType?: string): string {
    const raw = (roomType || '').trim().toUpperCase();
    if (!raw) return 'OTHER';

    const mapped = LEGACY_ROOM_TYPE_MAP[raw] || raw;
    return ALLOWED_ROOM_TYPES.has(mapped) ? mapped : 'OTHER';
}

export const ROOM_TYPE_OPTIONS = [
    { value: 'RECEPTION', label: 'Tiếp đón / Đăng ký', badgeColor: 'bg-blue-50 text-blue-700 border-blue-200' },
    { value: 'TRIAGE_AREA', label: 'Khu phân loại', badgeColor: 'bg-amber-50 text-amber-700 border-amber-200' },
    { value: 'CLINICAL_ROOM', label: 'Phòng khám chuyên khoa', badgeColor: 'bg-purple-50 text-purple-700 border-purple-200' },
    { value: 'PROCEDURE_ROOM', label: 'Phòng thủ thuật / điều trị', badgeColor: 'bg-teal-50 text-teal-700 border-teal-200' },
    { value: 'LABORATORY', label: 'Phòng xét nghiệm', badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { value: 'IMAGING_ROOM', label: 'Phòng chẩn đoán hình ảnh', badgeColor: 'bg-sky-50 text-sky-700 border-sky-200' },
    { value: 'FUNCTIONAL_EXPLORATION', label: 'Thăm dò chức năng', badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
    { value: 'PHARMACY', label: 'Nhà thuốc / Cấp phát thuốc', badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { value: 'CASHIER', label: 'Thu ngân / Thanh toán', badgeColor: 'bg-rose-50 text-rose-700 border-rose-200' },
    { value: 'EMPTY', label: 'Chưa xác định', badgeColor: 'bg-neutral-50 text-neutral-700 border-neutral-200' },
    { value: 'OTHER', label: 'Khác', badgeColor: 'bg-slate-50 text-slate-700 border-slate-200' },
] as const;
