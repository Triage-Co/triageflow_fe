import type { InfermedicaRecommendedSpecialist } from '@/modules/reception/types/infermedica.types';
import type { BackendSpecialtyCatalogItem } from '@/modules/reception/types/reception.types';

export interface RegisterDepartment {
    id: string;
    label: string;
    keywords: string[];
}

export const REGISTER_DEPARTMENTS: RegisterDepartment[] = [
    { id: 'noi-khoa', label: 'Nội khoa', keywords: ['nội khoa', 'noi khoa', 'internal', 'da khoa', 'đa khoa', 'nội tiết', 'tiêu hóa', 'dị ứng', 'đái tháo đường', 'huyết học', 'truyền nhiễm', 'thận học', 'ung bướu', 'tiết niệu'] },
    { id: 'ngoai-khoa', label: 'Ngoại khoa', keywords: ['ngoại khoa', 'ngoai khoa', 'surgery', 'ngoại', 'phẫu thuật'] },
    { id: 'tim-mach', label: 'Tim mạch', keywords: ['tim mạch', 'tim mach', 'cardio', 'cardiology', 'mạch máu'] },
    { id: 'da-lieu', label: 'Da liễu', keywords: ['da liễu', 'da lieu', 'dermat'] },
    { id: 'mat', label: 'Mắt', keywords: ['mắt', 'mat', 'eye', 'ophthal'] },
    { id: 'tmh', label: 'Tai mũi họng', keywords: ['tai mũi họng', 'tmh', 'ent', 'otorhin'] },
    { id: 'phu-khoa', label: 'Phụ khoa', keywords: ['phụ khoa', 'phu khoa', 'obgyn', 'gynec'] },
    { id: 'nhi-khoa', label: 'Nhi khoa', keywords: ['nhi khoa', 'pediat', 'pediatric', 'sơ sinh'] },
    { id: 'chan-thuong', label: 'Chấn thương chỉnh hình', keywords: ['chấn thương', 'chan thuong', 'ortho', 'trauma', 'cơ xương khớp', 'co xuong khop'] },
    { id: 'than-kinh', label: 'Thần kinh', keywords: ['thần kinh', 'than kinh', 'neuro'] },
    { id: 'cap-cuu', label: 'Cấp cứu', keywords: ['cấp cứu', 'cap cuu', 'emergency', 'chống độc'] },
    { id: 'ho-hap', label: 'Hô hấp', keywords: ['hô hấp', 'ho hap', 'respir', 'pulmon'] },
];

export function matchDepartmentLabel(
    department: RegisterDepartment,
    specialtyName?: string | null,
): boolean {
    if (!specialtyName) return false;
    const normalized = specialtyName.toLowerCase();
    if (normalized.includes(department.label.toLowerCase())) return true;
    return department.keywords.some((kw) => normalized.includes(kw));
}

const ENGLISH_SPECIALTY_TO_DEPT: Array<{ pattern: RegExp; deptId: string }> = [
    { pattern: /orthop|trauma|musculoskeletal|cơ xương khớp|co xuong khop/i, deptId: 'chan-thuong' },
    { pattern: /internal medicine|general medicine|internist|da khoa|đa khoa/i, deptId: 'noi-khoa' },
    { pattern: /surgery|surgical/i, deptId: 'ngoai-khoa' },
    { pattern: /cardio|heart/i, deptId: 'tim-mach' },
    { pattern: /dermat|skin/i, deptId: 'da-lieu' },
    { pattern: /ophthal|eye/i, deptId: 'mat' },
    { pattern: /ent|otorhin|ear nose throat/i, deptId: 'tmh' },
    { pattern: /gynec|obgyn|obstet/i, deptId: 'phu-khoa' },
    { pattern: /pediat|child/i, deptId: 'nhi-khoa' },
    { pattern: /neuro|neurolog/i, deptId: 'than-kinh' },
    { pattern: /emergency/i, deptId: 'cap-cuu' },
    { pattern: /pulmon|respir/i, deptId: 'ho-hap' },
];

