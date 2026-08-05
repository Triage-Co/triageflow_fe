/** Matches backend Service Order APIs (create / pending / detail). */

export type ServiceOrderStatus =
    | 'PENDING'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'PAID';

export type ServiceOrderPaymentStatus =
    | 'PENDING'
    | 'SUCCESSED'
    | 'SUCCESS'
    | 'PAID'
    | 'FAILED'
    | string;

export interface ServiceOrderCatalogService {
    service_id?: string;
    service_code?: string;
    service_name?: string;
    price?: number;
    service_type?: string | null;
    room_type?: string | null;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface ServiceOrderDetail {
    service_order_detail_id?: string;
    name?: string | null;
    service_order_id?: string;
    service_id?: string | null;
    price_at_order?: number;
    quantity?: number;
    status?: string;
    created_at?: string;
    updated_at?: string;
    service?: ServiceOrderCatalogService | null;
}

export interface ServiceOrder {
    service_order_id?: string;
    id?: string;
    booking_id?: string;
    assign_by_staff_id?: string | null;
    name: string;
    /** Legacy flat fields — prefer detail.service when present */
    service_code?: string;
    specialty_id?: string | null;
    room_id?: string | null;
    is_payment?: boolean;
    status?: ServiceOrderStatus | string;
    payment_status?: ServiceOrderPaymentStatus;
    qr_code?: string | null;
    package_id?: string | null;
    flow_id?: string | null;
    total_price?: number;
    created_at?: string;
    create_at?: string;
    updated_at?: string;
    serviceOrderDetails?: ServiceOrderDetail[];
    service_order_details?: ServiceOrderDetail[];
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

export function getServiceOrderDetails(order: ServiceOrder): ServiceOrderDetail[] {
    const list = order.serviceOrderDetails || order.service_order_details;
    return Array.isArray(list) ? list : [];
}

/** First catalog service nested in order details (if any). */
export function getPrimaryOrderService(
    order: ServiceOrder
): ServiceOrderCatalogService | null {
    for (const detail of getServiceOrderDetails(order)) {
        if (detail.service && typeof detail.service === 'object') {
            return detail.service;
        }
    }
    return null;
}

export function getOrderServiceCode(order: ServiceOrder): string {
    const nested = getPrimaryOrderService(order)?.service_code;
    if (nested?.trim()) return nested.trim();
    return (order.service_code || '').trim();
}

export function getOrderDisplayName(order: ServiceOrder): string {
    const nested = getPrimaryOrderService(order)?.service_name?.trim();
    if (nested) return nested;
    const raw = (order.name || '').trim();
    if (!raw) return 'Dịch vụ';
    return raw
        .replace(/^thanh toán:\s*/i, '')
        .replace(/^thanh toan:\s*/i, '')
        .replace(/^thanh toán\s+/i, '')
        .replace(/^thanh toan\s+/i, '')
        .trim() || raw;
}

export function getOrderRoomType(order: ServiceOrder): string {
    return (getPrimaryOrderService(order)?.room_type || '').trim().toUpperCase();
}

export function filterOrdersByBookingId(
    orders: ServiceOrder[],
    bookingId?: string | null
): ServiceOrder[] {
    const bid = (bookingId || '').trim();
    if (!bid) return orders;
    return orders.filter((o) => (o.booking_id || '').trim() === bid);
}
