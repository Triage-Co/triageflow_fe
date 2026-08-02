/** Matches backend CreateServiceOrderReqDto / UpdateServiceOrderReqDto */

export type ServiceOrderStatus =
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'PAID';

export interface ServiceOrder {
    service_order_id?: string;
    id?: string;
    booking_id?: string;
    assign_by_staff_id?: string;
    name: string;
    service_code: string;
    specialty_id?: string | null;
    room_id?: string | null;
    is_payment?: boolean;
    status?: ServiceOrderStatus | string;
    created_at?: string;
    create_at?: string;
    updated_at?: string;
    room_info?: {
        room_name?: string;
        room_id?: string;
    };
    specialty_info?: {
        specialty_name?: string;
        specialty_id?: string;
    };
}

export interface CreateServiceOrderReqDto {
    booking_id: string;
    assign_by_staff_id: string;
    name: string;
    service_code: string;
    specialty_id?: string | null;
    room_id?: string;
    is_payment: boolean;
}

export interface UpdateServiceOrderReqDto {
    booking_id?: string;
    assign_by_staff_id?: string;
    name?: string;
    service_code?: string;
    specialty_id?: string | null;
    room_id?: string;
    is_payment?: boolean;
    status?: ServiceOrderStatus;
}

export function getServiceOrderId(order: ServiceOrder): string {
    return (order.service_order_id || order.id || '').trim();
}
