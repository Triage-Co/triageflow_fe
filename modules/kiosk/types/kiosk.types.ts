export type ActiveView =
  | 'home'
  | 'register'
  | 'patient_info'
  | 'doctor_route'
  | 'queue'
  | 'map'
  | 'payment'
  | 'support'
  | 'pending_bills';

export type ActiveModal =
  | null
  | 'scan_cccd'
  | 'loading'
  | 'confirm_print';

export type AIRegisterStep =
  | 'body_select'
  | 'symptom_select'
  | 'quiz_detail'
  | 'ai_result'
  | 'doctor_select'
  | 'confirm_info';

export type PaymentMethod = 'bank' | 'counter';

export interface CCCDInfo {
  fullName: string;
  idNumber: string;
  dob: string;
  gender: string;
  address: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  room: string;
  location: string;
  avatar?: string;
  licenseNumber?: string;
}

export interface AIAnalysisResult {
  recommendedSpecialty: string;
  priority: string;
  mainSymptoms: string;
  painLevel: number;
  duration: string;
  hasEmergency: boolean;
}

export interface TicketData {
  ticketNumber: string;
  patientName: string;
  dob: string;
  createdAt: string;
  clinicName: string;
  roomNumber: string;
  location: string;
  doctorName?: string;
  status: 'waiting' | 'in_consultation' | 'completed';
  waitingCount: number;
  currentCallingNo: string;
  estimatedWaitMinutes: number;
  stepId?: string;
  bookingId?: string;
  startTime?: string;
}

export interface PaymentItem {
  name: string;
  amount: number;
}

export interface PaymentBill {
  billId: string;
  patientCode: string;
  patientName: string;
  items: PaymentItem[];
  totalAmount: number;
  isPaid: boolean;
  paymentMethod?: PaymentMethod;
  stepId?: string;
  bookingId?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// AUTH DTOs
export interface LoginCitizenRequest {
  citizen_id: string;
}
export interface LoginCitizenResponse {
  code: number;
  status: string;
  message: string;
  data: {
    token: string;
    patient_id: string;
    citizen_id: string;
  };
}

// Re-export domain types for backward compatibility
export * from './booking.types';
export * from './flow.types';
