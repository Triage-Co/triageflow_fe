import { create } from 'zustand';
import { TicketData, PaymentBill, PaymentMethod, RouteStepItem } from '../types/kiosk.types';
import { BookingPaymentData } from '../types/booking.types';
import { PendingPaymentStep, ServiceOrder, ServiceItem, TransactionQrResult } from '../types/flow.types';
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
  pendingPaymentSteps: PendingPaymentStep[];
  isFetchingPendingSteps: boolean;
  selectedPendingStep: PendingPaymentStep | null;

  // Service Order payment
  pendingServiceOrders: ServiceOrder[];
  allServicesList: ServiceItem[];
  isFetchingServiceOrders: boolean;
  activeTransactionQr: TransactionQrResult | null;
  isCreatingTransaction: boolean;

  setBookingPaymentState: (stepId: string, bookingId: string, paymentData: BookingPaymentData, patientId: string) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  fetchActiveTicketForPatient: (patientId: string) => Promise<boolean>;
  fetchDoctorRouteSteps: (patientId: string, preFetchedFlow?: any) => Promise<boolean>;
  fetchPendingPaymentSteps: (patientId: string) => Promise<boolean>;
  selectPendingStep: (step: PendingPaymentStep) => void;
  setSelectedPendingStep: (step: PendingPaymentStep | null) => void;
  verifyPaymentAndIssueTicket: () => Promise<boolean>;
  payBill: () => Promise<void>;
  resetFlow: () => void;

  fetchPendingServiceOrders: (patientId: string) => Promise<void>;
  createServiceOrderTransaction: (serviceOrderId: string, amount: number, patientId: string) => Promise<TransactionQrResult | null>;
  clearTransactionQr: () => void;
}

// Bộ nhớ tạm để chống trùng lặp request API song song/gần nhau
const activeTicketRequests = new Map<string, Promise<boolean>>();
const doctorRouteRequests = new Map<string, Promise<boolean>>();
const stepDetailRequests = new Map<string, Promise<any>>();
const activeFlowKioskRequests = new Map<string, Promise<any>>();

const getActivePatientFlowKioskWithCache = (patientId: string): Promise<any> => {
  const cacheKey = patientId;
  if (activeFlowKioskRequests.has(cacheKey)) {
    return activeFlowKioskRequests.get(cacheKey)!;
  }
  const promise = flowService.getActivePatientFlowKiosk(patientId)
    .then(res => (res as any)?.data || res)
    .catch((err) => {
      activeFlowKioskRequests.delete(cacheKey);
      throw err;
    })
    .finally(() => {
      // Xoá cache sau 1 giây để các lần bấm/tải sau vẫn được làm mới
      setTimeout(() => {
        activeFlowKioskRequests.delete(cacheKey);
      }, 1000);
    });
  activeFlowKioskRequests.set(cacheKey, promise);
  return promise;
};

const getStepDetailWithCache = (stepId: string, patientId: string): Promise<any> => {
  const cacheKey = `${stepId}-${patientId}`;
  if (stepDetailRequests.has(cacheKey)) {
    return stepDetailRequests.get(cacheKey)!;
  }
  const promise = flowService.getStepDetailByPatient(stepId, patientId)
    .then(res => (res as any)?.data || res)
    .catch((err) => {
      stepDetailRequests.delete(cacheKey);
      throw err;
    })
    .finally(() => {
      // Xoá cache sau 1 giây để các lần bấm/tải sau vẫn được làm mới
      setTimeout(() => {
        stepDetailRequests.delete(cacheKey);
      }, 1000);
    });
  stepDetailRequests.set(cacheKey, promise);
  return promise;
};

