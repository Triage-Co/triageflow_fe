import type {
    Patient,
    WorkflowStep,
    WorkflowStepStatus,
} from '@/modules/clinical/types/clinical.types';
import type { TemplateStep } from '@/modules/admin/types/process.types';
import {
    normalizeRoomType,
    normalizeStepType,
} from '@/modules/admin/types/process.types';
import { toLocalYmd } from '@/modules/clinical/utils/appointmentDate';
import { buildPhysicalExamFromApi } from '@/modules/clinical/utils/physicalExam';

// ── API Services & DTOs ──────────────────────────────────────────────────────
import { apiClient } from '@/shared/services/apiClient';

/** @deprecated Kept for draft/UI helpers; assign-by-id no longer sends body. */
export type AssignTemplateStepPayload = Omit<TemplateStep, 'template_step_id'>;

/** @deprecated Assign now uses path params only. */
export interface AssignTemplateRequestDto {
    templates: AssignTemplateStepPayload[];
}

/**
 * Map template/draft steps → legacy assign body shape (unused by new assign-by-id API).
 * Kept for local draft preview / room-staff matching after assign.
 */
export function mapTemplateStepsToAssignPayload(
    steps: TemplateStep[] | undefined | null,
    parentTemplateId?: string
): AssignTemplateStepPayload[] {
    if (!Array.isArray(steps) || steps.length === 0) return [];

    return steps.map((step, idx) => {
        const templateStepId = step.template_step_id?.trim() || `step_${idx + 1}`;
        const roomType = normalizeRoomType(step.room_type);
        const uniqueStepKey =
            templateStepId ||
            (step.template_id || parentTemplateId || `step_${idx + 1}`).trim();

        return {
            template_id: uniqueStepKey,
            service_code: (step.service_code || 'NONE').trim(),
            step_name: step.step_name?.trim() || `Bước ${idx + 1}`,
            step_type: normalizeStepType(step.step_type, roomType),
            room_type: roomType,
            requires_payment: Boolean(step.requires_payment),
            depends_on: Array.isArray(step.depends_on) ? step.depends_on.filter(Boolean) : [],
            sub_steps: [],
        };
    });
}



function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function pickString(record: Record<string, unknown> | null, keys: string[]): string | undefined {
    if (!record) return undefined;
    for (const key of keys) {
        const val = record[key];
        if (typeof val === 'string' && val.trim()) return val.trim();
    }
    return undefined;
}

