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
