import type {
    Patient,
    WorkflowStep,
    WorkflowStepStatus,
} from '@/modules/clinical/types/clinical.types';


// ── API Services & DTOs ──────────────────────────────────────────────────────
import { apiClient } from '@/shared/services/apiClient';

const MOCK_VITALS = {
    heartRate: 80,
    bloodPressure: '120/80',
    temperature: 37.0,
    spO2: 98,
};

const MOCK_PHYSICAL_EXAM = {
    throat: 'Chưa cập nhật',
    lungs: 'Chưa cập nhật',
    heart: 'Chưa cập nhật',
    abdomen: 'Chưa cập nhật',
};

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

export function extractWorkflowStepsFromResponse(raw: unknown, currentStepId?: string): WorkflowStep[] {
    return extractWorkflowSteps(raw, currentStepId);
}

export interface BackendQueuePatient {
    queue_id: string;
    queue_number: string;
    status: string;
    step: {
        step_id: string;
        next_step_id: string | null;
        step_status: string;
        docNo: number;
        payment_status: string;
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
                    account: {
                        user_name?: string;
                        email?: string;
                        role?: string;
                        gender?: string;
                        phone?: string | null;
                    };
                };
            };
        };
    };
}

export function mapBackendPatientToFrontend(item: BackendQueuePatient): Patient {
    const calculateAge = (dobString?: string) => {
        if (!dobString) return 30;
        try {
            const birthDate = new Date(dobString);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return isNaN(age) ? 30 : age;
        } catch {
            return 30;
        }
    };

    const mapGender = (g?: string): 'Nam' | 'Nữ' => {
        if (g === 'FEMALE') return 'Nữ';
        return 'Nam';
    };

    const mapStatus = (status: string, stepStatus?: string): 'Đang chờ' | 'Đang khám' | 'Đã khám' => {
        if (status === 'COMPLETED' || stepStatus === 'COMPLETED') {
            return 'Đã khám';
        }
        if (stepStatus === 'PROCESSING' || stepStatus === 'IN_PROGRESS' || stepStatus === 'ONGOING') {
            return 'Đang khám';
        }
        return 'Đang chờ';
    };

    const booking = item.step.flow.booking;
    const patientObj = booking.patient;
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

    const heartRate = pickNumber(vitalsRecord, ['heartRate', 'heart_rate', 'pulse']) ?? MOCK_VITALS.heartRate;
    const bloodPressure =
        pickString(vitalsRecord, ['bloodPressure', 'blood_pressure', 'bp']) ?? MOCK_VITALS.bloodPressure;
    const temperature =
        pickNumber(vitalsRecord, ['temperature', 'temp']) ?? MOCK_VITALS.temperature;
    const spO2 = pickNumber(vitalsRecord, ['spO2', 'spo2', 'oxygen_saturation']) ?? MOCK_VITALS.spO2;

    const throat = pickString(physicalExamRecord, ['throat']) ?? MOCK_PHYSICAL_EXAM.throat;
    const lungs = pickString(physicalExamRecord, ['lungs', 'lung']) ?? MOCK_PHYSICAL_EXAM.lungs;
    const heartExam = pickString(physicalExamRecord, ['heart']) ?? MOCK_PHYSICAL_EXAM.heart;
    const abdomen = pickString(physicalExamRecord, ['abdomen', 'digestive']) ?? MOCK_PHYSICAL_EXAM.abdomen;

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
        stt: String(qNum || '').padStart(2, '0'),
        name: patientObj.full_name || patientObj.account.user_name || `Bệnh nhân ${patientObj.patient_id.slice(0, 6)}`,
        age: calculateAge(patientObj.dob),
        gender: mapGender(patientObj.gender),
        code: patientObj.citizen_id || `BN-${patientObj.patient_id.slice(0, 8)}`,
        priority: 'Bình thường',
        time: booking.slot.start_time,
        status: mapStatus(item.status, item.step.step_status),
        visitReason: visitReasonFromApi || 'Chưa có lý do khám từ hệ thống',
        allergies: splitList(allergyNotes),
        medicalHistory: splitList(medicalHistoryFromApiRaw),
        vitals: {
            heartRate,
            bloodPressure,
            temperature,
            spO2,
        },
        insurance: {
            hasInsurance: !!patientObj.medical_coverage_id,
            coverage: patientObj.medical_coverage_id ? patientObj.medical_coverage_id : 'Không có BHYT',
        },
        visitType: 'Khám mới',
        flowId: item.step.flow.flow_id,
        templateId,
        workflowSteps,
        patientId: patientObj.patient_id,
        medicalRecord: {
            visitReason: visitReasonFromApi || 'Chưa có lý do khám từ hệ thống',
            clinicalProgression: clinicalProgressionFromApi || '',
            medicalHistory: splitList(medicalHistoryFromApiRaw),
            physicalExam: {
                throat,
                lungs,
                heart: heartExam,
                abdomen,
            },
        },
    };
}

export const clinicalService = {
    getPatients: (date: string, token: string) =>
        apiClient.get<BackendQueuePatient[]>(`/api/doctor/patients?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPatientByQueueId: (queueId: string, token: string) =>
        apiClient.get<BackendQueuePatient>(`/api/doctor/patients/queue/${queueId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getProcessTemplates: (token: string) =>
        apiClient.get<unknown>('/api/template', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    assignTemplateToFlow: (flowId: string, templateId: string, token: string) =>
        apiClient.post<unknown>(`/api/flow/assign/${flowId}`, {
            template_id: templateId,
        }, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getActiveFlowByPatientId: (patientId: string, token: string) =>
        apiClient.get<unknown>(`/api/flow/patient/${patientId}/active`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getFlowHistoryByPatientId: (patientId: string, token: string) =>
        apiClient.get<unknown>(`/api/flow/patient/${patientId}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};

