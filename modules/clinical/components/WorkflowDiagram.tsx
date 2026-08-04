'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
    FileText,
    CreditCard,
    Stethoscope,
    Microscope,
    Syringe,
    RefreshCw,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Pill,
    UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient, WorkflowStepStatus } from '@/modules/clinical/types/clinical.types';
import type { ProcessTemplate, TemplateStep } from '@/modules/admin/types/process.types';
import {
    normalizeRoomType,
    normalizeStepType,
    mapRoomTypeToStepType,
} from '@/modules/admin/types/process.types';
import {
    clinicalService,
    extractFlowSteps,
    resolvePatientFlow,
} from '@/modules/clinical/services/clinicalService';
import { serviceOrderService } from '@/modules/clinical/services/serviceOrderService';
import type { ServiceOrderStatus } from '@/modules/clinical/types/serviceOrder.types';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/modules/admin/store/roomStore';
import { useStaffStore } from '@/modules/admin/store/staffStore';
import { useShiftStore } from '@/modules/admin/store/shiftStore';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/shared/components/ui/Dialog';
import { Plus, Trash2, Edit3 } from 'lucide-react';

type NodeIcon = typeof FileText;

interface DraftStep {
    tempId: string;
    step_name: string;
    specialty_id: string;
    room_id: string;
    staff_id: string;
    service_code: string;
    room_type: string;
    doctor_name?: string;
    /** Fields needed for AssignTemplateRequestDto */
    template_id?: string;
    template_step_id?: string;
    step_type?: string;
    requires_payment?: boolean;
    depends_on?: string[];
}

interface ServiceOption {
    service_id: string;
    service_code: string;
    service_name: string;
    is_active?: boolean;
}

interface FlowNode {
    id: string;
    Icon: NodeIcon;
    status: WorkflowStepStatus;
    label: string;
    roomName?: string;
    staffName?: string;
    detail?: {
        source: 'live' | 'draft' | 'default';
        stepStatus?: string;
        roomId?: string;
        specialtyName?: string;
        specialtyId?: string;
        staffId?: string;
        paymentStatus?: string;
        docNo?: string;
    };
}

interface WorkflowDiagramProps {
    patientId: string;
    patient?: Patient;
    /** Bump to force reload active flow (e.g. after adding a service order). */
    refreshKey?: number;
    /** Sync resolved flow_id / booking_id back to patient context after active-flow fetch. */
    onFlowResolved?: (info: { flowId: string; bookingId: string }) => void;
}

const DEFAULT_FULL_WORKFLOW: FlowNode[] = [
    { id: 'dat-kham', Icon: FileText, label: 'Đặt khám', status: 'completed' },
    { id: 'kham-benh', Icon: Stethoscope, label: 'Khám bệnh', status: 'pending' },
];

function normalizeStepLabel(name: string): string {
    return name.trim().toLowerCase().normalize('NFC');
}

function isDefaultBookingStepName(name: string): boolean {
    const n = normalizeStepLabel(name);
    return (
        n === 'đặt khám' ||
        n === 'dat kham' ||
        n === 'đặt lịch' ||
        n === 'dat lich'
    );
}

function isDefaultExamStepName(name: string): boolean {
    const n = normalizeStepLabel(name);
    return n === 'khám bệnh' || n === 'kham benh';
}

function isPaymentStepName(name: string): boolean {
    const n = normalizeStepLabel(name);
    return n.startsWith('thanh toán') || n.startsWith('thanh toan');
}

/** Strip leading "Thanh toán:" / "Thanh toán " for matching service ↔ payment. */
function stripPaymentPrefix(name: string): string {
    return normalizeStepLabel(name)
        .replace(/^thanh toán:\s*/, '')
        .replace(/^thanh toan:\s*/, '')
        .replace(/^thanh toán\s+/, '')
        .replace(/^thanh toan\s+/, '')
        .trim();
}

/**
 * Payment for the specialist exam / queue ticket itself (not CLS).
 * e.g. "Thanh toán khám chuyên khoa", "Thanh toán viện phí".
 * Do NOT treat CLS fees like "Thanh toán: Khám ngoại khoa" as exam payment.
 */
function isExamPaymentStepName(name: string): boolean {
    if (!isPaymentStepName(name)) return false;
    const rest = stripPaymentPrefix(name);
    if (!rest) return true;
    if (isDefaultExamStepName(rest)) return true;
    if (rest.includes('chuyên khoa') || rest.includes('chuyen khoa')) return true;
    if (rest.includes('viện phí') || rest.includes('vien phi')) return true;
    if (rest.includes('lấy số') || rest.includes('lay so')) return true;
    if (rest.includes('đặt khám') || rest.includes('dat kham')) return true;
    // Bare "Thanh toán khám" / "Thanh toán: khám"
    if (rest === 'khám' || rest === 'kham') return true;
    return false;
}

function isPaidPaymentStatus(paymentStatus?: string): boolean {
    const pay = (paymentStatus || '').toUpperCase().trim();
    return ['SUCCESSED', 'SUCCESS', 'PAID', 'COMPLETED', 'DONE', 'FINISHED'].includes(pay);
}

/** Hide cancelled steps — except settled / exam-queue payments that must stay on the timeline. */
function shouldHideLiveFlowStep(step: Record<string, unknown>): boolean {
    const stepStatus = String(step.step_status || '').toUpperCase();
    if (stepStatus !== 'CANCELLED' && stepStatus !== 'CANCELED') return false;

    // Paid successfully — keep visible (green)
    if (isPaidPaymentStatus(String(step.payment_status || ''))) return false;

    const name = String(step.step_name || '');
    // BE often soft-cancels the lấy-số payment step after generate — keep it on flow
    if (isExamPaymentStepName(name)) return false;

    const stepType = String(step.step_type || '').toUpperCase();
    const roomType = String(step.room_type || '').toUpperCase();
    if (
        (stepType === 'PAYMENT' || roomType === 'CASHIER') &&
        isPaidPaymentStatus(String(step.payment_status || ''))
    ) {
        return false;
    }

    return true;
}

/** Format CLS / payment step names for timeline display. */
function formatFlowStepLabel(rawName: string, opts?: { forcePayment?: boolean }): string {
    const raw = (rawName || '').trim();
    if (!raw) return opts?.forcePayment ? 'Thanh toán' : 'Bước';

    if (isPaymentStepName(raw) || isExamPaymentStepName(raw)) {
        // Normalize "Thanh toán X" → "Thanh toán: X"
        if (raw.includes(':')) return raw;
        const remainder = raw
            .replace(/^thanh toán\s+/i, '')
            .replace(/^thanh toan\s+/i, '')
            .trim();
        return remainder ? `Thanh toán: ${remainder}` : raw;
    }

    if (opts?.forcePayment) {
        return `Thanh toán: ${raw}`;
    }
    return raw;
}

function pickLiveServiceCode(rec: Record<string, unknown>): string {
    if (typeof rec.service_code === 'string' && rec.service_code.trim()) {
        return rec.service_code.trim().toLowerCase();
    }
    const nested = asRecord(rec.service);
    if (nested && typeof nested.service_code === 'string' && nested.service_code.trim()) {
        return nested.service_code.trim().toLowerCase();
    }
    return '';
}

/**
 * BE often creates a payment companion with the same bare service name.
 * Mark later duplicates (by service_code / bare name) as payment for display.
 */
function detectUnlabeledPaymentStepIds(steps: unknown[]): Set<string> {
    type Entry = {
        id: string;
        key: string;
        createdAt: number;
        isPayment: boolean;
        index: number;
    };

    const entries: Entry[] = [];
    steps.forEach((item, index) => {
        const rec = asRecord(item);
        if (!rec) return;
        const status = String(rec.step_status || '').toUpperCase();
        if (status === 'CANCELLED' || status === 'CANCELED') return;
        const id = typeof rec.step_id === 'string' ? rec.step_id : '';
        if (!id) return;
        const stepName = String(rec.step_name || '').trim();
        if (!stepName || isDefaultBookingStepName(stepName) || isDefaultExamStepName(stepName)) {
            return;
        }
        const stepType = String(rec.step_type || '').toUpperCase();
        const roomType = String(rec.room_type || '').toUpperCase();
        const nameIsPayment = isPaymentStepName(stepName) || isExamPaymentStepName(stepName);
        const typedPayment =
            !nameIsPayment &&
            (stepType === 'PAYMENT' || roomType === 'CASHIER' || roomType === 'PAYMENT');
        const code = pickLiveServiceCode(rec);
        const key = code
            ? `code:${code}`
            : `name:${stripPaymentPrefix(stepName) || normalizeStepLabel(stepName)}`;
        const createdRaw = rec.create_at ?? rec.created_at ?? rec.updated_at;
        const createdAt = createdRaw ? new Date(createdRaw as string | number).getTime() : NaN;
        entries.push({
            id,
            key,
            createdAt: Number.isFinite(createdAt) ? createdAt : index,
            isPayment: nameIsPayment || typedPayment,
            index,
        });
    });

    const groups = new Map<string, Entry[]>();
    for (const e of entries) {
        const list = groups.get(e.key) || [];
        list.push(e);
        groups.set(e.key, list);
    }

    const paymentIds = new Set<string>();
    for (const list of groups.values()) {
        if (list.length < 2) continue;
        if (list.some((e) => e.isPayment)) {
            list.filter((e) => e.isPayment).forEach((e) => paymentIds.add(e.id));
            continue;
        }
        const sorted = [...list].sort(
            (a, b) => a.createdAt - b.createdAt || a.index - b.index || a.id.localeCompare(b.id)
        );
        for (let i = 1; i < sorted.length; i++) {
            paymentIds.add(sorted[i].id);
        }
    }
    return paymentIds;
}

function isProtectedBaseStep(step: Record<string, unknown>): boolean {
    const name = String(step.step_name || '');
    return isDefaultBookingStepName(name) || isDefaultExamStepName(name);
}

