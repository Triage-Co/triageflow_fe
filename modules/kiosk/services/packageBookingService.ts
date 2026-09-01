import { kioskApiClient } from './kioskApiClient';
import {
  ExamPackage,
  ExamPackageDetail,
  RoomSlot,
  BookingWithPackageResponse,
} from '../types/packageBooking.types';

export const packageBookingService = {

  getAllPackages: async () => {
    const response = await kioskApiClient.get<ExamPackage[]>('/api/exam-package');
    const raw = response as any;
    const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
    return list.filter((pkg: ExamPackage) => pkg.is_active === true);
  },

  getPackageDetail: async (id: string) => {
    return kioskApiClient.get<ExamPackageDetail>(`/api/exam-package/${encodeURIComponent(id)}`);
  },

  getRoomSlots: async (date: string, token?: string) => {
    const roomId = 'd6b5891e-3d1c-44f1-9636-aaeb66fae2d5';
    return kioskApiClient.get<RoomSlot[]>(
      `/api/room/${encodeURIComponent(roomId)}/slots?date=${encodeURIComponent(date)}`,
      { token }
    );
  },

  createBookingWithPackage: async (
    patientId: string,
    slotId: string,
    packageId: string,
    token?: string
  ) => {
    return kioskApiClient.post<BookingWithPackageResponse>(
      '/api/booking/with-package',
      {
        patient_id: patientId,
        slot_id: slotId,
        package_id: packageId,
        return_url: 'https://triageflow.me/payment/success',
        cancel_url: 'https://triageflow.me/payment/cancel'
      },
      { token }
    );
  }
};

