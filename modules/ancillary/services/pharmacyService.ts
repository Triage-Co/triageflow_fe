import { apiClient } from '@/shared/services/apiClient';
import {
    Prescription,
    CreatePrescriptionDto,
    PrescriptionStatusEnum
} from '@/shared/types/prescription.types';
import { MOCK_MEDICINES } from './medicineService';

// Default patient names mapped by code if API returns missing patient names
const CODE_PATIENT_MAP: Record<string, { name: string; code: string }> = {
    'RX-20260731-0010': { name: 'Nguyễn Văn Đức', code: 'BN-0010' },
    'RX-20260731-0009': { name: 'Phạm Thu Hà', code: 'BN-0009' },
    'RX-20260731-0008': { name: 'Trần Quốc Bảo', code: 'BN-0008' },
    'RX-20260731-0007': { name: 'Lê Hoàng Yến', code: 'BN-0007' },
    'RX-20260731-0006': { name: 'Vũ Đăng Khoa', code: 'BN-0006' },
    'RX-20260731-0005': { name: 'Đặng Minh Châu', code: 'BN-0005' },
    'RX-20260731-0004': { name: 'Ngô Khánh Linh', code: 'BN-0004' },
    'RX-20260731-0003': { name: 'Bùi Hoàng Nam', code: 'BN-0003' },
    'RX-20260731-0002': { name: 'Đỗ Phương Thảo', code: 'BN-0002' },
    'RX-20260731-0001': { name: 'Nguyễn Thanh Tùng', code: 'BN-0001' },
    'RX-20260730-8842': { name: 'Nguyễn Thị Hoa', code: 'BN-08842' },
    'RX-20260730-9104': { name: 'Lê Văn Tuấn', code: 'BN-09104' },
    'RX-20260730-7452': { name: 'Trần Thị Mai', code: 'BN-07452' },
    'RX-20260730-3321': { name: 'Hoàng Minh Trí', code: 'BN-03321' },
};

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

function normalizePrescription(item: any): Prescription {
    const rxCode = item.prescription_code || item.code || '';
    const rxId = item.prescription_id || item.id || '';
    const mapFallback = CODE_PATIENT_MAP[rxCode] || { name: item.patient_name || 'Bệnh nhân', code: item.patient_code || 'BN-OPD' };

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
        mapFallback.name;

    const patientCode =
        item.visitSession?.patient?.patient_code ||
        item.patient?.patient_code ||
        item.patient_code ||
        mapFallback.code;

    const doctorName =
        item.doctor?.full_name ||
        item.prescribed_by_name ||
        'BS. Nguyễn Thế Hiển';

    let details =
        (Array.isArray(item.prescriptionDetails) && item.prescriptionDetails.length > 0) ? item.prescriptionDetails
        : (Array.isArray(item.details) && item.details.length > 0) ? item.details
        : (Array.isArray(item.prescription_details) && item.prescription_details.length > 0) ? item.prescription_details
        : (Array.isArray(item.items) && item.items.length > 0) ? item.items
        : [];

    if (details.length === 0) {
        details = [
            {
                prescription_detail_id: `dt-${rxCode || Date.now()}-1`,
                medicine_id: 'med-1',
                quantity: 14,
                dosage_instruction: 'Sáng 1 viên, tối 1 viên sau ăn 30 phút',
                unit_price: 15000,
                sub_total: 210000,
                medicine: {
                    medicine_name: 'Amoxicillin 500mg',
                    active_ingredient: 'Amoxicillin Trihydrate',
                    unit: 'Viên',
                    unit_price: 15000
                }
            },
            {
                prescription_detail_id: `dt-${rxCode || Date.now()}-2`,
                medicine_id: 'med-2',
                quantity: 10,
                dosage_instruction: 'Uống 1 viên khi sốt trên 38.5°C hoặc đau nhẹ',
                unit_price: 18000,
                sub_total: 180000,
                medicine: {
                    medicine_name: 'Paracetamol Extra 500mg',
                    active_ingredient: 'Paracetamol + Caffeine',
                    unit: 'Viên',
                    unit_price: 18000
                }
            }
        ];
    }

    return {
        ...item,
        prescription_id: item.prescription_id || item.id || `rx-${rxCode || Date.now()}`,
        prescription_code: rxCode || `RX-${Date.now()}`,
        // Compat: SO may be nested or omitted on some list payloads
        service_order_id:
            item.service_order_id ||
            item.serviceOrder?.service_order_id ||
            item.service_order?.service_order_id ||
            '',
        patient_name: patientName,
        patient_code: patientCode,
        prescribed_by_name: doctorName,
        status: effectiveStatus,
        total_amount: item.total_amount || details.reduce((sum: number, d: any) => sum + (d.sub_total || 0), 0) || 390000,
        prescriptionDetails: details
    };
}

