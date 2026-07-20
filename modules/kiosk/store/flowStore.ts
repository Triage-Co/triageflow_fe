import { create } from 'zustand';
import { TicketData, PaymentBill, PaymentMethod, RouteStepItem } from '../types/kiosk.types';
import { BookingPaymentData } from '../types/booking.types';
import { flowService } from '../services/flowService';
import { useAuthStore } from './authStore';
import { useKioskStore } from './kioskStore';

interface FlowStoreState {
  activeStepId: string | null;
  activeBookingId: string | null;
  paymentQrData: BookingPaymentData | null;
  paymentMethod: PaymentMethod | null;
  activeBill: PaymentBill | null;
  activeTicket: TicketData | null;
  routeSteps: RouteStepItem[];
  isPaymentChecking: boolean;

  setBookingPaymentState: (stepId: string, bookingId: string, paymentData: BookingPaymentData, patientId: string) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  fetchActiveTicketForPatient: (patientId: string) => Promise<boolean>;
  fetchDoctorRouteSteps: (patientId: string) => Promise<boolean>;
  verifyPaymentAndIssueTicket: () => Promise<boolean>;
  payBill: () => Promise<void>;
  resetFlow: () => void;
}

export const useFlowStore = create<FlowStoreState>((set, get) => ({
  activeStepId: null,
  activeBookingId: null,
  paymentQrData: null,
  paymentMethod: null,
  activeBill: null,
  activeTicket: null,
  routeSteps: [],
  isPaymentChecking: false,

  resetFlow: () => {
    set({
      activeStepId: null,
      activeBookingId: null,
      paymentQrData: null,
      paymentMethod: null,
      activeBill: null,
      activeTicket: null,
      routeSteps: [],
      isPaymentChecking: false,
    });
  },

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setBookingPaymentState: (stepId, bookingId, paymentData, patientId) => {
    const authPatientInfo = useAuthStore.getState().patientInfo;
    set({
      activeStepId: stepId,
      activeBookingId: bookingId,
      paymentQrData: paymentData,
      paymentMethod: 'bank',
      activeBill: {
        billId: 'BILL-' + (paymentData?.orderCode || Date.now()),
        patientCode: patientId,
        patientName: authPatientInfo?.fullName ?? '',
        items: [
          { name: paymentData?.description ?? 'Phí khám bệnh chuyên khoa', amount: paymentData?.amount ?? 150000 }
        ],
        totalAmount: paymentData?.amount ?? 150000,
        isPaid: false,
        stepId,
        bookingId
      }
    });
  },

  // Nạp mảng các bước chỉ định (routeSteps) từ API flow & gọi API step chi tiết cho từng bước
  fetchDoctorRouteSteps: async (patientId: string) => {
    try {
      let rawRes: any = null;
      try {
        const kioskRes = await flowService.getActivePatientFlowKiosk(patientId);
        rawRes = (kioskRes as any)?.data || kioskRes;
      } catch (e) {
        console.warn('Lấy active kiosk flow cho doctor route không thành công, thử getPatientFlows:', e);
      }

      if (!rawRes || (Array.isArray(rawRes) && rawRes.length === 0)) {
        try {
          const patientFlowsRes = await flowService.getPatientFlows(patientId);
          rawRes = (patientFlowsRes as any)?.data || patientFlowsRes;
        } catch (e) {
          console.warn('Lấy patient flows cho doctor route không thành công:', e);
        }
      }

      let stepsArray: any[] = [];
      if (Array.isArray(rawRes)) {
        const activeFlow = rawRes.find((f: any) => f.status === 'IN_PROGRESS') || rawRes[0];
        stepsArray = activeFlow?.steps || [];
      } else if (rawRes) {
        stepsArray = Array.isArray(rawRes.steps) ? rawRes.steps : (rawRes.step_id ? [rawRes] : []);
      }

      if (stepsArray.length === 0) {
        set({ routeSteps: [] });
        return true;
      }

      // Gọi API chi tiết GET /api/step/{step_id}/patient/{patient_id} cho từng step để nạp STT thật
      const detailedSteps = await Promise.allSettled(
        stepsArray.map(async (step: any) => {
          const stepId = step.step_id || step.id;
          if (!stepId) return step;

          try {
            const stepRes = await flowService.getStepDetailByPatient(stepId, patientId);
            const stepDetail: any = (stepRes as any)?.data || stepRes;
            return { ...step, ...stepDetail };
          } catch (e) {
            console.warn(`Không thể lấy chi tiết step ${stepId}:`, e);
            return step;
          }
        })
      );

      const mappedRouteSteps: RouteStepItem[] = detailedSteps.map((result, index: number) => {
        const step = result.status === 'fulfilled' ? result.value : stepsArray[index];

        const roomObj = step.room_info || step.room || step.flow?.booking?.slot?.shift?.room;
        const roomName = roomObj?.room_name || '';

        const specialtyObj = step.specialty_info || step.specialty || roomObj?.specialty;
        const specialtyName = specialtyObj?.specialty_name || '';

        const staffObj = step.staff_info || step.staff;
        const staffName = staffObj?.full_name || '';

        let status: 'completed' | 'in_progress' | 'waiting' | 'pending' = 'pending';
        if (step.step_status === 'COMPLETED') status = 'completed';
        else if (step.step_status === 'IN_PROGRESS') status = 'in_progress';
        else if (step.step_status === 'PENDING') status = 'pending';
        else if (step.step_status === 'WAITING') status = 'waiting';

        // Lấy queue_number thật từ mảng queues (TUYỆT ĐỐI KHÔNG DÙNG docNo)
        const queueObj = Array.isArray(step.queues) && step.queues.length > 0 ? step.queues[0] : null;
        const queueNoStr = queueObj?.queue_number ? `${queueObj.queue_number}` : undefined;

        return {
          id: index + 1,
          title: specialtyName || roomName || `Bước ${index + 1}`,
          subtitle: staffName || specialtyName || '',
          room: roomName || undefined,
          location: undefined,
          queueNo: queueNoStr,
          status: status
        };
      });

      set({ routeSteps: mappedRouteSteps });
      return true;
    } catch (error) {
      console.error('Lỗi nạp lộ trình bác sĩ chỉ định:', error);
      return false;
    }
  },

  // Quy trình 2 bước tra cứu chi tiết phiếu khám:
  // BƯỚC 1: Lấy step_id từ API GET /api/flow/patient/{patient_id}/active/kiosk (hoặc GET /api/flow/patient/{patient_id})
  // BƯỚC 2: Gọi API GET /api/step/{step_id}/patient/{patient_id} nạp dữ liệu chi tiết phiếu khám thật (KHÔNG HARDCODE)
  fetchActiveTicketForPatient: async (patientId: string) => {
    const kioskState = useKioskStore.getState();
    const authPatientInfo = useAuthStore.getState().patientInfo;
    kioskState.setLoading(true, 'Đang tra cứu phiếu khám...');

    try {
      get().fetchDoctorRouteSteps(patientId).catch(() => {});

      // 1. Gọi Bước 1 lấy step_id từ flow active
      let stepId: string | null = null;
      try {
        const flowRes = await flowService.getActivePatientFlowKiosk(patientId);
        const flowData: any = (flowRes as any)?.data || flowRes;
        stepId = flowData?.step_id || (Array.isArray(flowData) ? flowData[0]?.steps?.[0]?.step_id : null);
      } catch (e) {
        console.warn('Thử lấy step_id từ active kiosk flow không thành công, thử getPatientFlows:', e);
      }

      if (!stepId) {
        try {
          const flowsRes = await flowService.getPatientFlows(patientId);
          const flowsData: any = (flowsRes as any)?.data || flowsRes;
          if (Array.isArray(flowsData) && flowsData.length > 0) {
            const activeFlow = flowsData.find((f: any) => f.status === 'IN_PROGRESS') || flowsData[0];
            if (activeFlow && Array.isArray(activeFlow.steps) && activeFlow.steps.length > 0) {
              stepId = activeFlow.steps[0].step_id;
            }
          }
        } catch (e) {
          console.warn('Lỗi lấy patient flows:', e);
        }
      }

      if (!stepId) {
        kioskState.showToast('Bệnh nhân chưa có lượt khám nào đang diễn ra!', 'info');
        return false;
      }

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
