import { apiClient } from '@/shared/services/apiClient';
import type {
    CreateServiceOrderReqDto,
    ServiceOrder,
    UpdateServiceOrderDetailReqDto,
    UpdateServiceOrderReqDto,
} from '../types/serviceOrder.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function extractServiceOrderList(raw: unknown): ServiceOrder[] {
    if (Array.isArray(raw)) return raw as ServiceOrder[];
    const root = asRecord(raw);
    if (!root) return [];
    if (Array.isArray(root.data)) return root.data as ServiceOrder[];
    if (Array.isArray(root.items)) return root.items as ServiceOrder[];
    const nested = asRecord(root.data);
    if (nested && Array.isArray(nested.data)) return nested.data as ServiceOrder[];
    if (nested && Array.isArray(nested.items)) return nested.items as ServiceOrder[];
    return [];
}

function unwrapOrderRecord(raw: unknown): Record<string, unknown> | null {
    const root = asRecord(raw);
    if (!root) return null;
    const nested = asRecord(root.data);
    if (
        nested &&
        (typeof nested.service_order_id === 'string' ||
            typeof nested.id === 'string' ||
            typeof nested.name === 'string')
    ) {
        return nested;
    }
    if (
        typeof root.service_order_id === 'string' ||
        typeof root.id === 'string' ||
        typeof root.name === 'string'
    ) {
        return root;
    }
    return nested || root;
}

/** Normalize GET /api/service-order/{id} payload → ServiceOrder */
export function normalizeDetailServiceOrder(raw: unknown): ServiceOrder | null {
    const rec = unwrapOrderRecord(raw);
    if (!rec) return null;
    const id = String(rec.service_order_id || rec.id || '').trim();
    if (!id) return null;

    const roomInfo = asRecord(rec.room_info);
    const roomId =
        (typeof rec.room_id === 'string' && rec.room_id.trim()) ||
        (typeof roomInfo?.room_id === 'string' && roomInfo.room_id.trim()) ||
        '';
    const roomName =
        (typeof rec.room_name === 'string' && rec.room_name.trim()) ||
        (typeof roomInfo?.room_name === 'string' && roomInfo.room_name.trim()) ||
        '';

    const paymentRaw = String(rec.payment_status || rec.is_payment || rec.status || '')
        .trim()
        .toUpperCase();
    const specialtyInfo = asRecord(rec.specialty_info);
    const staffInfo = asRecord(rec.staff_info) || asRecord(rec.assign_by_staff);
    const staffName =
        (typeof rec.staff_name === 'string' && rec.staff_name.trim()) ||
        (typeof staffInfo?.full_name === 'string' && staffInfo.full_name.trim()) ||
        (typeof staffInfo?.user_name === 'string' && staffInfo.user_name.trim()) ||
        '';

    const details = Array.isArray(rec.serviceOrderDetails)
        ? rec.serviceOrderDetails
        : Array.isArray(rec.service_order_details)
            ? rec.service_order_details
            : undefined;

    const primaryDetail = Array.isArray(details)
        ? details.find((d) => d && typeof d === 'object')
        : undefined;
    const primaryDetailRec = asRecord(primaryDetail);
    const nestedService =
        asRecord(primaryDetailRec?.service) ||
        asRecord(rec.service) ||
        asRecord(rec.catalog_service);

    const serviceCode =
        (typeof rec.service_code === 'string' && rec.service_code.trim()) ||
        (typeof nestedService?.service_code === 'string' &&
            nestedService.service_code.trim()) ||
        '';
    const serviceName =
        (typeof rec.service_name === 'string' && rec.service_name.trim()) ||
        (typeof nestedService?.service_name === 'string' &&
            nestedService.service_name.trim()) ||
        '';
    const serviceType =
        (typeof rec.service_type === 'string' && rec.service_type.trim()) ||
        (typeof nestedService?.service_type === 'string' &&
            nestedService.service_type.trim()) ||
        '';
    const roomType =
        (typeof rec.room_type === 'string' && rec.room_type.trim()) ||
        (typeof roomInfo?.room_type === 'string' && roomInfo.room_type.trim()) ||
        (typeof nestedService?.room_type === 'string' &&
            nestedService.room_type.trim()) ||
        '';

    return {
        service_order_id: id,
        booking_id:
            typeof rec.booking_id === 'string' ? rec.booking_id : undefined,
        assign_by_staff_id:
            typeof rec.assign_by_staff_id === 'string'
                ? rec.assign_by_staff_id
                : null,
        name: String(rec.name || serviceName || 'Dịch vụ'),
        type:
            typeof rec.type === 'string' && rec.type.trim()
                ? rec.type.trim().toUpperCase()
                : null,
        service_name: serviceName || undefined,
        service_code: serviceCode || undefined,
        service_type: serviceType || null,
        specialty_id:
            (typeof rec.specialty_id === 'string' && rec.specialty_id) ||
            (typeof specialtyInfo?.specialty_id === 'string' &&
                specialtyInfo.specialty_id) ||
            null,
        room_id: roomId || null,
        room_name: roomName || null,
        room_type: roomType || null,
        room_info:
            roomId || roomName
                ? {
                    room_id: roomId || undefined,
                    room_name: roomName || undefined,
                    ...(roomType ? { room_type: roomType } : {}),
                  }
                : undefined,
        specialty_info: (() => {
            const sid =
                (typeof specialtyInfo?.specialty_id === 'string' &&
                    specialtyInfo.specialty_id) ||
                (typeof rec.specialty_id === 'string' && rec.specialty_id) ||
                undefined;
            const sname =
                (typeof specialtyInfo?.specialty_name === 'string' &&
                    specialtyInfo.specialty_name) ||
                (typeof rec.specialty_name === 'string' && rec.specialty_name) ||
                undefined;
            if (!sid && !sname) return undefined;
            return { specialty_id: sid, specialty_name: sname };
        })(),
        is_payment: (rec.is_payment as string | boolean | null | undefined) ?? null,
        payment_status: paymentRaw || 'PENDING',
        status: String(rec.status || paymentRaw || 'PENDING'),
        staff_name: staffName || null,
        staff_info: staffName
            ? {
                staff_id:
                    typeof staffInfo?.staff_id === 'string'
                        ? staffInfo.staff_id
                        : undefined,
                full_name: staffName,
            }
            : null,
        qr_code: (rec.qr_code as string | null | undefined) ?? null,
        package_id: (rec.package_id as string | null | undefined) ?? null,
        flow_id: (rec.flow_id as string | null | undefined) ?? null,
        total_price:
            typeof rec.total_price === 'number' ? rec.total_price : undefined,
        created_at: typeof rec.created_at === 'string' ? rec.created_at : undefined,
        updated_at: typeof rec.updated_at === 'string' ? rec.updated_at : undefined,
        serviceOrderDetails: details as ServiceOrder['serviceOrderDetails'],
        service_order_details: details as ServiceOrder['service_order_details'],
    };
}

