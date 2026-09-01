import { apiClient } from '@/shared/services/apiClient';
import {
    Prescription,
    CreatePrescriptionDto,
    PrescriptionStatusEnum
} from '@/shared/types/prescription.types';
import type { PharmacyDisplayPayload } from '../types/pharmacy-display.types';

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLikelyUuid(value?: string | null): boolean {
    if (!value) return false;
    return UUID_RE.test(String(value).trim());
}

function resolveDoctorName(item: Record<string, unknown>): string {
    const doctor = item.doctor as { full_name?: string } | undefined;
    if (doctor?.full_name?.trim()) return doctor.full_name.trim();
    if (typeof item.prescribed_by_name === 'string' && item.prescribed_by_name.trim()) {
        return item.prescribed_by_name.trim();
    }
    const prescribedBy = item.prescribed_by;
    if (typeof prescribedBy === 'string' && prescribedBy.trim() && !isLikelyUuid(prescribedBy)) {
        return prescribedBy.trim();
    }
    return '';
}

function normalizeDetailMedicine(d: Record<string, unknown>, idx: number) {
    const nested =
        d.medicine && typeof d.medicine === 'object'
            ? (d.medicine as Record<string, unknown>)
            : {};
    const medicineId = String(d.medicine_id || nested.medicine_id || '');
    const medicineName =
        String(nested.medicine_name || d.medicine_name || d.name || nested.name || '').trim() ||
        'Thuốc kê đơn';

    return {
        prescription_detail_id: String(d.prescription_detail_id || d.id || `detail-${idx}`),
        medicine_id: medicineId,
        quantity: Number(d.quantity) || 0,
        dosage_instruction: String(d.dosage_instruction || d.usage || ''),
        note: String(d.note || ''),
        unit_price: Number(d.unit_price ?? nested.unit_price ?? 0) || 0,
        sub_total:
            Number(d.sub_total) ||
            (Number(d.quantity) || 0) * (Number(d.unit_price ?? nested.unit_price ?? 0) || 0),
        medicine: {
            medicine_id: medicineId,
            medicine_code: String(nested.medicine_code || d.medicine_code || ''),
            medicine_name: medicineName,
            active_ingredient: String(nested.active_ingredient || d.active_ingredient || ''),
            unit: String(nested.unit || d.unit || 'Viên'),
            usage_route: String(nested.usage_route || d.usage_route || ''),
            unit_price: Number(nested.unit_price ?? d.unit_price ?? 0) || 0,
            is_active: true,
            created_at: '',
            updated_at: '',
        },
    };
}

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

    const doctorName = resolveDoctorName(item as Record<string, unknown>);

    const rawDetails =
        (Array.isArray(item.prescriptionDetails) && item.prescriptionDetails.length > 0)
            ? item.prescriptionDetails
            : Array.isArray(item.details) && item.details.length > 0
              ? item.details
              : Array.isArray(item.prescription_details) && item.prescription_details.length > 0
                ? item.prescription_details
                : Array.isArray(item.items) && item.items.length > 0
                  ? item.items
                  : [];

    const details = rawDetails.map((d: Record<string, unknown>, idx: number) =>
        normalizeDetailMedicine(d, idx)
    );

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
        prescriptionDetails: details,
        pickup_number: item.pickup_number ?? null,
        pickup_date: item.pickup_date ?? null,
        called_at: item.called_at ?? null,
        missed_at: item.missed_at ?? null,
        display_screen_id: item.display_screen_id ?? null,
    };
}

