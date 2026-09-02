export type PrescriptionStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'PREPARED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface PrescriptionMedicine {
  medicine_id?: string;
  medicine_name?: string;
  unit?: string;
  description?: string;
  unit_price?: number;
}

export interface PrescriptionDetailItem {
  prescription_detail_id?: string;
  prescription_id?: string;
  medicine_id?: string;
  quantity: number;
  dosage_instruction?: string;
  unit_price?: number;
  medicine?: PrescriptionMedicine;
  medicine_name?: string;
  unit?: string;
}

export interface PrescriptionDoctor {
  staff_id?: string;
  full_name?: string;
  license_number?: string;
  phone_number?: string;
}

export interface PrescriptionServiceOrder {
  service_order_id?: string;
  name?: string;
  payment_status?: string;
  total_price?: number;
  qr_code?: string;
  status?: string;
}

export interface PrescriptionData {
  prescription_id?: string;
  prescription_code?: string;
  qr_code?: string;
  status?: PrescriptionStatus | string;
  diagnosis_note?: string;
  total_amount?: number;
  created_at?: string;
  updated_at?: string;
  visit_session_id?: string;
  prescribed_by?: string;
  doctor?: PrescriptionDoctor;
  prescriptionDetails?: PrescriptionDetailItem[];
  details?: PrescriptionDetailItem[];
  serviceOrder?: PrescriptionServiceOrder;
}

export interface TicketPrescriptionResponse {
  code: number;
  status: string;
  message: string;
  data: {
    ticket_code?: string;
    prescriptions: PrescriptionData[];
  };
}