export const serviceOrderService = {
    createOrder: (body: CreateServiceOrderReqDto, token: string) =>
        apiClient.post<unknown>('/api/service-order', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getOrders: (token: string, page = 1, limit = 100) =>
        apiClient.get<unknown>(`/api/service-order?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPendingByPatientId: (patientId: string, token: string) =>
        apiClient.get<unknown>(`/api/service-order/pending/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getOrderById: (id: string, token: string) =>
        apiClient.get<unknown>(`/api/service-order/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** Parallel GET /api/service-order/{id} for ids collected from flow steps */
    getOrdersByIds: async (ids: string[], token: string): Promise<ServiceOrder[]> => {
        const unique = [
            ...new Set(ids.map((id) => id.trim()).filter(Boolean)),
        ];
        if (unique.length === 0) return [];

        const settled = await Promise.all(
            unique.map(async (id) => {
                try {
                    const res = await serviceOrderService.getOrderById(id, token);
                    return normalizeDetailServiceOrder(res?.data ?? res);
                } catch {
                    // 404 after delete — skip
                    return null;
                }
            })
        );

        return settled.filter((o): o is ServiceOrder => Boolean(o));
    },

    updateOrder: (id: string, body: UpdateServiceOrderReqDto, token: string) =>
        apiClient.patch<unknown>(`/api/service-order/${id}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** PATCH /api/service-order/detail/{serviceOrderDetailId} */
    updateOrderDetail: (
        serviceOrderDetailId: string,
        body: UpdateServiceOrderDetailReqDto,
        token: string
    ) =>
        apiClient.patch<unknown>(
            `/api/service-order/detail/${serviceOrderDetailId}`,
            body,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        ),

    deleteOrder: (id: string, token: string) =>
        apiClient.delete<unknown>(`/api/service-order/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
