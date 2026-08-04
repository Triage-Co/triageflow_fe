import { kioskApiClient } from './kioskApiClient';
import {
  ActiveFlowKioskResponseData,
  StepDetailResponseData,
  PatientFlowItem,
  StepDetailPatientResponseData,
  PendingPaymentStep,
  ServiceOrder,
  ServiceItem,
  TransactionQrResult,
} from '../types/flow.types';

export const flowService = {

  getPatientFlows: async (patientId: string, token?: string) => {
    return kioskApiClient.get<PatientFlowItem[]>(
      `/api/flow/patient/${encodeURIComponent(patientId)}`,
      { token }
    );
  },

  getStepDetailByPatient: async (stepId: string, patientId: string, token?: string) => {
    return kioskApiClient.get<StepDetailPatientResponseData>(
      `/api/step/${encodeURIComponent(stepId)}/patient/${encodeURIComponent(patientId)}`,
      { token }
    );
  },

  getActivePatientFlowKiosk: async (patientId: string, date?: string, token?: string) => {
    const url = `/api/flow/patient/${encodeURIComponent(patientId)}/active/kiosk${date ? `?date=${encodeURIComponent(date)}` : ''
      }`;
    return kioskApiClient.get<ActiveFlowKioskResponseData>(
      url,
      { token }
    );
  },
  fetchBookingGenerate: async (stepId: string, token?: string) => {
    return kioskApiClient.get<any>(
      `/api/booking/generate?step-id=${encodeURIComponent(stepId)}`,
      { token }
    );
  },

  fetchStepDetail: async (stepId: string, token?: string) => {
    return kioskApiClient.get<StepDetailResponseData>(
      `/api/step/account/${encodeURIComponent(stepId)}`,
      { token }
    );
  },

  getPendingPaymentSteps: async (patientId: string, token?: string) => {
    return kioskApiClient.get<PendingPaymentStep[]>(
      `/api/step?patient_id=${encodeURIComponent(patientId)}`,
      { token }
    );
  },

  getPendingServiceOrders: async (patientId: string, token?: string) => {
    return kioskApiClient.get<ServiceOrder[]>(
      `/api/service-order/pending/${encodeURIComponent(patientId)}`,
      { token }
    );
  },

};

