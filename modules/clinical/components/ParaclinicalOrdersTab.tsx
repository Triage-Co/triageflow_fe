'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Loader2,
    Microscope,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import type { CatalogService } from '@/modules/admin/types/service.types';
import { getServiceId } from '@/modules/admin/types/service.types';
import {
    extractServiceList,
    serviceCatalogService,
} from '@/modules/admin/services/serviceCatalogService';
import type { ServiceOrder } from '@/modules/clinical/types/serviceOrder.types';
import {
    filterOrdersByBookingId,
    getOrderDisplayName,
    getOrderRoomType,
    getOrderServiceCode,
    getServiceOrderId,
} from '@/modules/clinical/types/serviceOrder.types';
import {
    extractServiceOrderList,
    serviceOrderService,
} from '@/modules/clinical/services/serviceOrderService';
import { resolvePatientFlow } from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/modules/admin/store/roomStore';

interface ParaclinicalOrdersTabProps {
    patient: Patient;
    refreshKey?: number;
    flowSnapshot?: Record<string, unknown> | null;
    onFlowChanged?: (flow: Record<string, unknown> | null) => void;
}

interface ServiceOrderCard {
    service_order_id: string;
    name: string;
    order_name: string;
    status: string;
    payment_status?: string;
    service_code?: string;
    room_type?: string;
    room_id?: string;
    room_name?: string;
    total_price?: number;
    created_at?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function pickBookingIdFromFlow(flow: Record<string, unknown> | null): string {
    if (!flow) return '';
    const direct = typeof flow.booking_id === 'string' ? flow.booking_id.trim() : '';
    if (direct) return direct;
    const booking = asRecord(flow.booking);
    if (booking && typeof booking.booking_id === 'string') return booking.booking_id.trim();
    return '';
}

function stepStatusMeta(status?: string): { label: string; className: string } {
    const s = (status || 'PENDING').toUpperCase();
    if (['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED', 'PAID', 'SUCCESS'].includes(s)) {
        return {
            label: s === 'PAID' || s === 'SUCCESSED' || s === 'SUCCESS' ? 'Đã thanh toán' : 'Hoàn tất',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        };
    }
    if (['IN_PROGRESS', 'PROCESSING', 'ONGOING', 'CURRENT', 'ACTIVE'].includes(s)) {
        return {
            label: 'Đang thực hiện',
            className: 'bg-blue-50 text-blue-700 border-blue-100',
        };
    }
    return {
        label: 'Chờ xử lý',
        className: 'bg-slate-50 text-slate-600 border-slate-200',
    };
}

function mapOrderToCard(
    order: ServiceOrder,
    rooms: Array<{ room_id: string; room_name: string }>
): ServiceOrderCard | null {
    const id = getServiceOrderId(order);
    if (!id) return null;
    const status = String(order.status || 'PENDING').toUpperCase();
    if (status === 'CANCELLED' || status === 'CANCELED') return null;

    const createdRaw = order.created_at || order.create_at || order.updated_at;
    const createdAt = createdRaw ? new Date(createdRaw).getTime() : NaN;
    const roomId = (order.room_id || order.room_info?.room_id || '').trim();
    const roomName =
        order.room_info?.room_name ||
        rooms.find((r) => r.room_id === roomId)?.room_name ||
        undefined;

    return {
        service_order_id: id,
        name: getOrderDisplayName(order),
        order_name: order.name || '',
        status: String(order.payment_status || order.status || 'PENDING'),
        payment_status: order.payment_status,
        service_code: getOrderServiceCode(order) || undefined,
        room_type: getOrderRoomType(order) || undefined,
        room_id: roomId || undefined,
        room_name: roomName,
        total_price: typeof order.total_price === 'number' ? order.total_price : undefined,
        created_at: Number.isFinite(createdAt) ? createdAt : undefined,
    };
}

function sortCards(cards: ServiceOrderCard[]): ServiceOrderCard[] {
    return [...cards].sort(
        (a, b) => (b.created_at || 0) - (a.created_at || 0) || a.service_order_id.localeCompare(b.service_order_id)
    );
}

const EDITABLE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;

export function ParaclinicalOrdersTab({
    patient,
    refreshKey = 0,
    flowSnapshot = null,
    onFlowChanged,
}: ParaclinicalOrdersTabProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authUser = useAuthStore((s) => s.user);
    const authProfile = useAuthStore((s) => s.profile);
    const rooms = useRoomStore((s) => s.rooms);
    const fetchRooms = useRoomStore((s) => s.fetchRooms);

    const [orders, setOrders] = useState<ServiceOrderCard[]>([]);
    const [resolvedBookingId, setResolvedBookingId] = useState(patient.bookingId || '');
    const [catalog, setCatalog] = useState<CatalogService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [requirePayment, setRequirePayment] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [editingOrder, setEditingOrder] = useState<ServiceOrderCard | null>(null);
    const [editRoomId, setEditRoomId] = useState('');
    const [editStatus, setEditStatus] = useState('PENDING');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const patientId = (patient.patientId || '').trim();
    const staffId = authProfile?.account_id || authUser?.id || '';

    const applyPendingOrders = useCallback(
        (rawOrders: ServiceOrder[], bookingId: string) => {
            const scoped = filterOrdersByBookingId(rawOrders, bookingId);
            const cards = scoped
                .map((o) => mapOrderToCard(o, rooms))
                .filter((c): c is ServiceOrderCard => Boolean(c));
            setOrders(sortCards(cards));
        },
        [rooms]
    );

    const loadPendingOrders = useCallback(async () => {
        if (!accessToken || !patientId) {
            setOrders([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const flowObj =
                flowSnapshot ||
                (await resolvePatientFlow(accessToken, {
                    flowId: patient.flowId,
                    patientId,
                    bookingId: patient.bookingId || resolvedBookingId,
                }).catch(() => null));

            const bookingId =
                pickBookingIdFromFlow(flowObj) ||
                patient.bookingId ||
                resolvedBookingId ||
                '';
            if (bookingId) setResolvedBookingId(bookingId);

            // Pending + full list: order COMPLETED sẽ mất khỏi /pending → gộp thêm getOrders
            const [pendingRes, allRes] = await Promise.all([
                serviceOrderService.getPendingByPatientId(patientId, accessToken).catch(() => null),
                serviceOrderService.getOrders(accessToken, 1, 200).catch(() => null),
            ]);
            const merged = [
                ...extractServiceOrderList(pendingRes?.data),
                ...extractServiceOrderList(allRes?.data),
            ];
            const byId = new Map<string, ServiceOrder>();
            for (const order of merged) {
                const id = getServiceOrderId(order);
                if (!id) continue;
                byId.set(id, order);
            }
            applyPendingOrders([...byId.values()], bookingId);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Không thể tải danh sách service order.'
            );
        } finally {
            setIsLoading(false);
        }
    }, [
        accessToken,
        patientId,
        patient.flowId,
        patient.bookingId,
        resolvedBookingId,
        flowSnapshot,
        applyPendingOrders,
    ]);

    useEffect(() => {
        void loadPendingOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, patientId, patient.bookingId, patient.flowId, refreshKey, flowSnapshot]);

    useEffect(() => {
        if (!accessToken) return;
        void fetchRooms(accessToken);
        void serviceCatalogService
            .getServices(accessToken, 1, 200)
            .then((res) => {
                setCatalog(extractServiceList(res?.data).filter((s) => s.is_active !== false));
            })
            .catch(() => setCatalog([]));
    }, [accessToken, fetchRooms]);

    const selectedService = useMemo(
        () => catalog.find((s) => getServiceId(s) === selectedServiceId) || null,
        [catalog, selectedServiceId]
    );

    useEffect(() => {
        if (!selectedService) {
            setSelectedRoomId('');
            return;
        }
        if (rooms.length > 0) {
            setSelectedRoomId((prev) =>
                rooms.some((r) => r.room_id === prev) ? prev : rooms[0].room_id
            );
        }
    }, [selectedService, rooms]);

    const handleCreateIndication = async () => {
        if (!accessToken) return;
        if (!staffId) {
            setFormError('Không xác định được bác sĩ chỉ định.');
            return;
        }
        if (!selectedService) {
            setFormError('Vui lòng chọn dịch vụ.');
            return;
        }
        const serviceCode = (selectedService.service_code || '').trim();
        if (!serviceCode) {
            setFormError('Dịch vụ thiếu service_code.');
            return;
        }
        if (!selectedRoomId) {
            setFormError('Vui lòng chọn phòng thực hiện.');
            return;
        }

        setIsSubmitting(true);
        setFormError(null);
        try {
            const flowObj = await resolvePatientFlow(accessToken, {
                flowId: patient.flowId,
                patientId,
                bookingId: patient.bookingId || resolvedBookingId,
            });
            const bookingId =
                pickBookingIdFromFlow(flowObj) ||
                patient.bookingId ||
                resolvedBookingId ||
                '';

            if (!bookingId) {
                setFormError('Không tìm thấy booking_id để tạo service order.');
                return;
            }
            setResolvedBookingId(bookingId);

            const room = rooms.find((r) => r.room_id === selectedRoomId);
            if (!room?.specialty_id) {
                setFormError('Phòng đã chọn thiếu specialty_id.');
                return;
            }

            // POST /api/service-order — BE tạo step; không gọi /api/step/parent
            await serviceOrderService.createOrder(
                {
                    booking_id: bookingId,
                    assign_by_staff_id: staffId,
                    name: selectedService.service_name,
                    service_code: serviceCode,
                    specialty_id: room.specialty_id,
                    room_id: selectedRoomId,
                    is_payment: requirePayment,
                },
                accessToken
            );

            setIsAddOpen(false);
            setSelectedServiceId('');
            setRequirePayment(true);
            onFlowChanged?.(flowObj);
            await loadPendingOrders();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể tạo chỉ định dịch vụ.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEdit = (order: ServiceOrderCard) => {
        setFormError(null);
        setEditingOrder(order);
        setEditRoomId(order.room_id || '');
        const status = (order.status || 'PENDING').toUpperCase();
        setEditStatus(
            (EDITABLE_STATUSES as readonly string[]).includes(status) ? status : 'PENDING'
        );
    };

    const handleUpdateIndication = async () => {
        if (!accessToken || !editingOrder) return;
        setIsSubmitting(true);
        setFormError(null);
        try {
            const room = rooms.find((r) => r.room_id === editRoomId);
            await serviceOrderService.updateOrder(
                editingOrder.service_order_id,
                {
                    room_id: editRoomId || undefined,
                    specialty_id: room?.specialty_id || null,
                    status: editStatus as (typeof EDITABLE_STATUSES)[number],
                    name: editingOrder.name || undefined,
                    service_code: editingOrder.service_code || undefined,
                },
                accessToken
            );
            setEditingOrder(null);
            onFlowChanged?.(flowSnapshot);
            await loadPendingOrders();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể cập nhật chỉ định.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteIndication = async (order: ServiceOrderCard) => {
        if (!accessToken) return;
        const ok = window.confirm(`Hủy chỉ định "${order.name}"?`);
        if (!ok) return;

        setDeletingId(order.service_order_id);
        setError(null);
        try {
            try {
                await serviceOrderService.updateOrder(
                    order.service_order_id,
                    { status: 'CANCELLED' },
                    accessToken
                );
            } catch {
                await serviceOrderService.deleteOrder(order.service_order_id, accessToken);
            }
            onFlowChanged?.(flowSnapshot);
            await loadPendingOrders();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể hủy chỉ định dịch vụ.');
        } finally {
            setDeletingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="p-10 flex flex-col items-center gap-2 text-neutral-500">
                <Loader2 className="w-6 h-6 animate-spin text-[#8B7CF6]" />
                <span className="text-xs font-semibold">Đang tải dịch vụ...</span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-neutral-600">
                    <Microscope className="w-4 h-4 text-[#8B7CF6]" />
                    <span className="text-xs font-bold uppercase tracking-wide">
                        Service order của lượt khám ({orders.length})
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setFormError(null);
                        setIsAddOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#F5F2FF] text-[#6D5DE5] border border-[#DED7FF] hover:bg-[#EDE8FF]"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm chỉ định
                </button>
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EBEBEB] p-8 text-center text-sm text-neutral-500">
                    Chưa có service order. Bấm &quot;Thêm chỉ định&quot; để tạo qua API service-order.
                </div>
            ) : (
                orders.map((order) => {
                    const meta = stepStatusMeta(order.status);
                    const isDeleting = deletingId === order.service_order_id;
                    return (
                        <div
                            key={order.service_order_id}
                            className="bg-white rounded-2xl border border-[#EBEBEB] p-5"
                        >
                            <div className="flex items-start justify-between flex-wrap gap-2">
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-[13px] font-bold text-[#2D2D2D]">
                                        {order.name}
                                    </h4>
                                    <p className="text-[11px] text-[#9C9C9C] mt-0.5">
                                        {[
                                            order.order_name !== order.name ? order.order_name : null,
                                            order.room_name,
                                            order.service_code,
                                            order.room_type,
                                            typeof order.total_price === 'number'
                                                ? `${order.total_price.toLocaleString('vi-VN')}đ`
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span
                                        className={cn(
                                            'text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border',
                                            meta.className
                                        )}
                                    >
                                        {meta.label}
                                    </span>
                                    <button
                                        type="button"
                                        title="Sửa chỉ định"
                                        onClick={() => openEdit(order)}
                                        disabled={isDeleting}
                                        className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        title="Hủy chỉ định"
                                        onClick={() => void handleDeleteIndication(order)}
                                        disabled={isDeleting}
                                        className="p-1.5 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}

            {isAddOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-neutral-100">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h3 className="font-bold text-neutral-900">Thêm chỉ định dịch vụ</h3>
                            <button
                                type="button"
                                onClick={() => setIsAddOpen(false)}
                                className="p-1.5 rounded-lg hover:bg-neutral-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {formError && (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                    {formError}
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                                    Dịch vụ
                                </label>
                                <select
                                    value={selectedServiceId}
                                    onChange={(e) => setSelectedServiceId(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                >
                                    <option value="">Chọn dịch vụ</option>
                                    {catalog.map((svc) => {
                                        const id = getServiceId(svc);
                                        return (
                                            <option key={id} value={id}>
                                                {svc.service_name}
                                                {svc.service_code ? ` (${svc.service_code})` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                                    Phòng thực hiện
                                </label>
                                <select
                                    value={selectedRoomId}
                                    onChange={(e) => setSelectedRoomId(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                >
                                    <option value="">Chọn phòng</option>
                                    {rooms.map((r) => (
                                        <option key={r.room_id} value={r.room_id}>
                                            {r.room_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={requirePayment}
                                    onChange={(e) => setRequirePayment(e.target.checked)}
                                    className="rounded border-neutral-300"
                                />
                                Yêu cầu thanh toán
                            </label>
                            <p className="text-[11px] text-neutral-500">
                                Tạo qua POST /api/service-order (không còn gọi /api/step/parent).
                            </p>
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-100 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsAddOpen(false)}
                                className="px-4 py-2 rounded-xl bg-neutral-100 text-sm font-bold"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleCreateIndication()}
                                disabled={isSubmitting || !selectedServiceId || !selectedRoomId}
                                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Tạo chỉ định
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-neutral-100">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h3 className="font-bold text-neutral-900">Sửa chỉ định</h3>
                            <button
                                type="button"
                                onClick={() => setEditingOrder(null)}
                                className="p-1.5 rounded-lg hover:bg-neutral-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {formError && (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                    {formError}
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                                    Dịch vụ
                                </label>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {editingOrder.name}
                                    {editingOrder.service_code
                                        ? ` (${editingOrder.service_code})`
                                        : ''}
                                </p>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                                    Phòng thực hiện
                                </label>
                                <select
                                    value={editRoomId}
                                    onChange={(e) => setEditRoomId(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                >
                                    <option value="">Không chọn phòng</option>
                                    {rooms.map((r) => (
                                        <option key={r.room_id} value={r.room_id}>
                                            {r.room_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                                    Trạng thái
                                </label>
                                <select
                                    value={editStatus}
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white"
                                >
                                    {EDITABLE_STATUSES.map((s) => (
                                        <option key={s} value={s}>
                                            {s === 'PENDING'
                                                ? 'Chờ thực hiện'
                                                : s === 'IN_PROGRESS'
                                                  ? 'Đang thực hiện'
                                                  : 'Hoàn tất'}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-neutral-100 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingOrder(null)}
                                className="px-4 py-2 rounded-xl bg-neutral-100 text-sm font-bold"
                            >
                                Đóng
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleUpdateIndication()}
                                disabled={isSubmitting}
                                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
