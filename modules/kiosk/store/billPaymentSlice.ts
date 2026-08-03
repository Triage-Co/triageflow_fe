import { StateCreator } from 'zustand';
import { PaymentBill, PaymentMethod, PendingPaymentStep, TicketData } from '../types/kiosk.types';
import { BookingPaymentData } from '../types/booking.types';
import { FlowStoreState } from './flowStore';
import { useAuthStore } from './authStore';
import { useKioskStore } from './kioskStore';
import { flowService } from '../services/flowService';
import {
  createPaymentBill,
  mapApiToTicketData,
  getActivePatientFlowKioskWithCache,
} from '../utils/flowHelpers';
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
  payBill: () => Promise<void>;
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
    let stepId = get().activeStepId;
    const authState = useAuthStore.getState();
    const patientId = getActivePatientId(authState);

    set({ isPaymentChecking: true });
    kioskState.setLoading(true, 'Đang xác nhận thanh toán & sinh Số thứ tự (STT)...');

    try {
      if (!stepId && get().activeBookingId && patientId) {
        try {
          const flowRes = await getActivePatientFlowKioskWithCache(patientId);
          const flowData: any = flowRes && (flowRes as any)?.data !== undefined ? (flowRes as any).data : flowRes;

          let activeFlow = null;
          if (Array.isArray(flowData)) {
            const inProgressFlows = flowData.filter((f: any) => f.status === 'IN_PROGRESS');
            if (inProgressFlows.length > 0) {
              inProgressFlows.sort((a: any, b: any) => {
                const timeA = a.create_at ? new Date(a.create_at).getTime() : 0;
                const timeB = b.create_at ? new Date(b.create_at).getTime() : 0;
                return timeB - timeA;
              });
              activeFlow = inProgressFlows[0];
            }
          } else if (flowData && flowData.status === 'IN_PROGRESS') {
            activeFlow = flowData;
          }

          if (activeFlow && Array.isArray(activeFlow.steps) && activeFlow.steps.length > 0) {
            stepId = activeFlow.steps[0].step_id || activeFlow.steps[0].id || null;
            if (stepId) {
              set({ activeStepId: stepId });
            }
          }
        } catch (e) {
          console.warn('Lỗi khi phân giải active flow cho gói khám:', e);
        }
      }

      if (!stepId) {
        set({ isPaymentChecking: false });
        kioskState.setLoading(false);
        await get().payBill();
        return true;
      }
      const generateRes = await flowService.fetchBookingGenerate(stepId);
      const generateData: any = generateRes.data || generateRes;

      const authPatientInfo = useAuthStore.getState().patientInfo;
      const generatedTicket = mapApiToTicketData(generateData, authPatientInfo, get().activeBookingId);

      set((s) => ({
        activeBill: s.activeBill ? { ...s.activeBill, isPaid: true } : null,
        activeTicket: generatedTicket,
      }));

      kioskState.navigateToView('patient_info');
      kioskState.showToast(`Thanh toán thành công! Số thứ tự của bạn: ${generatedTicket.ticketNumber}`, 'success');
      return true;
    } catch (error: any) {
      console.error('Lỗi khi xác nhận thanh toán & sinh STT:', error);
      kioskState.showToast('Chưa ghi nhận giao dịch từ ngân hàng. Nếu bạn đã quét mã, vui lòng đợi vài giây và bấm lại!', 'error');
      return false;
    } finally {
      set({ isPaymentChecking: false });
      kioskState.setLoading(false);
    }
  },

  payBill: async () => {
    const kioskState = useKioskStore.getState();
    const authPatientInfo = useAuthStore.getState().patientInfo;

    set((s) => {
      const updatedBill = s.activeBill ? { ...s.activeBill, isPaid: true } : null;
      const generatedTicket: TicketData = {
        ticketNumber: 'A' + Math.floor(Math.random() * 90 + 10),
        clinicName: '',
        roomNumber: '',
        location: '',
        patientName: authPatientInfo?.fullName ?? '',
        dob: authPatientInfo?.dob ?? '',
        createdAt: new Date().toLocaleTimeString('vi-VN'),
        currentCallingNo: '',
        estimatedWaitMinutes: 15,
        waitingCount: 0,
        status: 'waiting'
      };

      return {
        activeBill: updatedBill,
        activeTicket: generatedTicket,
      } as Partial<FlowStoreState>;
    });

    kioskState.navigateToView('patient_info');
    kioskState.showToast('Thanh toán viện phí thành công!', 'success');
  },
});
