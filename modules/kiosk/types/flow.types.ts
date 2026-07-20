export interface RouteStepItem {
  id: number;
  title: string;
  subtitle: string;
  room?: string;
  location?: string;
  queueNo?: string;
  estimatedWait?: string;
  status: 'completed' | 'in_progress' | 'waiting' | 'pending';
}

export interface BookingGenerateResponseData {
  slot?: {
    slot_id: string;
    slot_index?: number;
    shift_id?: string;
    start_time: string;
    end_time: string;
    capacity?: number;
    max_capacity?: number;
    status?: string;
  };
  room?: {
    room_id: string;
    room_name: string;
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
  specialty?: {
    specialty_id: string;
    specialty_code: string;
    specialty_name: string;
    description?: string | null;
  };
  queue?: Array<{
    queue_id: string;
    step_id: string;
    queue_number: string;
    status: string;
  }>;
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
  }>;
  staff?: {
    staff_id: string;
    full_name: string;
    license_number?: string;
    experience_years?: number;
    specialty_id?: string;
  };
  flow?: {
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