function pickNumber(record: Record<string, unknown> | null, keys: string[]): number | undefined {
    if (!record) return undefined;
    for (const key of keys) {
        const val = record[key];
        if (typeof val === 'number' && Number.isFinite(val)) return val;
        if (typeof val === 'string' && val.trim()) {
            const parsed = Number(val);
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return undefined;
}

function splitList(raw?: string): string[] {
    if (!raw) return [];
    return raw
        .split(/[,;|\n]/g)
        .map((item) => item.trim())
        .filter(Boolean);
}

function mapWorkflowStatus(status: string | undefined, index: number, currentIndex: number): WorkflowStepStatus {
    const normalized = (status || '').toUpperCase();
    if (normalized.includes('COMPLETE') || normalized === 'DONE') return 'completed';
    if (normalized.includes('PROCESS') || normalized.includes('IN_PROGRESS') || normalized.includes('CURRENT')) {
        return 'current';
    }
    if (currentIndex >= 0) {
        if (index < currentIndex) return 'completed';
        if (index === currentIndex) return 'current';
    }
    return 'pending';
}

function buildWorkflowSteps(rawSteps: unknown, currentStepId?: string): WorkflowStep[] {
    if (!Array.isArray(rawSteps)) return [];

    const steps: Array<{ id: string; label: string; statusRaw?: string }> = [];
    rawSteps.forEach((item, index) => {
        const record = asRecord(item);
        if (!record) return;

        const id = pickString(record, ['template_step_id', 'step_id', 'id']) || `step-${index + 1}`;
        const label = pickString(record, ['step_name', 'name', 'label']) || `Bước ${index + 1}`;
        const statusRaw = pickString(record, ['step_status', 'status']);

        steps.push({ id, label, statusRaw });
    });

    if (steps.length === 0) return [];

    const currentIndex = currentStepId
        ? steps.findIndex((step) => step.id === currentStepId)
        : -1;

    return steps.map((step, index) => ({
        id: step.id,
        label: step.label,
        status: mapWorkflowStatus(step.statusRaw, index, currentIndex),
    }));
}

function extractWorkflowSteps(raw: unknown, currentStepId?: string): WorkflowStep[] {
    const top = asRecord(raw);
    if (!top) return [];

    const dataRecord = asRecord(top.data);
    const templateRecord = asRecord(top.template) || asRecord(dataRecord?.template);
    const flowRecord = asRecord(top.flow) || asRecord(dataRecord?.flow);

    const stepCandidates: unknown[] = [
        top.steps,
        dataRecord?.steps,
        templateRecord?.steps,
        flowRecord?.steps,
    ];

    for (const candidate of stepCandidates) {
        const mapped = buildWorkflowSteps(candidate, currentStepId);
        if (mapped.length > 0) return mapped;
    }

    return [];
}

function extractTemplateIds(raw: unknown): string[] {
    const record = asRecord(raw);
    if (!record) return [];

    const data = record.data;
    const list = Array.isArray(data) ? data : Array.isArray(record.templates) ? record.templates : [];
    if (!Array.isArray(list)) return [];

    return list
        .map((item) => {
            const row = asRecord(item);
            return pickString(row, ['template_id', 'id']);
        })
        .filter((id): id is string => Boolean(id));
}

export function pickFirstTemplateId(raw: unknown): string | undefined {
    return extractTemplateIds(raw)[0];
}

export interface BackendQueuePatient {
    queue_id: string;
    queue_number: string;
    status: string;
    /** Denormalized room for TV/queue engine — may be null on legacy rows */
    room_id?: string | null;
    manual_rule_codes?: string[];
    visit_session_id?: string;
    step: {
        step_id: string;
        next_step_id: string | null;
        step_status: string;
        step_name?: string;
        docNo: number;
        payment_status: string;
        room_id?: string;   // room assigned to this step (if present)
        room?: {
            room_id: string;
            room_name: string;
        };
        flow: {
            flow_id: string;
            template_id?: string;
            status: string;
            steps?: {
                queues?: {
                    queue_number: string;
                }[];
            }[];
            booking: {
                booking_id: string;
                status: string;
                slot: {
                    slot_id: string;
                    start_time: string;
                    end_time: string;
                    shift: {
                        date: string;
                    };
                };
                patient: {
                    patient_id: string;
                    medical_coverage_id: string | null;
                    full_name?: string;
                    dob?: string;
                    gender?: string;
                    citizen_id?: string;
                    account?: {
                        full_name?: string;
                        user_name?: string;
                        citizen_id?: string;
                        email?: string;
                        dob?: string;
                        gender?: string;
                        role?: string;
                        phone?: string | null;
                    };
                };
            };
        };
    };
}

/**
 * Staff may open EMR only after the patient has been called into the room
 * (CALLED / SERVING / FINISHED). Blocks PENDING / QUEUED / WAITING / MISSING.
 */
export function canStaffViewPatientEmr(
    queueStatus?: string | null,
    stepStatus?: string,
): boolean {
    const q = (queueStatus || '').toUpperCase();
    const step = (stepStatus || '').toUpperCase();

    if (
        q === 'MISSING' ||
        q === 'SKIPPED' ||
        q === 'CANCELLED' ||
        q === 'DECLINED'
    ) {
        return false;
    }

    if (
        q === 'CALLED' ||
        q === 'CALLING' ||
        q === 'SERVING' ||
        q === 'IN_PROGRESS' ||
        q === 'FINISHED' ||
        q === 'COMPLETED'
    ) {
        return true;
    }

    if (step === 'IN_PROGRESS' || step === 'PROCESSING' || step === 'ONGOING') {
        return true;
    }

    return false;
}

/** Waiting in queue — staff may preview patient info before call-next. */
export function canStaffPreviewPatientEmr(queueStatus?: string | null): boolean {
    const q = (queueStatus || '').toUpperCase();
    return q === 'QUEUED' || q === 'PENDING' || q === 'WAITING';
}

export function canStaffAccessPatientEmr(
    queueStatus?: string | null,
    stepStatus?: string,
): boolean {
    return (
        canStaffViewPatientEmr(queueStatus, stepStatus) ||
        canStaffPreviewPatientEmr(queueStatus)
    );
}

export function mapBackendPatientToFrontend(item: BackendQueuePatient): Patient {
    const calculateAge = (dobString?: string): number | undefined => {
        if (!dobString) return undefined;
        try {
            const birthDate = new Date(dobString);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return Number.isFinite(age) && age >= 0 ? age : undefined;
        } catch {
            return undefined;
        }
    };

    const mapGender = (g?: string): 'Nam' | 'Nữ' | undefined => {
        const raw = (g || '').trim().toUpperCase();
        if (!raw) return undefined;
        if (raw === 'FEMALE' || raw === 'NỮ' || raw === 'NU' || raw === 'F') return 'Nữ';
        if (raw === 'MALE' || raw === 'NAM' || raw === 'M') return 'Nam';
        return undefined;
    };

    const mapVisitType = (raw?: string): Patient['visitType'] | undefined => {
        const value = (raw || '').trim();
        if (!value) return undefined;
        const upper = value.toUpperCase();
        if (
            value === 'Tái khám' ||
            upper.includes('FOLLOW') ||
            upper.includes('REVISIT') ||
            upper.includes('TAI_KHAM') ||
            upper.includes('TÁI')
        ) {
            return 'Tái khám';
        }
        if (
            value === 'Cấp cứu' ||
            upper.includes('EMERGENCY') ||
            upper.includes('CAP_CUU') ||
            upper.includes('CẤP CỨU')
        ) {
            return 'Cấp cứu';
        }
        if (
            value === 'Khám mới' ||
            upper.includes('NEW') ||
            upper.includes('FIRST') ||
            upper.includes('WALK_IN') ||
            upper.includes('KHAM_MOI') ||
            upper.includes('KHÁM MỚI')
        ) {
            return 'Khám mới';
        }
        return undefined;
    };

    const mapPriority = (raw?: string): Patient['priority'] | undefined => {
        const value = (raw || '').trim();
        if (!value) return undefined;
        const upper = value.toUpperCase();
        if (value === 'Bình thường' || upper === 'NORMAL' || upper === 'REGULAR') return 'Bình thường';
        if (value === 'Ngồi xe lăn' || upper.includes('WHEEL')) return 'Ngồi xe lăn';
        if (value === 'Khám sức khỏe' || upper.includes('CHECKUP') || upper.includes('HEALTH_CHECK')) {
            return 'Khám sức khỏe';
        }
        if (value === 'Quay lại phòng khám' || upper.includes('RETURN')) return 'Quay lại phòng khám';
        return undefined;
    };

    /**
     * Prefer queue.status (BE: PENDING/QUEUED/CALLED/SERVING/FINISHED/MISSING).
     * Fall back to step.step_status for older payloads.
     */
    const mapStatus = (
        status: string,
        stepStatus?: string,
    ): 'Đang chờ' | 'Đang gọi' | 'Đang khám' | 'Đã khám' => {
        const queueStatus = (status || '').toUpperCase();
        const step = (stepStatus || '').toUpperCase();

        if (
            queueStatus === 'FINISHED' ||
            queueStatus === 'COMPLETED' ||
            queueStatus === 'CANCELLED' ||
            step === 'COMPLETED' ||
            step === 'DECLINED'
        ) {
            return 'Đã khám';
        }
        if (queueStatus === 'CALLED' || queueStatus === 'CALLING') {
            return 'Đang gọi';
        }
        if (
            queueStatus === 'SERVING' ||
            queueStatus === 'IN_PROGRESS' ||
            step === 'PROCESSING' ||
            step === 'IN_PROGRESS' ||
            step === 'ONGOING'
        ) {
            return 'Đang khám';
        }
        // PENDING / QUEUED / MISSING / WAITING → waiting bucket for list UI
        return 'Đang chờ';
    };

    const booking = item.step?.flow?.booking;
    const patientObj = booking?.patient;
    if (!booking || !patientObj) {
        throw new Error('Queue patient thiếu booking/patient trong response.');
    }
    const patientRecord = asRecord(patientObj);
    const accountRecord = asRecord(patientObj.account);
    const flowRecord = asRecord(item.step.flow);
    const stepRecord = asRecord(item.step);
    const workflowSteps = extractWorkflowSteps(item.step.flow, item.step.step_id);
    const templateId = pickString(flowRecord, ['template_id']);

    const visitReasonFromApi = pickString(patientRecord, [
        'visit_reason',
        'reason',
        'chief_complaint',
        'complaint',
        'symptoms',
    ]) || pickString(flowRecord, ['visit_reason', 'reason', 'chief_complaint']);

    const clinicalProgressionFromApi =
        pickString(patientRecord, ['clinical_progression', 'progression', 'history_of_present_illness']) ||
        pickString(stepRecord, ['clinical_progression', 'progression']);

    const medicalHistoryFromApiRaw =
        pickString(patientRecord, ['medical_history', 'history', 'past_history']) ||
        pickString(accountRecord, ['medical_history', 'history']);

    const allergyNotes =
        pickString(patientRecord, ['allergy_notes', 'allergies']) ||
        pickString(accountRecord, ['allergy_notes', 'allergies']);

    const vitalsRecord =
        asRecord(patientRecord?.vitals) ||
        asRecord(patientRecord?.vital_signs) ||
        asRecord(stepRecord?.vitals) ||
        asRecord(flowRecord?.vitals);

    const physicalExamRecord =
        asRecord(patientRecord?.physical_exam) ||
        asRecord(stepRecord?.physical_exam) ||
        asRecord(stepRecord?.clinical_exam);

    const heartRate = pickNumber(vitalsRecord, ['heartRate', 'heart_rate', 'pulse']);
    const bloodPressure =
        pickString(vitalsRecord, ['bloodPressure', 'blood_pressure', 'bp']);
    const temperature =
        pickNumber(vitalsRecord, ['temperature', 'temp']);
    const spO2 = pickNumber(vitalsRecord, ['spO2', 'spo2', 'oxygen_saturation']);

    const physicalExam = buildPhysicalExamFromApi(physicalExamRecord);

    // Extract queue_number safely
    let qNum = item.queue_number;
    if (!qNum && item.step?.flow?.steps) {
        for (const s of item.step.flow.steps) {
            if (s.queues && s.queues.length > 0 && s.queues[0].queue_number) {
                qNum = s.queues[0].queue_number;
                break;
            }
        }
    }

    return {
        id: item.queue_id,   // use queue_id for routing to /api/doctor/patients/queue/{id}
        stt: String(qNum || item.queue_number || '').padStart(2, '0'),
        name: patientObj.full_name || patientObj.account?.full_name || patientObj.account?.user_name || `Bệnh nhân ${patientObj.patient_id.slice(0, 6)}`,
        age: calculateAge(patientObj.dob || patientObj.account?.dob),
        gender: mapGender(patientObj.gender || patientObj.account?.gender),
        code: patientObj.citizen_id || patientObj.account?.citizen_id || `BN-${patientObj.patient_id.slice(0, 8)}`,
        priority: mapPriority(
            pickString(patientRecord, ['priority', 'queue_priority']) ||
            pickString(stepRecord, ['priority']) ||
            pickString(flowRecord, ['priority']) ||
            pickString(asRecord(item), ['priority'])
        ),
        time: booking?.slot?.start_time || undefined,
        status: mapStatus(item.status, item.step?.step_status),
        visitReason: visitReasonFromApi || 'Chưa có lý do khám từ hệ thống',
        allergies: splitList(allergyNotes),
        medicalHistory: splitList(medicalHistoryFromApiRaw),
        vitals: {
            heartRate: heartRate ?? 0,
            bloodPressure: bloodPressure || '—',
            temperature: temperature ?? 0,
            spO2: spO2 ?? 0,
        },
        insurance: {
            hasInsurance: !!patientObj.medical_coverage_id,
            coverage: patientObj.medical_coverage_id ? patientObj.medical_coverage_id : 'Không có BHYT',
        },
        visitType: mapVisitType(
            pickString(patientRecord, ['visit_type', 'visitType', 'encounter_type']) ||
            pickString(asRecord(booking), ['visit_type', 'visitType', 'booking_type', 'encounter_type'])
        ),
        flowId: item.step.flow.flow_id,
        bookingId: booking.booking_id,
        templateId,
        workflowSteps,
        patientId: patientObj.patient_id,
        appointmentDate: toLocalYmd(booking?.slot?.shift?.date),
        medicalRecord: {
            visitReason: visitReasonFromApi || 'Chưa có lý do khám từ hệ thống',
            clinicalProgression: clinicalProgressionFromApi || '',
            medicalHistory: splitList(medicalHistoryFromApiRaw),
            physicalExam,
        },
    };
}

export function extractFlowList(raw: unknown): Record<string, unknown>[] {
    if (!raw) return [];

    const asFlows = (items: unknown[]): Record<string, unknown>[] =>
        items.filter((item): item is Record<string, unknown> => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
            const rec = item as Record<string, unknown>;
            return typeof rec.flow_id === 'string' || Array.isArray(rec.steps);
        });

    if (Array.isArray(raw)) return asFlows(raw);

    if (typeof raw === 'object') {
        const rec = raw as Record<string, unknown>;

        // ApiResponse envelope: { code, data: Flow[] }
        if (Array.isArray(rec.data)) return asFlows(rec.data);

        // Nested: { data: { data: Flow[] } } or { data: Flow }
        if (rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)) {
            const nested = rec.data as Record<string, unknown>;
            if (Array.isArray(nested.data)) return asFlows(nested.data);
            if (typeof nested.flow_id === 'string' || Array.isArray(nested.steps)) {
                return [nested];
            }
        }

        // Single flow object
        if (typeof rec.flow_id === 'string' || Array.isArray(rec.steps)) {
            return [rec];
        }
    }
    return [];
}

