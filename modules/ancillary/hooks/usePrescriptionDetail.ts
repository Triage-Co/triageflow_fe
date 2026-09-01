import { usePharmacyCounterStore } from '@/modules/display/store/pharmacyCounterStore';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Prescription } from '@/shared/types/prescription.types';
import { mergePrescription, pharmacyService } from '../services/pharmacyService';
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
    const currentPrescriptionRef = useRef<Prescription | null>(initialPrescription);

    useEffect(() => {
        currentPrescriptionRef.current = currentPrescription;
    }, [currentPrescription]);

    const commitPrescription = useCallback(
        (next: Prescription) => {
            setCurrentPrescription(next);
            onStatusChange?.(next);
            return next;
        },
        [onStatusChange]
    );

    const reloadPrescription = useCallback(
        async (prescriptionId: string, patch?: Prescription) => {
            const previous = currentPrescriptionRef.current || initialPrescription;
            const mergedPatch = patch && previous ? mergePrescription(previous, patch) : patch || previous;
            try {
                const fresh = await pharmacyService.getPrescriptionById(prescriptionId);
                return commitPrescription(
                    mergePrescription(mergedPatch || fresh, fresh)
                );
            } catch (err) {
                console.warn('[usePrescriptionDetail] Refetch after update failed, using merged patch:', err);
                if (mergedPatch) {
                    return commitPrescription(mergedPatch);
                }
                throw err;
            }
        },
        [commitPrescription, initialPrescription]
    );

    // Nạp chi tiết mới nhất từ server khi chọn đơn
    useEffect(() => {
        setShowPayOsModal(false);
        setError(null);
        setSuccessMessage(null);

        if (!initialPrescription?.prescription_id) {
            setCurrentPrescription(null);
            return;
        }

        let isMounted = true;
        const loadDetail = async () => {
            setDetailLoading(true);
            try {
                const fresh = await pharmacyService.getPrescriptionById(
                    initialPrescription.prescription_id
                );
                if (isMounted && fresh) {
                    setCurrentPrescription(
                        mergePrescription(initialPrescription, fresh)
                    );
                }
            } catch (err: unknown) {
                console.error('[usePrescriptionDetail] Failed to load fresh prescription detail:', err);
                if (isMounted) {
                    setCurrentPrescription(initialPrescription);
                }
            } finally {
                if (isMounted) setDetailLoading(false);
            }
        };

        void loadDetail();
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
            const fresh = await reloadPrescription(activeRx.prescription_id, updated);
            const pickupLabel = fresh.pickup_number ? ` Số lấy thuốc: ${fresh.pickup_number}.` : '';
            setSuccessMessage(`Đã xác nhận thu tiền mặt thành công!${pickupLabel} Đơn thuốc đã chuyển sang trạng thái "Đang soạn thuốc".`);
            broadcastPaymentDisplaySync({
                status: 'success',
                prescriptionId: fresh.prescription_id,
                patientName: fresh.patient_name || 'Bệnh nhân',
                patientCode: fresh.patient_code || '',
                rxCode: fresh.prescription_code || fresh.prescription_id,
                totalAmount: fresh.total_amount || 0,
            });
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không thể xác nhận thanh toán tiền mặt');
        } finally {
            setActionLoading(false);
        }
    }, [activeRx, reloadPrescription]);

    // 2. Action: Xác nhận soạn xong thuốc -> Tự động gọi số lên TV
    const handlePrepare = useCallback(async () => {
        if (!activeRx) return;
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const counterId = usePharmacyCounterStore.getState().display_screen_id;
            if (!counterId) {
                setError('Chưa chọn quầy TV nhà thuốc. Hãy chọn quầy trên thanh công cụ trước khi soạn thuốc.');
                setActionLoading(false);
                return;
            }
            const updated = await pharmacyService.preparePrescription(
                activeRx.prescription_id,
                counterId
            );
            const fresh = await reloadPrescription(activeRx.prescription_id, updated);

            setSuccessMessage(
                fresh.pickup_number
                    ? `Đã xác nhận soạn xong thuốc (Số nhận: ${fresh.pickup_number}). Số đã được gọi lên TV quầy đã chọn.`
                    : 'Đã xác nhận soạn xong thuốc! Số đã được gọi lên TV quầy đã chọn và gửi thông báo đến ứng dụng Bệnh nhân.'
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái soạn xong';
            setError(message);
        } finally {
            setActionLoading(false);
        }
    }, [activeRx, reloadPrescription]);

    // 3. Action: Xác nhận đã giao thuốc
    const handleDispense = useCallback(async () => {
        if (!activeRx) return;
        setActionLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const updated = await pharmacyService.dispensePrescription(activeRx.prescription_id);
            await reloadPrescription(activeRx.prescription_id, updated);
            setSuccessMessage('Đã xác nhận giao thuốc thành công! Quy trình cấp phát đã hoàn thành.');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Không thể xác nhận giao thuốc');
        } finally {
            setActionLoading(false);
        }
    }, [activeRx, reloadPrescription]);

    // 4. Callback khi thanh toán QR PayOS thành công
    const handlePayOsSuccess = useCallback((updated: Prescription) => {
        void reloadPrescription(updated.prescription_id, updated).then((fresh) => {
            setSuccessMessage(
                fresh.pickup_number
                    ? `Thanh toán PayOS thành công! Số lấy thuốc: ${fresh.pickup_number}. Đơn thuốc đã chuyển sang trạng thái "Đang soạn thuốc".`
                    : 'Thanh toán PayOS thành công! Đơn thuốc đã chuyển sang trạng thái "Đang soạn thuốc".'
            );
            setShowPayOsModal(false);
        });
    }, [reloadPrescription]);

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
