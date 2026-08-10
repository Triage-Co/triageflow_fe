'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    Circle,
    Loader2,
    Pencil,
    Plus,
    Printer,
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
import type { ServiceOrder, CreateServiceOrderReqDto } from '@/modules/clinical/types/serviceOrder.types';
import {
    getOrderDisplayName,
    getOrderRoomType,
    getOrderServiceCode,
    getOrderServiceType,
    getServiceOrderId,
} from '@/modules/clinical/types/serviceOrder.types';
import {
    serviceOrderService,
} from '@/modules/clinical/services/serviceOrderService';
import {
    clinicalService,
    extractFlowSteps,
    resolvePatientFlow,
} from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/modules/admin/store/roomStore';
import { useShiftStore } from '@/modules/admin/store/shiftStore';
import { staffService } from '@/modules/admin/services/staffService';
import type { Shift } from '@/modules/admin/types/shift.types';

function pickLinkedServiceOrderId(step: Record<string, unknown> | null): string {
    if (!step) return '';
    if (typeof step.service_order_id === 'string' && step.service_order_id.trim()) {
        return step.service_order_id.trim();
    }
    const nested = asRecord(step.service_order) || asRecord(step.serviceOrder);
    if (nested) {
        const id = nested.service_order_id || nested.id;
        if (typeof id === 'string' && id.trim()) return id.trim();
    }
    return '';
}

type FlowOrderRoomStaff = {
    roomId?: string;
    roomName?: string;
    staffName?: string;
    staffId?: string;
};

/** Room/staff trên live step — nguồn đúng hơn detail order nếu lệch */
function buildFlowOrderRoomStaffMap(
    flow: Record<string, unknown> | null | undefined
): Map<string, FlowOrderRoomStaff> {
    const map = new Map<string, FlowOrderRoomStaff>();
    for (const item of extractFlowSteps(flow)) {
        const step = asRecord(item);
        if (!step) continue;
        const status = String(step.step_status || '').toUpperCase();
        if (status === 'CANCELLED' || status === 'CANCELED') continue;

        const orderId = pickLinkedServiceOrderId(step);
        if (!orderId) continue;

        const roomInfo = asRecord(step.room_info);
        const roomId =
            (typeof step.room_id === 'string' && step.room_id.trim()) ||
            (typeof roomInfo?.room_id === 'string' && roomInfo.room_id.trim()) ||
            '';
        const roomName =
            (typeof roomInfo?.room_name === 'string' && roomInfo.room_name.trim()) || '';

        const staffInfo = asRecord(step.staff_info) || asRecord(step.staff);
        const staffName =
            (typeof staffInfo?.full_name === 'string' && staffInfo.full_name.trim()) ||
            (typeof staffInfo?.user_name === 'string' && staffInfo.user_name.trim()) ||
            (typeof step.staff_name === 'string' && step.staff_name.trim()) ||
            '';
        const staffId =
            (typeof step.staff_id === 'string' && step.staff_id.trim()) ||
            (typeof staffInfo?.staff_id === 'string' && staffInfo.staff_id.trim()) ||
            '';

        map.set(orderId, {
            roomId: roomId || undefined,
            roomName: roomName || undefined,
            staffName: staffName || undefined,
            staffId: staffId || undefined,
        });
    }
    return map;
}

function findStepIdByServiceOrderId(
    flow: Record<string, unknown> | null | undefined,
    serviceOrderId: string
): string {
    const want = (serviceOrderId || '').trim();
    if (!want) return '';
    for (const item of extractFlowSteps(flow)) {
        const step = asRecord(item);
        if (!step) continue;
        if (pickLinkedServiceOrderId(step) !== want) continue;
        const stepId =
            (typeof step.step_id === 'string' && step.step_id.trim()) ||
            (typeof step.id === 'string' && step.id.trim()) ||
            '';
        if (stepId) return stepId;
    }
    return '';
}

/** service_order_id trên live steps (bỏ step đã hủy) */
function collectServiceOrderIdsFromFlow(
    flow: Record<string, unknown> | null | undefined
): string[] {
    const ids = new Set<string>();
    for (const item of extractFlowSteps(flow)) {
        const step = asRecord(item);
        if (!step) continue;
        const status = String(step.step_status || '').toUpperCase();
        if (status === 'CANCELLED' || status === 'CANCELED') continue;
        const orderId = pickLinkedServiceOrderId(step);
        if (orderId) ids.add(orderId);
    }
    return [...ids];
}

