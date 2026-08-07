'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useShiftStore } from '@/modules/admin/store/shiftStore';
import { staffService } from '@/modules/admin/services/staffService';
import type { Shift } from '@/modules/admin/types/shift.types';

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
    assign_by_staff_id?: string;
    assign_doctor_name?: string;
    /** Bác sĩ đang trực hôm nay tại phòng thực hiện chỉ định */
    on_duty_doctor_name?: string;
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

/** Lab/CLS rooms often omit top-level specialty_id — resolve nested + flow fallbacks. */
function resolveSpecialtyIdForOrder(
    room:
        | {
            specialty_id?: string | null;
            specialty?: { specialty_id?: string | null } | null;
            room_type?: string | null;
        }
        | null
        | undefined,
    flow: Record<string, unknown> | null
): string {
    const fromRoom = (room?.specialty_id || room?.specialty?.specialty_id || '').trim();
    if (fromRoom) return fromRoom;

    const steps = Array.isArray(flow?.steps) ? (flow!.steps as unknown[]) : [];
    for (const item of steps) {
        const rec = asRecord(item);
        if (!rec) continue;
        const specialtyInfo = asRecord(rec.specialty_info) || asRecord(rec.specialty);
        const roomInfo = asRecord(rec.room_info);
        const sid =
            (typeof rec.specialty_id === 'string' && rec.specialty_id.trim()) ||
            (typeof specialtyInfo?.specialty_id === 'string' && specialtyInfo.specialty_id.trim()) ||
            (typeof roomInfo?.specialty_id === 'string' && roomInfo.specialty_id.trim()) ||
            '';
        if (sid) return sid;
    }

    const flowSpecialty = asRecord(flow?.specialty);
    if (typeof flowSpecialty?.specialty_id === 'string') {
        return flowSpecialty.specialty_id.trim();
    }
    return '';
}

