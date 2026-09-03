import { kioskApiClient } from './kioskApiClient';
import {
  PatientVisitBillingResponse,
  PatientBillingResponse,
} from '../types/invoice.types';

export const invoiceService = {
  /**
   * Lấy chi tiết hóa đơn theo lần khám của bệnh nhân
   * Endpoint: GET /api/invoice/patient/:patient_id/booking/:booking_id
   */
  getPatientVisitBilling: async (
    patientId: string,
    bookingId: string,
    token?: string
  ) => {
    return kioskApiClient.get<PatientVisitBillingResponse>(
      `/api/invoice/patient/${encodeURIComponent(patientId)}/booking/${encodeURIComponent(bookingId)}`,
      { token }
    );
  },

  /**
   * Lấy tổng hợp hóa đơn bệnh nhân theo các lần khám
   * Endpoint: GET /api/invoice/patient/:patient_id
   */
  getPatientBilling: async (
    patientId: string,
    params?: { page?: number; limit?: number; payment_status?: string },
    token?: string
  ) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.payment_status) query.append('payment_status', params.payment_status);

    const qs = query.toString();
    const url = `/api/invoice/patient/${encodeURIComponent(patientId)}${qs ? `?${qs}` : ''}`;

    return kioskApiClient.get<PatientBillingResponse>(url, { token });
  },

  /**
   * Lấy chi tiết 1 hóa đơn cụ thể theo ID
   * Endpoint: GET /api/invoice/:id
   */
  getInvoiceById: async (invoiceId: string, token?: string) => {
    return kioskApiClient.get<any>(
      `/api/invoice/${encodeURIComponent(invoiceId)}`,
      { token }
    );
  },
};