/** Ensure `steps` is always a concrete array on the flow object. */
export function normalizeFlowRecord(flow: Record<string, unknown>): Record<string, unknown> {
    const steps = extractFlowSteps(flow);
    return {
        ...flow,
        steps: Array.isArray(steps) ? [...steps] : [],
    };
}

/**
 * Pick one visit flow from GET /api/flow/patient/{id}/active (array).
 * Prefer booking_id / flow_id when provided; otherwise the newest flow by date.
 */
export function pickBestActiveFlow(
    flows: Record<string, unknown>[],
    preferredFlowId?: string,
    preferredBookingId?: string
): Record<string, unknown> | null {
    if (flows.length === 0) return null;

    const normalized = flows.map(normalizeFlowRecord);

    if (preferredBookingId) {
        const byBooking = normalized.find((f) => f.booking_id === preferredBookingId);
        if (byBooking) return byBooking;
    }

    if (preferredFlowId) {
        const preferred = normalized.find((f) => f.flow_id === preferredFlowId);
        if (preferred) return preferred;
    }

    // Newest visit by date, then create_at
    return (
        [...normalized].sort((a, b) => {
            const dateA = String(a.date || '');
            const dateB = String(b.date || '');
            if (dateA !== dateB) return dateB.localeCompare(dateA);
            const timeA = new Date((a.create_at || a.created_at || 0) as string | number).getTime();
            const timeB = new Date((b.create_at || b.created_at || 0) as string | number).getTime();
            return timeB - timeA;
        })[0] || null
    );
}