function roomsForService(
    rooms: Array<{
        room_id: string;
        room_name: string;
        specialty_id?: string | null;
        room_type?: string | null;
    }>,
    serviceRoomType?: string | null
) {
    if (!rooms.length) return rooms;
    const want = (serviceRoomType || '').trim().toUpperCase();
    if (!want) return rooms;

    const byType = rooms.filter(
        (r) => String(r.room_type || '').trim().toUpperCase() === want
    );
    if (byType.length > 0) return byType;

    if (want === 'LABORATORY' || want === 'LAB') {
        const byName = rooms.filter((r) =>
            /xét nghiệm|xet nghiem|\blab\b|sinh hóa|sinh hoa/i.test(r.room_name || '')
        );
        if (byName.length > 0) return byName;
    }
    if (want === 'IMAGING_ROOM' || want === 'IMAGING') {
        const byName = rooms.filter((r) =>
            /chẩn đoán hình ảnh|cdha|x-?quang|siêu âm|sieu am|ct|mri/i.test(r.room_name || '')
        );
        if (byName.length > 0) return byName;
    }
    return rooms;
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

function todayDateKeys(): { local: string; utc: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return {
        local: `${year}-${month}-${day}`,
        utc: now.toISOString().slice(0, 10),
    };
}

/**
 * Nhân viên đang trực hôm nay tại phòng CLS — dựa vào ca trực + GET /api/staff.
 * Trả '' nếu không có ca hoặc không resolve được tên → UI hiện "Chưa có bác sĩ trực".
 */
function pickEmbeddedShiftStaffName(shift: Shift): string {
    const embedded = shift as Shift & {
        staff?: {
            full_name?: string;
            user_name?: string;
            name?: string;
            account?: { user_name?: string; full_name?: string };
            profile?: { full_name?: string };
        };
        staff_info?: {
            full_name?: string;
            user_name?: string;
            name?: string;
            account?: { user_name?: string; full_name?: string };
            profile?: { full_name?: string };
        };
        account?: { user_name?: string; full_name?: string };
        staff_name?: string;
        doctor_name?: string;
    };
    const nested = embedded.staff || embedded.staff_info;
    return (
        embedded.staff_name?.trim() ||
        embedded.doctor_name?.trim() ||
        nested?.full_name?.trim() ||
        nested?.name?.trim() ||
        nested?.user_name?.trim() ||
        nested?.profile?.full_name?.trim() ||
        nested?.account?.full_name?.trim() ||
        nested?.account?.user_name?.trim() ||
        embedded.account?.full_name?.trim() ||
        embedded.account?.user_name?.trim() ||
        ''
    );
}

function mergeStaffName(
    map: Map<string, string>,
    id: string | undefined | null,
    name: string | undefined | null
) {
    const key = (id || '').trim();
    const value = (name || '').trim();
    if (!key || !value || map.has(key)) return;
    map.set(key, value);
}

function collectStaffNamesFromShifts(shifts: Shift[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const shift of shifts) {
        const name = pickEmbeddedShiftStaffName(shift);
        mergeStaffName(map, shift.staff_id, name);
    }
    return map;
}

function resolveOnDutyDoctorName(
    roomId: string | undefined,
    rooms: Array<{
        room_id: string;
        room_name: string;
        physical_room_id?: string | null;
    }>,
    shifts: Shift[],
    staffNameById: Map<string, string>
): string {
    if (!roomId?.trim()) return '';

    const targetRoom = rooms.find(
        (r) => r.room_id === roomId || r.room_name === roomId
    );
    const possibleRoomIds = new Set<string>([roomId]);
    if (targetRoom?.room_id) possibleRoomIds.add(targetRoom.room_id);
    if (targetRoom?.physical_room_id) possibleRoomIds.add(targetRoom.physical_room_id);
    if (targetRoom?.room_name) possibleRoomIds.add(targetRoom.room_name);

    let roomShifts = shifts.filter((s) => s.room_id && possibleRoomIds.has(s.room_id));
    if (roomShifts.length === 0) {
        const roomName = targetRoom?.room_name || roomId;
        roomShifts = shifts.filter(
            (s) =>
                Boolean(s.room_id) &&
                (s.room_id === roomName || s.room_id.includes(roomName))
        );
    }
    if (roomShifts.length === 0) return '';

    const { local, utc } = todayDateKeys();
    const todayShifts = roomShifts.filter((s) => {
        if (!s.date) return false;
        const dStr = s.date.split('T')[0].slice(0, 10);
        return dStr === local || dStr === utc;
    });
    if (todayShifts.length === 0) return '';

    // Prefer shift currently in time window if start/end available
    const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
    const toMins = (t?: string) => {
        if (!t) return null;
        const m = t.match(/(\d{1,2}):(\d{2})/);
        if (!m) return null;
        return Number(m[1]) * 60 + Number(m[2]);
    };
    const inWindow =
        todayShifts.find((s) => {
            const start = toMins(s.start_time);
            const end = toMins(s.end_time);
            if (start == null || end == null) return false;
            return nowMins >= start && nowMins <= end;
        }) || todayShifts[0];

    const staffId = (inWindow.staff_id || '').trim();
    if (!staffId) return '';

    const fromShift = pickEmbeddedShiftStaffName(inWindow);
    return fromShift || staffNameById.get(staffId) || '';
}

function mapOrderToCard(
    order: ServiceOrder,
    rooms: Array<{
        room_id: string;
        room_name: string;
        physical_room_id?: string | null;
    }>,
    shifts: Shift[],
    staffNameById: Map<string, string>
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

    const assignId = (order.assign_by_staff_id || '').trim();
    const nestedStaff = order.staff_info || order.assign_by_staff;
    const doctorFromNested =
        nestedStaff?.full_name?.trim() ||
        nestedStaff?.user_name?.trim() ||
        order.assign_by_staff?.account?.user_name?.trim() ||
        '';
    const doctorFromDirectory = assignId ? staffNameById.get(assignId) || '' : '';
    const assignDoctorName = doctorFromNested || doctorFromDirectory || undefined;
    const onDutyDoctorName = resolveOnDutyDoctorName(
        roomId || undefined,
        rooms,
        shifts,
        staffNameById
    );

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
        assign_by_staff_id: assignId || undefined,
        assign_doctor_name: assignDoctorName,
        on_duty_doctor_name: onDutyDoctorName || undefined,
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
    const shifts = useShiftStore((s) => s.shifts);
    const fetchShifts = useShiftStore((s) => s.fetchShifts);

    const [rawOrders, setRawOrders] = useState<ServiceOrder[]>([]);
    const [staffNameById, setStaffNameById] = useState<Map<string, string>>(() => new Map());
    const [resolvedBookingId, setResolvedBookingId] = useState(patient.bookingId || '');
    const [catalog, setCatalog] = useState<CatalogService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [editingOrder, setEditingOrder] = useState<ServiceOrderCard | null>(null);
    const [editRoomId, setEditRoomId] = useState('');
    const [editStatus, setEditStatus] = useState('PENDING');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const hasLoadedOnceRef = useRef(false);

    const patientId = (patient.patientId || '').trim();
    const staffId = authProfile?.account_id || authUser?.id || '';

    // Map thẻ hiển thị local — không refetch API khi rooms/shifts/tên bác sĩ đổi
    const orders = useMemo(() => {
        const scoped = filterOrdersByBookingId(rawOrders, resolvedBookingId);
        const cards = scoped
            .map((o) => mapOrderToCard(o, rooms, shifts, staffNameById))
            .filter((c): c is ServiceOrderCard => Boolean(c));
        return sortCards(cards);
    }, [rawOrders, resolvedBookingId, rooms, shifts, staffNameById]);

    const loadPendingOrders = useCallback(async (opts?: { silent?: boolean }) => {
        if (!accessToken || !patientId) {
            setRawOrders([]);
            setIsLoading(false);
            return;
        }
        const silent = opts?.silent ?? hasLoadedOnceRef.current;
        if (!silent) setIsLoading(true);
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
            setRawOrders([...byId.values()]);
            hasLoadedOnceRef.current = true;
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
    ]);

    useEffect(() => {
        // Chỉ refetch theo ngữ cảnh bệnh nhân/flow — KHÔNG phụ thuộc shifts/staffNameById
        // (tránh đóng modal khi mở form sửa vì fetch ca trực)
        const timeoutId = window.setTimeout(() => {
            void loadPendingOrders();
        }, 0);
        return () => window.clearTimeout(timeoutId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, patientId, patient.bookingId, patient.flowId, refreshKey, flowSnapshot]);

    useEffect(() => {
        if (!accessToken) return;
        void fetchRooms(accessToken);
        void fetchShifts(accessToken).catch(() => {
            // Doctor may not have shift list permission — on-duty stays empty
        });
        void serviceCatalogService
            .getServices(accessToken, 1, 200)
            .then((res) => {
                setCatalog(extractServiceList(res?.data).filter((s) => s.is_active !== false));
            })
            .catch(() => setCatalog([]));

        // Resolve tên NV/BS qua GET /api/staff (doctor đã có quyền xem)
        void staffService
            .getStaffs(accessToken)
            .then((res) => {
                const rows = Array.isArray(res?.data) ? res.data : [];
                const map = new Map<string, string>();
                for (const s of rows) {
                    const name = (s.full_name || s.account?.user_name || '').trim();
                    mergeStaffName(map, s.staff_id, name);
                    const accountId = (s.account as { account_id?: string } | undefined)?.account_id;
                    mergeStaffName(map, accountId, name);
                }
                const selfId = authProfile?.account_id || authUser?.id || '';
                const selfName =
                    authProfile?.full_name ||
                    authProfile?.user_name ||
                    authUser?.fullName ||
                    '';
                mergeStaffName(map, selfId, selfName);
                setStaffNameById(map);
            })
            .catch(() => {
                const map = new Map<string, string>();
                const selfId = authProfile?.account_id || authUser?.id || '';
                const selfName =
                    authProfile?.full_name ||
                    authProfile?.user_name ||
                    authUser?.fullName ||
                    '';
                mergeStaffName(map, selfId, selfName);
                setStaffNameById(map);
            });
    }, [accessToken, fetchRooms, fetchShifts, authProfile, authUser?.id, authUser?.fullName]);

    // Bổ sung tên nếu BE embed staff trong payload ca trực
    useEffect(() => {
        if (!shifts.length) return;
        const fromShifts = collectStaffNamesFromShifts(shifts);
        if (fromShifts.size === 0) return;
        const timeoutId = window.setTimeout(() => {
            setStaffNameById((prev) => {
                let changed = false;
                const next = new Map(prev);
                fromShifts.forEach((name, id) => {
                    if (!next.has(id)) {
                        next.set(id, name);
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [shifts]);

    const selectedService = useMemo(
        () => catalog.find((s) => getServiceId(s) === selectedServiceId) || null,
        [catalog, selectedServiceId]
    );

    const eligibleRooms = useMemo(
        () => roomsForService(rooms, selectedService?.room_type),
        [rooms, selectedService?.room_type]
    );

    const editServiceRoomType = useMemo(() => {
        if (!editingOrder?.service_code) return null;
        const code = editingOrder.service_code.trim().toUpperCase();
        const svc = catalog.find(
            (s) => (s.service_code || '').trim().toUpperCase() === code
        );
        return svc?.room_type || editingOrder.room_type || null;
    }, [editingOrder, catalog]);

    const editEligibleRooms = useMemo(() => {
        const base = roomsForService(rooms, editServiceRoomType);
        // Prefer rooms that have an on-duty doctor today
        return [...base].sort((a, b) => {
            const aDuty = resolveOnDutyDoctorName(a.room_id, rooms, shifts, staffNameById)
                ? 1
                : 0;
            const bDuty = resolveOnDutyDoctorName(b.room_id, rooms, shifts, staffNameById)
                ? 1
                : 0;
            return bDuty - aDuty;
        });
    }, [rooms, editServiceRoomType, shifts, staffNameById]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            if (!selectedService) {
                setSelectedRoomId('');
                return;
            }
            if (eligibleRooms.length > 0) {
                setSelectedRoomId((prev) =>
                    eligibleRooms.some((r) => r.room_id === prev) ? prev : eligibleRooms[0].room_id
                );
            }
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [selectedService, eligibleRooms]);

    // When opening edit: keep current room if valid; otherwise preselect best CLS room
    useEffect(() => {
        if (!editingOrder) return;
        const timeoutId = window.setTimeout(() => {
            setEditRoomId((prev) => {
                if (prev && editEligibleRooms.some((r) => r.room_id === prev)) return prev;
                if (
                    editingOrder.room_id &&
                    editEligibleRooms.some((r) => r.room_id === editingOrder.room_id)
                ) {
                    return editingOrder.room_id;
                }
                const withDuty = editEligibleRooms.find((r) =>
                    resolveOnDutyDoctorName(r.room_id, rooms, shifts, staffNameById)
                );
                return withDuty?.room_id || editEligibleRooms[0]?.room_id || '';
            });
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [editingOrder, editEligibleRooms, rooms, shifts, staffNameById]);

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
            // specialty_id is optional on POST /api/service-order — do not block CLS lab rooms
            const specialtyId = resolveSpecialtyIdForOrder(room, flowObj) || null;

            await serviceOrderService.createOrder(
                {
                    booking_id: bookingId,
                    assign_by_staff_id: staffId,
                    name: selectedService.service_name,
                    service_code: serviceCode,
                    specialty_id: specialtyId,
                    room_id: selectedRoomId,
                },
                accessToken
            );

            setIsAddOpen(false);
            setSelectedServiceId('');
            onFlowChanged?.(flowObj);
            await loadPendingOrders({ silent: true });
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
        if (!editRoomId) {
            setFormError('Vui lòng chọn phòng thực hiện.');
            return;
        }
        setIsSubmitting(true);
        setFormError(null);
        try {
            const room = rooms.find((r) => r.room_id === editRoomId);
            if (!room) {
                setFormError('Phòng đã chọn không hợp lệ. Vui lòng chọn lại.');
                return;
            }
            await serviceOrderService.updateOrder(
                editingOrder.service_order_id,
                {
                    room_id: editRoomId,
                    specialty_id: resolveSpecialtyIdForOrder(room, flowSnapshot) || null,
                    status: editStatus as (typeof EDITABLE_STATUSES)[number],
                    name: editingOrder.name || undefined,
                    service_code: editingOrder.service_code || undefined,
                },
                accessToken
            );
            setEditingOrder(null);
            onFlowChanged?.(flowSnapshot);
            await loadPendingOrders({ silent: true });
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
            await loadPendingOrders({ silent: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể hủy chỉ định dịch vụ.');
        } finally {
            setDeletingId(null);
        }
    };

    // Chỉ che toàn trang khi load lần đầu — giữ modal/list khi refetch nền
    const showInitialLoader =
        isLoading && rawOrders.length === 0 && !editingOrder && !isAddOpen;

    if (showInitialLoader) {
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
                                    <p className="text-[11px] text-[#6B7280] mt-1">
                                        <span className="font-semibold text-neutral-500">Phòng khám:</span>{' '}
                                        {order.room_name || 'Chưa gán phòng'}
                                    </p>
                                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                                        <span className="font-semibold text-neutral-500">Bác sĩ chỉ định:</span>{' '}
                                        {order.assign_doctor_name || 'Chưa xác định'}
                                    </p>
                                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                                        <span className="font-semibold text-neutral-500">Bác sĩ đang trực:</span>{' '}
                                        {order.on_duty_doctor_name || 'Chưa có bác sĩ trực'}
                                    </p>
                                    <p className="text-[11px] text-[#9C9C9C] mt-1">
                                        {[
                                            order.order_name !== order.name ? order.order_name : null,
                                            order.service_code,
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
                            <div className="grid grid-cols-2 gap-3">
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
                                        {eligibleRooms.map((r) => (
                                            <option key={r.room_id} value={r.room_id}>
                                                {r.room_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                                        Nhân viên trực
                                    </label>
                                    <div className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-neutral-50 text-neutral-800 min-h-10.5 flex items-center">
                                        {selectedRoomId
                                            ? resolveOnDutyDoctorName(
                                                selectedRoomId,
                                                rooms,
                                                shifts,
                                                staffNameById
                                            ) || 'Chưa có bác sĩ trực'
                                            : '—'}
                                    </div>
                                </div>
                            </div>
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
                                    <option value="">Chọn phòng</option>
                                    {editEligibleRooms.map((r) => (
                                        <option key={r.room_id} value={r.room_id}>
                                            {r.room_name}
                                        </option>
                                    ))}
                                </select>
                                {editEligibleRooms.length === 0 && (
                                    <p className="text-[11px] text-amber-600 mt-1.5">
                                        Không có phòng phù hợp. Kiểm tra danh mục phòng hoặc quyền
                                        GET /api/room.
                                    </p>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">
                                        Bác sĩ trực
                                    </label>
                                    <div className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-neutral-50 text-neutral-800 min-h-10.5 flex items-center">
                                        {editRoomId
                                            ? resolveOnDutyDoctorName(
                                                editRoomId,
                                                rooms,
                                                shifts,
                                                staffNameById
                                            ) || 'Chưa có bác sĩ trực'
                                            : '—'}
                                    </div>
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
