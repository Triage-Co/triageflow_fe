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

export interface StepTemplate {
  room_type: string;
  step_name: string;
  step_type: string;
  sub_steps: any[];
  depends_on: string[];
  template_id: string;
  service_code: string;
  requires_payment: boolean;
}

export interface ExamPackageDetail extends ExamPackage {
  template?: {
    template_id: string;
    template_name: string;
    steps: StepTemplate[];
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
  status: 'AVAILABLE' | 'FULL' | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookingWithPackageResponse {
  code: number;
  message: string;
  status: string;
  data: {
    booking_id: string;
    service_order_id: string;
    package_name: string;
    amount: number;
    payment: {
      code: number;
      message: string;
      status: string;
      data: {
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
      };
    };
  };
}