function findLiveExamStepId(steps: unknown[]): string {
    for (const item of steps) {
        const live = asRecord(item);
        if (!live) continue;
        const status = String(live.step_status || '').toUpperCase();
        if (status === 'CANCELLED') continue;
        const name = String(live.step_name || '');
        if (isDefaultExamStepName(name) && typeof live.step_id === 'string') {
            return live.step_id;
        }
    }
    return '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

/** Pull a display name from staff_info / staff / account shaped objects. */
function extractPersonName(person: Record<string, unknown> | null | undefined): string {
    if (!person) return '';
    const account = asRecord(person.account);
    const profile = asRecord(person.profile) || asRecord(account?.profile);
    const candidates = [
        person.full_name,
        person.fullName,
        person.name,
        person.doctor_name,
        person.staff_name,
        person.user_name,
        account?.full_name,
        account?.fullName,
        account?.name,
        account?.user_name,
        profile?.full_name,
        profile?.fullName,
        profile?.name,
    ];
    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

function isUnassignedStaffLabel(label: string): boolean {
    const n = label.trim().toLowerCase();
    return (
        !n ||
        n.includes('chưa phân công') ||
        n.includes('chua phan cong') ||
        n.includes('chưa có bác sĩ') ||
        n.includes('chua co bac si')
    );
}

function extractServiceOptions(raw: unknown): ServiceOption[] {
    const list: unknown[] = [];

    if (Array.isArray(raw)) {
        list.push(...raw);
    } else {
        const record = asRecord(raw);
        const firstData = record?.data;
        const firstDataRecord = asRecord(firstData);

        if (Array.isArray(firstData)) list.push(...firstData);
        if (Array.isArray(firstDataRecord?.data)) list.push(...(firstDataRecord.data as unknown[]));
        if (Array.isArray(record?.items)) list.push(...(record.items as unknown[]));
    }

    const dedup = new Map<string, ServiceOption>();
    list.forEach((item) => {
        const rec = asRecord(item);
        if (!rec) return;
        const serviceCode = typeof rec.service_code === 'string' ? rec.service_code.trim() : '';
        const serviceName = typeof rec.service_name === 'string' ? rec.service_name.trim() : '';
        const serviceId = typeof rec.service_id === 'string' ? rec.service_id : serviceCode;
        if (!serviceCode) return;

        dedup.set(serviceCode, {
            service_id: serviceId,
            service_code: serviceCode,
            service_name: serviceName || serviceCode,
            is_active: typeof rec.is_active === 'boolean' ? rec.is_active : true,
        });
    });

    return Array.from(dedup.values());
}

function pickServiceCodeByContext(input: {
    roomType?: string;
    roomName?: string;
    specialtyName?: string;
}, services: ServiceOption[]): string {
    const source = services.filter((service) => service.is_active !== false);
    const candidates = source.length > 0 ? source : services;
    if (!candidates.length) return '';

    const roomType = (input.roomType || '').toUpperCase();
    const roomName = (input.roomName || '').toUpperCase();
    const specialtyName = (input.specialtyName || '').toUpperCase();

    const keywordMap: Record<string, string[]> = {
        RECEPTION: ['KHAM', 'DANG_KY', 'TIEP_DON'],
        TRIAGE_AREA: ['KHAM_CAP_CUU', 'TRIAGE'],
        CLINICAL_ROOM: ['KHAM_CHUYEN_KHOA', 'KHAM'],
        PROCEDURE_ROOM: ['NOI_SOI', 'THU_THUAT', 'DIEU_TRI'],
        LABORATORY: ['XET_NGHIEM'],
        IMAGING_ROOM: ['X_QUANG', 'SIEU_AM', 'CT', 'MRI'],
        FUNCTIONAL_EXPLORATION: ['THAM_DO', 'FUNCTIONAL'],
        PHARMACY: ['THUOC', 'PHARMACY'],
        CASHIER: ['THANH_TOAN', 'VIEN_PHI'],
    };

    const explicitKeywords = keywordMap[roomType] || [];
    const inferredKeywords = [roomName, specialtyName]
        .filter(Boolean)
        .flatMap((value) => value.split(/\s+/g))
        .filter((token) => token.length > 2);
    const keywords = [...explicitKeywords, ...inferredKeywords];

    const matched = candidates.find((service) =>
        keywords.some((keyword) => service.service_code.toUpperCase().includes(keyword) || service.service_name.toUpperCase().includes(keyword))
    );

    return matched?.service_code || candidates[0].service_code;
}

function getTemplateName(tpl?: ProcessTemplate | Record<string, unknown> | null): string {
    if (!tpl) return '';
    const rec = tpl as Record<string, unknown>;
    return (
        (tpl as ProcessTemplate).name ||
        (rec.template_name as string) ||
        (rec.flow_name as string) ||
        (rec.title as string) ||
        (rec.name as string) ||
        ''
    );
}

function buildDraftFromTemplateStep(
    step: TemplateStep,
    idx: number,
    parentTemplateId: string,
    rooms: Array<{
        room_id: string;
        room_name: string;
        specialty_id?: string;
        specialty?: { specialty_name?: string };
    }>,
    serviceOptions: ServiceOption[],
    pickDoctorOnDutyForRoom: (roomId: string) => string,
    getStaffOnDutyForRoom: (roomId: string) => string,
    getRoomTypeValue: (room: unknown) => string
): DraftStep {
    const templateStepId = step.template_step_id || `step_${idx + 1}`;
    const roomType = normalizeRoomType(step.room_type);
    const defaultRoom =
        rooms.find((r) => r.room_name.toLowerCase().includes(roomType.toLowerCase())) || rooms[0];
    const rId = defaultRoom?.room_id || '';
    const defaultServiceCode =
        step.service_code ||
        pickServiceCodeByContext(
            {
                roomType: getRoomTypeValue(defaultRoom) || roomType,
                roomName: defaultRoom?.room_name,
                specialtyName: defaultRoom?.specialty?.specialty_name,
            },
            serviceOptions
        ) ||
        'NONE';

    return {
        tempId: `draft-${idx}-${Date.now()}`,
        step_name: step.step_name || roomType,
        specialty_id: defaultRoom?.specialty_id || '',
        room_type: roomType,
        room_id: rId,
        staff_id: rId ? pickDoctorOnDutyForRoom(rId) : '',
        service_code: defaultServiceCode,
        doctor_name: rId ? getStaffOnDutyForRoom(rId) || 'Chưa có bác sĩ' : 'Chưa có bác sĩ',
        template_id: step.template_id || parentTemplateId || templateStepId,
        template_step_id: templateStepId,
        step_type: normalizeStepType(step.step_type, roomType),
        requires_payment: Boolean(step.requires_payment),
        depends_on: Array.isArray(step.depends_on)
            ? step.depends_on
            : idx > 0
                ? [`step_${idx}`]
                : [],
    };
}

/**
 * Expand requires_payment steps into: service → payment → next service → payment...
 * Standalone PAYMENT/CASHIER template steps are skipped to avoid duplicates.
 */
function expandDraftsWithPaymentSteps(
    drafts: DraftStep[],
    rooms: Array<{ room_id: string; room_name: string }>,
    pickDoctorOnDutyForRoom: (roomId: string) => string,
    getStaffOnDutyForRoom: (roomId: string) => string,
    getRoomTypeValue: (room: unknown) => string
): DraftStep[] {
    // Already expanded (has payment companions) — keep as-is
    if (
        drafts.some(
            (d) =>
                d.tempId?.startsWith('draft-pay-') ||
                (normalizeStepType(d.step_type, d.room_type) === 'PAYMENT' &&
                    (d.step_name || '').startsWith('Thanh toán:'))
        )
    ) {
        return drafts;
    }

    const result: DraftStep[] = [];
    let seq = 0;

    const findCashierRoomId = (): string => {
        const cashier = rooms.find((r) => {
            const type = normalizeRoomType(getRoomTypeValue(r));
            const name = (r.room_name || '').toLowerCase();
            return type === 'CASHIER' || name.includes('thu ngân') || name.includes('thanh toán');
        });
        return cashier?.room_id || '';
    };

    for (const draft of drafts) {
        const stepType = normalizeStepType(draft.step_type, draft.room_type);
        const roomType = normalizeRoomType(draft.room_type);

        // Skip standalone payment steps from template — generated from requires_payment instead
        if (stepType === 'PAYMENT' || roomType === 'CASHIER') {
            continue;
        }

        seq += 1;
        const stepId = `step_${seq}`;
        const prevId = seq > 1 ? `step_${seq - 1}` : undefined;

        result.push({
            ...draft,
            template_step_id: stepId,
            template_id: draft.template_id || stepId,
            step_type: stepType,
            room_type: roomType,
            depends_on: prevId ? [prevId] : [],
        });

        if (draft.requires_payment) {
            seq += 1;
            const payId = `step_${seq}`;
            const payRoomId = findCashierRoomId() || draft.room_id || '';
            result.push({
                tempId: `draft-pay-${Date.now()}-${seq}`,
                step_name: `Thanh toán: ${draft.step_name || 'dịch vụ'}`,
                specialty_id: '',
                room_id: payRoomId,
                staff_id: payRoomId ? pickDoctorOnDutyForRoom(payRoomId) : '',
                service_code: draft.service_code?.trim() || 'NONE',
                room_type: 'CASHIER',
                doctor_name: payRoomId
                    ? getStaffOnDutyForRoom(payRoomId) || 'Thu ngân'
                    : 'Thu ngân',
                template_id: payId,
                template_step_id: payId,
                step_type: 'PAYMENT',
                requires_payment: false,
                depends_on: [stepId],
            });
        }
    }

    return result;
}

function pickStepOrderNumber(rec: Record<string, unknown>): number | null {
    for (const key of ['docNo', 'doc_no', 'order', 'sequence', 'seq', 'step_order']) {
        const val = rec[key];
        if (typeof val === 'number' && Number.isFinite(val)) return val;
        if (typeof val === 'string' && val.trim()) {
            const n = Number(val);
            if (Number.isFinite(n)) return n;
        }
    }

    // Only trust explicit step_N style ids — never parse UUID step_id
    for (const key of ['template_step_id', 'step_code', 'code']) {
        const raw = rec[key];
        if (typeof raw !== 'string') continue;
        const match = raw.match(/step[_\-]?(\d+)/i);
        if (match) {
            const n = Number(match[1]);
            if (Number.isFinite(n)) return n;
        }
    }

    return null;
}

/** First required predecessor UUID from a live flow step payload (best-effort). */
function pickLiveRequiredStepId(step: Record<string, unknown> | null | undefined): string {
    if (!step) return '';

    if (typeof step.required_step_id === 'string' && step.required_step_id.trim()) {
        return step.required_step_id.trim();
    }

    const deps = step.depends_on;
    if (Array.isArray(deps) && deps.length > 0) {
        const first = deps[0];
        if (typeof first === 'string' && first.trim()) return first.trim();
        const rec = asRecord(first);
        if (rec) {
            const nested =
                (typeof rec.step_id === 'string' && rec.step_id.trim()) ||
                (typeof rec.required_step_id === 'string' && rec.required_step_id.trim()) ||
                '';
            if (nested) return nested;
        }
    }

    const requiredSteps = step.required_steps;
    if (Array.isArray(requiredSteps) && requiredSteps.length > 0) {
        const first = requiredSteps[0];
        if (typeof first === 'string' && first.trim()) return first.trim();
        const rec = asRecord(first);
        if (rec && typeof rec.step_id === 'string' && rec.step_id.trim()) {
            return rec.step_id.trim();
        }
    }

    return '';
}

/**
 * Order live flow steps for timeline display.
 * Spine: Đặt khám → Thanh toán khám chuyên khoa → Khám bệnh → (CLS service → payment)…
 */
export function orderFlowStepsForTimeline(steps: unknown[]): unknown[] {
    if (!Array.isArray(steps) || steps.length <= 1) return steps;

    const unlabeledPaymentIds = detectUnlabeledPaymentStepIds(steps);

    type Row = {
        item: unknown;
        index: number;
        orderNum: number | null;
        createdAt: number;
        dependsOn: string[];
        stepId: string;
        stepName: string;
        stepNameLower: string;
        serviceCode: string;
        isPayment: boolean;
        isExamPayment: boolean;
        isBooking: boolean;
        isExam: boolean;
    };

    const rows: Row[] = steps.map((item, index) => {
        const rec = asRecord(item) || {};
        const orderNum = pickStepOrderNumber(rec);
        const createdRaw = rec.create_at ?? rec.created_at ?? rec.updated_at;
        const createdAt = createdRaw
            ? new Date(createdRaw as string | number).getTime()
            : NaN;
        const dependsOn = Array.isArray(rec.depends_on)
            ? (rec.depends_on as unknown[]).filter((d): d is string => typeof d === 'string')
            : [];
        const stepId =
            (typeof rec.template_step_id === 'string' && rec.template_step_id) ||
            (typeof rec.step_id === 'string' && rec.step_id) ||
            `idx-${index}`;
        const liveStepId = typeof rec.step_id === 'string' ? rec.step_id : '';
        const stepName = String(rec.step_name || '').trim();
        const stepNameLower = normalizeStepLabel(stepName);
        const stepType = String(rec.step_type || '').toUpperCase();
        const roomType = String(rec.room_type || '').toUpperCase();
        // Prefer name-based payment detection; step_type only as fallback (BE may mis-tag clinics)
        const nameIsPayment = isPaymentStepName(stepName) || isExamPaymentStepName(stepName);
        const typedPayment =
            !nameIsPayment &&
            (stepType === 'PAYMENT' || roomType === 'CASHIER' || roomType === 'PAYMENT') &&
            !isDefaultExamStepName(stepName) &&
            !isDefaultBookingStepName(stepName);
        const unlabeledPayment = Boolean(liveStepId && unlabeledPaymentIds.has(liveStepId));
        const isPayment = nameIsPayment || typedPayment || unlabeledPayment;
        const isExamPayment = isExamPaymentStepName(stepName);

        return {
            item,
            index,
            orderNum,
            createdAt,
            dependsOn,
            stepId,
            stepName,
            stepNameLower,
            serviceCode: pickLiveServiceCode(rec),
            isPayment: isPayment || isExamPayment,
            isExamPayment,
            isBooking: isDefaultBookingStepName(stepName),
            isExam: isDefaultExamStepName(stepName),
        };
    });

    const sortStable = (a: Row, b: Row) => {
        if (a.orderNum != null && b.orderNum != null && a.orderNum !== b.orderNum) {
            return a.orderNum - b.orderNum;
        }
        if (a.orderNum != null && b.orderNum == null) return -1;
        if (b.orderNum != null && a.orderNum == null) return 1;
        if (Number.isFinite(a.createdAt) && Number.isFinite(b.createdAt) && a.createdAt !== b.createdAt) {
            return a.createdAt - b.createdAt;
        }
        return a.index - b.index;
    };

    const paymentTargetKey = (row: Row): string => {
        if (row.serviceCode) return `code:${row.serviceCode}`;
        return `name:${stripPaymentPrefix(row.stepName)}`;
    };

    const serviceKey = (row: Row): string => {
        if (row.serviceCode) return `code:${row.serviceCode}`;
        return `name:${row.stepNameLower}`;
    };

    /**
     * Pair each CLS service with its payment AFTER it.
     * Matches "Thanh toán: X" / "Thanh toán X" to service "X" (and by service_code).
     */
    const orderServiceThenPayment = (block: Row[]): Row[] => {
        if (block.length <= 1) return block;

        const used = new Set<number>();
        const result: Row[] = [];
        const payments = block.filter((r) => r.isPayment && !r.isExamPayment);
        const services = [...block.filter((r) => !r.isPayment)].sort(sortStable);

        const findPaymentFor = (svc: Row): Row | undefined => {
            const svcKeys = new Set([serviceKey(svc), `name:${svc.stepNameLower}`]);
            return payments.find((p) => {
                if (used.has(p.index)) return false;
                const target = paymentTargetKey(p);
                if (svcKeys.has(target)) return true;
                // Fuzzy: payment target contained in / equals service name
                const payRest = stripPaymentPrefix(p.stepName);
                return (
                    payRest === svc.stepNameLower ||
                    svc.stepNameLower.includes(payRest) ||
                    payRest.includes(svc.stepNameLower)
                );
            });
        };

        services.forEach((svc) => {
            result.push(svc);
            used.add(svc.index);
            const pay = findPaymentFor(svc);
            if (pay) {
                result.push(pay);
                used.add(pay.index);
            }
        });

        // Remaining payments: try insert after matching service already in result
        payments
            .filter((p) => !used.has(p.index))
            .sort(sortStable)
            .forEach((pay) => {
                const payRest = stripPaymentPrefix(pay.stepName);
                const svcIdx = result.findIndex(
                    (r) =>
                        !r.isPayment &&
                        (serviceKey(r) === paymentTargetKey(pay) ||
                            r.stepNameLower === payRest ||
                            r.stepNameLower.includes(payRest) ||
                            payRest.includes(r.stepNameLower))
                );
                if (svcIdx >= 0) {
                    // Place right after service (and after an already-paired payment if any)
                    let insertAt = svcIdx + 1;
                    while (insertAt < result.length && result[insertAt].isPayment) insertAt += 1;
                    result.splice(insertAt, 0, pay);
                } else {
                    result.push(pay);
                }
                used.add(pay.index);
            });

        block.forEach((r) => {
            if (!used.has(r.index)) result.push(r);
        });

        return result;
    };

    const booking = rows.filter((r) => r.isBooking).sort(sortStable);
    const examPay = rows
        .filter((r) => r.isExamPayment && !r.isBooking && !r.isExam)
        .sort(sortStable);
    const exam = rows.filter((r) => r.isExam && !r.isBooking).sort(sortStable);

    // Drop duplicate CLS payment steps for the same service (createOrder + createStepParent)
    const restRaw = rows.filter((r) => !r.isBooking && !r.isExam && !r.isExamPayment);
    const restPreferred = (() => {
        const byKey = new Map<string, Row>();
        const nonPay: Row[] = [];
        restRaw.forEach((r) => {
            if (!r.isPayment) {
                nonPay.push(r);
                return;
            }
            const key = paymentTargetKey(r);
            const prev = byKey.get(key);
            if (!prev) {
                byKey.set(key, r);
                return;
            }
            const prevRec = asRecord(prev.item);
            const nextRec = asRecord(r.item);
            const prevRoom = Boolean(prevRec?.room_id || asRecord(prevRec?.room_info)?.room_id);
            const nextRoom = Boolean(nextRec?.room_id || asRecord(nextRec?.room_info)?.room_id);
            if (nextRoom && !prevRoom) byKey.set(key, r);
            else if (nextRoom === prevRoom && (r.createdAt || 0) > (prev.createdAt || 0)) {
                byKey.set(key, r);
            }
        });
        return [...nonPay, ...byKey.values()];
    })();

    return [...booking, ...examPay, ...exam, ...orderServiceThenPayment(restPreferred)].map(
        (r) => r.item
    );
}

function getIconForStep(specialtyName: string, roomName: string, label: string): NodeIcon {
    const s = (specialtyName || '').toLowerCase();
    const r = (roomName || '').toLowerCase();
    const l = (label || '').toLowerCase();

    if (s.includes('tiếp đón') || s.includes('đăng ký') || l.includes('tiếp đón') || l.includes('đăng ký') || l.includes('tiếp nhận') || r.includes('tiếp đón') || l.includes('reception')) {
        return FileText;
    }
    if (s.includes('thanh toán') || s.includes('thu ngân') || l.includes('thanh toán') || l.includes('thu ngân') || l.includes('viện phí') || r.includes('thu ngân') || r.includes('thanh toán') || l.includes('cashier')) {
        return CreditCard;
    }
    if (s.includes('xét nghiệm') || s.includes('siêu âm') || s.includes('x-quang') || s.includes('chẩn đoán') || s.includes('phòng lab') || s.includes('cận lâm sàng') || l.includes('xét nghiệm') || l.includes('siêu âm') || l.includes('cận lâm sàng') || l.includes('lab')) {
        return Microscope;
    }
    if (s.includes('thủ thuật') || s.includes('tiêm') || s.includes('truyền') || l.includes('thủ thuật') || l.includes('tiêm')) {
        return Syringe;
    }
    if (s.includes('dược') || s.includes('thuốc') || l.includes('dược') || l.includes('thuốc') || l.includes('phát thuốc') || l.includes('pharmacy')) {
        return Pill;
    }
    if (l.includes('tái khám') || l.includes('lịch hẹn')) {
        return RefreshCw;
    }
    if (l.includes('hoàn tất') || l.includes('kết thúc') || l.includes('done')) {
        return CheckCircle2;
    }
    return Stethoscope;
}

function mapStepStatusToNodeStatus(
    stepStatus: string,
    isPatientDone?: boolean,
    paymentStatus?: string,
    stepName?: string
): WorkflowStepStatus {
    if (isPaidPaymentStatus(paymentStatus)) return 'completed';
    if (isPatientDone) return 'completed';

    const st = (stepStatus || '').toUpperCase().trim();
    if (['COMPLETED', 'DONE', 'SUCCESSED', 'FINISHED'].includes(st)) {
        return 'completed';
    }

    // Soft-cancelled after lấy số / pay — treat exam payment as completed on UI
    if (
        (st === 'CANCELLED' || st === 'CANCELED') &&
        (isPaidPaymentStatus(paymentStatus) || isExamPaymentStepName(stepName || ''))
    ) {
        return 'completed';
    }

    if (['IN_PROGRESS', 'PROCESSING', 'CURRENT', 'DOING', 'EXAMINING', 'ACTIVE', 'ONGOING'].includes(st)) {
        return 'current';
    }

    // PENDING / waiting / unknown → gray default
    return 'pending';
}

function nodeStyles(status: WorkflowStepStatus) {
    switch (status) {
        case 'completed':
            // COMPLETED → green
            return {
                ring: 'bg-[#10B981] shadow-[0_0_0_4px_rgba(16,185,129,0.2)] border-transparent text-white',
                line: 'bg-[#10B981]',
            };
        case 'current':
            // IN_PROGRESS → blue
            return {
                ring: 'bg-[#2563EB] shadow-[0_0_0_4px_rgba(37,99,235,0.25)] border-transparent text-white',
                line: 'bg-[#2563EB]',
            };
        case 'pending':
        default:
            // PENDING → gray default
            return {
                ring: 'bg-[#F1F5F9] border border-[#CBD5E1] text-[#94A3B8]',
                line: 'bg-[#E2E8F0]',
            };
    }
}

function FlowIcon({ node, isFirst, onClick }: { node: FlowNode; isFirst?: boolean; onClick?: () => void }) {
    const styles = nodeStyles(node.status);

    return (
        <div className="group relative flex flex-col items-center">
            <button
                type="button"
                onClick={onClick}
                className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer',
                    styles.ring
                )}
                title="Xem chi tiết bước"
            >
                <node.Icon className="w-5 h-5" strokeWidth={2.2} />
            </button>

            {/* Tooltip */}
            <div
                className={cn(
                    'absolute hidden group-hover:flex flex-col items-center z-50',
                    isFirst ? 'top-full mt-2.5' : 'bottom-full mb-2.5'
                )}
            >
                {isFirst && <div className="w-2 h-2 bg-[#1E293B] rotate-45 -mb-1 z-10" />}
                <div className="bg-[#1E293B] text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg whitespace-nowrap">
                    <p className="font-bold text-[#F8FAFC]">{node.label}</p>
                    {node.roomName && <p className="text-[#94A3B8] font-normal text-[10px] mt-0.5">Phòng: {node.roomName}</p>}
                    {node.staffName && <p className="text-[#94A3B8] font-normal text-[10px]">Nhân viên: {node.staffName}</p>}
                </div>
                {!isFirst && <div className="w-2 h-2 bg-[#1E293B] rotate-45 -mt-1" />}
            </div>
            <span className="text-[11px] font-bold text-neutral-600 mt-1.5 max-w-[140px] text-center truncate">
                {node.label}
            </span>
        </div>
    );
}

