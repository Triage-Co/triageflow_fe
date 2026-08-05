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

export interface CatalogService {
    service_id?: string;
    id?: string;
    service_code?: string;
    service_name: string;
    price: number;
    room_type?: ServiceRoomType | string;
    is_active?: boolean;
}

export interface CreateServiceReqDto {
    service_code?: string;
    service_name: string;
    price: number;
    room_type?: ServiceRoomType | string;
}

export interface UpdateServiceReqDto {
    service_code?: string;
    service_name?: string;
    price?: number;
    room_type?: ServiceRoomType | string;
    is_active?: boolean;
}

export function getServiceId(service: CatalogService): string {
    return (service.service_id || service.id || '').trim();
}