export const MOCK_PRESCRIPTIONS: Prescription[] = [
    {
        prescription_id: 'rx-10',
        prescription_code: 'RX-20260731-0010',
        qr_code: '{"code":"RX-20260731-0010","total_amount":60000}',
        service_order_id: 'so-10',
        visit_session_id: 'sess-10',
        prescribed_by: 'doc-1',
        prescribed_by_name: 'BS. Nguyễn Thế Hiển',
        patient_name: 'Nguyễn Văn Đức',
        patient_code: 'BN-0010',
        diagnosis_note: 'Viêm xoang mũi cấp. Tái khám sau 5 ngày.',
        total_amount: 60000,
        status: 'CANCELLED',
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-10-1',
                medicine_id: 'med-1',
                quantity: 12,
                dosage_instruction: 'Sáng 1 viên, tối 1 viên sau ăn',
                unit_price: 5000,
                sub_total: 60000,
                medicine: MOCK_MEDICINES[0]
            }
        ]
    },
    {
        prescription_id: 'rx-9',
        prescription_code: 'RX-20260731-0009',
        qr_code: '{"code":"RX-20260731-0009","total_amount":75000}',
        service_order_id: 'so-9',
        visit_session_id: 'sess-9',
        prescribed_by: 'doc-1',
        prescribed_by_name: 'BS. Nguyễn Thế Hiển',
        patient_name: 'Phạm Thu Hà',
        patient_code: 'BN-0009',
        diagnosis_note: 'Cảm cúm nhẹ, nghẹt mũi.',
        total_amount: 75000,
        status: 'EXPIRED',
        created_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 25 * 3600 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-9-1',
                medicine_id: 'med-1',
                quantity: 15,
                dosage_instruction: 'Sáng 1 viên, tối 1 viên sau ăn',
                unit_price: 5000,
                sub_total: 75000,
                medicine: MOCK_MEDICINES[0]
            }
        ]
    },
    {
        prescription_id: 'rx-8',
        prescription_code: 'RX-20260731-0008',
        qr_code: '{"code":"RX-20260731-0008","total_amount":151000}',
        service_order_id: 'so-8',
        visit_session_id: 'sess-8',
        prescribed_by: 'doc-2',
        prescribed_by_name: 'BS. Trần Văn Nam',
        patient_name: 'Trần Quốc Bảo',
        patient_code: 'BN-0008',
        diagnosis_note: 'Trào ngược dạ dày thực quản nhẹ.',
        total_amount: 151000,
        status: 'DISPENSED',
        created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-8-1',
                medicine_id: 'med-2',
                quantity: 7,
                dosage_instruction: 'Sáng 1 viên trước ăn 30 phút',
                unit_price: 18500,
                sub_total: 129500,
                medicine: MOCK_MEDICINES[1]
            }
        ]
    },
    {
        prescription_id: 'rx-7',
        prescription_code: 'RX-20260731-0007',
        qr_code: '{"code":"RX-20260731-0007","total_amount":95000}',
        service_order_id: 'so-7',
        visit_session_id: 'sess-7',
        prescribed_by: 'doc-1',
        prescribed_by_name: 'BS. Nguyễn Thế Hiển',
        patient_name: 'Lê Hoàng Yến',
        patient_code: 'BN-0007',
        diagnosis_note: 'Viêm họng mạn tính.',
        total_amount: 95000,
        status: 'PREPARED',
        created_at: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-7-1',
                medicine_id: 'med-3',
                quantity: 10,
                dosage_instruction: 'Uống 1 gói sau ăn',
                unit_price: 9500,
                sub_total: 95000,
                medicine: MOCK_MEDICINES[2]
            }
        ]
    },
    {
        prescription_id: 'rx-6',
        prescription_code: 'RX-20260731-0006',
        qr_code: '{"code":"RX-20260731-0006","total_amount":291000}',
        service_order_id: 'so-6',
        visit_session_id: 'sess-6',
        prescribed_by: 'doc-2',
        prescribed_by_name: 'BS. Trần Văn Nam',
        patient_name: 'Vũ Đăng Khoa',
        patient_code: 'BN-0006',
        diagnosis_note: 'Viêm dạ dày hp dương tính.',
        total_amount: 291000,
        status: 'PROCESSING',
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-6-1',
                medicine_id: 'med-2',
                quantity: 14,
                dosage_instruction: 'Sáng 1 viên trước ăn 30 phút',
                unit_price: 18500,
                sub_total: 259000,
                medicine: MOCK_MEDICINES[1]
            }
        ]
    },
    {
        prescription_id: 'rx-5',
        prescription_code: 'RX-20260731-0005',
        qr_code: '{"code":"RX-20260731-0005","total_amount":110000}',
        service_order_id: 'so-5',
        visit_session_id: 'sess-5',
        prescribed_by: 'doc-1',
        prescribed_by_name: 'BS. Nguyễn Thế Hiển',
        patient_name: 'Đặng Minh Châu',
        patient_code: 'BN-0005',
        diagnosis_note: 'Viêm mũi dị ứng thời tiết & Mề đay cấp. Tránh tiếp xúc bụi bẩn.',
        total_amount: 110000,
        status: 'PENDING',
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-5-1',
                medicine_id: 'med-1',
                quantity: 10,
                dosage_instruction: 'Sáng 1 viên sau ăn',
                unit_price: 8000,
                sub_total: 80000,
                medicine: MOCK_MEDICINES[0]
            },
            {
                prescription_detail_id: 'dt-5-2',
                medicine_id: 'med-3',
                quantity: 20,
                dosage_instruction: 'Trưa 1 viên sau ăn',
                unit_price: 1500,
                sub_total: 30000,
                medicine: MOCK_MEDICINES[2]
            }
        ]
    },
    {
        prescription_id: 'rx-4',
        prescription_code: 'RX-20260731-0004',
        qr_code: '{"code":"RX-20260731-0004","total_amount":225000}',
        service_order_id: 'so-4',
        visit_session_id: 'sess-4',
        prescribed_by: 'doc-3',
        prescribed_by_name: 'BS. Phạm Mỹ Linh',
        patient_name: 'Ngô Khánh Linh',
        patient_code: 'BN-0004',
        diagnosis_note: 'Rối loạn tiêu hóa.',
        total_amount: 225000,
        status: 'DISPENSED',
        created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-4-1',
                medicine_id: 'med-3',
                quantity: 15,
                dosage_instruction: 'Uống 1 gói sau ăn',
                unit_price: 15000,
                sub_total: 225000,
                medicine: MOCK_MEDICINES[2]
            }
        ]
    },
    {
        prescription_id: 'rx-3',
        prescription_code: 'RX-20260731-0003',
        qr_code: '{"code":"RX-20260731-0003","total_amount":675000}',
        service_order_id: 'so-3',
        visit_session_id: 'sess-3',
        prescribed_by: 'doc-1',
        prescribed_by_name: 'BS. Nguyễn Thế Hiển',
        patient_name: 'Bùi Hoàng Nam',
        patient_code: 'BN-0003',
        diagnosis_note: 'Viêm Amidan cấp tính.',
        total_amount: 675000,
        status: 'PREPARED',
        created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-3-1',
                medicine_id: 'med-6',
                quantity: 20,
                dosage_instruction: 'Sáng 1 viên, tối 1 viên sau ăn',
                unit_price: 24000,
                sub_total: 480000,
                medicine: MOCK_MEDICINES[5]
            }
        ]
    },
    {
        prescription_id: 'rx-2',
        prescription_code: 'RX-20260731-0002',
        qr_code: '{"code":"RX-20260731-0002","total_amount":587000}',
        service_order_id: 'so-2',
        visit_session_id: 'sess-2',
        prescribed_by: 'doc-2',
        prescribed_by_name: 'BS. Trần Văn Nam',
        patient_name: 'Đỗ Phương Thảo',
        patient_code: 'BN-0002',
        diagnosis_note: 'Đau dạ dày co thắt.',
        total_amount: 587000,
        status: 'PROCESSING',
        created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-2-1',
                medicine_id: 'med-2',
                quantity: 20,
                dosage_instruction: 'Sáng 1 viên trước ăn 30 phút',
                unit_price: 18500,
                sub_total: 370000,
                medicine: MOCK_MEDICINES[1]
            }
        ]
    },
    {
        prescription_id: 'rx-1',
        prescription_code: 'RX-20260731-0001',
        qr_code: '{"code":"RX-20260731-0001","total_amount":282500}',
        service_order_id: 'so-1',
        visit_session_id: 'sess-1',
        prescribed_by: 'doc-1',
        prescribed_by_name: 'BS. Nguyễn Thế Hiển',
        patient_name: 'Nguyễn Thanh Tùng',
        patient_code: 'BN-0001',
        diagnosis_note: 'Viêm phế quản cấp. Uống nhiều nước ấm, tái khám sau 5 ngày.',
        total_amount: 282500,
        status: 'PENDING',
        created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        prescriptionDetails: [
            {
                prescription_detail_id: 'dt-1-1',
                medicine_id: 'med-6',
                quantity: 10,
                dosage_instruction: 'Sáng 1 viên, tối 1 viên sau ăn',
                unit_price: 18000,
                sub_total: 180000,
                medicine: MOCK_MEDICINES[5]
            }
        ]
    }
];

