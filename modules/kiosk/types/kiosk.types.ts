export type ActiveView =
  | 'home'
  | 'register'
  | 'patient_info'
  | 'doctor_route'
  | 'queue'
  | 'map'
  | 'payment'
  | 'support';

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

export interface DoctorItem {
  doctor_id: string;
  full_name: string;
  specialty_name?: string;
  room_name?: string;
  license_number?: string;
}

export interface DoctorSlotItem {
  slot_id: string;
  start_time: string;
  end_time: string;
  is_available?: boolean;
}

export interface AIAnalysisResult {
  recommendedSpecialty: string;
  priority: string;
  mainSymptoms: string;
  painLevel: number;
  duration: string;
  hasEmergency: boolean;
}

export interface RouteStepItem {
  id: number;
  title: string;
  subtitle: string;
  room: string;
  location: string;
  queueNo?: string;
  estimatedWait?: string;
  status: 'completed' | 'in_progress' | 'waiting' | 'pending';
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

// AUTH
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

// BOOKING & VIETQR PAYMENT
export interface BookingPaymentData {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  checkoutUrl: string;
  qrCode: string;
  orderCode: number | string;
}

export interface BookingResponseData {
  booking_id: string;
  step_id: string;
  payment: {
    status: string;
    message: string;
    data: BookingPaymentData;
  };
  data?: {
    booking_id: string;
  };
}

export interface BookingGenerateResponseData {
  queue_number?: string;
  queueNo?: string;
  message?: string;
}

export interface StepDetailResponseData {
  step_id?: string;
  flow?: {
    booking?: {
      slot?: {
        start_time?: string;
        shift?: {
          room?: {
            room_name?: string;
            location?: string;
            specialty?: {
              specialty_name?: string;
              specialty_code?: string;
            }
          }
        }
      }
    }
  };
  queues?: Array<{
    queue_number?: string;
  }>;
}