export type DoctorServiceOrderKind =
    | 'DIAGNOSTIC_TEST'
    | 'PROCEDURE'
    | 'PRESCRIPTION';

const KIND_COPY: Record<
    DoctorServiceOrderKind,
    {
        title: string;
        countLabel: (n: number) => string;
        emptyHint: string;
        nameColumn: string;
        printLabel: string;
    }
> = {
    DIAGNOSTIC_TEST: {
        title: 'Yêu cầu cận lâm sàng',
        countLabel: (n) => `${n} xét nghiệm đã được chỉ định`,
        emptyHint: 'Chưa có xét nghiệm nào. Bấm "Thêm chỉ định" để tạo yêu cầu.',
        nameColumn: 'Tên dịch vụ',
        printLabel: 'In CĐ',
    },
    PROCEDURE: {
        title: 'Yêu cầu thủ thuật',
        countLabel: (n) => `${n} thủ thuật đã được chỉ định`,
        emptyHint: 'Chưa có thủ thuật nào. Bấm "Thêm chỉ định" để tạo yêu cầu.',
        nameColumn: 'Tên dịch vụ',
        printLabel: 'In CĐ',
    },
    PRESCRIPTION: {
        title: 'Yêu cầu cấp phát thuốc',
        countLabel: (n) => `${n} dịch vụ cấp phát đã được chỉ định`,
        emptyHint: 'Chưa có chỉ định cấp phát. Bấm "Thêm chỉ định" để tạo yêu cầu.',
        nameColumn: 'Tên dịch vụ',
        printLabel: 'In CĐ',
    },
};

interface ParaclinicalOrdersTabProps {
    patient: Patient;
    /** Filter catalog + listed orders by service_type */
    serviceTypes?: DoctorServiceOrderKind[];
    title?: string;
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
    service_type?: string;
    room_type?: string;
    room_id?: string;
    room_name?: string;
    specialty_id?: string;
    specialty_name?: string;
    assign_by_staff_id?: string;
    assign_doctor_name?: string;
    /** Bác sĩ đang trực hôm nay tại phòng thực hiện chỉ định */
    on_duty_doctor_name?: string;
    total_price?: number;
    created_at?: number;
}

function normalizeServiceTypeKey(value?: string | null): string {
    return (value || '').trim().toUpperCase();
}

function inferServiceTypeFromRoom(roomType?: string | null): string {
    const t = normalizeServiceTypeKey(roomType);
    if (t === 'PROCEDURE_ROOM') return 'PROCEDURE';
    if (t === 'PHARMACY') return 'PRESCRIPTION';
    if (t === 'LABORATORY' || t === 'IMAGING_ROOM' || t === 'FUNCTIONAL_EXPLORATION') {
        return 'DIAGNOSTIC_TEST';
    }
    if (t === 'CLINICAL_ROOM') return 'CLINICAL_EXAMINATION';
    return '';
}

function resolveCatalogServiceType(
    order: ServiceOrder,
    catalog: CatalogService[],
    rooms?: Array<{ room_id: string; room_type?: string | null }>
): string {
    const fromOrder = getOrderServiceType(order);
    if (fromOrder) return fromOrder;

    const code = getOrderServiceCode(order).toUpperCase();
    const displayName = getOrderDisplayName(order).trim().toLowerCase();
    const rawName = (order.service_name || order.name || '').trim().toLowerCase();

    const match =
        catalog.find((s) => {
            const svcCode = (s.service_code || '').trim().toUpperCase();
            if (code && svcCode && svcCode === code) return true;
            const svcName = (s.service_name || '').trim().toLowerCase();
            if (!svcName) return false;
            return svcName === displayName || svcName === rawName;
        }) ||
        catalog.find((s) => {
            const svcName = (s.service_name || '').trim().toLowerCase();
            if (!svcName || svcName.length < 3) return false;
            return (
                (displayName && displayName.includes(svcName)) ||
                (rawName && rawName.includes(svcName)) ||
                (displayName && svcName.includes(displayName)) ||
                (rawName && svcName.includes(rawName))
            );
        });

    const fromCatalog = normalizeServiceTypeKey(match?.service_type);
    if (fromCatalog) return fromCatalog;

    const roomId = (order.room_id || order.room_info?.room_id || '').trim();
    const roomTypeFromRooms =
        roomId && rooms
            ? rooms.find((r) => r.room_id === roomId)?.room_type
            : undefined;

    return inferServiceTypeFromRoom(
        match?.room_type || getOrderRoomType(order) || roomTypeFromRooms
    );
}

