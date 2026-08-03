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
import { getServiceOrderId } from '@/modules/clinical/types/serviceOrder.types';
import {
    extractServiceOrderList,
    serviceOrderService,
} from '@/modules/clinical/services/serviceOrderService';
import {
    clinicalService,
    extractFlowSteps,
    resolvePatientFlow,
} from '@/modules/clinical/services/clinicalService';
import {
    isExamPaymentStepName,
    orderFlowStepsForTimeline,
} from '@/modules/clinical/components/WorkflowDiagram';
import { mapRoomTypeToStepType, normalizeRoomType } from '@/modules/admin/types/process.types';
import { useAuthStore } from '@/store/authStore';
import { useRoomStore } from '@/modules/admin/store/roomStore';

interface ParaclinicalOrdersTabProps {
    patient: Patient;
    onFlowChanged?: () => void;
}

interface ServiceStepCard {
    step_id: string;
    step_name: string;
    step_status: string;
    service_code?: string;
    room_id?: string;
    room_name?: string;
    step_type?: string;
    service_order_id?: string;
    is_payment?: boolean;
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

function isBaseClinicalStep(name: string, stepType?: string): boolean {
    const n = name.trim().toLowerCase();
    if (!n) return true;
    if (n === 'đặt khám' || n === 'dat kham' || n === 'đặt lịch' || n === 'dat lich') return true;
    if (n === 'khám bệnh' || n === 'kham benh') return true;
    if ((stepType || '').toUpperCase() === 'REGISTRATION') return true;
    return false;
}

function isPaymentStep(step: Record<string, unknown>): boolean {
    const name = String(step.step_name || '').trim().toLowerCase();
    if (name.startsWith('thanh toán') || name.startsWith('thanh toan')) return true;

    const stepType = String(step.step_type || '').toUpperCase();
    if (stepType === 'PAYMENT') return true;

    const roomType = String(step.room_type || '').toUpperCase();
    if (roomType === 'CASHIER' || roomType === 'PAYMENT') return true;

    const roomInfo = asRecord(step.room_info);
    const roomName = String(roomInfo?.room_name || '').toLowerCase();
    if (roomName.includes('thu ngân') || roomName.includes('thanh toán')) return true;

    if (step.is_payment === true) return true;
    return false;
}

/** CLS list: service indications + payment companions (exclude only base visit steps). */
function isClsIndicationStep(step: Record<string, unknown>): boolean {
    const status = String(step.step_status || '').toUpperCase();
    if (status === 'CANCELLED' || status === 'CANCELED') return false;
    const name = String(step.step_name || '');
    const stepType = String(step.step_type || '');
    return !isBaseClinicalStep(name, stepType);
}

function normalizeServiceKey(name: string, serviceCode?: string): string {
    const code = (serviceCode || '').trim().toLowerCase();
    if (code) return `code:${code}`;
    return `name:${stripClsPaymentPrefix(name).toLowerCase()}`;
}

/** If BE creates a payment sibling with the same bare name, mark the later one as payment. */
function annotateUnlabeledPaymentCompanions(cards: ServiceStepCard[]): ServiceStepCard[] {
    const groups = new Map<string, ServiceStepCard[]>();
    for (const card of cards) {
        const key = normalizeServiceKey(card.step_name, card.service_code);
        const list = groups.get(key) || [];
        list.push(card);
        groups.set(key, list);
    }

    const paymentIds = new Set<string>();
    for (const list of groups.values()) {
        if (list.length < 2) continue;
        const alreadyPayment = list.filter((c) => c.is_payment);
        if (alreadyPayment.length > 0) continue;
        const sorted = [...list].sort(
            (a, b) => (a.created_at || 0) - (b.created_at || 0) || a.step_id.localeCompare(b.step_id)
        );
        // Keep earliest as service; mark the rest as payment companions
        for (let i = 1; i < sorted.length; i++) {
            paymentIds.add(sorted[i].step_id);
        }
    }

    return cards.map((card) =>
        paymentIds.has(card.step_id) ? { ...card, is_payment: true } : card
    );
}

/**
 * createOrder(is_payment) + createStepParent often both spawn a payment step on the flow.
 * Keep one payment per service: prefer the one with room, then newest.
 */
function dedupePaymentCompanions(cards: ServiceStepCard[]): ServiceStepCard[] {
    const groups = new Map<string, ServiceStepCard[]>();
    for (const card of cards) {
        if (!card.is_payment) continue;
        const key = normalizeServiceKey(card.step_name, card.service_code);
        const list = groups.get(key) || [];
        list.push(card);
        groups.set(key, list);
    }

    const dropIds = new Set<string>();
    for (const list of groups.values()) {
        if (list.length < 2) continue;
        const ranked = [...list].sort((a, b) => {
            const roomScore = Number(Boolean(b.room_id || b.room_name)) - Number(Boolean(a.room_id || a.room_name));
            if (roomScore !== 0) return roomScore;
            return (b.created_at || 0) - (a.created_at || 0) || b.step_id.localeCompare(a.step_id);
        });
        for (let i = 1; i < ranked.length; i++) {
            dropIds.add(ranked[i].step_id);
        }
    }

    if (dropIds.size === 0) return cards;
    return cards.filter((card) => !dropIds.has(card.step_id));
}

function displayClsStepName(step: ServiceStepCard): string {
    const name = (step.step_name || '').trim() || 'Dịch vụ';
    if (!step.is_payment) return name;
    const lower = name.toLowerCase();
    if (lower.startsWith('thanh toán:') || lower.startsWith('thanh toan:')) return name;
    if (lower.startsWith('thanh toán ') || lower.startsWith('thanh toan ')) {
        // e.g. "Thanh toán XYZ" → normalize to "Thanh toán: XYZ"
        const rest = name.replace(/^thanh toán\s*:?\s*/i, '').replace(/^thanh toan\s*:?\s*/i, '').trim();
        return rest ? `Thanh toán: ${rest}` : 'Thanh toán';
    }
    return `Thanh toán: ${name}`;
}

function stepStatusMeta(status?: string): { label: string; className: string } {
    const s = (status || 'PENDING').toUpperCase();
    if (['COMPLETED', 'DONE', 'FINISHED', 'SUCCESSED'].includes(s)) {
        return {
            label: 'Hoàn tất',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        };
    }
    if (['IN_PROGRESS', 'PROCESSING', 'ONGOING', 'CURRENT', 'ACTIVE'].includes(s)) {
        return {
            label: 'Đang thực hiện',
            // IN_PROGRESS → blue (match flow timeline)
            className: 'bg-blue-50 text-blue-700 border-blue-100',
        };
    }
    return {
        label: 'Chờ thực hiện',
        // PENDING → gray default (match flow timeline)
        className: 'bg-slate-50 text-slate-600 border-slate-200',
    };
}

function findExamStepId(steps: unknown[]): string {
    for (const item of steps) {
        const live = asRecord(item);
        if (!live) continue;
        if (String(live.step_status || '').toUpperCase() === 'CANCELLED') continue;
        const name = String(live.step_name || '').trim().toLowerCase();
        if ((name === 'khám bệnh' || name === 'kham benh') && typeof live.step_id === 'string') {
            return live.step_id;
        }
    }
    for (let i = steps.length - 1; i >= 0; i--) {
        const live = asRecord(steps[i]);
        if (!live) continue;
        if (String(live.step_status || '').toUpperCase() === 'CANCELLED') continue;
        const name = String(live.step_name || '').toLowerCase();
        if (name.startsWith('thanh toán')) continue;
        if (typeof live.step_id === 'string') return live.step_id;
    }
    return '';
}

function pickServiceCode(step: Record<string, unknown>): string | undefined {
    if (typeof step.service_code === 'string' && step.service_code.trim()) {
        return step.service_code.trim();
    }
    const nested = asRecord(step.service);
    if (nested && typeof nested.service_code === 'string' && nested.service_code.trim()) {
        return nested.service_code.trim();
    }
    return undefined;
}

function isActiveOrder(order: ServiceOrder): boolean {
    const status = String(order.status || '').toUpperCase();
    return status !== 'CANCELLED' && status !== 'CANCELED';
}

function stripClsPaymentPrefix(name: string): string {
    return name
        .trim()
        .replace(/^thanh toán:\s*/i, '')
        .replace(/^thanh toan:\s*/i, '')
        .replace(/^thanh toán\s+/i, '')
        .replace(/^thanh toan\s+/i, '')
        .trim();
}

function findPaymentCompanionCards(
    serviceStep: ServiceStepCard,
    cards: ServiceStepCard[]
): ServiceStepCard[] {
    const key = normalizeServiceKey(serviceStep.step_name, serviceStep.service_code);
    return cards.filter(
        (c) =>
            c.is_payment &&
            !isExamPaymentStepName(c.step_name || '') &&
            c.step_id !== serviceStep.step_id &&
            normalizeServiceKey(c.step_name, c.service_code) === key
    );
}

/**
 * Stable CLS list order: keep flow sequence, always place service before its payment.
 * Exam/lấy-số payment stays in timeline spine position (not pulled after "Khám chuyên khoa").
 */
function orderClsCardsServiceThenPayment(cards: ServiceStepCard[]): ServiceStepCard[] {
    if (cards.length <= 1) return cards;

    const used = new Set<string>();
    const result: ServiceStepCard[] = [];
    const clsPayments = cards.filter(
        (c) => c.is_payment && !isExamPaymentStepName(c.step_name || '')
    );

    const findPaymentFor = (svc: ServiceStepCard): ServiceStepCard | undefined => {
        const key = normalizeServiceKey(svc.step_name, svc.service_code);
        return clsPayments.find(
            (p) =>
                !used.has(p.step_id) &&
                normalizeServiceKey(p.step_name, p.service_code) === key
        );
    };

    for (const card of cards) {
        if (used.has(card.step_id)) continue;

        // Preserve exam-queue payment where timeline placed it
        if (isExamPaymentStepName(card.step_name || '')) {
            result.push(card);
            used.add(card.step_id);
            continue;
        }

        if (card.is_payment) continue;

        result.push(card);
        used.add(card.step_id);

        const pay = findPaymentFor(card);
        if (pay) {
            result.push(pay);
            used.add(pay.step_id);
        }
    }

    for (const card of cards) {
        if (used.has(card.step_id)) continue;
        result.push(card);
        used.add(card.step_id);
    }

    return result;
}

function matchServiceOrderId(
    step: { step_name: string; service_code?: string; is_payment?: boolean },
    orders: ServiceOrder[]
): string | undefined {
    const code = (step.service_code || '').trim().toLowerCase();
    const name = stripClsPaymentPrefix(step.step_name).toLowerCase();
    const active = orders.filter(isActiveOrder);

    const preferPayment = Boolean(step.is_payment);
    const ranked = [...active].sort((a, b) => {
        const aPay = Number(Boolean(a.is_payment));
        const bPay = Number(Boolean(b.is_payment));
        return preferPayment ? bPay - aPay : aPay - bPay;
    });

    const byCode = code
        ? ranked.find((o) => (o.service_code || '').trim().toLowerCase() === code)
        : undefined;
    if (byCode) {
        const id = getServiceOrderId(byCode);
        if (id) return id;
    }
    const byName = ranked.find(
        (o) => stripClsPaymentPrefix(o.name || '').toLowerCase() === name
    );
    if (byName) {
        const id = getServiceOrderId(byName);
        if (id) return id;
    }
    return undefined;
}

const EDITABLE_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED'] as const;

export function ParaclinicalOrdersTab({ patient, onFlowChanged }: ParaclinicalOrdersTabProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const authUser = useAuthStore((s) => s.user);
    const authProfile = useAuthStore((s) => s.profile);
    const rooms = useRoomStore((s) => s.rooms);
    const fetchRooms = useRoomStore((s) => s.fetchRooms);

    const [serviceSteps, setServiceSteps] = useState<ServiceStepCard[]>([]);
    const [resolvedFlowId, setResolvedFlowId] = useState(patient.flowId || '');
    const [resolvedBookingId, setResolvedBookingId] = useState(patient.bookingId || '');
    const [catalog, setCatalog] = useState<CatalogService[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const [editingStep, setEditingStep] = useState<ServiceStepCard | null>(null);
    const [editRoomId, setEditRoomId] = useState('');
    const [editStatus, setEditStatus] = useState('PENDING');
    const [deletingStepId, setDeletingStepId] = useState<string | null>(null);

    const patientId = (patient.patientId || '').trim();
    const staffId = authProfile?.account_id || authUser?.id || '';

    const applyFlowToCards = useCallback(
        (flowObj: Record<string, unknown> | null, orders: ServiceOrder[] = []) => {
            const flowId =
                (typeof flowObj?.flow_id === 'string' && flowObj.flow_id) ||
                patient.flowId ||
                '';
            const bookingId = pickBookingIdFromFlow(flowObj) || patient.bookingId || '';
            setResolvedFlowId(flowId);
            setResolvedBookingId(bookingId);

            // Same timeline orderer as left "Quy trình" — stable across reloads
            const steps = orderFlowStepsForTimeline(extractFlowSteps(flowObj));
            const cards: ServiceStepCard[] = [];
            for (const item of steps) {
                const live = asRecord(item);
                if (!live || !isClsIndicationStep(live)) continue;
                const stepId = typeof live.step_id === 'string' ? live.step_id : '';
                if (!stepId) continue;
                const roomInfo = asRecord(live.room_info);
                const roomId =
                    (typeof live.room_id === 'string' && live.room_id) ||
                    (typeof roomInfo?.room_id === 'string' && roomInfo.room_id) ||
                    undefined;
                const createdRaw = live.create_at ?? live.created_at ?? live.updated_at;
                const createdAt = createdRaw
                    ? new Date(createdRaw as string | number).getTime()
                    : NaN;
                const card: ServiceStepCard = {
                    step_id: stepId,
                    step_name: String(live.step_name || 'Dịch vụ'),
                    step_status: String(live.step_status || 'PENDING'),
                    service_code: pickServiceCode(live),
                    room_id: roomId,
                    room_name:
                        (typeof roomInfo?.room_name === 'string' && roomInfo.room_name) ||
                        undefined,
                    step_type: typeof live.step_type === 'string' ? live.step_type : undefined,
                    is_payment: isPaymentStep(live),
                    created_at: Number.isFinite(createdAt) ? createdAt : undefined,
                };
                card.service_order_id = matchServiceOrderId(card, orders);
                cards.push(card);
            }
            // Annotate → dedupe → always service then its payment (no shuffle)
            setServiceSteps(
                orderClsCardsServiceThenPayment(
                    dedupePaymentCompanions(annotateUnlabeledPaymentCompanions(cards))
                )
            );
        },
        [patient.flowId, patient.bookingId]
    );

    const loadServiceStepsFromFlow = useCallback(async () => {
        if (!accessToken || !patientId) {
            setServiceSteps([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const [flowObj, pendingRes] = await Promise.all([
                resolvePatientFlow(accessToken, {
                    flowId: patient.flowId || resolvedFlowId,
                    patientId,
                    bookingId: patient.bookingId || resolvedBookingId,
                }),
                serviceOrderService
                    .getPendingByPatientId(patientId, accessToken)
                    .catch(() => null),
            ]);
            const orders = extractServiceOrderList(pendingRes?.data);
            applyFlowToCards(flowObj, orders);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể tải dịch vụ từ quy trình.');
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, patientId, patient.flowId, resolvedFlowId, applyFlowToCards]);

    useEffect(() => {
        void loadServiceStepsFromFlow();
        // Only re-run when patient identity / known flow changes — not every resolvedFlowId write
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken, patientId, patient.flowId]);

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

        setIsSubmitting(true);
        setFormError(null);
        try {
            const flowObj = await resolvePatientFlow(accessToken, {
                flowId: patient.flowId || resolvedFlowId,
                patientId,
                bookingId: patient.bookingId || resolvedBookingId,
            });
            const flowId =
                (typeof flowObj?.flow_id === 'string' && flowObj.flow_id) ||
                patient.flowId ||
                resolvedFlowId ||
                '';
            const bookingId =
                pickBookingIdFromFlow(flowObj) ||
                patient.bookingId ||
                resolvedBookingId ||
                '';

            if (!flowId) {
                setFormError('Không tìm thấy flow_id để thêm bước dịch vụ.');
                return;
            }

            // Lock onto this visit for subsequent reloads / timeline refresh
            setResolvedFlowId(flowId);
            if (bookingId) setResolvedBookingId(bookingId);

            if (bookingId) {
                try {
                    const room = rooms.find((r) => r.room_id === selectedRoomId);
                    // is_payment: false — BE already creates a payment companion from
                    // createStepParent / service catalog. is_payment: true duplicated that step.
                    await serviceOrderService.createOrder(
                        {
                            booking_id: bookingId,
                            assign_by_staff_id: staffId,
                            name: selectedService.service_name,
                            service_code: serviceCode,
                            specialty_id: room?.specialty_id || null,
                            room_id: selectedRoomId || undefined,
                            is_payment: false,
                        },
                        accessToken
                    );
                } catch (orderErr) {
                    console.warn('Service order create failed; still adding flow step', orderErr);
                }
            }

            const beforeSteps = extractFlowSteps(flowObj);
            const beforeIds = new Set(
                beforeSteps
                    .map((s) => {
                        const live = asRecord(s);
                        return typeof live?.step_id === 'string' ? live.step_id : '';
                    })
                    .filter(Boolean)
            );

            const roomType = normalizeRoomType(selectedService.room_type);
            await clinicalService.createStepParent(
                {
                    flow_id: flowId,
                    service_code: serviceCode,
                    step_name: selectedService.service_name,
                    room_id: selectedRoomId || undefined,
                    staff_id: staffId,
                    step_status: 'PENDING',
                    step_type: mapRoomTypeToStepType(roomType),
                },
                accessToken
            );

            // Reload from active-by-patient, sticking to the same flow_id we appended to
            const afterFlow = await resolvePatientFlow(accessToken, {
                flowId,
                patientId,
                bookingId,
            });
            const afterSteps = extractFlowSteps(afterFlow);
            const newStep = [...afterSteps].reverse().find((item) => {
                const live = asRecord(item);
                const id = typeof live?.step_id === 'string' ? live.step_id : '';
                return Boolean(id && !beforeIds.has(id));
            });
            const newStepId = (() => {
                const live = asRecord(newStep);
                return typeof live?.step_id === 'string' ? live.step_id : '';
            })();
            const examStepId = findExamStepId(afterSteps);

            if (newStepId && examStepId && newStepId !== examStepId) {
                try {
                    await clinicalService.createStepDependency(
                        { waiting_step_id: newStepId, required_step_id: examStepId },
                        accessToken
                    );
                } catch {
                    // ignore duplicate dependency
                }
            }

            applyFlowToCards(afterFlow);
            setIsAddOpen(false);
            setSelectedServiceId('');
            onFlowChanged?.();
            void loadServiceStepsFromFlow();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể tạo chỉ định dịch vụ.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEdit = (step: ServiceStepCard) => {
        setFormError(null);
        setEditingStep(step);
        setEditRoomId(step.room_id || '');
        const status = (step.step_status || 'PENDING').toUpperCase();
        setEditStatus(
            (EDITABLE_STATUSES as readonly string[]).includes(status) ? status : 'PENDING'
        );
    };

    const handleUpdateIndication = async () => {
        if (!accessToken || !editingStep) return;
        setIsSubmitting(true);
        setFormError(null);
        try {
            const roomChanged = (editRoomId || '') !== (editingStep.room_id || '');
            const statusChanged =
                editStatus.toUpperCase() !== (editingStep.step_status || 'PENDING').toUpperCase();

            if (!roomChanged && !statusChanged) {
                setEditingStep(null);
                return;
            }

            if (roomChanged) {
                await clinicalService.updateStep(
                    editingStep.step_id,
                    {
                        room_id: editRoomId || undefined,
                        staff_id: staffId || undefined,
                    },
                    accessToken
                );
            }

            if (statusChanged) {
                await clinicalService.updateStepStatus(
                    editingStep.step_id,
                    editStatus,
                    accessToken
                );
            }

            // Resolve linked service order (pending may miss matches — also try full list)
            let orderId = editingStep.service_order_id || '';
            if (!orderId && patientId) {
                try {
                    const [pendingRes, allRes] = await Promise.all([
                        serviceOrderService.getPendingByPatientId(patientId, accessToken).catch(() => null),
                        serviceOrderService.getOrders(accessToken, 1, 200).catch(() => null),
                    ]);
                    const orders = [
                        ...extractServiceOrderList(pendingRes?.data),
                        ...extractServiceOrderList(allRes?.data),
                    ];
                    orderId = matchServiceOrderId(editingStep, orders) || '';
                } catch {
                    // ignore resolve errors
                }
            }

            if (orderId) {
                try {
                    const room = rooms.find((r) => r.room_id === editRoomId);
                    const bareName = stripClsPaymentPrefix(editingStep.step_name);
                    await serviceOrderService.updateOrder(
                        orderId,
                        {
                            room_id: editRoomId || undefined,
                            specialty_id: room?.specialty_id || null,
                            status: editStatus as (typeof EDITABLE_STATUSES)[number],
                            // Keep order name as the CLS service name (not "Thanh toán: …")
                            name: bareName || undefined,
                            service_code: editingStep.service_code || undefined,
                        },
                        accessToken
                    );
                } catch (orderErr) {
                    console.warn('Service order update failed; step already updated', orderErr);
                }
            }

            // When editing the service indication, mirror status onto payment companion step(s)
            if (!editingStep.is_payment && statusChanged) {
                const companions = findPaymentCompanionCards(editingStep, serviceSteps);
                for (const pay of companions) {
                    try {
                        await clinicalService.updateStepStatus(
                            pay.step_id,
                            editStatus,
                            accessToken
                        );
                    } catch (payErr) {
                        console.warn('Failed to sync payment companion status', payErr);
                    }
                }
            }

            setEditingStep(null);
            onFlowChanged?.();
            await loadServiceStepsFromFlow();
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không thể cập nhật chỉ định.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteIndication = async (step: ServiceStepCard) => {
        if (!accessToken) return;
        const ok = window.confirm(
            `Hủy chỉ định "${displayClsStepName(step)}"?\nBước tương ứng trên quy trình cũng sẽ bị hủy.`
        );
        if (!ok) return;

        setDeletingStepId(step.step_id);
        setError(null);
        try {
            // Soft-cancel the service step on the visit flow
            await clinicalService.updateStepStatus(step.step_id, 'CANCELLED', accessToken);

            // Also cancel paired payment step(s) on the flow
            const companions = findPaymentCompanionCards(step, serviceSteps);
            for (const pay of companions) {
                try {
                    await clinicalService.updateStepStatus(pay.step_id, 'CANCELLED', accessToken);
                } catch (payErr) {
                    console.warn('Failed to cancel payment companion step', payErr);
                }
            }

            // Resolve/cancel linked service order
            let orderId = step.service_order_id || '';
            if (!orderId && patientId) {
                try {
                    const [pendingRes, allRes] = await Promise.all([
                        serviceOrderService.getPendingByPatientId(patientId, accessToken).catch(() => null),
                        serviceOrderService.getOrders(accessToken, 1, 200).catch(() => null),
                    ]);
                    const orders = [
                        ...extractServiceOrderList(pendingRes?.data),
                        ...extractServiceOrderList(allRes?.data),
                    ];
                    orderId = matchServiceOrderId(step, orders) || '';
                } catch {
                    // ignore
                }
            }

            if (orderId) {
                try {
                    await serviceOrderService.updateOrder(
                        orderId,
                        { status: 'CANCELLED' },
                        accessToken
                    );
                } catch {
                    try {
                        await serviceOrderService.deleteOrder(orderId, accessToken);
                    } catch (orderErr) {
                        console.warn('Service order cancel/delete failed', orderErr);
                    }
                }
            }

            // Refresh left-panel Quy trình timeline
            onFlowChanged?.();
            await loadServiceStepsFromFlow();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không thể hủy chỉ định dịch vụ.');
        } finally {
            setDeletingStepId(null);
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
                        Dịch vụ đã chỉ định ({serviceSteps.length})
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

            {serviceSteps.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EBEBEB] p-8 text-center text-sm text-neutral-500">
                    Chưa có dịch vụ trên quy trình. Bấm &quot;Thêm chỉ định&quot; để chọn dịch vụ — bước sẽ được thêm vào flow.
                </div>
            ) : (
                serviceSteps.map((step) => {
                    const meta = stepStatusMeta(step.step_status);
                    const isDeleting = deletingStepId === step.step_id;
                    return (
                        <div
                            key={step.step_id}
                            className="bg-white rounded-2xl border border-[#EBEBEB] p-5"
                        >
                            <div className="flex items-start justify-between flex-wrap gap-2">
                                <div className="min-w-0 flex-1">
                                    <h4 className="text-[13px] font-bold text-[#2D2D2D]">
                                        {displayClsStepName(step)}
                                    </h4>
                                    <p className="text-[11px] text-[#9C9C9C] mt-0.5">
                                        {[
                                            step.is_payment ? 'Thanh toán' : null,
                                            step.room_name,
                                            step.service_code,
                                            step.step_type,
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
                                        onClick={() => openEdit(step)}
                                        disabled={isDeleting}
                                        className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        title="Hủy chỉ định"
                                        onClick={() => void handleDeleteIndication(step)}
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
                                    <option value="">Không chọn phòng</option>
                                    {rooms.map((r) => (
                                        <option key={r.room_id} value={r.room_id}>
                                            {r.room_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[11px] text-neutral-500">
                                Dịch vụ sẽ được thêm vào quy trình bệnh nhân (sau bước Khám bệnh).
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
                                disabled={isSubmitting || !selectedServiceId}
                                className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold disabled:opacity-50 inline-flex items-center gap-2"
                            >
                                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                Tạo chỉ định
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editingStep && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-neutral-100">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                            <h3 className="font-bold text-neutral-900">Sửa chỉ định</h3>
                            <button
                                type="button"
                                onClick={() => setEditingStep(null)}
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
                                    {editingStep.is_payment ? 'Thanh toán' : 'Dịch vụ'}
                                </label>
                                <p className="text-sm font-semibold text-neutral-800">
                                    {displayClsStepName(editingStep)}
                                    {editingStep.service_code
                                        ? ` (${editingStep.service_code})`
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
                                onClick={() => setEditingStep(null)}
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
