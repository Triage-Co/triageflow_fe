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
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
