import { create } from 'zustand';
import { TicketData, PaymentBill, PaymentMethod, RouteStepItem } from '../types/kiosk.types';
import { BookingPaymentData } from '../types/booking.types';
import { PendingPaymentStep, ServiceOrder, TransactionQrResult } from '../types/flow.types';

import { TicketSlice, createTicketSlice } from './ticketSlice';
import { BillPaymentSlice, createBillPaymentSlice } from './billPaymentSlice';
import { ServiceOrderSlice, createServiceOrderSlice } from './serviceOrderSlice';

export interface FlowStoreState extends TicketSlice, BillPaymentSlice, ServiceOrderSlice {
  resetFlow: () => void;
}

const initialState = {
  activeStepId: null,
  activeBookingId: null,
  paymentQrData: null,
  paymentMethod: null,
  activeBill: null,
  activeTicket: null,
  routeSteps: [],
  isPaymentChecking: false,
  pendingPaymentSteps: [],
  isFetchingPendingSteps: false,
  selectedPendingStep: null,
  pendingServiceOrders: [],
  isFetchingServiceOrders: false,
  activeTransactionQr: null,
};

export const useFlowStore = create<FlowStoreState>((set, get, store) => ({
  ...createTicketSlice(set, get, store),
  ...createBillPaymentSlice(set, get, store),
  ...createServiceOrderSlice(set, get, store),

      // Lấy stepId từ flowData
      const stepId: string | null = flowData?.step_id || (Array.isArray(flowData) ? flowData[0]?.steps?.[0]?.step_id : null);

      if (!stepId) {
        set({ activeTicket: null, routeSteps: [] });
        kioskState.showToast('Bạn chưa có phiếu khám hôm nay!', 'info');
        return false;
      }

      // Nạp lộ trình bác sĩ chỉ định nếu có lượt khám active
      get().fetchDoctorRouteSteps(patientId).catch(() => {});

      // 2. Gọi Bước 2 lấy chi tiết step theo GET /api/step/{step_id}/patient/{patient_id}
      const stepRes = await flowService.getStepDetailByPatient(stepId, patientId);
      const stepData: any = (stepRes as any)?.data || stepRes;

      if (!stepData) {
        kioskState.showToast('Không thể lấy chi tiết bước khám của bệnh nhân!', 'error');
        return false;
      }

      const queueObj = Array.isArray(stepData.queues) ? stepData.queues[0] : null;
      const roomObj = stepData.flow?.booking?.slot?.shift?.room;
      const specialtyObj = roomObj?.specialty;
      const staffObj = stepData.staff;
      const slotObj = stepData.flow?.booking?.slot;

      // Map dữ liệu 100% từ API Bước 2, KHÔNG dùng chuỗi giả định hardcode
      const generatedTicket: TicketData = {
        ticketNumber: queueObj?.queue_number ?? '',
        patientName: authPatientInfo?.fullName ?? '',
        dob: authPatientInfo?.dob ?? '',
        createdAt: stepData.created_at ? new Date(stepData.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '',
        clinicName: specialtyObj?.specialty_name ?? '',
        roomNumber: roomObj?.room_name ?? '',
        location: '',
        doctorName: staffObj?.full_name ?? '',
        status: stepData.step_status === 'COMPLETED' ? 'completed' : 'waiting',
        waitingCount: 0,
        currentCallingNo: queueObj?.queue_number ?? '',
        estimatedWaitMinutes: 5,
        stepId: stepData.step_id,
        bookingId: stepData.flow_id,
        startTime: slotObj?.start_time ?? ''
      };

      set({
        activeStepId: stepData.step_id,
        activeTicket: generatedTicket,
      });

      return true;
    } catch (error: any) {
      console.error('Lỗi khi tra cứu phiếu khám 2 bước:', error);

      const is401Error =
        error?.statusCode === 401 ||
        (typeof error?.message === 'string' && (error.message.includes('Token') || error.message.includes('401'))) ||
        (typeof error?.detail === 'string' && error.detail.includes('token'));

      if (is401Error) {
        useAuthStore.getState().clearAuth();
        get().resetFlow();
        kioskState.showToast('Phiên làm việc đã hết hạn. Vui lòng quét lại CCCD!', 'error');
        kioskState.openModal('scan_cccd', 'patient_info');
        return false;
      }

      kioskState.showToast(error?.message || 'Lỗi hệ thống khi tra cứu phiếu khám!', 'error');
      return false;
    } finally {
      kioskState.setLoading(false);
    }
  },

  // Xác nhận Thanh toán & Gọi API sinh STT /api/booking/generate
  verifyPaymentAndIssueTicket: async () => {
    const kioskState = useKioskStore.getState();
    const stepId = get().activeStepId;

    if (!stepId) {
      await get().payBill();
      return true;
    }

    set({ isPaymentChecking: true });
    kioskState.setLoading(true, 'Đang xác nhận thanh toán & sinh Số thứ tự (STT)...');

    try {
      const generateRes = await flowService.fetchBookingGenerate(stepId);
      const generateData: any = generateRes.data || generateRes;

      const queueObj = Array.isArray(generateData?.queue) ? generateData.queue[0] : null;
      const queueNumber = queueObj?.queue_number ?? generateData?.queue_number ?? generateData?.queueNo ?? '';

      const roomObj = generateData?.room;
      const roomName = roomObj?.room_name ?? '';

      const specialtyObj = generateData?.specialty || roomObj?.specialty;
      const specialtyName = specialtyObj?.specialty_name ?? '';

      const slotObj = generateData?.slot;
      const startTime = slotObj?.start_time ?? '';

      const authPatientInfo = useAuthStore.getState().patientInfo;

      const generatedTicket: TicketData = {
        ticketNumber: queueNumber,
        patientName: authPatientInfo?.fullName ?? '',
        dob: authPatientInfo?.dob ?? '',
        createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        clinicName: specialtyName,
        roomNumber: roomName,
        location: '',
        doctorName: '',
        status: 'waiting',
        waitingCount: 0,
        currentCallingNo: queueNumber,
        estimatedWaitMinutes: 5,
        stepId: stepId,
        bookingId: get().activeBookingId || undefined,
        startTime: startTime
      };

      set((s) => ({
        activeBill: s.activeBill ? { ...s.activeBill, isPaid: true } : null,
        activeTicket: generatedTicket,
      }));

      kioskState.navigateToView('patient_info');
      kioskState.showToast(`Thanh toán thành công! Số thứ tự của bạn: ${queueNumber}`, 'success');
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
}));
