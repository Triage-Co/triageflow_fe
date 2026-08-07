/** Matches backend CreateServiceReqDto / UpdateServiceReqDto room_type enum */
export type ServiceRoomType =
    | 'RECEPTION'
    | 'TRIAGE_AREA'
    | 'CLINICAL_ROOM'
    | 'PROCEDURE_ROOM'
    | 'LABORATORY'
    | 'IMAGING_ROOM'
    | 'FUNCTIONAL_EXPLORATION'
    | 'PHARMACY'
    | 'CASHIER'
    | 'EMPTY'
    | 'OTHER';

/** Matches values returned by GET /api/service */
export type ServiceType =
    | 'CLINICAL_EXAMINATION'
    | 'DIAGNOSTIC_TEST'
    | 'PROCEDURE'
    | 'PRESCRIPTION';

export const SERVICE_TYPE_OPTIONS = [
    { value: 'CLINICAL_EXAMINATION', label: 'Khám lâm sàng' },
    { value: 'DIAGNOSTIC_TEST', label: 'Cận lâm sàng / Chẩn đoán' },
    { value: 'PROCEDURE', label: 'Thủ thuật' },
    { value: 'PRESCRIPTION', label: 'Cấp phát thuốc' },
] as const;

export function serviceTypeLabel(value?: string | null): string {
    if (!value) return '—';
    return SERVICE_TYPE_OPTIONS.find((o) => o.value === value)?.label || value;
}

/** Suggest service_type from room_type when creating */
export function defaultServiceTypeForRoom(
    roomType?: string | null
): ServiceType | undefined {
    const t = (roomType || '').toUpperCase();
    if (t === 'CLINICAL_ROOM') return 'CLINICAL_EXAMINATION';
    if (t === 'LABORATORY' || t === 'IMAGING_ROOM' || t === 'FUNCTIONAL_EXPLORATION') {
        return 'DIAGNOSTIC_TEST';
    }
    if (t === 'PROCEDURE_ROOM') return 'PROCEDURE';
    if (t === 'PHARMACY') return 'PRESCRIPTION';
    return undefined;
}

export interface CatalogService {
    service_id?: string;
    id?: string;
    service_code?: string;
    service_name: string;
    price: number;
    service_type?: ServiceType | string | null;
    room_type?: ServiceRoomType | string | null;
    is_active?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateServiceReqDto {
    service_code: string;
    service_name: string;
    price: number;
    service_type?: ServiceType | string;
    room_type?: ServiceRoomType | string;
}

export interface UpdateServiceReqDto {
    service_code?: string;
    service_name?: string;
    price?: number;
    service_type?: ServiceType | string | null;
    room_type?: ServiceRoomType | string | null;
    is_active?: boolean;
}

export interface QueryServiceParams {
    page?: number;
    limit?: number;
    service_type?: ServiceType | string;
    room_type?: ServiceRoomType | string;
    is_active?: boolean;
    search?: string;
}

export function getServiceId(service: CatalogService): string {
    return (service.service_id || service.id || '').trim();
}
