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
    /** Flat name from GET /api/service-order/booking/{id} */
    service_name?: string;
    /** Legacy flat fields — prefer detail.service when present */
    service_code?: string;
    specialty_id?: string | null;
    room_id?: string | null;
    /** Flat room name from booking API */
    room_name?: string | null;
    /** Assigned staff display name from booking API */
    staff_name?: string | null;
    /** BE may return boolean or payment status string (e.g. SUCCESSED) */
    is_payment?: boolean | string | null;
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
    /** Bác sĩ tạo chỉ định — một số BE nhúng object, một số chỉ trả assign_by_staff_id */
    staff_info?: {
        staff_id?: string;
        full_name?: string;
        user_name?: string;
    } | null;
    assign_by_staff?: {
        staff_id?: string;
        full_name?: string;
        user_name?: string;
        account?: { user_name?: string; email?: string };
    } | null;
}

/** Item shape from GET /api/service-order/booking/{bookingId} */
export interface BookingServiceOrderItem {
    service_order_id: string;
    service_name?: string | null;
    room_id?: string | null;
    room_name?: string | null;
    specialty_id?: string | null;
    specialty_name?: string | null;
    is_payment?: boolean | string | null;
    staff_name?: string | null;
}

export function normalizeBookingServiceOrder(
    item: BookingServiceOrderItem,
    bookingId: string
): ServiceOrder {
    const paymentRaw =
        typeof item.is_payment === 'string'
            ? item.is_payment.trim().toUpperCase()
            : item.is_payment === true
                ? 'SUCCESSED'
                : item.is_payment === false
                    ? 'PENDING'
                    : '';
    const paymentStatus = paymentRaw || 'PENDING';
    const serviceName = (item.service_name || '').trim() || 'Dịch vụ';
    const roomId = (item.room_id || '').trim() || null;
    const roomName = (item.room_name || '').trim() || undefined;
    const staffName = (item.staff_name || '').trim() || undefined;

    return {
        service_order_id: item.service_order_id,
        booking_id: bookingId,
        name: serviceName,
        service_name: serviceName,
        room_id: roomId,
        room_name: roomName || null,
        room_info:
            roomId || roomName
                ? { room_id: roomId || undefined, room_name: roomName }
                : undefined,
        specialty_id: (item.specialty_id || '').trim() || null,
        specialty_info: item.specialty_name
            ? {
                specialty_id: (item.specialty_id || '').trim() || undefined,
                specialty_name: item.specialty_name,
            }
            : undefined,
        is_payment: item.is_payment,
        payment_status: paymentStatus,
        status: paymentStatus,
        staff_name: staffName || null,
        staff_info: staffName ? { full_name: staffName } : null,
    };
}

export interface CreateServiceOrderReqDto {
    booking_id: string;
    assign_by_staff_id: string;
    name: string;
    service_code: string;
    specialty_id?: string | null;
    room_id: string;
}

export interface UpdateServiceOrderReqDto {
    booking_id?: string;
    assign_by_staff_id?: string;
    name?: string;
    service_code?: string;
    specialty_id?: string | null;
    room_id?: string;
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
    const flatName = (order.service_name || '').trim();
    const raw = flatName || (order.name || '').trim();
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

export function getOrderServiceType(order: ServiceOrder): string {
    const nested = (getPrimaryOrderService(order)?.service_type || '').trim().toUpperCase();
    if (nested) return nested;

    // Infer from room_type when nested service_type is missing
    const roomType = getOrderRoomType(order);
    if (roomType === 'PROCEDURE_ROOM') return 'PROCEDURE';
    if (roomType === 'PHARMACY') return 'PRESCRIPTION';
    if (
        roomType === 'LABORATORY' ||
        roomType === 'IMAGING_ROOM' ||
        roomType === 'FUNCTIONAL_EXPLORATION'
    ) {
        return 'DIAGNOSTIC_TEST';
    }
    if (roomType === 'CLINICAL_ROOM') return 'CLINICAL_EXAMINATION';
    return '';
}

export function filterOrdersByBookingId(
    orders: ServiceOrder[],
    bookingId?: string | null
): ServiceOrder[] {
    const bid = (bookingId || '').trim();
    if (!bid) return orders;
    return orders.filter((o) => (o.booking_id || '').trim() === bid);
}