function Connector({ status }: { status: WorkflowStepStatus }) {
    const styles = nodeStyles(status);
    return <div className={cn('w-0.5 h-6 mx-auto rounded-full', styles.line)} />;
}

function normalizeRoomKey(value?: string): string {
    return (value || '').toLowerCase().trim();
}

function getRoomTypeValue(room: unknown): string {
    const rec = asRecord(room);
    const roomType = rec?.room_type;
    if (typeof roomType === 'string') return roomType;
    const altRoomType = rec?.roomType;
    if (typeof altRoomType === 'string') return altRoomType;
    return '';
}

export function WorkflowDiagram({
    patientId,
    patient,
    refreshKey = 0,
    onFlowResolved,
}: WorkflowDiagramProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authUser = useAuthStore((s) => s.user);
    const authProfile = useAuthStore((s) => s.profile);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [flowData, setFlowData] = useState<Record<string, unknown> | null>(null);
    const flowIdRef = useRef<string>('');
    const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [draftSteps, setDraftSteps] = useState<DraftStep[]>([]);
    const [isConfiguringDraft, setIsConfiguringDraft] = useState(false);

    const [isAssigning, setIsAssigning] = useState(false);
    const [isSelectingTemplate, setIsSelectingTemplate] = useState(false);

    const [isCustomizing, setIsCustomizing] = useState(false);
    const [editingStepId, setEditingStepId] = useState<string | null>(null);
    const [editingSpecialtyId, setEditingSpecialtyId] = useState<string>('');
    const [editingRoomId, setEditingRoomId] = useState<string>('');
    const [editingStaffId, setEditingStaffId] = useState<string>('');
    const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('');
    const [selectedRoomId, setSelectedRoomId] = useState<string>('');
    const [selectedStaffId, setSelectedStaffId] = useState<string>('');
    const [selectedServiceCode, setSelectedServiceCode] = useState<string>('');
    const [selectedDraftServiceCode, setSelectedDraftServiceCode] = useState<string>('');
    const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(true);
    const [editingStepStatus, setEditingStepStatus] = useState<string>('');
    const [editingRequiredStepId, setEditingRequiredStepId] = useState<string>('');
    const [editingOldRequiredStepId, setEditingOldRequiredStepId] = useState<string>('');
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [selectedStepNode, setSelectedStepNode] = useState<FlowNode | null>(null);

    const normalizeStepStatusForApi = (status?: string): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED' | 'CANCELLED' => {
        const normalized = (status || '').toUpperCase().trim();

        if (['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED'].includes(normalized)) {
            return 'COMPLETED';
        }
        if (['IN_PROGRESS', 'PROCESSING', 'ONGOING', 'CURRENT', 'DOING', 'EXAMINING', 'ACTIVE'].includes(normalized)) {
            return 'IN_PROGRESS';
        }
        if (['DECLINED', 'REJECTED', 'DENIED'].includes(normalized)) {
            return 'DECLINED';
        }
        if (['CANCELLED', 'CANCELED'].includes(normalized)) {
            return 'CANCELLED';
        }
        return 'PENDING';
    };

    const getStatusCandidates = (normalizedStatus: string): string[] => {
        switch (normalizedStatus) {
            case 'IN_PROGRESS':
                return ['IN_PROGRESS', 'PROCESSING', 'ONGOING', 'CURRENT', 'ACTIVE'];
            case 'COMPLETED':
                return ['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED'];
            case 'DECLINED':
                return ['DECLINED', 'REJECTED', 'DENIED'];
            case 'CANCELLED':
                return ['CANCELLED', 'CANCELED'];
            default:
                return ['PENDING', 'WAITING'];
        }
    };

    const updateStepStatusWithFallback = async (stepId: string, status: string, token: string) => {
        const normalizedStatus = normalizeStepStatusForApi(status);
        const candidates = getStatusCandidates(normalizedStatus);
        let lastError: unknown = null;

        for (const candidate of candidates) {
            try {
                await clinicalService.updateStepStatus(stepId, candidate, token);
                return;
            } catch (err) {
                lastError = err;
            }
        }

        throw lastError;
    };

    const rawFlowSteps = useMemo(() => extractFlowSteps(flowData), [flowData]);
    const orderedFlowSteps = useMemo(() => {
        return orderFlowStepsForTimeline(rawFlowSteps);
    }, [rawFlowSteps]);
    const unlabeledPaymentStepIds = useMemo(
        () => detectUnlabeledPaymentStepIds(orderedFlowSteps),
        [orderedFlowSteps]
    );
    const hasLiveSteps = rawFlowSteps.length > 0;

    useEffect(() => {
        const id = typeof flowData?.flow_id === 'string' ? flowData.flow_id : '';
        if (id) flowIdRef.current = id;
    }, [flowData]);

    // Get rooms, staff and shifts from Zustand stores
    const { rooms, fetchRooms } = useRoomStore();
    const { staffs, fetchStaffs } = useStaffStore();
    const { shifts, fetchShifts } = useShiftStore();

    const currentRole = (authUser?.role || authProfile?.role || '').toUpperCase();
    const isDoctorRole = currentRole === 'DOCTOR';

    const currentDoctorStaffId = useMemo(() => {
        if (!isDoctorRole) return '';

        const userId = (authUser?.id || '').toLowerCase();
        const userEmail = (authUser?.email || '').toLowerCase();
        const profileId = (authProfile?.id || '').toLowerCase();
        const profileAccountId = (authProfile?.account_id || '').toLowerCase();
        const profileEmail = (authProfile?.email || '').toLowerCase();

        const matched = staffs.find((staff) => {
            const rec = staff as unknown as Record<string, unknown>;
            const accountRec = rec.account && typeof rec.account === 'object'
                ? (rec.account as Record<string, unknown>)
                : null;

            const staffId = (staff.staff_id || '').toLowerCase();
            const accountId = (typeof rec.account_id === 'string' ? rec.account_id : '').toLowerCase();
            const accountRecId = (typeof accountRec?.id === 'string' ? accountRec.id : '').toLowerCase();
            const accountEmail = (typeof accountRec?.email === 'string' ? accountRec.email : '').toLowerCase();

            return Boolean(
                (userId && (staffId === userId || accountId === userId || accountRecId === userId)) ||
                (profileId && (staffId === profileId || accountId === profileId || accountRecId === profileId)) ||
                (profileAccountId && (accountId === profileAccountId || accountRecId === profileAccountId)) ||
                (userEmail && accountEmail === userEmail) ||
                (profileEmail && accountEmail === profileEmail)
            );
        });

        return matched?.staff_id || '';
    }, [
        isDoctorRole,
        staffs,
        authUser?.id,
        authUser?.email,
        authProfile?.id,
        authProfile?.account_id,
        authProfile?.email,
    ]);

    const currentDoctorRoomKeys = useMemo(() => {
        if (!isDoctorRole || !currentDoctorStaffId) return new Set<string>();

        const keys = new Set<string>();
        shifts.forEach((shift) => {
            if (shift.staff_id !== currentDoctorStaffId) return;

            const shiftRoomId = normalizeRoomKey(shift.room_id);
            if (shiftRoomId) keys.add(shiftRoomId);

            const room = rooms.find((r) => r.room_id === shift.room_id || r.room_name === shift.room_id);
            if (room) {
                const roomId = normalizeRoomKey(room.room_id);
                const roomName = normalizeRoomKey(room.room_name);
                const physicalRoomId = normalizeRoomKey(room.physical_room_id || '');

                if (roomId) keys.add(roomId);
                if (roomName) keys.add(roomName);
                if (physicalRoomId) keys.add(physicalRoomId);
            }
        });

        return keys;
    }, [isDoctorRole, currentDoctorStaffId, shifts, rooms]);

    const canCurrentDoctorEditStepStatus = (step: Record<string, unknown>): boolean => {
        if (!isDoctorRole) return true;

        const roomInfo = step.room_info as Record<string, unknown> | undefined;
        const candidateRoomKeys = [
            normalizeRoomKey(step.room_id as string),
            normalizeRoomKey(roomInfo?.room_id as string),
            normalizeRoomKey(roomInfo?.room_name as string),
        ].filter(Boolean);

        return candidateRoomKeys.some((key) => currentDoctorRoomKeys.has(key));
    };



    useEffect(() => {
        if (accessToken) {
            fetchRooms(accessToken).catch(() => { });
            fetchStaffs(accessToken).catch(() => { });
            fetchShifts(accessToken).catch(() => { });
        }
    }, [accessToken, fetchRooms, fetchStaffs, fetchShifts]);

    useEffect(() => {
        if (!accessToken) return;

        let isCancelled = false;

        clinicalService
            .getServices(accessToken, 1, 100)
            .then((res) => {
                if (isCancelled) return;
                const options = extractServiceOptions(res.data);
                setServiceOptions(options);
                if (options.length > 0) {
                    setSelectedServiceCode((prev) => prev || options[0].service_code);
                    setSelectedDraftServiceCode((prev) => prev || options[0].service_code);
                }
            })
            .catch((err) => {
                console.error('Failed to load service list for workflow:', err);
            })
            .finally(() => {
                if (!isCancelled) setIsLoadingServices(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [accessToken]);

    const specialties = useMemo(() => {
        const byId = new Map<string, string>();
        rooms.forEach((room) => {
            if (!room.specialty_id) return;
            if (!byId.has(room.specialty_id)) {
                byId.set(room.specialty_id, room.specialty?.specialty_name || room.specialty_id);
            }
        });
        return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
    }, [rooms]);

    const getRoomsBySpecialty = (specialtyId: string) => {
        if (!specialtyId) return [];
        return rooms.filter((room) => room.specialty_id === specialtyId);
    };



    const getStaffOnDutyForRoom = (roomId: string): string => {
        if (!roomId) return '';

        const targetRoom = rooms.find(
            (r) =>
                r.room_id === roomId ||
                (r as unknown as Record<string, unknown>).id === roomId ||
                r.room_name === roomId
        );

        const possibleRoomIds = new Set<string>();
        if (roomId) possibleRoomIds.add(roomId);
        if (targetRoom) {
            if (targetRoom.room_id) possibleRoomIds.add(targetRoom.room_id);
            if ((targetRoom as unknown as Record<string, unknown>).id) {
                possibleRoomIds.add((targetRoom as unknown as Record<string, unknown>).id as string);
            }
            if (targetRoom.physical_room_id) possibleRoomIds.add(targetRoom.physical_room_id);
            if (targetRoom.room_name) possibleRoomIds.add(targetRoom.room_name);
        }

        let roomShifts = shifts.filter((s) => {
            if (!s.room_id) return false;
            return possibleRoomIds.has(s.room_id);
        });

        if (roomShifts.length === 0) {
            const roomName = targetRoom?.room_name || roomId;
            roomShifts = shifts.filter((s) => s.room_id && (s.room_id === roomName || s.room_id.includes(roomName)));
        }

        if (roomShifts.length === 0) {
            const roomSpecialtyId = targetRoom?.specialty_id;
            const doctorInSpecialty = staffs.find(
                (st) => (roomSpecialtyId && st.specialty_id === roomSpecialtyId) && (st.account?.role as string) === 'DOCTOR'
            ) || staffs.find(
                (st) => (st.account?.role as string) === 'DOCTOR'
            );
            if (doctorInSpecialty?.full_name) {
                return doctorInSpecialty.full_name;
            }
            if (doctorInSpecialty?.account?.user_name) {
                return doctorInSpecialty.account.user_name;
            }
            return 'Chưa có bác sĩ';
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayKey = `${year}-${month}-${day}`;
        const todayUtcKey = now.toISOString().split('T')[0];

        let matchedShift = roomShifts.find((s) => {
            if (!s.date) return false;
            const dStr = s.date.split('T')[0].slice(0, 10);
            return dStr === todayKey || dStr === todayUtcKey;
        });

        if (!matchedShift) {
            matchedShift = [...roomShifts].sort((a, b) => {
                const aTime = a.date ? new Date(a.date).getTime() : 0;
                const bTime = b.date ? new Date(b.date).getTime() : 0;
                return bTime - aTime;
            })[0];
        }

        if (!matchedShift) return '';

        const shiftObj = matchedShift as unknown as Record<string, unknown>;
        const staffInShift = (shiftObj.staff || shiftObj.staff_info || shiftObj.account) as Record<string, unknown> | undefined;

        const directStaffName =
            shiftObj.staff_name ||
            shiftObj.doctor_name ||
            staffInShift?.full_name ||
            staffInShift?.name ||
            staffInShift?.user_name ||
            ((staffInShift?.profile || {}) as Record<string, unknown>)?.full_name;

        if (typeof directStaffName === 'string' && directStaffName.trim()) {
            return directStaffName;
        }

        const sId = matchedShift.staff_id;
        if (sId) {
            const staff = staffs.find((st) => {
                const stAny = st as unknown as Record<string, unknown>;
                const accAny = (st.account || {}) as unknown as Record<string, unknown>;
                const profAny = (accAny.profile || {}) as Record<string, unknown>;
                return (
                    st.staff_id === sId ||
                    stAny.id === sId ||
                    stAny.account_id === sId ||
                    stAny.user_id === sId ||
                    stAny.staff_code === sId ||
                    accAny.id === sId ||
                    accAny.account_id === sId ||
                    accAny.user_id === sId ||
                    accAny.email === sId ||
                    accAny.user_name === sId ||
                    profAny.id === sId
                );
            });

            if (staff) {
                const name =
                    extractPersonName(staff as unknown as Record<string, unknown>) ||
                    staff.full_name ||
                    staff.account?.user_name ||
                    staff.account?.email;

                if (name && name.trim()) return name;
            }

            const roomSpecialtyId = targetRoom?.specialty_id;
            const doctorInSpecialty = staffs.find(
                (st) => (roomSpecialtyId && st.specialty_id === roomSpecialtyId) || (st.account?.role as string) === 'DOCTOR'
            );
            const specialtyName =
                extractPersonName(doctorInSpecialty as unknown as Record<string, unknown>) ||
                doctorInSpecialty?.full_name ||
                doctorInSpecialty?.account?.user_name;
            if (specialtyName && specialtyName.trim()) {
                return specialtyName;
            }
        }

        return 'Chưa phân công bác sĩ trực';
    };

    const pickDoctorOnDutyForRoom = (roomId: string) => {
        if (!roomId) return '';

        const targetRoom = rooms.find(
            (r) =>
                r.room_id === roomId ||
                (r as unknown as Record<string, unknown>).id === roomId ||
                r.room_name === roomId
        );

        const possibleRoomIds = new Set<string>();
        if (roomId) possibleRoomIds.add(roomId);
        if (targetRoom) {
            if (targetRoom.room_id) possibleRoomIds.add(targetRoom.room_id);
            if ((targetRoom as unknown as Record<string, unknown>).id) {
                possibleRoomIds.add((targetRoom as unknown as Record<string, unknown>).id as string);
            }
            if (targetRoom.physical_room_id) possibleRoomIds.add(targetRoom.physical_room_id);
            if (targetRoom.room_name) possibleRoomIds.add(targetRoom.room_name);
        }

        let roomShifts = shifts.filter((s) => {
            if (!s.room_id) return false;
            return possibleRoomIds.has(s.room_id);
        });

        if (roomShifts.length === 0) {
            const roomName = targetRoom?.room_name || roomId;
            roomShifts = shifts.filter((s) => s.room_id && (s.room_id === roomName || s.room_id.includes(roomName)));
        }

        if (roomShifts.length === 0) {
            const roomSpecialtyId = targetRoom?.specialty_id;
            const doctorInSpecialty = staffs.find(
                (st) => roomSpecialtyId && st.specialty_id === roomSpecialtyId && (st.account?.role as string) === 'DOCTOR'
            ) || staffs.find(
                (st) => (st.account?.role as string) === 'DOCTOR'
            );

            return doctorInSpecialty?.staff_id || '';
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayKey = `${year}-${month}-${day}`;
        const todayUtcKey = now.toISOString().split('T')[0];

        let matchedShift = roomShifts.find((s) => {
            if (!s.date) return false;
            const dStr = s.date.split('T')[0].slice(0, 10);
            return dStr === todayKey || dStr === todayUtcKey;
        });

        if (!matchedShift) {
            matchedShift = [...roomShifts].sort((a, b) => {
                const aTime = a.date ? new Date(a.date).getTime() : 0;
                const bTime = b.date ? new Date(b.date).getTime() : 0;
                return bTime - aTime;
            })[0];
        }

        if (!matchedShift) return '';

        const sId = matchedShift.staff_id;
        const staff = staffs.find(
            (st) =>
                st.staff_id === sId ||
                (st as unknown as Record<string, unknown>).id === sId ||
                (st as unknown as Record<string, unknown>).account_id === sId
        );

        const resolvedStaffId = staff?.staff_id || sId || '';
        if (resolvedStaffId) return resolvedStaffId;

        const roomSpecialtyId = targetRoom?.specialty_id;
        const doctorInSpecialty = staffs.find(
            (st) => roomSpecialtyId && st.specialty_id === roomSpecialtyId && (st.account?.role as string) === 'DOCTOR'
        ) || staffs.find(
            (st) => (st.account?.role as string) === 'DOCTOR'
        );

        return doctorInSpecialty?.staff_id || '';
    };

    const findStaffByAnyId = (sId: string) => {
        if (!sId) return undefined;
        return staffs.find((st) => {
            const stAny = st as unknown as Record<string, unknown>;
            const accAny = (st.account || {}) as unknown as Record<string, unknown>;
            const profAny = (accAny.profile || {}) as Record<string, unknown>;
            return (
                st.staff_id === sId ||
                stAny.id === sId ||
                stAny.account_id === sId ||
                stAny.user_id === sId ||
                stAny.staff_code === sId ||
                accAny.id === sId ||
                accAny.account_id === sId ||
                accAny.user_id === sId ||
                accAny.email === sId ||
                accAny.user_name === sId ||
                profAny.id === sId
            );
        });
    };

    const resolveStaffNameById = (sId: string): string => {
        const staff = findStaffByAnyId(sId);
        if (!staff) return '';
        return (
            extractPersonName(staff as unknown as Record<string, unknown>) ||
            staff.full_name ||
            staff.account?.user_name ||
            staff.account?.email ||
            ''
        );
    };

    /** Resolve display name + staff id when BE omits staff_info on a live step. */
    const resolveLiveStepStaff = (
        step: Record<string, unknown>
    ): { staffName: string; staffId: string } => {
        const staffInfo = asRecord(step.staff_info) || asRecord(step.staff);
        const roomInfo = asRecord(step.room_info);

        const fromInfo = extractPersonName(staffInfo);
        const staffIdFromStep =
            (typeof step.staff_id === 'string' && step.staff_id.trim()) ||
            (typeof staffInfo?.staff_id === 'string' && staffInfo.staff_id.trim()) ||
            (typeof staffInfo?.id === 'string' && staffInfo.id.trim()) ||
            '';

        if (fromInfo) {
            return { staffName: fromInfo, staffId: staffIdFromStep };
        }

        if (staffIdFromStep) {
            const byId = resolveStaffNameById(staffIdFromStep);
            if (byId) return { staffName: byId, staffId: staffIdFromStep };
        }

        const roomCandidates = [
            typeof step.room_id === 'string' ? step.room_id : '',
            typeof roomInfo?.room_id === 'string' ? roomInfo.room_id : '',
            typeof roomInfo?.room_name === 'string' ? roomInfo.room_name : '',
        ].filter(Boolean);

        for (const roomKey of roomCandidates) {
            const dutyName = getStaffOnDutyForRoom(roomKey);
            if (dutyName && !isUnassignedStaffLabel(dutyName)) {
                const dutyId = pickDoctorOnDutyForRoom(roomKey) || staffIdFromStep;
                return { staffName: dutyName, staffId: dutyId };
            }

            const dutyId = pickDoctorOnDutyForRoom(roomKey);
            if (dutyId) {
                const dutyNameById = resolveStaffNameById(dutyId);
                if (dutyNameById) {
                    return { staffName: dutyNameById, staffId: dutyId };
                }
            }
        }

        return {
            staffName: 'Chưa phân công bác sĩ trực',
            staffId: staffIdFromStep,
        };
    };

    const handleEditingSpecialtyChange = (specialtyId: string) => {
        setEditingSpecialtyId(specialtyId);
        setEditingRoomId('');
        setEditingStaffId('');
    };

    const handleEditingRoomChange = (roomId: string) => {
        setEditingRoomId(roomId);
        setEditingStaffId(pickDoctorOnDutyForRoom(roomId));
    };

    const handleSelectedSpecialtyChange = (specialtyId: string) => {
        setSelectedSpecialtyId(specialtyId);
        setSelectedRoomId('');
        setSelectedStaffId('');
        setSelectedServiceCode('');
        setSelectedDraftServiceCode('');
    };

    const handleSelectedRoomChange = (roomId: string) => {
        setSelectedRoomId(roomId);
        setSelectedStaffId(pickDoctorOnDutyForRoom(roomId));

        const room = rooms.find((r) => r.room_id === roomId);
        const defaultServiceCode = pickServiceCodeByContext(
            {
                roomType: getRoomTypeValue(room),
                roomName: room?.room_name,
                specialtyName: room?.specialty?.specialty_name,
            },
            serviceOptions
        );
        if (defaultServiceCode) {
            setSelectedServiceCode(defaultServiceCode);
            setSelectedDraftServiceCode(defaultServiceCode);
        }
    };

    const reloadFlow = async (): Promise<Record<string, unknown> | null> => {
        const resolvedPatientId = (patient?.patientId || '').trim();
        if (!accessToken || !resolvedPatientId) return null;
        try {
            const preferredFlowId =
                flowIdRef.current ||
                (typeof flowData?.flow_id === 'string' && flowData.flow_id) ||
                patient?.flowId ||
                '';
            const flowObj = await resolvePatientFlow(accessToken, {
                flowId: preferredFlowId,
                patientId: resolvedPatientId,
                bookingId: patient?.bookingId,
            });
            setFlowData(flowObj);
            return flowObj;
        } catch (err) {
            console.error('Failed to reload active flow:', err);
            return null;
        }
    };

    const handleCancelStep = async (stepId: string) => {
        if (!accessToken) return;
        setIsActionLoading(true);
        try {
            await clinicalService.updateStepStatus(stepId, 'CANCELLED', accessToken);
            await reloadFlow();
        } catch (err) {
            console.error('Failed to cancel step:', err);
            setError('Không thể hủy bước khám.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleUpdateStep = async (stepId: string) => {
        if (!accessToken) return;

        const liveStep = orderedFlowSteps
            .map((item) => asRecord(item))
            .find((s) => s && String(s.step_id || '') === stepId);
        const linkedOrderId = (() => {
            if (!liveStep) return '';
            if (typeof liveStep.service_order_id === 'string') {
                return liveStep.service_order_id.trim();
            }
            if (typeof liveStep.serviceOrderId === 'string') {
                return liveStep.serviceOrderId.trim();
            }
            return '';
        })();
        const nextStatus = (editingStepStatus || '').trim().toUpperCase();
        const hasRoom = Boolean(editingRoomId);
        const hasStatus = Boolean(nextStatus);

        // Payment / some service steps often have no room — allow status-only save
        if (!hasRoom && !hasStatus) {
            setError('Vui lòng chọn phòng hoặc đổi trạng thái trước khi lưu.');
            return;
        }

        setIsActionLoading(true);
        setError(null);
        try {
            if (hasRoom) {
                const payload: { room_id: string; staff_id?: string } = {
                    room_id: editingRoomId,
                };
                if (editingStaffId) {
                    payload.staff_id = editingStaffId;
                }
                await clinicalService.updateStep(stepId, payload, accessToken);
            }

            if (hasStatus) {
                await updateStepStatusWithFallback(stepId, nextStatus, accessToken);

                if (linkedOrderId) {
                    const orderStatus: ServiceOrderStatus =
                        nextStatus === 'COMPLETED' || nextStatus === 'DONE'
                            ? 'COMPLETED'
                            : nextStatus === 'CANCELLED' || nextStatus === 'CANCELED'
                              ? 'CANCELLED'
                              : nextStatus === 'IN_PROGRESS'
                                ? 'IN_PROGRESS'
                                : 'PENDING';
                    try {
                        await serviceOrderService.updateOrder(
                            linkedOrderId,
                            { status: orderStatus },
                            accessToken
                        );
                    } catch (orderErr) {
                        console.warn('Failed to sync service order status', orderErr);
                    }
                }
            }

            const nextRequired = editingRequiredStepId.trim();
            const oldRequired = editingOldRequiredStepId.trim();
            if (nextRequired && nextRequired !== stepId) {
                if (!oldRequired) {
                    await clinicalService.createStepDependency(
                        { waiting_step_id: stepId, required_step_id: nextRequired },
                        accessToken
                    );
                } else if (oldRequired !== nextRequired) {
                    await clinicalService.updateStepDependency(
                        {
                            waiting_step_id: stepId,
                            old_required_step_id: oldRequired,
                            new_required_step_id: nextRequired,
                        },
                        accessToken
                    );
                }
            }

            setEditingStepId(null);
            setEditingRequiredStepId('');
            setEditingOldRequiredStepId('');
            await reloadFlow();
        } catch (err) {
            console.error('Failed to update step:', err);
            setError('Không thể cập nhật thông tin bước.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleAddStep = async () => {
        const flowId = (flowData?.flow_id as string) || patient?.flowId;
        if (!flowId || !accessToken || !selectedRoomId) return;

        const room = rooms.find((r) => r.room_id === selectedRoomId);
        const resolvedServiceCode =
            selectedServiceCode ||
            pickServiceCodeByContext(
                {
                    roomType: getRoomTypeValue(room),
                    roomName: room?.room_name,
                    specialtyName: room?.specialty?.specialty_name,
                },
                serviceOptions
            );

        if (!resolvedServiceCode) {
            setError('Vui lòng chọn mã dịch vụ cho bước khám.');
            return;
        }

        const resolvedStaffId = selectedStaffId || pickDoctorOnDutyForRoom(selectedRoomId);
        if (!resolvedStaffId) {
            setError('Không tìm thấy bác sĩ/nhân viên trực cho phòng đã chọn. Vui lòng chọn phòng khác hoặc phân ca trước.');
            return;
        }

        // Last non-cancelled step before add — new step will wait on it
        const previousStepId = (() => {
            for (let i = orderedFlowSteps.length - 1; i >= 0; i--) {
                const live = asRecord(orderedFlowSteps[i]);
                const status = String(live?.step_status || '').toUpperCase();
                if (status === 'CANCELLED') continue;
                const id = typeof live?.step_id === 'string' ? live.step_id : '';
                if (id) return id;
            }
            return '';
        })();

        setIsActionLoading(true);
        try {
            const roomType = normalizeRoomType(getRoomTypeValue(room) || 'CLINICAL_ROOM');
            const payload = {
                flow_id: flowId,
                room_id: selectedRoomId,
                step_status: 'PENDING' as const,
                staff_id: resolvedStaffId,
                service_code: resolvedServiceCode,
                step_name: room?.room_name || 'Bước khám mới',
                step_type: mapRoomTypeToStepType(roomType),
            };
            await clinicalService.createStepParent(payload, accessToken);
            setSelectedRoomId('');
            setSelectedStaffId('');
            setSelectedServiceCode('');
            const flowObj = await reloadFlow();

            if (previousStepId && flowObj) {
                const liveRaw = Array.isArray(flowObj.steps) ? (flowObj.steps as unknown[]) : [];
                const liveOrdered = orderFlowStepsForTimeline(liveRaw);
                const existingIds = new Set(
                    orderedFlowSteps
                        .map((s) => {
                            const rec = asRecord(s);
                            return typeof rec?.step_id === 'string' ? rec.step_id : '';
                        })
                        .filter(Boolean)
                );
                const newStep = [...liveOrdered].reverse().find((item) => {
                    const live = asRecord(item);
                    const id = typeof live?.step_id === 'string' ? live.step_id : '';
                    const status = String(live?.step_status || '').toUpperCase();
                    return Boolean(id && !existingIds.has(id) && status !== 'CANCELLED');
                });
                const newStepId = (() => {
                    const live = asRecord(newStep);
                    return typeof live?.step_id === 'string' ? live.step_id : '';
                })();

                if (newStepId && newStepId !== previousStepId) {
                    try {
                        await clinicalService.createStepDependency(
                            { waiting_step_id: newStepId, required_step_id: previousStepId },
                            accessToken
                        );
                        await reloadFlow();
                    } catch (depErr) {
                        console.warn('Failed to link new step dependency', depErr);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to add step:', err);
            setError('Không thể thêm bước khám mới.');
        } finally {
            setIsActionLoading(false);
        }
    };

    useEffect(() => {
        if (!accessToken) return;
        // BE active-flow requires real patient_id — never queue_id (patient.id)
        const resolvedPatientId = (patient?.patientId || '').trim();
        if (!resolvedPatientId) {
            setError('Thiếu patient_id — không tải được quy trình.');
            setFlowData(null);
            return;
        }

        let cancelled = false;
        setError(null);
        setIsLoading(true);

        const loadData = async () => {
            try {
                const flowObj = await resolvePatientFlow(accessToken, {
                    // Prefer booking (current queue). Stale sparse flowId is ignored when poorer.
                    flowId: patient?.flowId,
                    patientId: resolvedPatientId,
                    bookingId: patient?.bookingId,
                });
                if (cancelled) return;
                setFlowData(flowObj);
                if (!flowObj) {
                    setError('Không tìm thấy flow đang chạy cho bệnh nhân.');
                } else {
                    const flowId =
                        typeof flowObj.flow_id === 'string' ? flowObj.flow_id : '';
                    const bookingId =
                        typeof flowObj.booking_id === 'string' ? flowObj.booking_id : '';
                    if (flowId) flowIdRef.current = flowId;
                    if (flowId || bookingId) {
                        onFlowResolved?.({ flowId, bookingId });
                    }
                }

                try {
                    const tplRes = await clinicalService.getProcessTemplates(accessToken);
                    if (cancelled) return;
                    let tplList: ProcessTemplate[] = [];
                    if (tplRes?.data) {
                        const tData = tplRes.data as unknown;
                        if (Array.isArray(tData)) {
                            tplList = tData as ProcessTemplate[];
                        } else if (tData && typeof tData === 'object') {
                            const rec = tData as Record<string, unknown>;
                            if (Array.isArray(rec.data)) {
                                tplList = rec.data as ProcessTemplate[];
                            } else if (Array.isArray(rec.templates)) {
                                tplList = rec.templates as ProcessTemplate[];
                            }
                        }
                    }
                    setTemplates(tplList);
                } catch {
                    // ignore template fetch error if any
                }
            } catch (err) {
                if (cancelled) return;
                console.error('Failed to fetch active flow:', err);
                setError('Không thể tải quy trình.');
                setFlowData(null);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void loadData();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, patient?.patientId, patient?.flowId, patient?.bookingId, accessToken, refreshKey]);



    const handleSelectTemplateDraft = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const tpl = templates.find(t => (t.template_id || t.id) === templateId);
        if (tpl && tpl.steps) {
            const parentId = tpl.template_id || tpl.id || templateId;
            const baseDrafts = tpl.steps.map((s, idx) =>
                buildDraftFromTemplateStep(
                    s,
                    idx,
                    parentId,
                    rooms,
                    serviceOptions,
                    pickDoctorOnDutyForRoom,
                    getStaffOnDutyForRoom,
                    getRoomTypeValue
                )
            );
            setDraftSteps(
                expandDraftsWithPaymentSteps(
                    baseDrafts,
                    rooms,
                    pickDoctorOnDutyForRoom,
                    getStaffOnDutyForRoom,
                    getRoomTypeValue
                )
            );
        } else {
            setDraftSteps([]);
        }
    };

    const handleUpdateDraftStep = (tempId: string, updates: Partial<DraftStep>) => {
        setDraftSteps(prev => prev.map(step => {
            if (step.tempId === tempId) {
                const updated = { ...step, ...updates };
                if (updates.room_id !== undefined && updates.staff_id === undefined) {
                    updated.staff_id = ''; // Reset staff when room changes
                }
                if (updates.room_id !== undefined) {
                    updated.doctor_name = getStaffOnDutyForRoom(updates.room_id) || 'Chưa có bác sĩ';
                    if (!updated.service_code) {
                        const room = rooms.find((r) => r.room_id === updates.room_id);
                        updated.service_code = pickServiceCodeByContext(
                            {
                                roomType: getRoomTypeValue(room),
                                roomName: room?.room_name,
                                specialtyName: room?.specialty?.specialty_name,
                            },
                            serviceOptions
                        );
                    }
                }
                return updated;
            }
            return step;
        }));
    };

    const handleRemoveDraftStep = (tempId: string) => {
        setDraftSteps(prev => prev.filter(step => step.tempId !== tempId));
    };

    const handleAddDraftStep = (specialty_id: string, room_id: string, staff_id: string, service_code: string) => {
        if (!room_id) return;
        if (!service_code) {
            setError('Vui lòng chọn mã dịch vụ cho bước nháp.');
            return;
        }
        const resolvedStaffId = staff_id || pickDoctorOnDutyForRoom(room_id);
        if (!resolvedStaffId) {
            setError('Không tìm thấy bác sĩ/nhân viên trực cho phòng đã chọn. Vui lòng chọn phòng khác hoặc phân ca trước.');
            return;
        }
        const room = rooms.find(r => r.room_id === room_id);
        const doctorName = getStaffOnDutyForRoom(room_id) || 'Chưa có bác sĩ';
        const nextIdx = draftSteps.length;
        const templateStepId = `step_${nextIdx + 1}`;
        const roomType = normalizeRoomType(getRoomTypeValue(room) || 'CLINICAL_ROOM');
        const newStep: DraftStep = {
            tempId: `draft-custom-${Date.now()}`,
            step_name: room?.room_name || 'Chỉ định thêm',
            specialty_id,
            room_type: roomType,
            room_id,
            staff_id: resolvedStaffId,
            service_code,
            doctor_name: doctorName,
            template_id: templateStepId,
            template_step_id: templateStepId,
            step_type: mapRoomTypeToStepType(roomType),
            requires_payment: false,
            depends_on: nextIdx > 0 ? [`step_${nextIdx}`] : [],
        };
        setDraftSteps(prev => [...prev, newStep]);
    };

    const handleCommitDraft = async () => {
        const flowId = (flowData?.flow_id as string) || patient?.flowId;
        if (!flowId || flowId === 'undefined' || !accessToken) {
            setError('Không tìm thấy Flow ID của bệnh nhân.');
            return;
        }

        const templateId = selectedTemplateId.trim();
        if (!templateId) {
            setError('Vui lòng chọn một template để thêm vào quy trình.');
            return;
        }

        if (draftSteps.length === 0) {
            setError('Quy trình nháp không có bước nào.');
            return;
        }

        const expandedForValidation = expandDraftsWithPaymentSteps(
            draftSteps,
            rooms,
            pickDoctorOnDutyForRoom,
            getStaffOnDutyForRoom,
            getRoomTypeValue
        );

        // Validate service steps (payment companions may not need staff)
        const missingRoom = expandedForValidation.find(
            (s) => !s.room_id && normalizeStepType(s.step_type, s.room_type) !== 'PAYMENT'
        );
        if (missingRoom) {
            setError(`Vui lòng chọn phòng cho bước "${missingRoom.step_name}".`);
            return;
        }

        const missingStaff = expandedForValidation.find(
            (s) => !s.staff_id && normalizeStepType(s.step_type, s.room_type) !== 'PAYMENT'
        );
        if (missingStaff) {
            setError(`Bước "${missingStaff.step_name}" chưa có bác sĩ/nhân viên phụ trách.`);
            return;
        }

        const missingServiceCode = expandedForValidation.find((s) => !s.service_code);
        if (missingServiceCode) {
            setError(`Bước "${missingServiceCode.step_name}" chưa có mã dịch vụ.`);
            return;
        }

        const beforeStepIds = new Set(
            orderedFlowSteps
                .map((item) => {
                    const live = asRecord(item);
                    return typeof live?.step_id === 'string' ? live.step_id : '';
                })
                .filter(Boolean)
        );

        setIsAssigning(true);
        setError(null);
        try {
            const expandedDrafts = expandedForValidation;
            setDraftSteps(expandedDrafts);

            // 1) Append saved template onto flow (BE keeps default Đặt khám / Khám bệnh)
            await clinicalService.assignTemplateToFlow(flowId, templateId, accessToken);

            // 2) Reload; patch room/staff on newly created steps (match by name)
            const flowObj = await reloadFlow();
            const liveRaw = Array.isArray(flowObj?.steps) ? (flowObj!.steps as unknown[]) : [];
            const liveOrdered = orderFlowStepsForTimeline(liveRaw);

            const newLiveSteps = liveOrdered.filter((item) => {
                const live = asRecord(item);
                const id = typeof live?.step_id === 'string' ? live.step_id : '';
                return Boolean(id && !beforeStepIds.has(id));
            });
            const unusedNew = [...newLiveSteps];
            const draftTemplateIdToLiveId = new Map<string, string>();
            const appendedLiveIds: string[] = [];

            for (const draft of expandedDrafts) {
                const draftName = (draft.step_name || '').trim().toLowerCase();
                const matchIdx = unusedNew.findIndex((liveItem) => {
                    const live = asRecord(liveItem);
                    const liveName = String(live?.step_name || '').trim().toLowerCase();
                    return Boolean(draftName && liveName && draftName === liveName);
                });
                const liveItem = matchIdx >= 0 ? unusedNew.splice(matchIdx, 1)[0] : null;
                const live = asRecord(liveItem);
                const stepId = typeof live?.step_id === 'string' ? live.step_id : '';
                const templateStepId = (draft.template_step_id || '').trim();
                if (stepId && templateStepId) {
                    draftTemplateIdToLiveId.set(templateStepId, stepId);
                }
                if (stepId) appendedLiveIds.push(stepId);
                if (!stepId || !draft.room_id) continue;

                const patch: { room_id: string; staff_id?: string } = {
                    room_id: draft.room_id,
                };
                if (draft.staff_id) patch.staff_id = draft.staff_id;

                try {
                    await clinicalService.updateStep(stepId, patch, accessToken);
                } catch (patchErr) {
                    console.warn('Failed to patch room/staff for step', stepId, patchErr);
                }
            }

            // 3) Runtime dependencies: first appended → Khám bệnh; then draft.depends_on edges
            const examStepId = findLiveExamStepId(liveOrdered);
            const firstAppendedId = appendedLiveIds[0] || '';
            if (examStepId && firstAppendedId && examStepId !== firstAppendedId) {
                try {
                    await clinicalService.createStepDependency(
                        { waiting_step_id: firstAppendedId, required_step_id: examStepId },
                        accessToken
                    );
                } catch (depErr) {
                    console.warn('Failed to link first template step to Khám bệnh', depErr);
                }
            }

            for (const draft of expandedDrafts) {
                const waitingId = draftTemplateIdToLiveId.get((draft.template_step_id || '').trim());
                if (!waitingId) continue;

                const deps = Array.isArray(draft.depends_on) ? draft.depends_on.filter(Boolean) : [];
                for (const depTemplateId of deps) {
                    const requiredId = draftTemplateIdToLiveId.get(depTemplateId.trim());
                    if (!requiredId || requiredId === waitingId) continue;
                    try {
                        await clinicalService.createStepDependency(
                            { waiting_step_id: waitingId, required_step_id: requiredId },
                            accessToken
                        );
                    } catch (depErr) {
                        console.warn('Failed to create step dependency', waitingId, requiredId, depErr);
                    }
                }
            }

            setSelectedTemplateId('');
            setDraftSteps([]);
            setIsConfiguringDraft(false);

            await reloadFlow();
        } catch (err) {
            console.error('Failed to commit flow steps:', err);
            setError(
                err instanceof Error
                    ? err.message
                    : 'Không thể lưu quy trình vào cơ sở dữ liệu.'
            );
        } finally {
            setIsAssigning(false);
        }
    };

    // Determine active template and current steps to render
    const activeTemplateId =
        selectedTemplateId ||
        (flowData?.template_id as string) ||
        (patient?.templateId as string) ||
        '';

    const dynamicSteps: FlowNode[] = [];
    const isPatientDone = patient?.status === 'Đã khám';

    const appendLiveSteps = () => {
        const seenIds = new Set<string>();

        orderedFlowSteps.forEach((stepItem, index) => {
            const step = stepItem as Record<string, unknown>;
            const stepStatus = ((step.step_status as string) || '').toUpperCase();
            if (shouldHideLiveFlowStep(step)) return;

            // Drop cancelled / exact step_id duplicates only (same name can be service + payment)
            const stepId = (step.step_id as string) || `api-step-${index}`;
            if (seenIds.has(stepId)) return;
            seenIds.add(stepId);

            const specialtyInfo = step.specialty_info as Record<string, unknown> | undefined;
            const roomInfo = step.room_info as Record<string, unknown> | undefined;

            const specialtyName = (specialtyInfo?.specialty_name as string) || '';
            const roomName = (roomInfo?.room_name as string) || '';
            const rawLabel =
                (step.step_name as string) || roomName || specialtyName || `Bước ${index + 1}`;
            const stepType = String(step.step_type || '').toUpperCase();
            const roomType = String(step.room_type || '').toUpperCase();
            const forcePayment =
                unlabeledPaymentStepIds.has(stepId) ||
                stepType === 'PAYMENT' ||
                roomType === 'CASHIER' ||
                roomType === 'PAYMENT' ||
                isExamPaymentStepName(rawLabel);
            // CLS payment companions → "Thanh toán: {tên dịch vụ}"
            let label = formatFlowStepLabel(rawLabel, { forcePayment });

            // Disambiguate multiple "Khám bệnh" from different active flows
            if (isDefaultExamStepName(rawLabel)) {
                const bits = [roomName, specialtyName].filter(Boolean);
                if (bits.length > 0) label = `${rawLabel} · ${bits.join(' · ')}`;
            }

            const paymentStatus = String(step.payment_status || '');
            const status = mapStepStatusToNodeStatus(
                stepStatus,
                isPatientDone,
                paymentStatus,
                rawLabel
            );

            const { staffName, staffId: resolvedStaffId } = resolveLiveStepStaff(step);

            dynamicSteps.push({
                id: stepId,
                Icon: getIconForStep(specialtyName, roomName, label),
                status,
                label,
                roomName,
                staffName,
                detail: {
                    source: 'live',
                    stepStatus,
                    roomId: (step.room_id as string) || (roomInfo?.room_id as string) || '',
                    specialtyName,
                    specialtyId: (specialtyInfo?.specialty_id as string) || '',
                    staffId: resolvedStaffId,
                    paymentStatus: (step.payment_status as string) || '',
                    docNo: String(step.docNo || ''),
                },
            });
        });
    };

    if (selectedTemplateId && draftSteps.length > 0) {
        // Append mode: keep live base (Đặt khám / Khám bệnh / …) then preview draft steps
        if (hasLiveSteps) {
            appendLiveSteps();
        }
        draftSteps.forEach((dStep: DraftStep, index: number) => {
            const roomObj = rooms.find(r => r.room_id === dStep.room_id);
            const label = dStep.step_name || `Bước ${index + 1}`;
            dynamicSteps.push({
                id: dStep.tempId,
                Icon: getIconForStep(dStep.room_type, roomObj?.room_name || dStep.room_type, label),
                status: 'current',
                label,
                roomName: roomObj?.room_name || 'Chưa phân phòng',
                staffName: getStaffOnDutyForRoom(dStep.room_id) || 'Chưa phân công',
                detail: {
                    source: 'draft',
                    stepStatus: 'NOT_STARTED',
                    roomId: dStep.room_id,
                    specialtyId: dStep.specialty_id,
                    staffId: dStep.staff_id,
                    paymentStatus: 'N/A',
                    docNo: 'N/A',
                },
            });
        });
    } else if (hasLiveSteps) {
        appendLiveSteps();
    } else {
        // Waiting for BE-seeded defaults after booking
        dynamicSteps.push(...DEFAULT_FULL_WORKFLOW);
    }

    if (isLoading) {
        return (
            <div className="bg-white rounded-[24px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center justify-center min-h-[350px]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                <p className="text-xs font-semibold text-neutral-500 mt-3">Đang tải quy trình...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50/50 border border-red-100 rounded-[24px] p-5 flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-red-700">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="bg-white rounded-[24px] border border-neutral-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 flex flex-col items-center w-full max-w-[280px] mx-auto select-none transition-all group/workflow"
        >
            <div className="w-full mb-4">
                <button
                    onClick={() => setIsSelectingTemplate(true)}
                    className="w-full bg-[#F5F2FF] hover:bg-[#EDE8FF] text-[#6D5DE5] border border-[#DED7FF] font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
                >
                    Thêm template vào quy trình
                </button>
            </div>

            <div className="flex flex-col items-center w-full space-y-1">
                {dynamicSteps.map((node, idx) => (
                    <div key={node.id} className="flex flex-col items-center w-full">
                        <FlowIcon node={node} isFirst={idx === 0} onClick={() => setSelectedStepNode(node)} />
                        {idx < dynamicSteps.length - 1 && (
                            <Connector status={node.status} />
                        )}
                    </div>
                ))}
            </div>

            {/* Template Selector Footer */}
            {selectedTemplateId && draftSteps.length > 0 ? (
                <div className="w-full mt-6 pt-5 border-t border-neutral-100 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#8B7CF6] uppercase tracking-wider">
                            {hasLiveSteps ? 'Thêm sau bước mặc định:' : 'Xem trước template:'}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setIsConfiguringDraft(true);
                                setSelectedSpecialtyId('');
                                setSelectedRoomId('');
                                setSelectedStaffId('');
                            }}
                            className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                            Cấu hình & Thêm
                        </button>
                        <button
                            onClick={() => {
                                setSelectedTemplateId('');
                                setDraftSteps([]);
                            }}
                            className="px-3.5 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            ) : (
                <div className="w-full mt-6 pt-5 border-t border-neutral-100 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                            Quy trình:
                        </span>
                        {hasLiveSteps ? (
                            <button
                                onClick={() => {
                                    setIsCustomizing(true);
                                    setEditingStepId(null);
                                    setEditingRequiredStepId('');
                                    setEditingOldRequiredStepId('');
                                    setEditingSpecialtyId('');
                                    setSelectedSpecialtyId('');
                                    setSelectedRoomId('');
                                    setSelectedStaffId('');
                                }}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB] hover:bg-[#8B7CF6] hover:text-white transition-colors cursor-pointer"
                            >
                                Tùy chỉnh ({dynamicSteps.length} bước)
                            </button>
                        ) : (
                            <span className="text-[10px] font-medium text-neutral-400">
                                Chờ 2 bước mặc định từ đặt lịch
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Customizer Modal */}
            <Dialog open={isCustomizing} onOpenChange={setIsCustomizing}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Tùy chỉnh Quy trình của Bệnh nhân</DialogTitle>
                        <DialogDescription>
                            Chỉnh sửa phòng, nhân viên phụ trách hoặc thêm/hủy các bước của quy trình hiện tại.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-6 space-y-4">
                        {/* List of current steps */}
                        <div className="border border-neutral-100 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-neutral-50/50">
                            {orderedFlowSteps.map((stepItem, idx) => {
                                const step = stepItem as Record<string, unknown>;
                                const stepId = (step.step_id as string) || `step-${idx}`;
                                const stepStatus = ((step.step_status as string) || '').toUpperCase();
                                if (shouldHideLiveFlowStep(step)) return null;

                                const canEditStatus = canCurrentDoctorEditStepStatus(step);

                                const isStepEditing = editingStepId === stepId;
                                const roomInfo = step.room_info as Record<string, unknown> | undefined;
                                const specialtyInfo = step.specialty_info as Record<string, unknown> | undefined;
                                const roomName = (roomInfo?.room_name as string) || '';
                                const specialtyName = (specialtyInfo?.specialty_name as string) || '';
                                const rawStepName = (step.step_name as string) || roomName || `Bước ${idx + 1}`;
                                const stepName =
                                    dynamicSteps.find((n) => n.id === stepId)?.label ||
                                    formatFlowStepLabel(rawStepName, {
                                        forcePayment:
                                            unlabeledPaymentStepIds.has(stepId) ||
                                            String(step.step_type || '').toUpperCase() === 'PAYMENT',
                                    });

                                return (
                                    <div key={stepId} className="p-4 flex items-center justify-between gap-4 bg-white">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-neutral-800 text-sm">{stepName}</p>

                                            {!isStepEditing && (
                                                <div className="flex gap-4 text-xs text-neutral-400 mt-1 font-medium flex-wrap">
                                                    <span>Phòng: <strong className="text-neutral-600 font-semibold">{roomName || 'Chưa phân công'}</strong></span>
                                                    <span>Chuyên khoa: <strong className="text-neutral-600 font-semibold">{specialtyName || 'Chưa phân khoa'}</strong></span>
                                                    <span>Bác sĩ trực: <strong className="text-[#5B4ED6] font-semibold">{dynamicSteps.find((n) => n.id === stepId)?.staffName || 'Chưa có bác sĩ'}</strong></span>
                                                    <span className="flex items-center gap-1">
                                                        Trạng thái:
                                                        <select
                                                            value={stepStatus}
                                                            onChange={async (e) => {
                                                                if (!accessToken) return;
                                                                if (!canEditStatus) {
                                                                    setError('Bác sĩ chỉ có thể sửa trạng thái ở bước mình phụ trách.');
                                                                    return;
                                                                }

                                                                const newStatus = e.target.value;
                                                                try {
                                                                    setIsActionLoading(true);
                                                                    await clinicalService.updateStepStatus(stepId, newStatus, accessToken);
                                                                    await reloadFlow();
                                                                } catch (err) {
                                                                    console.error('Failed to update step status:', err);
                                                                    setError('Không thể cập nhật trạng thái.');
                                                                } finally {
                                                                    setIsActionLoading(false);
                                                                }
                                                            }}
                                                            disabled={isActionLoading || !canEditStatus}
                                                            className="bg-neutral-50 hover:bg-neutral-100 text-brand-600 border border-neutral-200 rounded-md px-1.5 py-0.5 text-[11px] font-bold cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-500/20"
                                                        >
                                                            <option value="PENDING">PENDING</option>
                                                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                            <option value="COMPLETED">COMPLETED</option>
                                                            <option value="DECLINED">DECLINED</option>
                                                            <option value="CANCELLED">CANCELLED</option>
                                                        </select>
                                                    </span>
                                                </div>
                                            )}

                                            {isStepEditing && (
                                                <div className="grid grid-cols-2 gap-3 mt-3">
                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Chuyên khoa</label>
                                                        <select
                                                            value={editingSpecialtyId}
                                                            onChange={(e) => handleEditingSpecialtyChange(e.target.value)}
                                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200"
                                                        >
                                                            <option value="">Chọn chuyên khoa</option>
                                                            {specialties.map((specialty) => (
                                                                <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Phòng khám</label>
                                                        <select
                                                            value={editingRoomId}
                                                            onChange={(e) => handleEditingRoomChange(e.target.value)}
                                                            disabled={!editingSpecialtyId}
                                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 disabled:bg-neutral-50 disabled:text-neutral-400"
                                                        >
                                                            <option value="">Chọn phòng</option>
                                                            {getRoomsBySpecialty(editingSpecialtyId).map((r) => (
                                                                <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Trạng thái</label>
                                                        <select
                                                            value={editingStepStatus}
                                                            onChange={(e) => setEditingStepStatus(e.target.value)}
                                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white"
                                                        >
                                                            <option value="PENDING">PENDING</option>
                                                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                                                            <option value="COMPLETED">COMPLETED</option>
                                                            <option value="DECLINED">DECLINED</option>
                                                            <option value="CANCELLED">CANCELLED</option>
                                                        </select>
                                                    </div>

                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                            Phụ thuộc vào
                                                        </label>
                                                        <select
                                                            value={editingRequiredStepId}
                                                            onChange={(e) => setEditingRequiredStepId(e.target.value)}
                                                            className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white"
                                                        >
                                                            <option value="">
                                                                {editingOldRequiredStepId
                                                                    ? 'Giữ nguyên (không hỗ trợ xóa)'
                                                                    : 'Không phụ thuộc'}
                                                            </option>
                                                            {orderedFlowSteps.map((depItem, depIdx) => {
                                                                const dep = asRecord(depItem);
                                                                const depId =
                                                                    typeof dep?.step_id === 'string' ? dep.step_id : '';
                                                                const depStatus = String(dep?.step_status || '').toUpperCase();
                                                                if (!depId || depId === stepId || depStatus === 'CANCELLED') {
                                                                    return null;
                                                                }
                                                                const depRoom = dep?.room_info as
                                                                    | Record<string, unknown>
                                                                    | undefined;
                                                                const depName =
                                                                    (typeof dep?.step_name === 'string' && dep.step_name) ||
                                                                    (typeof depRoom?.room_name === 'string' &&
                                                                        depRoom.room_name) ||
                                                                    `Bước ${depIdx + 1}`;
                                                                return (
                                                                    <option key={depId} value={depId}>
                                                                        {depName}
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isStepEditing ? (
                                                <>
                                                    <button
                                                        onClick={() => handleUpdateStep(stepId)}
                                                        disabled={isActionLoading}
                                                        className="px-3 py-1.5 bg-brand-500 text-white rounded-xl text-xs font-bold hover:bg-brand-600 transition-colors disabled:opacity-50"
                                                    >
                                                        Lưu
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingStepId(null);
                                                            setEditingRequiredStepId('');
                                                            setEditingOldRequiredStepId('');
                                                        }}
                                                        className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-xl text-xs font-bold hover:bg-neutral-200 transition-colors"
                                                    >
                                                        Hủy
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            const currentRoomId = (roomInfo?.room_id as string) || '';
                                                            const currentRoom = rooms.find((r) => r.room_id === currentRoomId);
                                                            const currentSpecialtyId =
                                                                currentRoom?.specialty_id ||
                                                                (roomInfo?.specialty_id as string) ||
                                                                (specialtyInfo?.specialty_id as string) ||
                                                                '';
                                                            const currentRequired = pickLiveRequiredStepId(step);

                                                            setEditingStepId(stepId);
                                                            setEditingSpecialtyId(currentSpecialtyId);
                                                            setEditingRoomId(currentRoomId);
                                                            setEditingStaffId(pickDoctorOnDutyForRoom(currentRoomId));
                                                            setEditingStepStatus(normalizeStepStatusForApi(stepStatus));
                                                            setEditingRequiredStepId(currentRequired);
                                                            setEditingOldRequiredStepId(currentRequired);
                                                        }}
                                                        className="p-2 text-neutral-400 hover:text-brand-500 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer"
                                                        title="Sửa bước"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>

                                                    {stepStatus !== 'COMPLETED' && !isProtectedBaseStep(step) && (
                                                        <button
                                                            onClick={() => handleCancelStep(stepId)}
                                                            disabled={isActionLoading}
                                                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                                                            title="Hủy bước"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Add Step Section */}
                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <Plus className="w-4 h-4 text-brand-500" />
                                Thêm bước khám mới
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Chuyên khoa</label>
                                    <select
                                        value={selectedSpecialtyId}
                                        onChange={(e) => handleSelectedSpecialtyChange(e.target.value)}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white"
                                    >
                                        <option value="">Chọn chuyên khoa</option>
                                        {specialties.map((specialty) => (
                                            <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Phòng khám</label>
                                    <select
                                        value={selectedRoomId}
                                        onChange={(e) => handleSelectedRoomChange(e.target.value)}
                                        disabled={!selectedSpecialtyId}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                    >
                                        <option value="">Chọn phòng</option>
                                        {getRoomsBySpecialty(selectedSpecialtyId).map((r) => (
                                            <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Dịch vụ</label>
                                    <select
                                        value={selectedServiceCode}
                                        onChange={(e) => setSelectedServiceCode(e.target.value)}
                                        disabled={isLoadingServices || serviceOptions.length === 0}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                    >
                                        {serviceOptions.map((service) => (
                                            <option key={service.service_id || service.service_code} value={service.service_code}>
                                                {service.service_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                            </div>
                            <button
                                onClick={handleAddStep}
                                disabled={!selectedRoomId || !selectedServiceCode}
                                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isActionLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Thêm bước vào Quy trình
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Draft Configuration & Commit Modal */}
            <Dialog open={isConfiguringDraft} onOpenChange={setIsConfiguringDraft}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Cấu hình & Thêm template</DialogTitle>
                        <DialogDescription>
                            Gán phòng/nhân viên cho các bước template. Khi lưu, hệ thống gọi assign theo template_id và thêm sau Đặt khám / Khám bệnh.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-6 space-y-4">
                        {/* List of draft steps */}
                        <div className="border border-neutral-100 rounded-2xl overflow-hidden divide-y divide-neutral-100 bg-neutral-50/50">
                            {draftSteps.map((step, idx) => {
                                return (
                                    <div key={step.tempId} className="p-4 flex items-start justify-between gap-4 bg-white">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] font-bold text-[10px] flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <p className="font-bold text-neutral-800 text-sm">{step.step_name}</p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mt-3">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                        Chuyên khoa
                                                    </label>
                                                    <select
                                                        value={step.specialty_id}
                                                        onChange={(e) => {
                                                            handleUpdateDraftStep(step.tempId, {
                                                                specialty_id: e.target.value,
                                                                room_id: '',
                                                                staff_id: '',
                                                            });
                                                        }}
                                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white focus:border-[#8B7CF6] focus:outline-none"
                                                    >
                                                        <option value="">Chọn chuyên khoa</option>
                                                        {specialties.map((specialty) => (
                                                            <option key={specialty.id} value={specialty.id}>
                                                                {specialty.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                        Phòng khám
                                                    </label>
                                                    <select
                                                        value={step.room_id}
                                                        onChange={(e) => {
                                                            const roomId = e.target.value;
                                                            handleUpdateDraftStep(step.tempId, {
                                                                room_id: roomId,
                                                                staff_id: pickDoctorOnDutyForRoom(roomId),
                                                            });
                                                        }}
                                                        disabled={!step.specialty_id}
                                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white focus:border-[#8B7CF6] focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
                                                    >
                                                        <option value="">Chọn phòng</option>
                                                        {getRoomsBySpecialty(step.specialty_id).map((r) => (
                                                            <option key={r.room_id} value={r.room_id}>
                                                                {r.room_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                        Dịch vụ
                                                    </label>
                                                    <select
                                                        value={step.service_code}
                                                        onChange={(e) => {
                                                            handleUpdateDraftStep(step.tempId, {
                                                                service_code: e.target.value,
                                                            });
                                                        }}
                                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white focus:border-[#8B7CF6] focus:outline-none"
                                                    >
                                                        {serviceOptions.map((service) => (
                                                            <option key={service.service_id || service.service_code} value={service.service_code}>
                                                                {service.service_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {step.room_id && (
                                                    <div className="col-span-2">
                                                        <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">
                                                            Bác sĩ đang trực của phòng
                                                        </label>
                                                        <div className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-[#F5F2FF] text-[#5B4ED6] flex items-center gap-2">
                                                            <UserCheck className="w-4 h-4 text-[#8B7CF6] shrink-0" />
                                                            <span>{step.doctor_name || getStaffOnDutyForRoom(step.room_id) || 'Chưa có bác sĩ'}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleRemoveDraftStep(step.tempId)}
                                            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer mt-1"
                                            title="Xóa bước nháp"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}

                            {draftSteps.length === 0 && (
                                <div className="p-8 text-center text-xs text-neutral-400 font-semibold">
                                    Không có bước khám nào. Hãy thêm bước mới ở dưới.
                                </div>
                            )}
                        </div>

                        {/* Add Step Section */}
                        <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4">
                            <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                                <Plus className="w-4 h-4 text-brand-500" />
                                Bổ sung bước khám nháp
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Chuyên khoa</label>
                                    <select
                                        value={selectedSpecialtyId}
                                        onChange={(e) => handleSelectedSpecialtyChange(e.target.value)}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white"
                                    >
                                        <option value="">Chọn chuyên khoa</option>
                                        {specialties.map((specialty) => (
                                            <option key={specialty.id} value={specialty.id}>{specialty.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Phòng khám</label>
                                    <select
                                        value={selectedRoomId}
                                        onChange={(e) => handleSelectedRoomChange(e.target.value)}
                                        disabled={!selectedSpecialtyId}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                    >
                                        <option value="">Chọn phòng</option>
                                        {getRoomsBySpecialty(selectedSpecialtyId).map((r) => (
                                            <option key={r.room_id} value={r.room_id}>{r.room_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wide text-neutral-400 block mb-1">Dịch vụ</label>
                                    <select
                                        value={selectedDraftServiceCode}
                                        onChange={(e) => setSelectedDraftServiceCode(e.target.value)}
                                        disabled={isLoadingServices || serviceOptions.length === 0}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-neutral-200 bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                                    >
                                        {serviceOptions.map((service) => (
                                            <option key={service.service_id || service.service_code} value={service.service_code}>
                                                {service.service_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                            </div>
                            <button
                                onClick={() => {
                                    handleAddDraftStep(selectedSpecialtyId, selectedRoomId, selectedStaffId, selectedDraftServiceCode);
                                    setSelectedSpecialtyId('');
                                    setSelectedRoomId('');
                                    setSelectedStaffId('');
                                    setSelectedDraftServiceCode('');
                                }}
                                disabled={!selectedRoomId || !selectedDraftServiceCode}
                                className="w-full bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 text-neutral-700 font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer border border-neutral-200"
                            >
                                <Plus className="w-4 h-4" />
                                Thêm vào danh sách nháp
                            </button>
                        </div>

                        {/* Commit controls */}
                        <div className="pt-4 border-t border-neutral-100 flex gap-3">
                            <button
                                onClick={handleCommitDraft}
                                disabled={isAssigning || draftSteps.length === 0 || draftSteps.some(s => !s.room_id)}
                                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-neutral-200 disabled:text-neutral-400 text-white font-bold py-3 px-4 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isAssigning ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang thêm template...
                                    </>
                                ) : (
                                    <>
                                        Thêm template vào quy trình
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setIsConfiguringDraft(false)}
                                className="px-5 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Template Selection Modal */}
            <Dialog open={isSelectingTemplate} onOpenChange={setIsSelectingTemplate}>
                <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Chọn template để thêm vào quy trình</DialogTitle>
                        <DialogDescription>
                            Template sẽ được thêm sau 2 bước mặc định (Đặt khám, Khám bệnh). Không thay thế các bước đã có.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="my-6 grid grid-cols-1 gap-3">
                        {templates.map((tpl) => {
                            const tplId = tpl.template_id || tpl.id || '';
                            const name = getTemplateName(tpl) || `Mẫu quy trình (${tpl.steps?.length || 0} bước)`;
                            const isActive = tplId === activeTemplateId;

                            return (
                                <button
                                    key={tplId || name}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsSelectingTemplate(false);
                                        handleSelectTemplateDraft(tplId);
                                    }}
                                    className={cn(
                                        "w-full text-left p-4 rounded-2xl border text-sm transition-all duration-200 cursor-pointer flex flex-col justify-between hover:bg-neutral-50/50",
                                        isActive
                                            ? "border-[#8B7CF6] bg-[#F5F2FF]/40 shadow-sm"
                                            : "border-neutral-200 bg-white"
                                    )}
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span className="font-bold text-neutral-800 text-sm">
                                            {name}
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F2FF] text-[#8B7CF6] border border-[#E0DCFB]">
                                            {tpl.steps?.length || 0} bước
                                        </span>
                                    </div>
                                    {tpl.steps && tpl.steps.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1.5 items-center text-[10px] text-neutral-400 font-medium">
                                            {tpl.steps.map((s, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5">
                                                    <span>{s.step_name || s.room_type}</span>
                                                    {idx < tpl.steps.length - 1 && <span className="text-neutral-300">→</span>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedStepNode} onOpenChange={(open) => !open && setSelectedStepNode(null)}>
                <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
                    <DialogHeader>
                        <DialogTitle>Chi tiết bước quy trình</DialogTitle>
                        <DialogDescription>
                            Thông tin chi tiết của bước bạn vừa chọn.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedStepNode && (
                        <div className="space-y-3 text-sm">
                            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
                                <p className="text-xs text-neutral-500 font-semibold">Tên bước</p>
                                <p className="font-bold text-neutral-800 mt-0.5">{selectedStepNode.label}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Trạng thái</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.detail?.stepStatus || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Phòng</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.roomName || selectedStepNode.detail?.roomId || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Bác sĩ / Nhân viên</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.staffName || selectedStepNode.detail?.staffId || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Payment status</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.detail?.paymentStatus || 'N/A'}</p>
                                </div>
                                <div className="rounded-lg border border-neutral-200 p-2.5">
                                    <p className="text-[11px] text-neutral-500 font-semibold">Specialty</p>
                                    <p className="font-semibold text-neutral-800">{selectedStepNode.detail?.specialtyName || selectedStepNode.detail?.specialtyId || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
