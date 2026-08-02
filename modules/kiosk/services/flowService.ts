import { apiClient } from '@/shared/services/apiClient';
import {
  ActiveFlowKioskResponseData,
  BookingGenerateResponseData,
  StepDetailResponseData,
  PatientFlowItem,
  StepDetailPatientResponseData,
  PendingPaymentStep,
} from '../types/flow.types';
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

export const flowService = {
  // Bước 1: Lấy danh sách flow của bệnh nhân (GET /api/flow/patient/{patient_id})
  getPatientFlows: async (patientId: string, token?: string) => {
    return apiClient.get<PatientFlowItem[]>(
      `/api/flow/patient/${encodeURIComponent(patientId)}`,
      { headers: getAuthHeaders(token) }
    );
  },

  // Bước 2: Lấy chi tiết step theo step_id và patient_id (GET /api/step/{step_id}/patient/{patient_id})
  getStepDetailByPatient: async (stepId: string, patientId: string, token?: string) => {
    return apiClient.get<StepDetailPatientResponseData>(
      `/api/step/${encodeURIComponent(stepId)}/patient/${encodeURIComponent(patientId)}`,
      { headers: getAuthHeaders(token) }
    );
  },

  getActivePatientFlowKiosk: async (patientId: string, token?: string) => {
    return apiClient.get<ActiveFlowKioskResponseData>(
      `/api/flow/patient/${encodeURIComponent(patientId)}/active/kiosk`,
      { headers: getAuthHeaders(token) }
    );
  },

  fetchBookingGenerate: async (stepId: string, token?: string) => {
    return apiClient.get<BookingGenerateResponseData>(
      `/api/booking/generate?step-id=${encodeURIComponent(stepId)}`,
      { headers: getAuthHeaders(token) }
    );
  },

  fetchStepDetail: async (stepId: string, token?: string) => {
    return apiClient.get<StepDetailResponseData>(
      `/api/step/account/${encodeURIComponent(stepId)}`,
      { headers: getAuthHeaders(token) }
    );
  },

  // Lấy danh sách các bước chưa thanh toán của bệnh nhân (GET /api/step?patient_id={patient_id})
  getPendingPaymentSteps: async (patientId: string, token?: string) => {
    return apiClient.get<PendingPaymentStep[]>(
      `/api/step?patient_id=${encodeURIComponent(patientId)}`,
      { headers: getAuthHeaders(token) }
    );
  },
};
