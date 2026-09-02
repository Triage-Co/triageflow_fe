import { useState, useEffect, useCallback } from 'react';
import { Prescription } from '@/shared/types/prescription.types';
import { paymentService } from '@/modules/payment/services/paymentService';
import { pharmacyService } from '../services/pharmacyService';
import { broadcastPaymentDisplaySync } from '@/modules/payment/utils/paymentSync';

export interface PayOsData {
    bin?: string;
    accountNumber?: string;
    accountName?: string;
    amount?: number;
    description?: string;
    orderCode?: number;
    checkoutUrl?: string;
    qrCode?: string;
}

export function usePayOsPolling(
    prescription: Prescription,
    accessToken?: string,
    onPaymentSuccess?: (updated: Prescription) => void
) {
    const [isGenerating, setIsGenerating] = useState(true);
    const [isChecking, setIsChecking] = useState(false);
    const [txData, setTxData] = useState<PayOsData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const totalAmount = prescription.total_amount || 0;
    const rxCode = prescription.prescription_code || prescription.prescription_id;
    const serviceOrderId =
        prescription.service_order_id ||
        prescription.prescription_id;

    // Khởi tạo mã PayOS QR khi mở modal
    useEffect(() => {
        let isMounted = true;

        const initTransaction = async () => {
            setIsGenerating(true);
            setError(null);
            try {
                const res = await paymentService.createPrescriptionPayOsTransaction(
                    serviceOrderId,
                    totalAmount,
                    accessToken || undefined
                );

                if (isMounted) {
                    const rawData = res?.data || res;
                    const parsed: PayOsData = {
                        bin: rawData.bin,
                        accountNumber: rawData.accountNumber,
                        accountName: rawData.accountName,
                        amount: rawData.amount || totalAmount,
                        description: rawData.description,
                        orderCode: rawData.orderCode,
                        checkoutUrl: rawData.checkoutUrl || rawData.checkout_url,
                        qrCode: rawData.qrCode || rawData.qr_code,
                    };

                    setTxData(parsed);

                    const qrImageUrl = (parsed.qrCode && parsed.qrCode.startsWith('http'))
                        ? parsed.qrCode
                        : (parsed.bin && parsed.accountNumber)
                        ? `https://img.vietqr.io/image/${parsed.bin}-${parsed.accountNumber}-compact2.png?amount=${parsed.amount || totalAmount}&addInfo=${encodeURIComponent(parsed.description || '')}&accountName=${encodeURIComponent(parsed.accountName || '')}`
                        : parsed.qrCode
                        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(parsed.qrCode)}`
                        : undefined;

                    broadcastPaymentDisplaySync({
                        status: 'active',
                        prescriptionId: prescription.prescription_id,
                        patientName: prescription.patient_name || 'Bệnh nhân',
                        patientCode: prescription.patient_code || '',
                        rxCode: rxCode,
                        totalAmount: parsed.amount || totalAmount,
                        paymentMethod: 'qr',
                        accountNumber: parsed.accountNumber,
                        accountName: parsed.accountName,
                        transferMemo: parsed.description,
                        checkoutUrl: parsed.checkoutUrl,
                        qrCode: qrImageUrl,
                        medicines: prescription.prescriptionDetails?.map((d) => ({
                            medicine_code: d.medicine_id,
                            medicine_name: d.medicine?.medicine_name || 'Thuốc kê đơn',
                            quantity: d.quantity,
                            unit: d.medicine?.unit || 'Viên',
                            unit_price: d.unit_price || 0,
                            sub_total: d.sub_total || 0,
                            dosage_instruction: d.dosage_instruction
                        }))
                    });
                }
            } catch (err: any) {
                console.error('[usePayOsPolling] Failed to generate PayOS QR:', err);
                if (isMounted) {
                    setError(err?.message || 'Không thể khởi tạo giao dịch PayOS từ server.');
                }
            } finally {
                if (isMounted) setIsGenerating(false);
            }
        };

        void initTransaction();

        return () => {
            isMounted = false;
        };
    }, [serviceOrderId, totalAmount, rxCode, accessToken]);

    // Kiểm tra trạng thái đơn thuốc
    const checkStatus = useCallback(async (isManual = false) => {
        if (isManual) setIsChecking(true);
        try {
            const fresh = await pharmacyService.getPrescriptionById(prescription.prescription_id);
            if (fresh && fresh.status !== 'PENDING') {
                broadcastPaymentDisplaySync({
                    status: 'success',
                    prescriptionId: fresh.prescription_id,
                    patientName: fresh.patient_name || 'Bệnh nhân',
                    patientCode: fresh.patient_code || '',
                    rxCode: fresh.prescription_code || rxCode,
                    totalAmount: fresh.total_amount || totalAmount,
                });
                onPaymentSuccess?.(fresh);
                return true;
            }
        } catch (err) {
            console.warn('[usePayOsPolling] Check status error:', err);
        } finally {
            if (isManual) setIsChecking(false);
        }
        return false;
    }, [prescription.prescription_id, rxCode, totalAmount, onPaymentSuccess]);

    const qrImageSource = (txData?.qrCode && txData.qrCode.startsWith('http'))
        ? txData.qrCode
        : (txData?.bin && txData?.accountNumber)
        ? `https://img.vietqr.io/image/${txData.bin}-${txData.accountNumber}-compact2.png?amount=${txData.amount || totalAmount}&addInfo=${encodeURIComponent(txData.description || '')}&accountName=${encodeURIComponent(txData.accountName || '')}`
        : txData?.qrCode
        ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(txData.qrCode)}`
        : undefined;

    return {
        isGenerating,
        isChecking,
        txData,
        error,
        qrImageSource,
        checkStatus
    };
}
