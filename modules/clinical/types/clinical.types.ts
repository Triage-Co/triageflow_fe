// ── Enums & Literal Types ──────────────────────────────────────────────────
export type Priority = 'Bình thường' | 'Ngồi xe lăn' | 'Khám sức khỏe' | 'Quay lại phòng khám';
export type Status = 'Đã khám' | 'Đang khám' | 'Đang chờ';
export type Gender = 'Nam' | 'Nữ';

// ── Vitals ─────────────────────────────────────────────────────────────────
export interface Vitals {
    heartRate: number;       // nhịp/phút
    bloodPressure: string;   // e.g. "120/80"
    temperature: number;     // °C
    spO2: number;            // %
}

// ── Medical Record ─────────────────────────────────────────────────────────
export interface MedicalRecord {
    visitReason: string;
    clinicalProgression: string;
    medicalHistory: string[];
    physicalExam: {
        throat?: string;
        lungs: string;
        heart: string;
        abdomen: string;
    };
    diagnosis?: string;
    treatmentPlan?: string;
}

// ── Patient ────────────────────────────────────────────────────────────────
export interface Patient {
    id: string;
    stt: string;
    name: string;
    age: number;
    gender: Gender;
    code: string;
    priority: Priority;
    time: string;
    status: Status;
    // Extended info shown in the detail drawer
    visitReason: string;
    shortDiagnosis?: string;
    allergies: string[];
    medicalHistory: string[];
    vitals: Vitals;
    insurance: { hasInsurance: boolean; coverage: string };
    visitType: 'Tái khám' | 'Khám mới' | 'Cấp cứu';
    // EMR-specific fields
    medicalRecord?: MedicalRecord;
    department?: string;
}

// ── Stat Card ──────────────────────────────────────────────────────────────
export interface StatItem {
    value: string | number;
    label: string;
    color?: string;
}

// ── Clinical workflow ────────────────────────────────────────────────────────
export type WorkflowStepStatus = 'completed' | 'current' | 'pending';

export interface WorkflowStep {
    id: string;
    label: string;
    status: WorkflowStepStatus;
}

export type ClinicalStage =
    | 'examination'
    | 'paraclinical'
    | 'diagnosis'
    | 'procedure'
    | 'prescription';

export type LabOrderStatus = 'Chờ thực hiện' | 'Đang thực hiện' | 'Hoàn tất';

export interface LabOrder {
    id: string;
    name: string;
    group: string;
    status: LabOrderStatus;
    receivedAt?: string;
    returnedAt?: string;
}
