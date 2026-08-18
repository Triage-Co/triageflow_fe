import { apiClient } from '@/shared/services/apiClient';
import {
    Prescription,
    CreatePrescriptionDto,
    PrescriptionStatusEnum
} from '@/shared/types/prescription.types';

const STATUS_OVERRIDE_KEY = 'triageflow_prescription_status_overrides';

export function getStatusOverrides(): Record<string, PrescriptionStatusEnum> {
    if (typeof window === 'undefined') return {};
    try {
        const stored = localStorage.getItem(STATUS_OVERRIDE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
}

export function saveStatusOverride(idOrCode: string, status: PrescriptionStatusEnum) {
    if (!idOrCode || typeof window === 'undefined') return;
    try {
        const current = getStatusOverrides();
        const cleanKey = idOrCode.trim().toLowerCase();
        current[cleanKey] = status;
        localStorage.setItem(STATUS_OVERRIDE_KEY, JSON.stringify(current));
        localStorage.setItem('triageflow_prescription_paid', JSON.stringify({ id: idOrCode, status, time: Date.now() }));

        // Fire window events for real-time reactive sync across components
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('triageflow_prescription_paid', { detail: { id: idOrCode, status } }));
    } catch (e) {
        console.error('[pharmacyService] Failed to save status override:', e);
    }
}

export function normalizePrescription(item: any): Prescription {
    if (!item) return {} as Prescription;

    const rxCode = item.prescription_code || item.code || '';
    const rxId = item.prescription_id || item.id || '';

    // Apply status overrides if present in localStorage
    const overrides = getStatusOverrides();
    const cleanId = (rxId || '').trim().toLowerCase();
    const cleanCode = (rxCode || '').trim().toLowerCase();

    let effectiveStatus: PrescriptionStatusEnum = item.status || 'PENDING';
    if (cleanId && overrides[cleanId]) {
        effectiveStatus = overrides[cleanId];
    } else if (cleanCode && overrides[cleanCode]) {
        effectiveStatus = overrides[cleanCode];
    }

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
    /**
     * Kê đơn thuốc cho phiên khám (Bác sĩ / Admin)
     * POST /api/prescription
     */
    async createPrescription(data: CreatePrescriptionDto): Promise<Prescription> {
        const res = await apiClient.post<any>('/api/prescription', data);
        const resData = res?.data || res;
        return normalizePrescription(resData);
    },

    /**
     * Quét QR code / Tra cứu mã đơn thuốc (Nhà thuốc)
     * GET /api/prescription/scan/:code
     */
    async scanPrescription(code: string): Promise<Prescription> {
        const cleanCode = encodeURIComponent(code.trim());
        const res = await apiClient.get<any>(`/api/prescription/scan/${cleanCode}`);
        const data = res?.data || res;
        if (!data || (!data.prescription_id && !data.prescription_code && !data.id && !data.code)) {
            throw new Error(`Không tìm thấy thông tin đơn thuốc với mã: ${code}`);
        }
        return normalizePrescription(data);
    },

    /**
     * Lấy danh sách đơn thuốc (dành cho Nhà thuốc / Quản lý queue)
     * GET /api/prescription
     */
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

        // Client-side search fallback if search was also provided
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

    /**
     * Xác nhận thanh toán offline tại quầy (Nhà thuốc / Thu ngân)
     * PATCH /api/prescription/:id/pay
     */
    async payPrescriptionOffline(prescriptionId: string): Promise<Prescription> {
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/pay`, {});
        const data: any = res?.data || res;
        const norm = normalizePrescription(data);
        if (norm.prescription_code) saveStatusOverride(norm.prescription_code, 'PROCESSING');
        if (norm.prescription_id) saveStatusOverride(norm.prescription_id, 'PROCESSING');
        return norm;
    },

    /**
     * Xác nhận soạn xong thuốc (Dược sĩ) - CHỈ ĐƯỢC BỐC THUỐC KHI ĐÃ THANH TOÁN
     * PATCH /api/prescription/:id/prepare
     */
    async preparePrescription(prescriptionId: string): Promise<Prescription> {
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/prepare`, {});
        const data: any = res?.data || res;
        const norm = normalizePrescription(data);
        if (norm.prescription_code) saveStatusOverride(norm.prescription_code, 'PREPARED');
        if (norm.prescription_id) saveStatusOverride(norm.prescription_id, 'PREPARED');
        return norm;
    },

    /**
     * Xác nhận đã giao thuốc cho Bệnh nhân (Dược sĩ)
     * PATCH /api/prescription/:id/dispense
     */
    async dispensePrescription(prescriptionId: string): Promise<Prescription> {
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/dispense`, {});
        const data: any = res?.data || res;
        const norm = normalizePrescription(data);
        if (norm.prescription_code) saveStatusOverride(norm.prescription_code, 'DISPENSED');
        if (norm.prescription_id) saveStatusOverride(norm.prescription_id, 'DISPENSED');
        return norm;
    },

    /**
     * Cập nhật trực tiếp trạng thái đơn thuốc (STAFF - ADMIN)
     * PATCH /api/prescription/:id/status
     */
    async updatePrescriptionStatus(prescriptionId: string, status: PrescriptionStatusEnum): Promise<Prescription> {
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/status`, { status });
        const data: any = res?.data || res;
        return normalizePrescription(data);
    }
};
