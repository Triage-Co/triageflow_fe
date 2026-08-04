import { StateCreator } from 'zustand';
import { PaymentBill, PaymentMethod, PendingPaymentStep } from '../types/kiosk.types';
import { BookingPaymentData } from '../types/booking.types';
import { FlowStoreState } from './flowStore';
import { useAuthStore } from './authStore';
import { useKioskStore } from './kioskStore';
import { flowService } from '../services/flowService';
import { createPaymentBill } from '../utils/flowHelpers';
import { getActivePatientId } from '../utils/kioskHelpers';

export interface BillPaymentSlice {
  paymentQrData: BookingPaymentData | null;
  paymentMethod: PaymentMethod | null;
  activeBill: PaymentBill | null;
  pendingPaymentSteps: PendingPaymentStep[];
  isPaymentChecking: boolean;
  isFetchingPendingSteps: boolean;
  selectedPendingStep: PendingPaymentStep | null;

  setBookingPaymentState: (stepId: string, bookingId: string, paymentData: BookingPaymentData, patientId: string) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  fetchPendingPaymentSteps: (patientId: string) => Promise<boolean>;
  selectPendingStep: (step: PendingPaymentStep) => void;
  setSelectedPendingStep: (step: PendingPaymentStep | null) => void;
  verifyPaymentAndIssueTicket: () => Promise<boolean>;
}

export const createBillPaymentSlice: StateCreator<
  FlowStoreState,
  [],
  [],
  BillPaymentSlice
> = (set, get) => ({
  paymentQrData: null,
  paymentMethod: null,
  activeBill: null,
  pendingPaymentSteps: [],
  isPaymentChecking: false,
  isFetchingPendingSteps: false,
  selectedPendingStep: null,

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setSelectedPendingStep: (step) => set({ selectedPendingStep: step }),

  selectPendingStep: (step) => {
    set({
      selectedPendingStep: step,
      activeStepId: step.step_id,
      activeBookingId: step.flow_id,
    });
  },

  fetchPendingPaymentSteps: async (patientId: string) => {
    const kioskState = useKioskStore.getState();
    set({ isFetchingPendingSteps: true });
    kioskState.navigateToView('pending_bills');

    try {
      const response = await flowService.getPendingPaymentSteps(patientId);
      const data: any = (response as any)?.data || response || [];
      const stepsArray: PendingPaymentStep[] = Array.isArray(data) ? data : [];
      const pending = stepsArray.filter((s) => s.payment_status === 'PENDING');

      set({ pendingPaymentSteps: pending });
      return true;
    } catch (error: any) {
      console.warn('Lỗi khi lấy danh sách bước chưa thanh toán:', error?.message || error);
      kioskState.showToast(error?.message || 'Lỗi khi tải danh sách bước thanh toán!', 'error');
      set({ pendingPaymentSteps: [] });
      return false;
    } finally {
      set({ isFetchingPendingSteps: false });
    }
  },

  setBookingPaymentState: (stepId, bookingId, paymentData, patientId) => {
    const authPatientInfo = useAuthStore.getState().patientInfo;
    const patientName = authPatientInfo?.fullName ?? '';
    const bill = createPaymentBill(paymentData, patientId, patientName, stepId, bookingId);
    set({
      activeStepId: stepId,
      activeBookingId: bookingId,
      paymentQrData: paymentData,
      paymentMethod: 'bank',
      activeBill: bill,
    });
  },

  verifyPaymentAndIssueTicket: async () => {
    const kioskState = useKioskStore.getState();
    const authState = useAuthStore.getState();
    const patientId = getActivePatientId(authState);

    if (!patientId) {
      kioskState.showToast('Không xác định được bệnh nhân. Vui lòng quét lại CCCD!', 'error');
      return false;
    }

    set({ isPaymentChecking: true });
    kioskState.setLoading(true, 'Đang xác nhận thanh toán & cấp Số thứ tự...');

    // Retry logic: BE cần thời gian xử lý sau khi thanh toán
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1500;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      let success = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 1) {
          kioskState.setLoading(true, `Đang xác nhận lần ${attempt}/${MAX_RETRIES}...`);
          await wait(RETRY_DELAY_MS);
        }

        success = await get().fetchActiveTicketForPatient(patientId);

        if (success) break;
      }

      if (success) {
        set((s) => ({
          activeBill: s.activeBill ? { ...s.activeBill, isPaid: true } : null,
        }));
        kioskState.navigateToView('patient_info');
        kioskState.showToast('Thanh toán thành công! Phiếu khám đã được cấp.', 'success');
        return true;
      } else {
        kioskState.showToast(
          'Chưa ghi nhận giao dịch từ ngân hàng. Nếu bạn đã quét mã, vui lòng đợi vài giây và bấm lại!',
          'error'
        );
        return false;
      }
    } catch (error: any) {
      console.error('Lỗi khi xác nhận thanh toán & cấp STT:', error);
      kioskState.showToast(
        'Lỗi hệ thống khi xác nhận thanh toán. Vui lòng thử lại!',
        'error'
      );
      return false;
    } finally {
      set({ isPaymentChecking: false });
      kioskState.setLoading(false);
    }
  },
});
