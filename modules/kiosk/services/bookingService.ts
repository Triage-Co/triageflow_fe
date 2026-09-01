import { kioskApiClient } from './kioskApiClient';
import {
  BookingResponseData,
  DoctorItem,
  DoctorSlotItem,
  SpecialtyItem,
} from '../types/booking.types';

export const bookingService = {

  getAllSpecialties: async (params?: { page?: number; limit?: number }) => {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 500;
    return kioskApiClient.get<SpecialtyItem[]>(
      `/api/specialty?page=${page}&limit=${limit}`
    );
  },

  createAutoBooking: async (patientId: string, interviewToken: string, token?: string) => {
    return kioskApiClient.post<BookingResponseData>(
      '/api/booking/recommend',
      {
        patient_id: patientId,
        interview_token: interviewToken,
      },
      { token }
    );
  },

  getDoctorsBySpecialty: async (specialtyCode: string, dateTime?: string, token?: string) => {
    const params = new URLSearchParams();
    if (specialtyCode) params.append('specialty_code', specialtyCode);
    if (dateTime) params.append('date_time', dateTime);
    return kioskApiClient.get<DoctorItem[]>(
      `/api/doctor/specialty/clinical?${params.toString()}`,
      { token }
    );
  },

  getDoctorSlots: async (doctorId: string, date: string, token?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return kioskApiClient.get<DoctorSlotItem[]>(
      `/api/doctor/${doctorId}/slot?${params.toString()}`,
      { token }
    );
  },

  createBooking: async (patientId: string, slotId: string, token?: string) => {
    return kioskApiClient.post<BookingResponseData>(
      '/api/booking',
      {
        patient_id: patientId,
        slot_id: slotId,
      },
      { token }
    );
  },
};

