export type ReceptionPriority =
  | "Khẩn cấp"
  | "Người cao tuổi"
  | "Ưu tiên"
  | "Thường";
export type ReceptionStatus =
  | "Đang khám"
  | "Chờ khám"
  | "Chờ TT"
  | "Đã TT"
  | "Đã gọi"
  | "Check-in";
export interface QueuePatient {
  id: string;
  ticketNo: string;
  name: string;
  specialty: string;
  specialtyIcon:
    | "emergency"
    | "internal"
    | "trauma"
    | "dermatology"
    | "obgyn"
    | "general";
  priority: ReceptionPriority;
  status: ReceptionStatus;
  waitMinutes: number;
  bookingId?: string;
  accountId?: string;
}

export interface ReceptionAccount {
  account_id: string;
  patient_id?: string;
  full_name: string;
  citizen_id: string;
  email: string;
  dob: string;
  gender: string;
  role: string;
  phone: string | null;
  bhyt?: string | null;
  blood_type?: string | null;
  allergy_notes?: string | null;
  createdAt?: string;
}
export interface ReceptionPatientRecord {
  patient_id: string;
  medical_coverage_id?: string | null;
  account?: {
    account_id?: string;
    full_name: string;
    citizen_id: string;
    email: string;
    dob: string;
    gender: string;
    role?: string;
    phone: string | null;
  };
  full_name?: string;
  citizen_id?: string;
  email?: string;
  dob?: string;
  gender?: string;
  phone?: string | null;
  blood_type?: string | null;
  allergy_notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface ReceptionSlot {
  slot_id?: string;
  id?: string;
  doctor_id?: string;
  start_time: string;
  end_time: string;
  capacity?: number;
  max_capacity?: number;
  status?: string;
  is_full?: boolean;
  room_name?: string;
  room?: { room_name?: string; name?: string; room_number?: string };
  shift?: { shift_id?: string; date?: string };
}
export interface BackendSpecialtyCatalogItem {
  specialty_id: string;
  specialty_code: string;
  specialty_name: string;
  description?: string | null;
}
export interface ReceptionSpecialty {
  specialty_id?: string;
  specialty_code?: string;
  doctor_id?: string;
  name?: string;
  specialty_name?: string;
  specialty_labels?: string[];
  experience_years?: number;
  gender?: string;
  license_number?: string;
  avatar_url?: string;
  academic_degree?: string;
  rating?: number;
  review_count?: number;
  room_name?: string;
}
export interface CreateBookingRequest {
  patient_id: string;
  slot_id: string;
}
export interface CreateBookingWithPackageRequest {
  patient_id: string;
  slot_id: string;
  package_id: string;
  return_url?: string;
  cancel_url?: string;
}
export interface CreateBookingRecommendRequest {
  patient_id: string;
  interview_token: string;
}
export interface ReceptionPatientDetail {
  queueId: string;
  ticketNo: string;
  name: string;
  citizenId: string;
  email: string;
  phone: string | null;
  dob: string;
  gender: string;
  queueStatus: string;
  paymentStatus: string;
  stepStatus: string;
  slotTime: string;
  slotDate: string;
  bookingStatus: string;
  bookingId: string;
  waitMinutes: number;
  priority: ReceptionPriority;
  status: ReceptionStatus;
}
export interface PatientSearchResult {
  accountId: string;
  patient_id?: string;
  queueId?: string;
  name: string;
  citizenId: string;
  phone: string | null;
  email?: string;
  ticketNo?: string;
  dob?: string;
  gender?: string;
  specialty: string;
  bhyt: string | null;
  priority: ReceptionPriority;
  status: ReceptionStatus | "Không trong hàng đợi";
  waitMinutes?: number;
  bookingId?: string;
  inQueueToday: boolean;
  blood_type?: string | null;
  allergy_notes?: string | null;
  createdAt?: string;
}
export interface RegistrationResult {
  appointmentDate?: string;
  ticketNo: string;
  queueNumber?: string;
  bookingId?: string;
  stepId?: string;
  queueId?: string;
  fullName: string;
  citizenId: string;
  phone: string;
  specialty: string;
  priority?: ReceptionPriority;
  paymentLabel: string;
  doctorLabel: string;
  slotTimeLabel: string;
  roomLabel: string;
  waitTimeLabel: string;
  insuranceId: string;
  qrPayload: string;
  isPaymentPending?: boolean;
  paymentQrCode?: string;
  paymentCheckoutUrl?: string;
  paymentAmount?: number;
  paymentAccountName?: string;
  paymentAccountNumber?: string;
  paymentDescription?: string;
  debugLogs?: string[];
}
export interface ReceptionFlow {
  flow_id: string;
  name: string;
  status: string;
}

export interface ExamPackage {
  package_id: string;
  package_name: string;
  description: string;
  price: number;
  is_active: boolean;
  template_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExamPackageDetail extends ExamPackage {
  template?: {
    template_id: string;
    template_name: string;
    steps: Array<{
      room_type: string;
      step_name: string;
      step_type: string;
      sub_steps: any[];
      depends_on: string[];
      template_id: string;
      service_code: string;
      requires_payment: boolean;
    }>;
  };
}

export interface RoomSlot {
  slot_id: string;
  slot_index: number;
  shift_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  max_capacity: number;
  status: "AVAILABLE" | "FULL" | string;
  createdAt?: string;
  updatedAt?: string;
}
