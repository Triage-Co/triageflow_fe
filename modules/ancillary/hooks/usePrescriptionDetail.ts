import { useState, useEffect, useCallback } from 'react';
import { Prescription } from '@/shared/types/prescription.types';
import { pharmacyService } from '../services/pharmacyService';
import { broadcastPaymentDisplaySync } from '@/modules/payment/utils/paymentSync';

export function usePrescriptionDetail(
    initialPrescription: Prescription | null,
    onStatusChange?: (updated: Prescription) => void
) {
    const [currentPrescription, setCurrentPrescription] = useState<Prescription | null>(initialPrescription);
    const [detailLoading, setDetailLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [showPayOsModal, setShowPayOsModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Nạp chi tiết mới nhất từ server khi chọn đơn
    useEffect(() => {
        setCurrentPrescription(initialPrescription);
        setShowPayOsModal(false);
        setError(null);
        setSuccessMessage(null);

        if (!initialPrescription?.prescription_id) return;

        let isMounted = true;
        const loadDetail = async () => {
            setDetailLoading(true);
            try {
                const fresh = await pharmacyService.getPrescriptionById(initialPrescription.prescription_id);
                if (isMounted && fresh) {
                    setCurrentPrescription(fresh);
                }
            } catch (err: any) {
                console.error('[usePrescriptionDetail] Failed to load fresh prescription detail:', err);
            } finally {
                if (isMounted) setDetailLoading(false);
            }
        };

        loadDetail();
        return () => {
            isMounted = false;
        };
    }, [initialPrescription?.prescription_id]);

    const activeRx = currentPrescription || initialPrescription;

    // 1. Action: Xác nhận thu tiền mặt
    const handlePayOffline = useCallback(async () => {
        if (!activeRx) return;
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await pharmacyService.payPrescriptionOffline(activeRx.prescription_id);
            setCurrentPrescription(updated);
            const pickupLabel = updated.pickup_number ? ` Số lấy thuốc: ${updated.pickup_number}.` : '';
            setSuccessMessage(`Đã xác nhận thu tiền mặt thành công!${pickupLabel} Đơn thuốc đã chuyển sang trạng thái "Đang soạn thuốc".`);
            broadcastPaymentDisplaySync({
                status: 'success',
                prescriptionId: activeRx.prescription_id,
                patientName: activeRx.patient_name || 'Bệnh nhân',
                patientCode: activeRx.patient_code || '',
                rxCode: activeRx.prescription_code || activeRx.prescription_id,
                totalAmount: activeRx.total_amount || 0,
            });
            onStatusChange?.(updated);
        } catch (err: any) {
            setError(err?.message || 'Không thể xác nhận thanh toán tiền mặt');
        } finally {
            setActionLoading(false);
        }
    }, [activeRx, onStatusChange]);

    // 2. Action: Xác nhận soạn xong thuốc -> Tự động gọi số lên TV
    const handlePrepare = useCallback(async () => {
        if (!activeRx) return;
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await pharmacyService.preparePrescription(activeRx.prescription_id);
            setCurrentPrescription(updated);

            // Tự động gọi API call-next để đẩy số lên màn hình TV sảnh chờ
            try {
                await pharmacyService.callNextPharmacy();
            } catch (callNextErr) {
                console.warn('[handlePrepare] Auto callNext warning:', callNextErr);
            }

            setSuccessMessage(
                updated.pickup_number
                    ? `Đã xác nhận soạn xong thuốc (Số nhận: ${updated.pickup_number}). Hệ thống đã tự động gọi số lên TV sảnh chờ và gửi thông báo cho bệnh nhân.`
                    : 'Đã xác nhận soạn xong thuốc! Hệ thống đã tự động gọi số lên TV sảnh chờ và gửi thông báo đến ứng dụng Bệnh nhân.'
            );
            onStatusChange?.(updated);
        } catch (err: any) {
            setError(err?.message || 'Không thể cập nhật trạng thái soạn xong');
        } finally {
            setActionLoading(false);
        }
    }, [activeRx, onStatusChange]);

    // 3. Action: Xác nhận đã giao thuốc
    const handleDispense = useCallback(async () => {
        if (!activeRx) return;
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await pharmacyService.dispensePrescription(activeRx.prescription_id);
            setCurrentPrescription(updated);
            setSuccessMessage('Đã xác nhận giao thuốc thành công! Quy trình cấp phát đã hoàn thành.');
            onStatusChange?.(updated);
        } catch (err: any) {
            setError(err?.message || 'Không thể xác nhận giao thuốc');
        } finally {
            setActionLoading(false);
        }
    }, [activeRx, onStatusChange]);

    // 4. Callback khi thanh toán QR PayOS thành công
    const handlePayOsSuccess = useCallback((updated: Prescription) => {
        setCurrentPrescription(updated);
        setSuccessMessage(
            updated.pickup_number
                ? `Thanh toán PayOS thành công! Số lấy thuốc: ${updated.pickup_number}. Đơn thuốc đã chuyển sang trạng thái "Đang soạn thuốc".`
                : 'Thanh toán PayOS thành công! Đơn thuốc đã chuyển sang trạng thái "Đang soạn thuốc".'
        );
        setShowPayOsModal(false);
        onStatusChange?.(updated);
    }, [onStatusChange]);

    return {
        activeRx,
        detailLoading,
        actionLoading,
        showPayOsModal,
        setShowPayOsModal,
        error,
        successMessage,
        handlePayOffline,
        handlePrepare,
        handleDispense,
        handlePayOsSuccess
    };
}