export function resolveDepartmentFromSpecialtyName(name?: string | null): RegisterDepartment | null {
    if (!name?.trim()) return null;
    const normalized = name.trim();

    for (const dept of REGISTER_DEPARTMENTS) {
        if (matchDepartmentLabel(dept, normalized)) return dept;
    }

    for (const { pattern, deptId } of ENGLISH_SPECIALTY_TO_DEPT) {
        if (pattern.test(normalized)) {
            return REGISTER_DEPARTMENTS.find((d) => d.id === deptId) ?? null;
        }
    }

    return null;
}

export function translateSpecialtyDisplayName(name?: string | null): string {
    const dept = resolveDepartmentFromSpecialtyName(name);
    return dept?.label ?? name?.trim() ?? '';
}

/** Luôn trả về đúng 1 khoa — dùng sau recommend_specialist / triage. */
/** Map slug AI / form cũ hoặc specialty_id BE → mục trong GET /api/specialty */
export function resolveCatalogSpecialty(
    departmentKey: string,
    catalog: BackendSpecialtyCatalogItem[],
): BackendSpecialtyCatalogItem | null {
    if (!departmentKey || catalog.length === 0) return null;

    const direct = catalog.find(
        (item) => item.specialty_id === departmentKey || item.specialty_code === departmentKey,
    );
    if (direct) return direct;

    const dept = REGISTER_DEPARTMENTS.find((d) => d.id === departmentKey);
    if (!dept) return null;

    return catalog.find((item) => matchDepartmentLabel(dept, item.specialty_name)) ?? null;
}

/** Chọn chuyên khoa BE tương ứng gợi ý AI (ưu tiên specialty_code → tên → slug). */
export function resolveAiCatalogSpecialty(
    session: {
        recommended_department_id?: string | null;
        recommended_department_label?: string | null;
        recommended_specialist?: {
            specialty_code?: string;
            name?: string;
        } | null;
    },
    catalog: BackendSpecialtyCatalogItem[],
): BackendSpecialtyCatalogItem | null {
    if (catalog.length === 0) return null;

    const fromCode = session.recommended_specialist?.specialty_code?.trim();
    if (fromCode) {
        const byCode = catalog.find((item) => item.specialty_code === fromCode);
        if (byCode) return byCode;
    }

    const label =
        session.recommended_department_label?.trim() ||
        translateSpecialtyDisplayName(session.recommended_specialist?.name);
    if (label) {
        const exact = catalog.find(
            (item) => item.specialty_name.toLowerCase() === label.toLowerCase(),
        );
        if (exact) return exact;

        const dept = resolveDepartmentFromSpecialtyName(label);
        if (dept) {
            const byDept = catalog.find((item) => matchDepartmentLabel(dept, item.specialty_name));
            if (byDept) return byDept;
        }
    }

    if (session.recommended_department_id) {
        return resolveCatalogSpecialty(session.recommended_department_id, catalog);
    }

    return null;
}

export function resolveFinalDepartment(params: {
    recommended?: InfermedicaRecommendedSpecialist | null;
    triageLevel?: string | null;
    isEmergency?: boolean;
    symptoms?: string;
}): RegisterDepartment {
    const fromSpecialist = resolveDepartmentFromSpecialtyName(params.recommended?.name);
    if (fromSpecialist) return fromSpecialist;

    if (params.isEmergency || params.triageLevel?.startsWith('emergency')) {
        return REGISTER_DEPARTMENTS.find((d) => d.id === 'cap-cuu') ?? REGISTER_DEPARTMENTS[0];
    }

    const symptoms = params.symptoms?.trim() ?? '';
    if (symptoms) {
        for (const dept of REGISTER_DEPARTMENTS) {
            if (matchDepartmentLabel(dept, symptoms)) return dept;
        }
    }

    return REGISTER_DEPARTMENTS.find((d) => d.id === 'noi-khoa') ?? REGISTER_DEPARTMENTS[0];
}
