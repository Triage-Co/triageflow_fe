import { apiClient } from '@/shared/services/apiClient';
import { pharmacyService } from '@/modules/ancillary/services/pharmacyService';

export const paymentService = {
    /**
     * Xác nhận thanh toán tiền mặt (Offline) tại quầy nhà thuốc / thu ngân
     * PATCH /api/prescription/:id/pay
     */
    async payPrescriptionOffline(prescriptionId: string): Promise<any> {
        if (typeof window !== 'undefined') {
            localStorage.setItem('triageflow_prescription_paid', JSON.stringify({ id: prescriptionId, time: Date.now() }));
        }
        return await pharmacyService.payPrescriptionOffline(prescriptionId);
    },

    /**
     * Khởi tạo giao dịch thanh toán chuyển khoản PayOS cho đơn thuốc
     * POST /api/transaction
     */
    async createPrescriptionPayOsTransaction(
        serviceOrderId: string,
        amount: number,
        token?: string
    ): Promise<any> {
        const payload = {
            transType: 'APPOINTMENT_PAYMENT',
            amount: amount,
            clientId: '75a51e00-b2e7-447a-b39e-7c00a09cf15c',
            returnUrl: 'https://www.youtube.com/shorts/8Y9-C4UYE_g',
            cancelUrl: 'https://www.youtube.com/watch?v=TQM8bUHOEuE',
            service_order_id: serviceOrderId
        };

        const res = await apiClient.post<any>(
            '/api/transaction',
            payload,
            token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
        );

        return res?.data || res;
    },

    /**
     * Lấy toàn bộ danh sách giao dịch thanh toán
     * GET /api/transaction
     */
    async getAllTransactions(token?: string): Promise<any[]> {
        try {
            const res = await apiClient.get<any>(
                '/api/transaction',
                token ? { headers: { Authorization: `Bearer ${token}` } } : { suppressLogError: true }
            );
            return Array.isArray(res) ? res : res?.data || [];
        } catch (error) {
            console.warn('[paymentService] API getAllTransactions failed:', error);
            return [];
        }
    },

    /**
     * Lấy chi tiết giao dịch thanh toán theo ID
     * GET /api/transaction/:id
     */
    async getTransactionById(transactionId: string, token?: string): Promise<any> {
        try {
            const res = await apiClient.get<any>(
                `/api/transaction/${transactionId}`,
                token ? { headers: { Authorization: `Bearer ${token}` } } : { suppressLogError: true }
            );
            return res?.data || res;
        } catch (error) {
            console.warn('[paymentService] API getTransactionById failed:', error);
            return null;
        }
    }
};
