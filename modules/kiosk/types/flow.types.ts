export interface RouteStepItem {
  id: number;
  title: string;
  subtitle: string;
  doctorName?: string;
  specialtyName?: string;
  room?: string;
  location?: string;
  queueNo?: string;
  estimatedWait?: string;
  status: 'completed' | 'in_progress' | 'waiting' | 'pending' | 'declined';
  stepId?: string;
  rawStep?: any;
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
            };
          };
        };
      };
    };
  };
  queues?: Array<{
    queue_number?: string;
  }>;
}

export interface PatientFlowStepItem {
  step_id: string;
  flow_id: string;
  room_id?: string;
  staff_id?: string;
  step_status?: string;
  docNo?: number | null;
  payment_status?: string | null;
  parent_step_id?: string | null;
  physicalRoomId?: string | null;
  depends_on?: string[];
  sub_steps?: any[];
  room_info?: {
    room_id: string;
    room_name: string;
  };
  specialty_info?: {
    specialty_id: string;
    specialty_name: string;
  };
  staff_info?: {
    staff_id: string;
    full_name: string;
  };
}

export interface PatientFlowItem {
  flow_id: string;
  booking_id?: string;
  ticket_code?: string;
  status: string;
  current_processing_steps?: string[];
  steps?: PatientFlowStepItem[];
}

export interface StepDetailPatientResponseData {
  step_id: string;
  step_name?: string | null;
  flow_id?: string;
  room_id?: string;
  staff_id?: string;
  step_status?: string;
  docNo?: number | null;
  payment_status?: string | null;
  created_at?: string;
  updated_at?: string;
  parent_step_id?: string | null;
  physicalRoomId?: string | null;
  queues?: Array<{
    queue_id: string;
    step_id: string;
    queue_number: string;
    status: string;
    queue_type?: string;
  }>;
  staff?: {
    staff_id: string;
    full_name: string;
    license_number?: string;
    experience_years?: number;
    specialty_id?: string;
  };
  flow?: {
    ticket_code?: string;
    booking?: {
      slot?: {
        start_time?: string;
        end_time?: string;
        shift?: {
          room?: {
            room_id?: string;
            room_name?: string;
            room_type?: string;
            physical_room_id?: string | null;
            specialty_id?: string;
            specialty?: {
              specialty_id: string;
              specialty_code: string;
              specialty_name: string;
              description?: string | null;
            };
          };
          date?: string;
        };
      };
    };
  };
  sub_step?: any[];
}

export interface ActiveFlowKioskResponseData extends StepDetailPatientResponseData {}

export interface PendingPaymentStep {
  step_id: string;
  step_name: string;
  flow_id: string;
  room_id: string;
  staff_id: string;
  step_status: string;
  qr_text: string;
  docNo: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
  parent_step_id?: string | null;
  physicalRoomId?: string | null;
}

export interface ServiceOrderDetail {
  service_order_detail_id: string;
  service_order_id: string;
  service_id?: string | null;
  price_at_order: number;
  quantity: number;
  status: string;
  created_at: string;
  updated_at: string;
  name?: string | null;
  service?: {
    service_id: string;
    service_code: string;
    service_name: string;
    price: number;
    is_active: boolean;
  } | null;
}

export interface ServiceOrder {
  service_order_id: string;
  booking_id: string;
  name: string;
  status: string;
  qr_code: string;
  payment_status: string;
  total_price: number;
  created_at: string;
  updated_at: string;
  serviceOrderDetails: ServiceOrderDetail[];
}

export interface ServiceItem {
  service_id: string;
  service_code: string;
  service_name: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TransactionQrResult {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  status: string;
  expiredAt: string | null;
  checkoutUrl: string;
  qrCode: string;
}