export const useFlowStore = create<FlowStoreState>((set, get) => ({
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
  allServicesList: [],
  isFetchingServiceOrders: false,
  activeTransactionQr: null,
  isCreatingTransaction: false,

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
      pendingPaymentSteps: [],
      isFetchingPendingSteps: false,
      selectedPendingStep: null,
      pendingServiceOrders: [],
      allServicesList: [],
      isFetchingServiceOrders: false,
      activeTransactionQr: null,
      isCreatingTransaction: false,
    });
  },

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
  fetchDoctorRouteSteps: async (patientId: string, preFetchedFlow?: any) => {
    const cacheKey = patientId;
    if (doctorRouteRequests.has(cacheKey)) {
      return doctorRouteRequests.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        let rawRes: any = preFetchedFlow;
        if (!rawRes) {
          try {
            rawRes = await getActivePatientFlowKioskWithCache(patientId);
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
        }

        let stepsArray: any[] = [];
        if (Array.isArray(rawRes)) {
          const inProgressFlows = rawRes.filter((f: any) => f.status === 'IN_PROGRESS');
          let activeFlow = null;
          if (inProgressFlows.length > 0) {
            inProgressFlows.sort((a: any, b: any) => {
              const timeA = a.create_at ? new Date(a.create_at).getTime() : 0;
              const timeB = b.create_at ? new Date(b.create_at).getTime() : 0;
              return timeB - timeA;
            });
            activeFlow = inProgressFlows[0];
          } else {
            activeFlow = rawRes[0];
          }
          stepsArray = activeFlow?.steps || [];
        } else if (rawRes) {
          stepsArray = Array.isArray(rawRes.steps) ? rawRes.steps : (rawRes.step_id ? [rawRes] : []);
        }

        if (stepsArray.length === 0) {
          set({ routeSteps: [] });
          return true;
        }

        // Gọi API chi tiết GET /api/step/{step_id}/patient/{patient_id} cho từng step chưa hoàn thành để nạp STT thật (sử dụng cache)
        const detailedSteps = await Promise.allSettled(
          stepsArray.map(async (step: any) => {
            const stepId = step.step_id || step.id;
            if (!stepId) return step;

            // Bỏ qua lấy chi tiết với các bước đã hoàn thành hoặc huỷ để giảm tải request trùng lặp
            const isCompletedOrCancelled = step.step_status === 'COMPLETED' || step.step_status === 'CANCELLED';
            if (isCompletedOrCancelled) {
              return step;
            }

            try {
              const stepDetail = await getStepDetailWithCache(stepId, patientId);
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
      } finally {
        doctorRouteRequests.delete(cacheKey);
      }
    })();

    doctorRouteRequests.set(cacheKey, promise);
    return promise;
  },

  // Quy trình 2 bước tra cứu chi tiết phiếu khám:
  // BƯỚC 1: Lấy step_id từ API GET /api/flow/patient/{patient_id}/active/kiosk (hoặc GET /api/flow/patient/{patient_id})
  // BƯỚC 2: Gọi API GET /api/step/{step_id}/patient/{patient_id} nạp dữ liệu chi tiết phiếu khám thật (KHÔNG HARDCODE)
  fetchActiveTicketForPatient: async (patientId: string) => {
    const cacheKey = patientId;
    if (activeTicketRequests.has(cacheKey)) {
      return activeTicketRequests.get(cacheKey)!;
    }

    const kioskState = useKioskStore.getState();
    const authPatientInfo = useAuthStore.getState().patientInfo;
    kioskState.setLoading(true, 'Đang tra cứu phiếu khám...');

    const promise = (async () => {
      try {
        // 1. Gọi Bước 1 lấy active flow kiosk của bệnh nhân
        let flowRes: any = null;
        try {
          flowRes = await getActivePatientFlowKioskWithCache(patientId);
        } catch (e: any) {
          console.warn('Lỗi khi lấy active kiosk flow:', e?.message || e);
        }

        const flowData: any = flowRes && (flowRes as any)?.data !== undefined ? (flowRes as any).data : flowRes;

        // Nếu API trả về thành công nhưng data rỗng [] -> Bệnh nhân chưa có phiếu khám hôm nay -> DỪNG NGAY
        const isEmpty = !flowData || (Array.isArray(flowData) && flowData.length === 0);
        if (isEmpty) {
          set({ activeTicket: null, routeSteps: [] });
          kioskState.showToast('Bạn chưa có phiếu khám hôm nay!', 'info');
          return false;
        }

        // Lấy flow có status === 'IN_PROGRESS' và mới nhất (create_at gần nhất)
        let activeFlow = null;
        if (Array.isArray(flowData)) {
          const inProgressFlows = flowData.filter((f: any) => f.status === 'IN_PROGRESS');
          if (inProgressFlows.length > 0) {
            // Sắp xếp theo create_at giảm dần
            inProgressFlows.sort((a: any, b: any) => {
              const timeA = a.create_at ? new Date(a.create_at).getTime() : 0;
              const timeB = b.create_at ? new Date(b.create_at).getTime() : 0;
              return timeB - timeA;
            });
            activeFlow = inProgressFlows[0];
          } else {
            activeFlow = flowData[0];
          }
        } else {
          activeFlow = flowData;
        }

        // Tìm active step trong activeFlow theo thứ tự từ trên xuống dưới
        // Bỏ qua các bước COMPLETED / CANCELLED và kiểm tra depends_on
        let stepId: string | null = null;
        if (activeFlow && Array.isArray(activeFlow.steps)) {
          const activeSteps = activeFlow.steps.filter(
            (s: any) => s.step_status !== 'COMPLETED' && s.step_status !== 'CANCELLED'
          );

          const currentActiveStep = activeSteps.find((s: any) => {
            if (!s.depends_on || s.depends_on.length === 0) return true;
            // Tất cả các dependencies phải đã COMPLETED hoặc CANCELLED
            return s.depends_on.every((depId: string) => {
              const depStep = activeFlow.steps.find((fs: any) => fs.step_id === depId);
              return !depStep || depStep.step_status === 'COMPLETED' || depStep.step_status === 'CANCELLED';
            });
          });

          stepId = currentActiveStep?.step_id || activeSteps[0]?.step_id || activeFlow.steps[0]?.step_id || null;
        } else {
          stepId = flowData?.step_id || null;
        }

        if (!stepId) {
          set({ activeTicket: null, routeSteps: [] });
          kioskState.showToast('Bạn chưa có phiếu khám hôm nay!', 'info');
          return false;
        }

        // Nạp lộ trình bác sĩ chỉ định nếu có lượt khám active
        get().fetchDoctorRouteSteps(patientId, activeFlow).catch(() => {});

        // 2. Gọi Bước 2 lấy chi tiết step theo GET /api/step/{step_id}/patient/{patient_id} (sử dụng cache)
        const stepData = await getStepDetailWithCache(stepId, patientId);

        if (!stepData) {
          kioskState.showToast('Không thể lấy chi tiết bước khám của bệnh nhân!', 'error');
          return false;
        }

        const queueObj = Array.isArray(stepData.queues) ? stepData.queues[0] : null;
        const roomObj = stepData.room_info || stepData.room || stepData.flow?.booking?.slot?.shift?.room;
        const specialtyObj = stepData.specialty_info || stepData.specialty || roomObj?.specialty;
        const staffObj = stepData.staff_info || stepData.staff;
        const slotObj = stepData.flow?.booking?.slot;

        // Tính thời gian chờ = giờ bắt đầu slot - giờ hiện tại
        const computeWaitMinutes = (startTimeStr: string | undefined): number => {
          if (!startTimeStr) return 0;
          const now = new Date();
          const [h, m] = startTimeStr.split(':').map(Number);
          const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
          const diffMs = slotStart.getTime() - now.getTime();
          return Math.max(0, Math.floor(diffMs / 60000));
        };

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
          estimatedWaitMinutes: computeWaitMinutes(slotObj?.start_time),
          stepId: stepData.step_id,
          bookingId: stepData.flow_id,
          startTime: slotObj?.start_time ?? '',
          roomId: roomObj?.physical_room_id || roomObj?.room_id || stepData.room_id || undefined
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
        activeTicketRequests.delete(cacheKey);
      }
    })();

    activeTicketRequests.set(cacheKey, promise);
    return promise;
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
        startTime: startTime,
        roomId: roomObj?.physical_room_id || roomObj?.room_id || generateData?.room_id || undefined
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

  fetchPendingServiceOrders: async (patientId) => {
    set({ isFetchingServiceOrders: true });
    try {
      const [soRes, servicesRes] = await Promise.all([
        flowService.getPendingServiceOrders(patientId),
        flowService.getAllServices(1, 100)
      ]);
      const soData = (soRes as any)?.data || soRes;
      const servicesData = (servicesRes as any)?.data?.data || (servicesRes as any)?.data || servicesRes;

      set({
        pendingServiceOrders: Array.isArray(soData) ? soData : [],
        allServicesList: Array.isArray(servicesData) ? servicesData : []
      });
    } catch (error) {
      console.error('Error fetching pending service orders:', error);
      set({ pendingServiceOrders: [], allServicesList: [] });
    } finally {
      set({ isFetchingServiceOrders: false });
    }
  },

  createServiceOrderTransaction: async (serviceOrderId, amount, patientId) => {
    set({ isCreatingTransaction: true });
    try {
      const payload = {
        transType: 'APPOINTMENT_PAYMENT',
        amount,
        clientId: patientId,
        returnUrl: 'https://www.youtube.com/shorts/8Y9-C4UYE_g',
        cancelUrl: 'https://www.youtube.com/watch?v=TQM8bUHOEuE',
        service_order_id: serviceOrderId
      };
      const res = await flowService.createTransactionQr(payload);
      const data = (res as any)?.data || res;
      set({ activeTransactionQr: data });
      return data;
    } catch (error) {
      console.error('Error creating transaction QR:', error);
      useKioskStore.getState().showToast('Tạo QR thanh toán thất bại!', 'error');
      return null;
    } finally {
      set({ isCreatingTransaction: false });
    }
  },

  clearTransactionQr: () => set({ activeTransactionQr: null }),
}));
