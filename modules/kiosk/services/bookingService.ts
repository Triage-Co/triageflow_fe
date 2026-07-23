import { apiClient } from '@/shared/services/apiClient';
import {
  BookingResponseData,
  DoctorItem,
  DoctorSlotItem,
  SpecialtyItem,
} from '../types/booking.types';
import { useAuthStore } from '../store/authStore';

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

export const bookingService = {
  getAllSpecialties: async () => {
    return apiClient.get<SpecialtyItem[]>('/api/specialty');
  },
  createAutoBooking: async (patientId: string, interviewToken: string, token?: string) => {
    return apiClient.post<BookingResponseData>(
      '/api/booking/recommend',
      {
        patient_id: patientId,
        interview_token: interviewToken,
      },
      { headers: getAuthHeaders(token) }
    );
  },

  getDoctorsBySpecialty: async (specialtyCode: string, dateTime?: string, token?: string) => {
    const params = new URLSearchParams();
    if (specialtyCode) params.append('specialty_code', specialtyCode);
    if (dateTime) params.append('date_time', dateTime);
    return apiClient.get<DoctorItem[]>(
      `/api/doctor/specialty?${params.toString()}`,
      { headers: getAuthHeaders(token) }
    );
  },

  getDoctorSlots: async (doctorId: string, date: string, token?: string) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return apiClient.get<DoctorSlotItem[]>(
      `/api/doctor/${doctorId}/slot?${params.toString()}`,
      { headers: getAuthHeaders(token) }
    );
  },

  createBooking: async (patientId: string, slotId: string, token?: string) => {
    return apiClient.post<BookingResponseData>(
      '/api/booking',
      {
        patient_id: patientId,
        slot_id: slotId,
      },
      { headers: getAuthHeaders(token) }
    );
  },
};
