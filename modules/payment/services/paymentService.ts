import { apiClient } from '@/shared/services/apiClient';
import { PaymentTransaction, CreatePaymentDto, PaymentStatusEnum } from '../types/payment.types';
import { pharmacyService } from '@/modules/ancillary/services/pharmacyService';

export const paymentService = {
    /**
     * Xác nhận thanh toán tiền mặt (Offline) tại quầy nhà thuốc / thu ngân
     * PATCH /api/prescription/:id/pay
     */
    async payPrescriptionOffline(prescriptionId: string): Promise<any> {
        // Update local state immediately for seamless UI responsiveness across tabs
        pharmacyService.payPrescriptionOffline(prescriptionId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('triageflow_prescription_paid', JSON.stringify({ id: prescriptionId, time: Date.now() }));
        }

        try {
            const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/pay`, {}, { suppressLogError: true });
            return res.data || res;
        } catch (error) {
            console.warn('[paymentService] API pay offline fallback to local state:', error);
            return { status: 'SUCCESS' };
        }
    },

    /**
     * Khởi tạo giao dịch thanh toán chuyển khoản PayOS cho đơn thuốc
     * POST /api/transaction
     */
    async createPrescriptionPayOsTransaction(
        prescriptionId: string,
        amount: number,
        prescriptionCode: string,
        token?: string
    ): Promise<any> {
        try {
            const getSafeUrl = (path: string) => {
                if (typeof window === 'undefined') return `https://triageflow.me${path}`;
                const hostname = window.location.hostname;
                const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
                const origin = isIp ? `http://localhost:${window.location.port || '3000'}` : window.location.origin;
                return `${origin}${path}`;
            };

            const res = await apiClient.post<any>(
                '/api/transaction',
                {
                    clientId: prescriptionId,
                    service_order_id: prescriptionId,
                    transType: 'BOOKING_PAYMENT_1',
                    amount: amount || 100000,
                    returnUrl: getSafeUrl('/pharmacy'),
                    cancelUrl: getSafeUrl('/pharmacy'),
                },
                token ? { headers: { Authorization: `Bearer ${token}` } } : { suppressLogError: true }
            );

            const data = res?.data || res;
            if (data && (data.qr_code || data.qrCode || data.checkout_url || data.checkoutUrl)) {
                return data;
            }
        } catch (error) {
            console.warn('[paymentService] API create PayOS transaction fallback to VietQR mock:', error);
        }

        // Mock VietQR / PayOS payload for frontend demonstration & offline backend fallback
        const cleanCode = (prescriptionCode || prescriptionId).toUpperCase();
        const checkoutUrl = `https://pay.payos.vn/web/presc-${prescriptionId}`;
        const qrCode = `00020101021238580010A00000072701280006970422011499998888880208QRIBFTTA5303704540${amount}5802VN5922BV DAKHOA TRIAGEFLOW6008HA NOI62240820THUOC ${cleanCode}`;

        return {
            transaction_id: `tx-payos-${Date.now()}`,
            qrCode,
            qr_code: qrCode,
            checkoutUrl,
            checkout_url: checkoutUrl,
            amount,
            status: 'PENDING',
        };
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
     * Thanh toán bằng tiền mặt (Lễ tân / Thu ngân xác nhận thu tiền)
     * POST /api/transaction/cash
     */
    async payCashTransaction(
        prescriptionId: string,
        amount: number,
        token?: string
    ): Promise<any> {
        // Update local state immediately for fast UI feedback
        pharmacyService.payPrescriptionOffline(prescriptionId);
        if (typeof window !== 'undefined') {
            localStorage.setItem('triageflow_prescription_paid', JSON.stringify({ id: prescriptionId, time: Date.now() }));
        }

        try {
            const res = await apiClient.post<any>(
                '/api/transaction/cash',
                {
                    clientId: prescriptionId,
                    service_order_id: prescriptionId,
                    amount: amount,
                    transType: 'BOOKING_PAYMENT_1',
                    payment_method: 'CASH',
                },
                token ? { headers: { Authorization: `Bearer ${token}` } } : { suppressLogError: true }
            );
            return res?.data || res;
        } catch (error) {
            console.warn('[paymentService] API payCashTransaction fallback:', error);
            return { status: 'PAID', success: true };
        }
    },

    /**
     * Kích hoạt Webhook Backend cập nhật trạng thái thanh toán PayOS thành công
     * POST /api/transaction/webhook
     */
    async triggerTransactionWebhook(bookingId: string, token?: string): Promise<any> {
        try {
            return await apiClient.post<any>(
                '/api/transaction/webhook',
                {
                    booking_id: bookingId,
                    client_id: bookingId,
                    status: 'PAID',
                    code: '00',
                },
                token ? { headers: { Authorization: `Bearer ${token}` } } : { suppressLogError: true }
            );
        } catch (error) {
            console.warn('[paymentService] Auto webhook trigger notice:', error);
            return null;
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
    },

    /**
     * Cập nhật trực tiếp trạng thái thanh toán / đơn thuốc (STAFF - ADMIN)
     * PATCH /api/prescription/:id/status
     */
    async updatePrescriptionStatus(prescriptionId: string, status: string): Promise<any> {
        pharmacyService.updatePrescriptionStatus(prescriptionId, status as any);
        if (typeof window !== 'undefined') {
            localStorage.setItem('triageflow_prescription_paid', JSON.stringify({ id: prescriptionId, time: Date.now() }));
        }

        try {
            const res = await apiClient.patch<any>(`/api/prescription/${prescriptionId}/status`, { status }, { suppressLogError: true });
            return res.data || res;
        } catch (error) {
            console.warn('[paymentService] API update status failed:', error);
            return { status: 'SUCCESS' };
        }
    },

    /**
     * Tạo giao dịch thanh toán mới (Chuyển khoản VietQR / Thẻ POS / Tiền mặt)
     * POST /api/payment hoặc PATCH /api/prescription/:id/pay
     */
    async createPayment(data: CreatePaymentDto): Promise<PaymentTransaction> {
        try {
            if (data.prescription_id) {
                await this.payPrescriptionOffline(data.prescription_id);
            }
            const res = await apiClient.post<any>('/api/payment', data, { suppressLogError: true });
            return res.data || res;
        } catch (error) {
            console.warn('[paymentService] API create payment fallback to local mock:', error);
            return {
                payment_id: `pay-${Date.now()}`,
                prescription_id: data.prescription_id,
                service_order_id: data.service_order_id,
                patient_name: 'Nguyễn Thị Hoa',
                amount: data.amount,
                payment_method: data.payment_method,
                status: 'SUCCESS',
                transaction_code: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }
    },

    /**
     * Lấy danh sách hóa đơn / giao dịch thanh toán
     * GET /api/payment
     */
    async getPayments(): Promise<PaymentTransaction[]> {
        try {
            const res = await apiClient.get<any>('/api/payment', { suppressLogError: true });
            const list = Array.isArray(res) ? res : res?.data || [];
            if (list.length > 0) return list;
        } catch (error) {
            console.warn('[paymentService] API get payments fallback to local prescriptions:', error);
        }

        const rxs = await pharmacyService.getPrescriptions();
        return rxs.map((r) => ({
            payment_id: `pay-${r.prescription_id}`,
            prescription_id: r.prescription_id,
            service_order_id: r.service_order_id,
            patient_name: r.patient_name || 'Bệnh nhân',
            patient_code: r.patient_code,
            amount: r.total_amount,
            payment_method: 'VIETQR',
            status: r.status === 'PENDING' ? 'PENDING' : 'SUCCESS',
            transaction_code: `TXN-${r.prescription_code}`,
            created_at: r.created_at,
            updated_at: r.updated_at
        }));
    }
};