/** Fetch the full active-flow list for a patient (no get-by-id). */
export async function fetchPatientActiveFlows(
    token: string,
    patientId: string
): Promise<Record<string, unknown>[]> {
    const id = patientId.trim();
    if (!id) return [];

    const active = await clinicalService.getActiveFlowByPatientId(id, token);
    const list = extractFlowList(active?.data);
    if (list.length > 0) return list.map(normalizeFlowRecord);

    const fromEnvelope = extractFlowList(active);
    return fromEnvelope.map(normalizeFlowRecord);
}

/**
 * Resolve visit flow from GET /api/flow/patient/{patient_id}/active.
 * Uses only the latest (or preferred booking/flow) visit — not a merge of all flows.
 */
export async function resolvePatientFlow(
    token: string,
    options: { flowId?: string; patientId?: string; bookingId?: string }
): Promise<Record<string, unknown> | null> {
    const patientId = (options.patientId || '').trim();
    if (!patientId) return null;

    const list = await fetchPatientActiveFlows(token, patientId);
    if (list.length === 0) return null;

    return pickBestActiveFlow(
        list,
        (options.flowId || '').trim(),
        (options.bookingId || '').trim()
    );
}

export function extractFlowSteps(flow: Record<string, unknown> | null | undefined): unknown[] {
    if (!flow) return [];
    if (Array.isArray(flow.steps)) return flow.steps as unknown[];
    const nested = flow.data && typeof flow.data === 'object' ? (flow.data as Record<string, unknown>) : null;
    if (nested && Array.isArray(nested.steps)) return nested.steps as unknown[];
    return [];
}

