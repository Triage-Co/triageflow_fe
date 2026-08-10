import { apiClient, ApiError } from '@/shared/services/apiClient';
import type {
    CreatePrescriptionDto,
    Prescription,
    UpdatePrescriptionDto,
} from '@/shared/types/prescription.types';

function unwrapPrescription(raw: unknown): Prescription {
    if (!raw || typeof raw !== 'object') {
        throw new Error('Phản hồi đơn thuốc không hợp lệ');
    }
    const obj = raw as Record<string, unknown>;
    const data = (obj.data && typeof obj.data === 'object' ? obj.data : obj) as Prescription;
    if (!data.prescription_id && !data.prescription_code) {
        throw new Error('Phản hồi đơn thuốc thiếu mã định danh');
    }
    return data;
}

export const doctorPrescriptionService = {
    /**
     * GET /api/prescription/visit-session/:id
     * 404 → null (chưa có đơn); lỗi khác throw.
     */
    async getByVisitSession(visitSessionId: string): Promise<Prescription | null> {
        try {
            const res = await apiClient.get<unknown>(
                `/api/prescription/visit-session/${visitSessionId}`,
                { suppressLogError: true }
            );
            return unwrapPrescription(res);
        } catch (err) {
            if (err instanceof ApiError && err.statusCode === 404) {
                return null;
            }
            throw err;
        }
    },

    async create(data: CreatePrescriptionDto): Promise<Prescription> {
        const res = await apiClient.post<unknown>('/api/prescription', data);
        return unwrapPrescription(res);
    },

    async update(id: string, data: UpdatePrescriptionDto): Promise<Prescription> {
        const res = await apiClient.patch<unknown>(`/api/prescription/${id}`, data);
        return unwrapPrescription(res);
    },

    async remove(id: string): Promise<void> {
        await apiClient.delete<unknown>(`/api/prescription/${id}`);
    },
};
