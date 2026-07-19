import { apiClient } from '@/shared/services/apiClient';
import {
  BookingResponseData,
  BookingGenerateResponseData,
  StepDetailResponseData,
  DoctorItem,
  DoctorSlotItem
} from '../types/kiosk.types';

export const bookingService = {
  // 1. Tự động xếp phòng khám từ kết quả gợi ý chuyên khoa AI
  createAutoBooking: async (patientId: string, interviewToken: string) => {
    return apiClient.post<BookingResponseData>('/api/booking/recommend', {
      patient_id: patientId,
      interview_token: interviewToken,
    });
  },

  // 2. Lấy danh sách Bác sĩ thực tế theo mã chuyên khoa
  getDoctorsBySpecialty: async (specialtyCode: string, dateTime?: string) => {
    const params = new URLSearchParams();
    if (specialtyCode) params.append('specialty_code', specialtyCode);
    if (dateTime) params.append('date_time', dateTime);
    return apiClient.get<DoctorItem[]>(`/api/doctor/specialty?${params.toString()}`);
  },

  // 3. Lấy các khung giờ trống của Bác sĩ
  getDoctorSlots: async (doctorId: string, date: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return apiClient.get<DoctorSlotItem[]>(`/api/doctor/${doctorId}/slot?${params.toString()}`);
  },

  // 4. Đặt lịch với Bác sĩ & khung giờ cụ thể
  createBooking: async (patientId: string, slotId: string) => {
    return apiClient.post<BookingResponseData>('/api/booking', {
      patient_id: patientId,
      slot_id: slotId,
    });
  },

  // 5. Xác nhận thanh toán & Sinh số thứ tự (STT) chính thức
  fetchBookingGenerate: async (stepId: string) => {
    return apiClient.get<BookingGenerateResponseData>(`/api/booking/generate?step-id=${encodeURIComponent(stepId)}`);
  },

  // 6. Lấy chi tiết lịch khám & thông tin phòng khám đầy đủ
  fetchStepDetail: async (stepId: string) => {
    return apiClient.get<StepDetailResponseData>(`/api/step/account/${encodeURIComponent(stepId)}`);
  }
};