function normalizeStepLabel(name: string): string {
    return name.trim().toLowerCase().normalize('NFC');
}

/** Default consultation step created with the visit flow. */
export function isDefaultExamStepName(name: string): boolean {
    const n = normalizeStepLabel(name);
    return n === 'khám bệnh' || n === 'kham benh';
}

export function findExamStepInFlow(
    flow: Record<string, unknown> | null | undefined
): { stepId: string; stepStatus: string } | null {
    for (const item of extractFlowSteps(flow)) {
        const rec = asRecord(item);
        if (!rec) continue;
        const status = String(rec.step_status || '').toUpperCase();
        if (status === 'CANCELLED' || status === 'CANCELED') continue;
        const name = String(rec.step_name || '');
        if (!isDefaultExamStepName(name)) continue;
        const stepId = typeof rec.step_id === 'string' ? rec.step_id.trim() : '';
        if (stepId) return { stepId, stepStatus: status };
    }
    return null;
}

const PENDING_EXAM_STATUSES = new Set(['', 'PENDING', 'WAITING', 'QUEUED']);
const IN_PROGRESS_EXAM_STATUSES = new Set([
    'IN_PROGRESS',
    'PROCESSING',
    'ONGOING',
    'CURRENT',
    'DOING',
    'EXAMINING',
    'ACTIVE',
]);

