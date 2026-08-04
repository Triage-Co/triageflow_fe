export interface SpecialtyItem {
  specialty_id: string;
  specialty_code: string;
  specialty_name: string;
  description: string | null;
}

export interface DoctorSlotItem {
  slot_id: string;
  slot_index?: number;
  shift_id?: string;
  start_time: string;
  end_time: string;
  capacity?: number;
  max_capacity?: number;
  status?: 'AVAILABLE' | 'FULL' | string;
  is_available?: boolean;
}

export interface DoctorShift {
  date: string;
  slots: DoctorSlotItem[];
}

export interface DoctorAccount {
  account_id: string;
  avatar?: string;
  user_name?: string;
  email?: string;
  role?: string;
  gender?: string;
  phone?: string;
  is_banned?: boolean;
}

export interface DoctorItem {
  staff_id?: string;
  doctor_id?: string;
  full_name: string;
  license_number?: string;
  experience_years?: number;
  specialty_id?: string;
  account?: DoctorAccount;
  specialty?: SpecialtyItem;
  shifts?: DoctorShift[];
  specialty_name?: string;
  room_name?: string;
}

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
