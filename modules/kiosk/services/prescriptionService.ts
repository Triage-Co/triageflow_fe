import { kioskApiClient } from './kioskApiClient';
import {
  TicketPrescriptionResponse,
  PrescriptionData,
} from '../types/prescription.types';

export const prescriptionService = {
  /**
   * Lấy đơn thuốc gắn với mã phiếu khám (Ticket Code)
   * Endpoint: GET /api/ticket/:code/prescription
   */
  getPrescriptionByTicketCode: async (ticketCode: string, token?: string) => {
    return kioskApiClient.get<TicketPrescriptionResponse>(
      `/api/ticket/${encodeURIComponent(ticketCode)}/prescription`,
      { token }
    );
  },

  /**
   * Lấy đơn thuốc theo ID phiên khám (visit_session_id)
   * Endpoint: GET /api/prescription/visit-session/:visit_session_id
   */
  getPrescriptionByVisitSession: async (visitSessionId: string, token?: string) => {
    return kioskApiClient.get<{
      code: number;
      status: string;
      message: string;
      data: PrescriptionData;
    }>(
      `/api/prescription/visit-session/${encodeURIComponent(visitSessionId)}`,
      { token }
    );
  },

  /**
   * Lấy danh sách đơn thuốc theo ID bệnh nhân
   * Endpoint: GET /api/prescription?patient_id=:patient_id
   */
  getPrescriptionsByPatient: async (patientId: string, token?: string) => {
    return kioskApiClient.get<{
      code: number;
      status: string;
      message: string;
      data: PrescriptionData[] | { items: PrescriptionData[] };
    }>(
      `/api/prescription?patient_id=${encodeURIComponent(patientId)}`,
      { token }
    );
  },
};