async function resolveExamStepTarget(
    token: string,
    options: {
        patientId?: string;
        flowId?: string;
        bookingId?: string;
        queueStepId?: string;
        queueStepStatus?: string;
        queueStepName?: string;
    }
): Promise<{ stepId: string; stepStatus: string } | null> {
    let stepId = '';
    let stepStatus = '';

    const queueName = (options.queueStepName || '').trim();
    const queueId = (options.queueStepId || '').trim();
    if (queueId && queueName && isDefaultExamStepName(queueName)) {
        stepId = queueId;
        stepStatus = (options.queueStepStatus || '').toUpperCase();
    }

    if (!stepId) {
        const flow = await resolvePatientFlow(token, {
            patientId: options.patientId,
            flowId: options.flowId,
            bookingId: options.bookingId,
        });
        const exam = findExamStepInFlow(flow);
        if (exam) {
            stepId = exam.stepId;
            stepStatus = exam.stepStatus;
        } else if (queueId) {
            stepId = queueId;
            stepStatus = (options.queueStepStatus || '').toUpperCase();
        }
    }

    if (!stepId) return null;
    return { stepId, stepStatus };
}

/**
 * When a doctor opens a patient for examination, move "Khám bệnh" PENDING → IN_PROGRESS.
 * Idempotent for already in-progress / completed steps.
 */
export async function startExamStepIfPending(
    token: string,
    options: {
        patientId?: string;
        flowId?: string;
        bookingId?: string;
        /** Queue-bound step from GET /api/doctor/patients/... (often the exam step). */
        queueStepId?: string;
        queueStepStatus?: string;
        queueStepName?: string;
    }
): Promise<boolean> {
    const target = await resolveExamStepTarget(token, options);
    if (!target) return false;
    if (!PENDING_EXAM_STATUSES.has(target.stepStatus)) return false;

    await clinicalService.updateStepStatus(target.stepId, 'IN_PROGRESS', token);
    return true;
}

/**
 * Doctor finishes examination via queue Step complete.
 * Prefers POST /queue/:queueId/complete when queueId is known (SERVING turn).
 * Does NOT silently fall back to PATCH /step — returns need_call_next if no queueId.
 */
export async function completeExamStepIfInProgress(
    token: string,
    options: {
        patientId?: string;
        flowId?: string;
        bookingId?: string;
        queueStepId?: string;
        queueStepStatus?: string;
        queueStepName?: string;
        /** Active SERVING queue id (Patient.id from doctor queue routes). */
        queueId?: string;
    }
): Promise<
    'completed' | 'already_done' | 'not_ready' | 'not_found' | 'need_call_next'