function matchesServiceTypes(
    serviceType: string | undefined,
    allowed: DoctorServiceOrderKind[] | undefined
): boolean {
    if (!allowed || allowed.length === 0) return true;
    const key = normalizeServiceTypeKey(serviceType);
    // Keep orders visible when detail/catalog cannot resolve type yet
    if (!key) return true;
    return allowed.some((t) => t === key);
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

/** Specialty của phòng thực hiện — không lấy specialty từ step Khám bệnh trên flow. */
function resolveSpecialtyIdForOrder(
    room:
        | {
            specialty_id?: string | null;
            specialty?: { specialty_id?: string | null } | null;
            room_type?: string | null;
        }
        | null
        | undefined,
    _flow?: Record<string, unknown> | null
): string {
    return (room?.specialty_id || room?.specialty?.specialty_id || '').trim();
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
    if (!rooms.length) return [];
    const want = (serviceRoomType || '').trim().toUpperCase();
    if (!want) return rooms;

    const byType = rooms.filter(
        (r) => String(r.room_type || '').trim().toUpperCase() === want
    );
    if (byType.length > 0) return byType;

    if (want === 'LABORATORY' || want === 'LAB') {
        return rooms.filter((r) =>
            /xét nghiệm|xet nghiem|\blab\b|sinh hóa|sinh hoa/i.test(r.room_name || '')
        );
    }
    if (want === 'IMAGING_ROOM' || want === 'IMAGING') {
        return rooms.filter((r) =>
            /chẩn đoán hình ảnh|cdha|x-?quang|siêu âm|sieu am|ct|mri/i.test(r.room_name || '')
        );
    }
    if (want === 'PROCEDURE_ROOM') {
        return rooms.filter((r) =>
            /thủ thuật|thu thuat|điều trị|dieu tri|nội soi|noi soi/i.test(r.room_name || '')
        );
    }
    if (want === 'PHARMACY') {
        return rooms.filter((r) =>
            /nhà thuốc|nha thuoc|pharmacy|quầy thuốc|quay thuoc/i.test(r.room_name || '')
        );
    }

    // Không fallback toàn bộ danh mục — tránh chọn nhầm PHARMACY/CASHIER
    return [];
}

function stepStatusMeta(status?: string): { label: string; className: string } {
    const s = (status || 'PENDING').toUpperCase();
    if (['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED', 'PAID', 'SUCCESS', 'COMPLETE'].includes(s)) {
        return {
            label:
                s === 'PAID' || s === 'SUCCESSED' || s === 'SUCCESS' || s === 'COMPLETE'
                    ? 'Đã thanh toán'
                    : 'Hoàn tất',
            className: 'bg-emerald-50 text-emerald-700',
        };
    }
    if (['IN_PROGRESS', 'PROCESSING', 'ONGOING', 'CURRENT', 'ACTIVE'].includes(s)) {
        return {
            label: 'Đang thực hiện',
            className: 'bg-blue-50 text-blue-700',
        };
    }
    if (['CANCELLED', 'CANCELED', 'DECLINED', 'REJECTED'].includes(s)) {
        return {
            label: 'Đã hủy',
            className: 'bg-red-50 text-red-600',
        };
    }
    return {
        label: 'Chờ thực hiện',
        className: 'bg-neutral-100 text-neutral-600',
    };
}

/** Paid / non-deletable — chỉ theo payment field, không dùng step clinical status */
function isPaymentCompleted(...values: Array<string | undefined | null>): boolean {
    const paid = new Set([
        'SUCCESSED',
        'SUCCESS',
        'PAID',
        'COMPLETE',
    ]);
    return values.some((v) => paid.has(String(v || '').trim().toUpperCase()));
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

function resolveOnDutyStaff(
    roomId: string | undefined,
    rooms: Array<{
        room_id: string;
        room_name: string;
        physical_room_id?: string | null;
    }>,
    shifts: Shift[],
    staffNameById: Map<string, string>
): { staffId: string; staffName: string } {
    if (!roomId?.trim()) return { staffId: '', staffName: '' };

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
    if (roomShifts.length === 0) return { staffId: '', staffName: '' };

    const { local, utc } = todayDateKeys();
    const todayShifts = roomShifts.filter((s) => {
        if (!s.date) return false;
        const dStr = s.date.split('T')[0].slice(0, 10);
        return dStr === local || dStr === utc;
    });
    if (todayShifts.length === 0) return { staffId: '', staffName: '' };

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
    if (!staffId) return { staffId: '', staffName: '' };

    const fromShift = pickEmbeddedShiftStaffName(inWindow);
    return {
        staffId,
        staffName: fromShift || staffNameById.get(staffId) || '',
    };
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
    return resolveOnDutyStaff(roomId, rooms, shifts, staffNameById).staffName;
}

function mapOrderToCard(
    order: ServiceOrder,
    rooms: Array<{
        room_id: string;
        room_name: string;
        specialty_id?: string;
        physical_room_id?: string | null;
        specialty?: { specialty_id?: string; specialty_name?: string } | null;
    }>,
    shifts: Shift[],
    staffNameById: Map<string, string>,
    specialties: Array<{ specialty_id: string; specialty_name: string }>,
    flowMeta?: FlowOrderRoomStaff | null
): ServiceOrderCard | null {
    const id = getServiceOrderId(order);
    if (!id) return null;
    const status = String(order.status || 'PENDING').toUpperCase();
    if (status === 'CANCELLED' || status === 'CANCELED') return null;

    const createdRaw = order.created_at || order.create_at || order.updated_at;
    const createdAt = createdRaw ? new Date(createdRaw).getTime() : NaN;

    // Ưu tiên phòng gắn trên step CLS trong flow (đúng nơi BN sẽ đến).
    // GET service-order đôi khi trả room_id của booking/step Khám bệnh → lệch nhóm specialty.
    const roomId = (
        flowMeta?.roomId ||
        order.room_id ||
        order.room_info?.room_id ||
        ''
    ).trim();
    const room = rooms.find((r) => r.room_id === roomId);
    const roomName =
        flowMeta?.roomName ||
        room?.room_name ||
        order.room_name ||
        order.room_info?.room_name ||
        undefined;

    // Nhóm = specialty của phòng thực hiện (flow/CLS), không dùng specialty step khám nếu đã có phòng
    const roomSpecialtyId = (
        room?.specialty_id ||
        room?.specialty?.specialty_id ||
        ''
    ).trim();
    const specialtyId = (
        roomSpecialtyId ||
        order.specialty_id ||
        order.specialty_info?.specialty_id ||
        ''
    ).trim();
    const specialtyName =
        specialties.find((s) => s.specialty_id === specialtyId)?.specialty_name ||
        room?.specialty?.specialty_name?.trim() ||
        order.specialty_info?.specialty_name?.trim() ||
        undefined;

    const assignId = (order.assign_by_staff_id || flowMeta?.staffId || '').trim();
    const nestedStaff = order.staff_info || order.assign_by_staff;
    const doctorFromNested =
        order.staff_name?.trim() ||
        nestedStaff?.full_name?.trim() ||
        nestedStaff?.user_name?.trim() ||
        order.assign_by_staff?.account?.user_name?.trim() ||
        flowMeta?.staffName?.trim() ||
        '';
    const doctorFromDirectory = assignId ? staffNameById.get(assignId) || '' : '';
    const assignDoctorName = doctorFromNested || doctorFromDirectory || undefined;

    // Bác sĩ trực theo phòng trên service-order + fallback staff trên step
    const onDutyDoctorName =
        resolveOnDutyDoctorName(roomId || undefined, rooms, shifts, staffNameById) ||
        flowMeta?.staffName ||
        assignDoctorName ||
        '';

    const paymentFromIsPayment =
        typeof order.is_payment === 'string' ? order.is_payment : undefined;

    return {
        service_order_id: id,
        name: getOrderDisplayName(order),
        order_name: order.name || '',
        status: String(
            order.payment_status || paymentFromIsPayment || order.status || 'PENDING'
        ),
        payment_status: order.payment_status || paymentFromIsPayment,
        service_code: getOrderServiceCode(order) || undefined,
        service_type: getOrderServiceType(order) || undefined,
        room_type: getOrderRoomType(order) || undefined,
        room_id: roomId || undefined,
        room_name: roomName,
        specialty_id: specialtyId || undefined,
        specialty_name: specialtyName,
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

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Mở cửa sổ in phiếu chỉ định (test với Print / Save as PDF). */
function printServiceOrderIndications(options: {
    title: string;
    patientName: string;
    patientCode?: string;
    orders: ServiceOrderCard[];
}): void {
    const { title, patientName, patientCode, orders } = options;
    if (orders.length === 0) {
        window.alert('Chưa có chỉ định để in.');
        return;
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const printedAt = `${pad(now.getHours())}:${pad(now.getMinutes())} ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

    const rows = orders
        .map((order, idx) => {
            const status = stepStatusMeta(order.status).label;
            return `<tr>
              <td>${idx + 1}</td>
              <td>${escapeHtml(order.name || '—')}</td>
              <td>${escapeHtml(order.specialty_name || '—')}</td>
              <td>${escapeHtml(status)}</td>
            </tr>`;
        })
        .join('');

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — ${escapeHtml(patientName)}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { font-size: 12px; color: #555; margin-bottom: 16px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
    th { background: #f5f5f7; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
    td:first-child, th:first-child { width: 40px; text-align: center; }
    .footer { margin-top: 20px; font-size: 11px; color: #777; }
    @media print {
      body { margin: 12mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">
    Bệnh nhân: <strong>${escapeHtml(patientName)}</strong>
    ${patientCode ? ` · CCCD: ${escapeHtml(patientCode)}` : ''}<br/>
    Số chỉ định: ${orders.length} · In lúc: ${printedAt}
  </div>
  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Tên dịch vụ</th>
        <th>Nhóm</th>
        <th>Trạng thái</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p class="footer no-print">Nếu hộp thoại in không hiện: cho phép popup trên trình duyệt, rồi bấm lại In CĐ.</p>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
    if (!printWindow) {
        window.alert('Trình duyệt chặn popup. Hãy cho phép popup rồi thử lại.');
        return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}

const EDITABLE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;

export function ParaclinicalOrdersTab({
    patient,
    serviceTypes,
    title,
    refreshKey = 0,
    flowSnapshot = null,
    onFlowChanged,
}: ParaclinicalOrdersTabProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authUser = useAuthStore((s) => s.user);
    const authProfile = useAuthStore((s) => s.profile);
    const rooms = useRoomStore((s) => s.rooms);
    const specialties = useRoomStore((s) => s.specialties);
    const fetchRooms = useRoomStore((s) => s.fetchRooms);
    const fetchSpecialties = useRoomStore((s) => s.fetchSpecialties);
    const shifts = useShiftStore((s) => s.shifts);
    const fetchShifts = useShiftStore((s) => s.fetchShifts);

    const allowedTypes = useMemo(
        () =>
            (serviceTypes || []).map((t) =>
                normalizeServiceTypeKey(t)
            ) as DoctorServiceOrderKind[],
        [serviceTypes]
    );
    const primaryKind: DoctorServiceOrderKind =
        allowedTypes[0] || 'DIAGNOSTIC_TEST';
    const copy = KIND_COPY[primaryKind];
    const panelTitle = title || copy.title;

    const [rawOrders, setRawOrders] = useState<ServiceOrder[]>([]);
    const [linkedFlow, setLinkedFlow] = useState<Record<string, unknown> | null>(null);
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

    const filteredCatalog = useMemo(
        () =>
            catalog.filter((s) =>
                matchesServiceTypes(
                    normalizeServiceTypeKey(s.service_type) ||
                        inferServiceTypeFromRoom(s.room_type),
                    allowedTypes
                )
            ),
        [catalog, allowedTypes]
    );

    const flowRoomStaffByOrderId = useMemo(
        () => buildFlowOrderRoomStaffMap(linkedFlow || flowSnapshot),
        [linkedFlow, flowSnapshot]
    );

    // Map thẻ hiển thị local — không refetch API khi rooms/shifts/tên bác sĩ đổi
    const orders = useMemo(() => {
        // Đã lấy id từ flow hiện tại — giữ cả order thiếu booking_id trên detail
        const scoped = !resolvedBookingId
            ? rawOrders
            : rawOrders.filter((o) => {
                const oid = (o.booking_id || '').trim();
                return !oid || oid === resolvedBookingId;
            });
        const cards = scoped
            .filter((o) =>
                matchesServiceTypes(
                    resolveCatalogServiceType(o, catalog, rooms),
                    allowedTypes
                )
            )
            .map((o) => {
                const orderId = getServiceOrderId(o);
                const card = mapOrderToCard(
                    o,
                    rooms,
                    shifts,
                    staffNameById,
                    specialties,
                    flowRoomStaffByOrderId.get(orderId) || null
                );
                if (!card) return null;
                const resolvedType = resolveCatalogServiceType(o, catalog, rooms);
                const next: ServiceOrderCard = {
                    ...card,
                    service_type: resolvedType || card.service_type,
                };
                return next;
            })
            .filter((c): c is ServiceOrderCard => c !== null);
        return sortCards(cards);
    }, [
        rawOrders,
        resolvedBookingId,
        rooms,
        specialties,
        shifts,
        staffNameById,
        catalog,
        allowedTypes,
        flowRoomStaffByOrderId,
    ]);

    const loadPendingOrders = useCallback(async (opts?: { silent?: boolean }) => {
        if (!accessToken) {
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
                (patientId
                    ? await resolvePatientFlow(accessToken, {
                        flowId: patient.flowId,
                        patientId,
                        bookingId: patient.bookingId || resolvedBookingId,
                    }).catch(() => null)
                    : null);

            const bookingId =
                pickBookingIdFromFlow(flowObj) ||
                patient.bookingId ||
                resolvedBookingId ||
                '';
            if (bookingId) setResolvedBookingId(bookingId);

            // Flow mới nhất → lấy service_order_id từ steps → GET /api/service-order/{id}
            const latestFlow =
                (patientId
                    ? await resolvePatientFlow(accessToken, {
                        flowId: patient.flowId,
                        patientId,
                        bookingId: bookingId || undefined,
                    }).catch(() => flowObj)
                    : flowObj) || flowObj;

            if (!latestFlow) {
                setLinkedFlow(null);
                setRawOrders([]);
                setError('Không tìm thấy quy trình khám để tải chỉ định.');
                return;
            }

            setLinkedFlow(latestFlow);
            const orderIds = collectServiceOrderIdsFromFlow(latestFlow);
            const orders = await serviceOrderService.getOrdersByIds(
                orderIds,
                accessToken
            );
            setRawOrders(orders);
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
        void fetchSpecialties(accessToken);
        void fetchShifts(accessToken).catch(() => {
            // Doctor may not have shift list permission — on-duty stays empty
        });
        void serviceCatalogService
            .getServices(accessToken, { page: 1, limit: 200 })
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
    }, [
        accessToken,
        fetchRooms,
        fetchSpecialties,
        fetchShifts,
        authProfile,
        authUser?.id,
        authUser?.fullName,
    ]);

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
        () => filteredCatalog.find((s) => getServiceId(s) === selectedServiceId) || null,
        [filteredCatalog, selectedServiceId]
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
            setSelectedRoomId((prev) => {
                if (prev && eligibleRooms.some((r) => r.room_id === prev)) return prev;
                // Chỉ auto-chọn khi chưa có phòng / phòng cũ không còn hợp lệ
                return eligibleRooms[0]?.room_id || '';
            });
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

        const room = rooms.find((r) => r.room_id === selectedRoomId);
        if (!room) {
            setFormError('Phòng đã chọn không hợp lệ. Vui lòng chọn lại.');
            return;
        }
        if (
            eligibleRooms.length > 0 &&
            !eligibleRooms.some((r) => r.room_id === selectedRoomId)
        ) {
            setFormError('Phòng đã chọn không phù hợp với loại dịch vụ.');
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

            // specialty_id bắt buộc theo CreateServiceOrderReqDto mới
            const specialtyId = resolveSpecialtyIdForOrder(room, flowObj) || '';
            if (!specialtyId) {
                setFormError('Không xác định được chuyên khoa của phòng. Vui lòng chọn phòng khác.');
                return;
            }

            const createBody: CreateServiceOrderReqDto = {
                booking_id: bookingId,
                assign_by_staff_id: staffId,
                service_code: serviceCode,
                specialty_id: specialtyId,
                room_id: selectedRoomId,
            };

            const createdRes = await serviceOrderService.createOrder(createBody, accessToken);
            const createdData = (createdRes?.data || null) as Record<string, unknown> | null;
            const createdId = String(
                createdData?.service_order_id || createdData?.id || ''
            ).trim();

            // Response create đôi khi chưa phản ánh room_id đã chọn — PATCH lại để chắc
            if (createdId) {
                try {
                    await serviceOrderService.updateOrder(
                        createdId,
                        {
                            room_id: selectedRoomId,
                            specialty_id: specialtyId,
                            service_code: serviceCode,
                        },
                        accessToken
                    );
                } catch (patchErr) {
                    console.warn(
                        'Created service-order but failed to PATCH room_id',
                        patchErr
                    );
                }
            }

            setIsAddOpen(false);
            setSelectedServiceId('');
            setSelectedRoomId('');
            onFlowChanged?.(flowObj);
            // Chờ BE gắn service_order_id vào step rồi mới enrich phòng/BS từ flow
            await new Promise((resolve) => window.setTimeout(resolve, 400));
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
            const duty = resolveOnDutyStaff(
                editRoomId,
                rooms,
                shifts,
                staffNameById
            );
            const orderId = editingOrder.service_order_id;

            // PATCH chỉ nhận room_id — tên phòng lấy từ catalog khi render
            await serviceOrderService.updateOrder(
                orderId,
                {
                    room_id: editRoomId,
                    specialty_id: resolveSpecialtyIdForOrder(room, flowSnapshot) || null,
                    status: editStatus as (typeof EDITABLE_STATUSES)[number],
                    name: editingOrder.name || undefined,
                    service_code: editingOrder.service_code || undefined,
                    ...(duty.staffId
                        ? { assign_by_staff_id: duty.staffId }
                        : {}),
                },
                accessToken
            );

            // Đồng bộ phòng (và BS trực) lên flow step liên kết
            const stepId = findStepIdByServiceOrderId(
                linkedFlow || flowSnapshot,
                orderId
            );
            if (stepId) {
                try {
                    await clinicalService.updateStep(
                        stepId,
                        {
                            room_id: editRoomId,
                            ...(duty.staffId ? { staff_id: duty.staffId } : {}),
                        },
                        accessToken
                    );
                } catch (stepErr) {
                    console.warn(
                        'Updated service-order room but failed to sync flow step',
                        stepErr
                    );
                }
            }

            // Optimistic: bảng hiện phòng mới ngay (không chờ flow cũ ghi đè)
            setRawOrders((prev) =>
                prev.map((o) => {
                    if (getServiceOrderId(o) !== orderId) return o;
                    return {
                        ...o,
                        room_id: editRoomId,
                        room_name: room.room_name,
                        room_info: {
                            room_id: editRoomId,
                            room_name: room.room_name,
                        },
                        ...(duty.staffId
                            ? {
                                assign_by_staff_id: duty.staffId,
                                staff_name: duty.staffName || o.staff_name,
                            }
                            : {}),
                        status: editStatus,
                    };
                })
            );

            setEditingOrder(null);
            onFlowChanged?.(linkedFlow || flowSnapshot);
            await loadPendingOrders({ silent: true });
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể cập nhật chỉ định.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteIndication = async (order: ServiceOrderCard) => {
        if (!accessToken) return;
        // Chỉ chặn theo payment_status / is_payment — không dùng status lâm sàng
        if (isPaymentCompleted(order.payment_status)) {
            setError('Không thể xóa chỉ định đã thanh toán thành công.');
            return;
        }
        const ok = window.confirm(`Hủy chỉ định "${order.name}"?`);
        if (!ok) return;

        const orderId = order.service_order_id;
        setDeletingId(orderId);
        setError(null);
        try {
            let latestFlow = flowSnapshot || linkedFlow;
            const flowObj =
                latestFlow ||
                (await resolvePatientFlow(accessToken, {
                    flowId: patient.flowId,
                    patientId,
                    bookingId: patient.bookingId || resolvedBookingId,
                }).catch(() => null));

            // 1) Hủy step trước — list giờ lấy id từ flow; step CANCELLED sẽ không còn load lại
            const stepId = findStepIdByServiceOrderId(flowObj, orderId);
            if (stepId) {
                try {
                    await clinicalService.updateStepStatus(stepId, 'CANCELLED', accessToken);
                } catch (stepErr) {
                    console.warn('Failed to cancel linked step before delete', stepErr);
                }
            }

            // 2) DELETE service-order
            try {
                await serviceOrderService.deleteOrder(orderId, accessToken);
            } catch (delErr) {
                const status =
                    delErr && typeof delErr === 'object' && 'statusCode' in delErr
                        ? Number((delErr as { statusCode?: number }).statusCode)
                        : 0;
                if (status !== 404) throw delErr;
            }

            setRawOrders((prev) =>
                prev.filter((o) => getServiceOrderId(o) !== orderId)
            );

            latestFlow =
                (await resolvePatientFlow(accessToken, {
                    flowId: patient.flowId,
                    patientId,
                    bookingId: patient.bookingId || resolvedBookingId,
                }).catch(() => flowObj)) || flowObj;
            if (latestFlow) setLinkedFlow(latestFlow);

            onFlowChanged?.(latestFlow);
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
            <div className="bg-white rounded-2xl border border-[#EBEBEB] shadow-[0_2px_12px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-5 pt-5 pb-4">
                    <div>
                        <h3 className="text-[15px] font-bold text-[#2D2D2D] tracking-tight">
                            {panelTitle}
                        </h3>
                        <p className="text-[12px] text-neutral-400 font-medium mt-1">
                            {copy.countLabel(orders.length)}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            title="In chỉ định"
                            onClick={() =>
                                printServiceOrderIndications({
                                    title: panelTitle,
                                    patientName: patient.name,
                                    patientCode: patient.code,
                                    orders,
                                })
                            }
                            disabled={orders.length === 0}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-neutral-200 bg-white text-[12px] font-bold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            {copy.printLabel}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setFormError(null);
                                setIsAddOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-[12px] font-bold transition-colors cursor-pointer shadow-sm"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Thêm chỉ định
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mx-5 mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-xs text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                {orders.length === 0 ? (
                    <div className="px-5 pb-8 text-center text-sm text-neutral-500">
                        {copy.emptyHint}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-160 text-left border-collapse">
                            <thead>
                                <tr className="bg-[#F7F7F8] border-y border-[#ECECEE]">
                                    <th className="px-5 py-3 text-[11px] font-bold text-neutral-500">
                                        {copy.nameColumn}
                                    </th>
                                    <th className="px-4 py-3 text-[11px] font-bold text-neutral-500">
                                        Nhóm
                                    </th>
                                    <th className="px-4 py-3 text-[11px] font-bold text-neutral-500">
                                        Trạng thái
                                    </th>
                                    <th className="px-4 py-3 text-[11px] font-bold text-neutral-500 text-right w-22">
                                        Hành động
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order) => {
                                    const meta = stepStatusMeta(order.status);
                                    const isDeleting = deletingId === order.service_order_id;
                                    const paid = isPaymentCompleted(order.payment_status);
                                    return (
                                        <tr
                                            key={order.service_order_id}
                                            className="border-b border-[#F0F0F2] last:border-b-0 hover:bg-neutral-50/60 transition-colors"
                                        >
                                            <td className="px-5 py-3.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(order)}
                                                    className="text-left text-[13px] font-bold text-[#2D2D2D] hover:text-[#6D5DE5] transition-colors cursor-pointer"
                                                >
                                                    {order.name}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3.5 text-[12px] text-neutral-600 font-medium">
                                                {order.specialty_name || '—'}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span
                                                    className={cn(
                                                        'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full',
                                                        meta.className
                                                    )}
                                                >
                                                    <Circle className="w-1.5 h-1.5 fill-current" />
                                                    {meta.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        title="Sửa chỉ định"
                                                        onClick={() => openEdit(order)}
                                                        disabled={isDeleting}
                                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-[#8B7CF6] hover:bg-[#F5F2FF] disabled:opacity-50 cursor-pointer transition-colors"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title={
                                                            paid
                                                                ? 'Không thể xóa chỉ định đã thanh toán'
                                                                : 'Hủy chỉ định'
                                                        }
                                                        onClick={() => void handleDeleteIndication(order)}
                                                        disabled={isDeleting || paid}
                                                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-400 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                                    >
                                                        {isDeleting ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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
                                    {filteredCatalog.map((svc) => {
                                        const id = getServiceId(svc);
                                        return (
                                            <option key={id} value={id}>
                                                {svc.service_name}
                                            </option>
                                        );
                                    })}
                                </select>
                                {filteredCatalog.length === 0 && (
                                    <p className="text-[11px] text-amber-600 mt-1.5">
                                        Không có dịch vụ thuộc nhóm này trong danh mục.
                                    </p>
                                )}
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