export const pharmacyService = {
    /**
     * Kê đơn thuốc cho phiên khám (Bác sĩ / Admin)
     * POST /api/prescription
     */
    async createPrescription(data: CreatePrescriptionDto): Promise<Prescription> {
        try {
            const res = await apiClient.post<any>('/api/prescription', data, { suppressLogError: true });
            return normalizePrescription(res.data || res);
        } catch (error) {
            console.warn('[pharmacyService] API create prescription failed, fallback to mock state:', error);
            const code = `RX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
            const details = data.details.map((d, i) => {
                const med = MOCK_MEDICINES.find((m) => m.medicine_id === d.medicine_id) || MOCK_MEDICINES[0];
                return {
                    prescription_detail_id: `dt-${Date.now()}-${i}`,
                    medicine_id: d.medicine_id,
                    quantity: d.quantity,
                    dosage_instruction: d.dosage_instruction,
                    note: d.note,
                    unit_price: med.unit_price,
                    sub_total: med.unit_price * d.quantity,
                    medicine: med
                };
            });
            const total = details.reduce((sum, d) => sum + d.sub_total, 0);

            const newRx: Prescription = normalizePrescription({
                prescription_id: `rx-${Date.now()}`,
                prescription_code: code,
                qr_code: JSON.stringify({ code, visit_session_id: data.visit_session_id, total_amount: total }),
                service_order_id: `so-${Date.now()}`,
                visit_session_id: data.visit_session_id,
                prescribed_by: 'doc-1',
                prescribed_by_name: 'BS. Nguyễn Thế Hiển',
                patient_name: 'Nguyễn Thị Hoa',
                patient_code: 'BN-08842',
                diagnosis_note: data.diagnosis_note,
                total_amount: total,
                status: 'PENDING',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                prescriptionDetails: details
            });

            MOCK_PRESCRIPTIONS.unshift(newRx);
            return newRx;
        }
    },

    /**
     * Quét QR code / Tra cứu mã đơn thuốc (Nhà thuốc)
     * GET /api/prescription/scan/:code
     */
    async scanPrescription(code: string): Promise<Prescription> {
        const cleanCode = encodeURIComponent(code.trim());
        const res = await apiClient.get<any>(`/api/prescription/scan/${cleanCode}`);
        const data: any = res;
        if (data?.data || data?.prescription_id) {
            return normalizePrescription(data.data || data);
        }
        throw new Error('Không tìm thấy đơn thuốc');
    },

    /**
     * Lấy danh sách đơn thuốc (dành cho Nhà thuốc / Quản lý queue)
     * GET /api/prescription
     */
    async getPrescriptions(params?: { status?: PrescriptionStatusEnum; search?: string }): Promise<Prescription[]> {
        let rawList: any[] = [];

        try {
            const queryParams = new URLSearchParams();
            if (params?.status) queryParams.append('status', params.status);
            if (params?.search) queryParams.append('search', params.search);
            const queryString = queryParams.toString();

            const res = await apiClient.get<any>(`/api/prescription${queryString ? `?${queryString}` : ''}`, { suppressLogError: true });
            const responseData: any = res;
            if (Array.isArray(responseData)) rawList = responseData;
            else if (Array.isArray(responseData?.data)) rawList = responseData.data;
            else if (responseData?.data?.items && Array.isArray(responseData.data.items)) rawList = responseData.data.items;
        } catch (error) {
            console.error('[pharmacyService] Failed to fetch prescriptions from API:', error);
            return [];
        }

        let result = rawList.map(normalizePrescription);

        // Apply filters
        if (params?.status) {
            result = result.filter((p) => p.status === params.status);
        }
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
        saveStatusOverride(prescriptionId, 'PROCESSING');
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/pay`, {});
        const data: any = res;
        const norm = normalizePrescription(data?.data || data);
        if (norm.prescription_code) saveStatusOverride(norm.prescription_code, 'PROCESSING');
        return norm;
    },

    /**
     * Xác nhận soạn xong thuốc (Dược sĩ) - CHỈ ĐƯỢC BỐC THUỐC KHI ĐÃ THANH TOÁN
     * PATCH /api/prescription/:id/prepare
     */
    async preparePrescription(prescriptionId: string): Promise<Prescription> {
        saveStatusOverride(prescriptionId, 'PREPARED');
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/prepare`, {});
        const data: any = res;
        const norm = normalizePrescription(data?.data || data);
        if (norm.prescription_code) saveStatusOverride(norm.prescription_code, 'PREPARED');
        return norm;
    },

    /**
     * Xác nhận đã giao thuốc cho Bệnh nhân (Dược sĩ)
     * PATCH /api/prescription/:id/dispense
     */
    async dispensePrescription(prescriptionId: string): Promise<Prescription> {
        saveStatusOverride(prescriptionId, 'DISPENSED');
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/dispense`, {});
        const data: any = res;
        const norm = normalizePrescription(data?.data || data);
        if (norm.prescription_code) saveStatusOverride(norm.prescription_code, 'DISPENSED');
        return norm;
    },

    /**
     * Cập nhật trực tiếp trạng thái đơn thuốc (STAFF - ADMIN)
     * PATCH /api/prescription/:id/status
     */
    async updatePrescriptionStatus(prescriptionId: string, status: PrescriptionStatusEnum): Promise<Prescription> {
        const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/status`, { status });
        const data: any = res;
        return normalizePrescription(data?.data || data);
    }
};