function mergePrescriptionDetails(
    previous: Prescription['prescriptionDetails'],
    incoming: Prescription['prescriptionDetails']
): Prescription['prescriptionDetails'] {
    if (!incoming.length) return previous;
    if (!previous.length) return incoming;

    const prevByKey = new Map(
        previous.map((d, idx) => [d.prescription_detail_id || d.medicine_id || `idx-${idx}`, d])
    );

    return incoming.map((detail, idx) => {
        const key = detail.prescription_detail_id || detail.medicine_id || `idx-${idx}`;
        const prev =
            prevByKey.get(key) ||
            previous.find((p) => p.medicine_id && p.medicine_id === detail.medicine_id);
        if (!prev) return detail;

        return {
            ...prev,
            ...detail,
            dosage_instruction: detail.dosage_instruction || prev.dosage_instruction,
            note: detail.note ?? prev.note,
            unit_price: detail.unit_price ?? prev.unit_price,
            sub_total: detail.sub_total ?? prev.sub_total,
            medicine: {
                ...(prev.medicine || {}),
                ...(detail.medicine || {}),
                medicine_id: detail.medicine_id || prev.medicine_id,
                medicine_name:
                    detail.medicine?.medicine_name?.trim() ||
                    prev.medicine?.medicine_name?.trim() ||
                    'Thuốc kê đơn',
                active_ingredient:
                    detail.medicine?.active_ingredient || prev.medicine?.active_ingredient || '',
                unit: detail.medicine?.unit || prev.medicine?.unit || 'Viên',
                unit_price: detail.medicine?.unit_price ?? prev.medicine?.unit_price ?? 0,
            },
        };
    });
}

/** Giữ tên BN / bác sĩ / thuốc khi BE trả payload rút gọn sau pay/prepare/dispense. */
export function mergePrescription(
    previous: Prescription | null | undefined,
    incoming: Prescription
): Prescription {
    const normalized = normalizePrescription(incoming);
    if (!previous || previous.prescription_id !== normalized.prescription_id) {
        return normalized;
    }

    return normalizePrescription({
        ...previous,
        ...normalized,
        patient_name: normalized.patient_name || previous.patient_name,
        patient_code: normalized.patient_code || previous.patient_code,
        prescribed_by_name: normalized.prescribed_by_name || previous.prescribed_by_name,
        diagnosis_note: normalized.diagnosis_note || previous.diagnosis_note,
        visitSession: normalized.visitSession || previous.visitSession,
        doctor: normalized.doctor || previous.doctor,
        prescriptionDetails: mergePrescriptionDetails(
            previous.prescriptionDetails || [],
            normalized.prescriptionDetails || []
        ),
    });
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
                    p.pickup_number?.toLowerCase().includes(s) ||
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


    async preparePrescription(prescriptionId: string, displayScreenId?: string): Promise<Prescription> {
        const res = await apiClient.patch<any>(
            `/api/prescription/${prescriptionId}/prepare`,
            displayScreenId ? { display_screen_id: displayScreenId } : {}
        );
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
    },

    async getPharmacyDisplay(roomId?: string): Promise<PharmacyDisplayPayload> {
        const query = roomId ? `?room_id=${encodeURIComponent(roomId)}` : '';
        const res = await apiClient.get<any>(`/api/prescription/pharmacy-display${query}`, {
            suppressLogError: true
        });
        const data = (res as any)?.calling_numbers ? res : (res as any)?.data || res;
        return {
            kind: 'pharmacy',
            room: data?.room || { room_id: roomId || '', room_name: 'Nhà thuốc' },
            calling_numbers: Array.isArray(data?.calling_numbers) ? data.calling_numbers : [],
            missed_numbers: Array.isArray(data?.missed_numbers) ? data.missed_numbers : [],
            ready_unshown_count: Number(data?.ready_unshown_count || 0),
            removed_ids: Array.isArray(data?.removed_ids) ? data.removed_ids : undefined
        };
    },

    async callNextPharmacy(options?: {
        roomId?: string;
        displayScreenId?: string;
        prescriptionId?: string;
    }): Promise<PharmacyDisplayPayload & { called_count?: number }> {
        const body: Record<string, string> = {};
        if (options?.roomId) body.room_id = options.roomId;
        if (options?.displayScreenId) body.display_screen_id = options.displayScreenId;
        if (options?.prescriptionId) body.prescription_id = options.prescriptionId;
        const res = await apiClient.post<any>('/api/prescription/call-next', body);
        const data: any = res?.data || res;
        return data;
    },

    async missPrescription(prescriptionId: string): Promise<Prescription> {
        const res = await apiClient.post<any>(`/api/prescription/${prescriptionId}/miss`, {});
        const data: any = res?.data || res;
        return normalizePrescription(data);
    },

    async recallPrescription(prescriptionId: string): Promise<Prescription> {
        const res = await apiClient.post<any>(`/api/prescription/${prescriptionId}/recall`, {});
        const data: any = res?.data || res;
        return normalizePrescription(data);
    }
};
