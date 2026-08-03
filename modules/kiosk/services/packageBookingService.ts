import { apiClient } from '@/shared/services/apiClient';
import { useAuthStore } from '../store/authStore';

// Cổng dữ liệu hồi đáp cơ bản từ API
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

const getAuthHeaders = (explicitToken?: string): Record<string, string> => {
  const token = explicitToken || useAuthStore.getState().authToken;
  if (!token) return {};
  let cleanToken = token.trim();
  if ((cleanToken.startsWith('"') && cleanToken.endsWith('"')) || (cleanToken.startsWith("'") && cleanToken.endsWith("'"))) {
    cleanToken = cleanToken.slice(1, -1).trim();
  }
  if (cleanToken.toLowerCase().startsWith('bearer ')) {
    cleanToken = cleanToken.substring(7).trim();
  }
  return { Authorization: `Bearer ${cleanToken}` };
};

export const packageBookingService = {
  // API 1: Lấy danh sách gói khám
  getAllPackages: async () => {
    return apiClient.get<ExamPackage[]>('/api/exam-package');
  },

  // API 2: Lấy chi tiết gói khám
  getPackageDetail: async (id: string) => {
    return apiClient.get<ExamPackageDetail>(`/api/exam-package/${encodeURIComponent(id)}`);
  },

  // API 3: Lấy slots của phòng chỉ định (Room ID mặc định d6b5891e-3d1c-44f1-9636-aaeb66fae2d5)
  getRoomSlots: async (date: string, token?: string) => {
    const roomId = 'd6b5891e-3d1c-44f1-9636-aaeb66fae2d5';
    return apiClient.get<RoomSlot[]>(
      `/api/room/${encodeURIComponent(roomId)}/slots?date=${encodeURIComponent(date)}`,
      { headers: getAuthHeaders(token) }
    );
  },

  // API 4: Tạo booking gói khám & Lấy link thanh toán
  createBookingWithPackage: async (
    patientId: string,
    slotId: string,
    packageId: string,
    token?: string
  ) => {
    return apiClient.post<BookingWithPackageResponse>(
      '/api/booking/with-package',
      {
        patient_id: patientId,
        slot_id: slotId,
        package_id: packageId,
        return_url: 'https://triageflow.me/payment/success',
        cancel_url: 'https://triageflow.me/payment/cancel'
      },
      { headers: getAuthHeaders(token) }
    );
  }
};