> {
    const queueId = (options.queueId || '').trim();
    if (queueId) {
        const { queueService } = await import('@/modules/queue/services/queueService');
        try {
            await queueService.completeStep(queueId, token);
            return 'completed';
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            // Already finished / not serving
            if (
                /already|finished|completed|không.*serving|not serving|400/i.test(msg)
            ) {
                const target = await resolveExamStepTarget(token, options);
                if (
                    target &&
                    (target.stepStatus === 'COMPLETED' ||
                        target.stepStatus === 'DONE' ||
                        target.stepStatus === 'FINISHED')
                ) {
                    return 'already_done';
                }
            }
            throw err;
        }
    }

    // No queue id — do not PATCH /step; staff must call-next first
    const target = await resolveExamStepTarget(token, options);
    if (!target) return 'not_found';
    const status = target.stepStatus;
    if (status === 'COMPLETED' || status === 'DONE' || status === 'FINISHED') {
        return 'already_done';
    }
    return 'need_call_next';
}

export const clinicalService = {
    getPatients: (date: string, token: string, suppressLogError = true) =>
        apiClient.get<BackendQueuePatient[]>(`/api/doctor/patients?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
            suppressLogError,
        }),

    getPatientByQueueId: (queueId: string, token: string, suppressLogError = false) =>
        apiClient.get<BackendQueuePatient>(`/api/doctor/patients/queue/${queueId}`, {
            headers: { Authorization: `Bearer ${token}` },
            suppressLogError,
        }),

    getProcessTemplates: (token: string) =>
        apiClient.get<unknown>('/api/template', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /**
     * [DOCTOR - ADMIN] Append a saved template onto a visit flow by template_id.
     * POST /api/flow/assign/{flow_id}/template/{template_id} — no body.
     */
    assignTemplateToFlow: (flowId: string, templateId: string, token: string) =>
        apiClient.post<unknown>(
            `/api/flow/assign/${flowId}/template/${templateId}`,
            {},
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        ),

    getActiveFlowByPatientId: (patientId: string, token: string) =>
        apiClient.get<unknown>(`/api/flow/patient/${patientId}/active`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getFlowHistoryByPatientId: (patientId: string, token: string) =>
        apiClient.get<unknown>(`/api/flow/patient/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getAllFlows: (token: string) =>
        apiClient.get<unknown>('/api/flow', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getFlowById: (flowId: string, token: string) =>
        apiClient.get<unknown>(`/api/flow/${flowId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getVisitSessionByPatientId: (patientId: string, token: string) =>
        apiClient.get<unknown>(`/api/visit-session?patient_id=${patientId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getLatestTriageAnswer: (patientId: string, token: string) =>
        apiClient.get<unknown>(`/api/visit-session/patient/${patientId}/latest-answer`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getServices: (token: string, page = 1, limit = 100) =>
        apiClient.get<unknown>(`/api/service?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createVisitSession: (body: Record<string, unknown>, token: string) =>
        apiClient.post<unknown>('/api/visit-session', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateVisitSession: (visitSessionId: string, body: Record<string, unknown>, token: string) =>
        apiClient.patch<unknown>(`/api/visit-session/${visitSessionId}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateLatestVisitSession: (
        patientId: string,
        body: Record<string, unknown>,
        token: string,
        options?: { suppressLogError?: boolean },
    ) =>
        apiClient.patch<unknown>(
            `/api/visit-session/patient/${patientId}/latest`,
            body,
            {
                headers: { Authorization: `Bearer ${token}` },
                suppressLogError: options?.suppressLogError,
            },
        ),

    /**
     * Fallback for booking/flow steps that have no service_order_id
     * (e.g. default "Khám bệnh"). Prefer PATCH /api/service-order when linked.
     */
    updateStep: (
        stepId: string,
        body: { room_id?: string; staff_id?: string; docNo?: number; payment_status?: string },
        token: string
    ) =>
        apiClient.patch<unknown>(`/api/step/${stepId}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updateStepStatus: (stepId: string, status: string, token: string) =>
        apiClient.patch<unknown>(
            `/api/step/${stepId}/status`,
            { step_status: status },
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        ),

    /** Create runtime edge: waiting step cannot proceed until required completes. */
    createStepDependency: (
        body: { waiting_step_id: string; required_step_id: string },
        token: string
    ) =>
        apiClient.post<unknown>('/api/step/dependency', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** Replace required predecessor for a waiting step. */
    updateStepDependency: (
        body: {
            waiting_step_id: string;
            old_required_step_id: string;
            new_required_step_id: string;
        },
        token: string
    ) =>
        apiClient.patch<unknown>('/api/step/dependency', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};

