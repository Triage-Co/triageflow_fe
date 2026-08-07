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

/** Matches backend Prisma ServiceTypeEnum */
export type ServiceType =
    | 'CLINICAL_EXAMINATION'
    | 'PRESCRIPTION'
    | 'DIAGNOSTIC_TEST'
    | 'PROCEDURE';

export const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
    { value: 'CLINICAL_EXAMINATION', label: 'Khám lâm sàng' },
    { value: 'PRESCRIPTION', label: 'Kê đơn / Thuốc' },
    { value: 'DIAGNOSTIC_TEST', label: 'Xét nghiệm / Cận lâm sàng' },
    { value: 'PROCEDURE', label: 'Thủ thuật' },
];

export interface CatalogService {
    service_id?: string;
    id?: string;
    service_code?: string;
    service_name: string;
    price: number;
    service_type?: ServiceType | string;
    room_type?: ServiceRoomType | string;
    is_active?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateServiceReqDto {
    service_code: string;
    service_name: string;
    price: number;
    service_type: ServiceType | string;
    room_type?: ServiceRoomType | string;
}

export interface UpdateServiceReqDto {
    service_code?: string;
    service_name?: string;
    price?: number;
    service_type?: ServiceType | string;
    room_type?: ServiceRoomType | string;
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
