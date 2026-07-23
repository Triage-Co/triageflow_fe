export type ReceptionPriority = 'Khẩn cấp' | 'Người cao tuổi' | 'Ưu tiên' | 'Thường';
export type ReceptionStatus = 'Đang khám' | 'Chờ khám' | 'Chờ TT' | 'Đã TT' | 'Đã gọi' | 'Check-in';
export interface ReceptionStat { value: string | number; label: string; icon: 'waiting' | 'registered' | 'queues' | 'payment' | 'emergency' | 'avgTime' | 'walkin' | 'reissue'; trend?: { value: string; positive: boolean }; iconBg: string; iconColor: string; }
export interface QueuePatient { id: string; ticketNo: string; name: string; specialty: string; specialtyIcon: 'emergency' | 'internal' | 'trauma' | 'dermatology' | 'obgyn' | 'general'; priority: ReceptionPriority; status: ReceptionStatus; waitMinutes: number; bookingId?: string; accountId?: string; }
export interface HighPriorityPatient { id: string; name: string; ticketNo: string; specialty: string; priority: ReceptionPriority; }
export interface RecentActivity { id: string; time: string; title: string; ticketNo: string; patientName: string; type: 'register' | 'emergency' | 'payment' | 'print'; }
export interface ReceptionAccount { account_id: string; patient_id?: string; full_name: string; citizen_id: string; email: string; dob: string; gender: string; role: string; phone: string | null; bhyt?: string | null; }
export interface ReceptionPatientRecord { patient_id: string; medical_coverage_id?: string | null; account?: { account_id?: string; full_name: string; citizen_id: string; email: string; dob: string; gender: string; role?: string; phone: string | null; }; full_name?: string; citizen_id?: string; email?: string; dob?: string; gender?: string; phone?: string | null; }
export interface ReceptionSlot { slot_id?: string; id?: string; doctor_id?: string; start_time: string; end_time: string; capacity?: number; max_capacity?: number; status?: string; is_full?: boolean; shift?: { shift_id?: string; date?: string; }; }
export interface BackendSpecialtyCatalogItem {
    specialty_id: string;
    specialty_code: string;
    specialty_name: string;
    description?: string | null;
}
export interface ReceptionSpecialty { specialty_id?: string; specialty_code?: string; doctor_id?: string; name?: string; specialty_name?: string; specialty_labels?: string[]; experience_years?: number; gender?: string; license_number?: string; avatar_url?: string; academic_degree?: string; rating?: number; review_count?: number; }
export interface CreateBookingRequest { patient_id: string; slot_id: string; }
export interface CreateBookingRecommendRequest { patient_id: string; interview_token: string; }
export interface ReceptionPatientDetail { queueId: string; ticketNo: string; name: string; citizenId: string; email: string; phone: string | null; dob: string; gender: string; queueStatus: string; paymentStatus: string; stepStatus: string; slotTime: string; slotDate: string; bookingStatus: string; bookingId: string; waitMinutes: number; priority: ReceptionPriority; status: ReceptionStatus; }
export interface PatientSearchResult { accountId: string; patient_id?: string; queueId?: string; name: string; citizenId: string; phone: string | null; email?: string; ticketNo?: string; dob?: string; gender?: string; specialty: string; bhyt: string | null; priority: ReceptionPriority; status: ReceptionStatus | 'Không trong hàng đợi'; waitMinutes?: number; bookingId?: string; inQueueToday: boolean; }
export interface RegistrationResult { ticketNo: string; queueNumber?: string; bookingId?: string; stepId?: string; queueId?: string; fullName: string; citizenId: string; phone: string; specialty: string; priority: ReceptionPriority; paymentLabel: string; doctorLabel: string; slotTimeLabel: string; roomLabel: string; waitTimeLabel: string; insuranceId: string; qrPayload: string; isPaymentPending?: boolean; paymentQrCode?: string; paymentCheckoutUrl?: string; paymentAmount?: number; paymentAccountName?: string; paymentAccountNumber?: string; paymentDescription?: string; debugLogs?: string[]; }
export interface ReceptionFlow { flow_id: string; name: string; status: string; }
export interface CreateTransactionRequest { transType: string; amount: number; clientId: string; returnUrl: string; cancelUrl: string; }
export interface TransactionQrResponse { qrCode?: string; checkoutUrl?: string; amount?: number; currency?: string; status?: string; transaction_id?: string; qr_code?: string; checkout_url?: string; }
export interface ReceptionStatsSummary { waiting: number; registered: number; queues: number; payment: number; emergency: number; avgTime: string; walkin: number; reissue: number; }
