export type PrescriptionStatusEnum =
    | 'PENDING'
    | 'PROCESSING'
    | 'PREPARED'
    | 'DISPENSED'
    | 'EXPIRED'
    | 'CANCELLED';

export interface Medicine {
    medicine_id: string;
    medicine_code: string;
    medicine_name: string;
    active_ingredient: string;
    unit: string;
    usage_route: string;
    unit_price: number;
    manufacturer?: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CreateMedicineDto {
    medicine_code: string;
    medicine_name: string;
    active_ingredient: string;
    unit: string;
    usage_route: string;
    unit_price: number;
    manufacturer?: string;
    description?: string;
}

export interface PrescriptionDetail {
    prescription_detail_id: string;
    medicine_id: string;
    quantity: number;
    dosage_instruction: string;
    note?: string;
    unit_price: number;
    sub_total: number;
    medicine?: {
        medicine_code: string;
        medicine_name: string;
        unit: string;
        active_ingredient?: string;
        usage_route?: string;
    };
}

export interface Prescription {
    prescription_id: string;
    prescription_code: string;
    qr_code: string;
    service_order_id: string;
    visit_session_id: string;
    prescribed_by: string;
    prescribed_by_name?: string;
    diagnosis_note: string;
    total_amount: number;
    status: PrescriptionStatusEnum;
    created_at: string;
    updated_at: string;
    prescriptionDetails: PrescriptionDetail[];
    patient_name?: string;
    patient_code?: string;
}

export interface CreatePrescriptionDetailDto {
    medicine_id: string;
    quantity: number;
    dosage_instruction: string;
    note?: string;
}

export interface CreatePrescriptionDto {
    visit_session_id: string;
    diagnosis_note: string;
    details: CreatePrescriptionDetailDto[];
}

export interface PrescriptionQrData {
    code: string;
    visit_session_id: string;
    service_order_id: string;
    total_amount: number;
}
