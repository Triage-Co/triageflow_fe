import { apiClient } from '@/shared/services/apiClient';
import {
    Prescription,
    CreatePrescriptionDto,
    PrescriptionStatusEnum
} from '@/shared/types/prescription.types';

export function normalizePrescription(item: any): Prescription {
    if (!item) return {} as Prescription;

    const rxCode = item.prescription_code || item.code || '';
    const rxId = item.prescription_id || item.id || '';
    const effectiveStatus: PrescriptionStatusEnum = item.status || 'PENDING';

    const patientName =
        item.visitSession?.patient?.full_name ||
        item.patient?.full_name ||
        item.serviceOrder?.patient?.full_name ||
        item.patient_name ||
        '';

    const patientCode =
        item.visitSession?.patient?.patient_code ||
        item.patient?.patient_code ||
        item.patient_code ||
        '';

    const doctorName =
        item.doctor?.full_name ||
        item.prescribed_by_name ||
        item.prescribed_by ||
        '';

    const rawDetails =
        (Array.isArray(item.prescriptionDetails) && item.prescriptionDetails.length > 0) ? item.prescriptionDetails
            : (Array.isArray(item.details) && item.details.length > 0) ? item.details
                : (Array.isArray(item.prescription_details) && item.prescription_details.length > 0) ? item.prescription_details
                    : (Array.isArray(item.items) && item.items.length > 0) ? item.items
                        : [];

    const details = rawDetails.map((d: any, idx: number) => ({
        prescription_detail_id: d.prescription_detail_id || d.id || `detail-${idx}`,
        medicine_id: d.medicine_id || d.medicine?.medicine_id || '',
        quantity: d.quantity || 0,
        dosage_instruction: d.dosage_instruction || d.usage || '',
        note: d.note || '',
        unit_price: d.unit_price || d.medicine?.unit_price || 0,
        sub_total: d.sub_total || ((d.quantity || 0) * (d.unit_price || d.medicine?.unit_price || 0)),
        medicine: d.medicine || {
            medicine_id: d.medicine_id || '',
            medicine_name: d.medicine_name || d.name || 'Thuốc kê đơn',
            active_ingredient: d.active_ingredient || '',
            unit: d.unit || 'Viên',
            unit_price: d.unit_price || 0
        }
    }));

    const calculatedTotal = details.reduce((sum: number, d: any) => sum + (d.sub_total || 0), 0);

    return {
        ...item,
        prescription_id: rxId,
        prescription_code: rxCode,
        service_order_id:
            item.service_order_id ||
            item.serviceOrder?.service_order_id ||
            item.service_order?.service_order_id ||
            '',
        visit_session_id: item.visit_session_id || item.visitSession?.visit_session_id || '',
        prescribed_by: item.prescribed_by || '',
        patient_name: patientName,
        patient_code: patientCode,
        prescribed_by_name: doctorName,
        diagnosis_note: item.diagnosis_note || '',
        status: effectiveStatus,
        total_amount: item.total_amount !== undefined && item.total_amount !== null ? item.total_amount : calculatedTotal,
        prescriptionDetails: details
    };
}

export interface GetPrescriptionsParams {
    patient_id?: string;
    visit_session_id?: string;
    status?: PrescriptionStatusEnum;
    date?: string; // YYYY-MM-DD
    page?: number;
    limit?: number;
    search?: string;
}

export const pharmacyService = {

    async createPrescription(data: CreatePrescriptionDto): Promise<Prescription> {
        const res = await apiClient.post<any>('/api/prescription', data);
        const resData = res?.data || res;
        return normalizePrescription(resData);
    },

    async scanPrescription(code: string): Promise<Prescription> {
        const cleanCode = encodeURIComponent(code.trim());
        const res = await apiClient.get<any>(`/api/prescription/scan/${cleanCode}`);
        const data = res?.data || res;
        if (!data || (!data.prescription_id && !data.prescription_code && !data.id && !data.code)) {
            throw new Error(`Không tìm thấy thông tin đơn thuốc với mã: ${code}`);
        }
        return normalizePrescription(data);
    },

    async getPrescriptions(params?: GetPrescriptionsParams): Promise<Prescription[]> {
        let rawList: any[] = [];

        try {
            const queryParams = new URLSearchParams();
            if (params?.patient_id) queryParams.append('patient_id', params.patient_id);
            if (params?.visit_session_id) queryParams.append('visit_session_id', params.visit_session_id);
            if (params?.status) queryParams.append('status', params.status);
            if (params?.date) queryParams.append('date', params.date);
            if (params?.page) queryParams.append('page', String(params.page));
            if (params?.limit) queryParams.append('limit', String(params.limit));
            if (params?.search) queryParams.append('search', params.search);
            const queryString = queryParams.toString();

            const res = await apiClient.get<any>(`/api/prescription${queryString ? `?${queryString}` : ''}`, { suppressLogError: true });
            const responseData: any = res;
            if (Array.isArray(responseData)) rawList = responseData;
            else if (Array.isArray(responseData?.data)) rawList = responseData.data;
            else if (responseData?.data?.items && Array.isArray(responseData.data.items)) rawList = responseData.data.items;
        } catch (error) {
            console.error('[pharmacyService] Failed to fetch prescriptions:', error);
            return [];
        }

        let result = rawList.map(normalizePrescription);
        if (params?.search) {
            const s = params.search.toLowerCase();
            result = result.filter(
                (p) =>
                    p.prescription_code?.toLowerCase().includes(s) ||
                    p.patient_name?.toLowerCase().includes(s) ||
                    p.patient_code?.toLowerCase().includes(s)
            );
        }

        return result;
    },


    async getPrescriptionById(prescriptionId: string): Promise<Prescription> {
        const res = await apiClient.get<any>(`/api/prescription/${prescriptionId}`);
        const data = res?.data || res;
        return normalizePrescription(data);
    },


    async payPrescriptionOffline(prescriptionId: string): Promise<Prescription> {
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/pay`, {});
        const data: any = res?.data || res;
        return normalizePrescription(data);
    },


    async preparePrescription(prescriptionId: string): Promise<Prescription> {
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/prepare`, {});
        const data: any = res?.data || res;
        return normalizePrescription(data);
    },


    async dispensePrescription(prescriptionId: string): Promise<Prescription> {
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/dispense`, {});
        const data: any = res?.data || res;
        return normalizePrescription(data);
    },


    async updatePrescriptionStatus(prescriptionId: string, status: PrescriptionStatusEnum): Promise<Prescription> {
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/status`, { status });
        const data: any = res?.data || res;
        return normalizePrescription(data);
    }
};
