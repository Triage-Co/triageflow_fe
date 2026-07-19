import { create } from 'zustand';
import {
  ActiveView,
  ActiveModal,
  AIRegisterStep,
  PaymentMethod,
  CCCDInfo,
  Doctor,
  RouteStepItem,
  TicketData,
  PaymentBill,
  ToastItem,
  BookingPaymentData,
  DoctorItem,
  DoctorSlotItem
} from '../types/kiosk.types';
import { bookingService } from '../services/bookingService';

interface KioskStoreState {
  currentView: ActiveView;
  activeModal: ActiveModal;
  targetViewAfterScan: ActiveView | null;

  // AI Register Flow (UI Routing State)
  aiRegisterStep: AIRegisterStep;
  selectedGender: 'male' | 'female';
  selectedBodyPart: string | null;
  selectedBodyParts: string[];
  selectedDoctor: Doctor | null;

  // Doctor & Slot API State
  availableDoctors: DoctorItem[];
  availableSlots: DoctorSlotItem[];
  selectedSlotId: string | null;
  isDoctorLoading: boolean;

  // Dynamic Booking & VietQR Payment State
  activeStepId: string | null;
  activeBookingId: string | null;
  paymentQrData: BookingPaymentData | null;
  paymentMethod: PaymentMethod | null;
  activeBill: PaymentBill | null;
  isBookingProcessing: boolean;
  isPaymentChecking: boolean;

  // Patient & Ticket State
  patientInfo: CCCDInfo | null;
  activeTicket: TicketData | null;
  routeSteps: RouteStepItem[];

  // Global UI State
  toasts: ToastItem[];
  isLoading: boolean;
  loadingMessage: string;

  // Core Actions
  initialize: () => void;
  selectHomeOption: (view: ActiveView) => void;
  closeModal: () => void;

  // UI Flow Control Actions
  setAIRegisterStep: (step: AIRegisterStep) => void;
  setGender: (gender: 'male' | 'female') => void;
  setSelectedBodyPart: (part: string | null) => void;
  toggleBodyPart: (part: string) => void;
  removeBodyPart: (part: string) => void;
  setSelectedDoctor: (doctor: Doctor | null) => void;
  setSelectedSlotId: (slotId: string | null) => void;
  loginCitizen: (citizenId: string) => Promise<void>;

  // Dynamic Booking & Payment Actions
  executeAutoBooking: () => Promise<boolean>;
  fetchDoctorsAndSlots: (specialtyCode: string) => Promise<void>;
  fetchSlotsForDoctor: (doctorId: string, date?: string) => Promise<void>;
  executeManualBooking: (slotId: string) => Promise<boolean>;
  verifyPaymentAndIssueTicket: () => Promise<boolean>;

  // Payment actions
  setPaymentMethod: (method: PaymentMethod | null) => void;
  payBill: () => void;

  // Navigation helpers
  goHome: () => void;
  navigateToView: (view: ActiveView) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  setLoading: (loading: boolean, message?: string) => void;
}

export const useKioskStore = create<KioskStoreState>((set, get) => ({
  // Default UI state ban đầu sạch
  currentView: 'home' as ActiveView,
  activeModal: null,
  targetViewAfterScan: null,
  aiRegisterStep: 'body_select' as AIRegisterStep,
  selectedGender: 'male',
  selectedBodyPart: null,
  selectedBodyParts: [],
  selectedDoctor: null,

  availableDoctors: [],
  availableSlots: [],
  selectedSlotId: null,
  isDoctorLoading: false,

  activeStepId: null,
  activeBookingId: null,
  paymentQrData: null,
  paymentMethod: null,
  activeBill: null,
  isBookingProcessing: false,
  isPaymentChecking: false,

  patientInfo: null,
  activeTicket: null,
  routeSteps: [],
  toasts: [],
  isLoading: false,
  loadingMessage: 'Đang tải dữ liệu...',

  // Hệ thống Actions xử lý UI cốt lõi
  initialize: () => {
    set({
      currentView: 'home' as ActiveView,
      activeModal: null,
      targetViewAfterScan: null,
      aiRegisterStep: 'body_select' as AIRegisterStep,
      selectedBodyParts: [],
      selectedBodyPart: null,
      selectedDoctor: null,
      availableDoctors: [],
      availableSlots: [],
      selectedSlotId: null,
      activeStepId: null,
      activeBookingId: null,
      paymentQrData: null,
      activeBill: null,
      paymentMethod: null,
    });
  },

  selectHomeOption: (view) => {
    set({ targetViewAfterScan: view, activeModal: 'scan_cccd' as ActiveModal });
  },

  closeModal: () => set({ activeModal: null }),

  // Luồng nạp dữ liệu định danh thật từ API Auth
  loginCitizen: async (citizenId: string) => {
    set({ isLoading: true, loadingMessage: 'Đang xác thực thẻ căn cước...' });

    const { useAuthStore } = await import('./authStore');
    const isSuccess = await useAuthStore.getState().loginCitizen(citizenId);

    if (isSuccess) {
      const authState = useAuthStore.getState();

      set({
        isLoading: false,
        activeModal: null,
        patientInfo: {
          idNumber: authState.citizenId || citizenId,
          fullName: 'BỆNH NHÂN KHÁM KIOSK',
          dob: '',
          gender: '',
          address: ''
        },
        currentView: 'register' as ActiveView,
        aiRegisterStep: 'body_select' as AIRegisterStep
      });

      get().showToast('Xác thực căn cước công dân thành công!', 'success');
    } else {
      set({ isLoading: false });
      get().showToast('Xác thực thất bại. Vui lòng kiểm tra lại thẻ căn cước!', 'error');
    }
  },

  // 1. Thực hiện Tự động Xếp Phòng / Bác sĩ từ kết quả AI
  executeAutoBooking: async () => {
    const { useAuthStore } = await import('./authStore');
    const { useTriageStore } = await import('./triageStore');

    const authState = useAuthStore.getState();
    const triageState = useTriageStore.getState();

    const patientId = authState.patientId || authState.citizenId || get().patientInfo?.idNumber;
    const interviewToken = triageState.interviewToken;

    if (!patientId || !interviewToken) {
      get().showToast('Thiếu thông tin bệnh nhân hoặc phiên chẩn đoán AI!', 'error');
      return false;
    }

    set({ isBookingProcessing: true, isLoading: true, loadingMessage: 'Đang tự động phân phòng khám & khởi tạo thanh toán...' });

    try {
      const response = await bookingService.createAutoBooking(patientId, interviewToken);

      if (response && (response.status === 'success' || response.code === 200 || response.data)) {
        const resData = response.data || (response as any);
        const stepId = resData.step_id;
        const bookingId = resData.booking_id || resData.data?.booking_id;
        const paymentData: BookingPaymentData = resData.payment?.data || resData.payment;

        set({
          activeStepId: stepId,
          activeBookingId: bookingId,
          paymentQrData: paymentData,
          activeBill: {
            billId: 'BILL-' + (paymentData?.orderCode || Date.now()),
            patientCode: patientId,
            patientName: get().patientInfo?.fullName || 'BỆNH NHÂN KHÁM KIOSK',
            items: [
              { name: paymentData?.description || 'Phí khám bệnh chuyên khoa', amount: paymentData?.amount || 150000 }
            ],
            totalAmount: paymentData?.amount || 150000,
            isPaid: false,
            stepId,
            bookingId
          },
          currentView: 'payment' as ActiveView,
          paymentMethod: 'bank'
        });

        get().showToast('Khởi tạo lịch khám & mã VietQR thành công!', 'success');
        return true;
      } else {
        get().showToast('Phân phòng tự động chưa thành công. Vui lòng chọn Bác sĩ cụ thể!', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Lỗi khi thực hiện Auto Booking:', error);
      get().showToast(error.message || 'Lỗi kết nối khi tự động xếp phòng!', 'error');
      return false;
    } finally {
      set({ isBookingProcessing: false, isLoading: false });
    }
  },

  // 2. Lấy danh sách Bác sĩ thực tế theo chuyên khoa
  fetchDoctorsAndSlots: async (specialtyCode: string) => {
    set({ isDoctorLoading: true });
    try {
      const response = await bookingService.getDoctorsBySpecialty(specialtyCode);
      const doctorsList = (response as any)?.data || response || [];
      set({ availableDoctors: doctorsList });
    } catch (error) {
      console.error('Lỗi lấy danh sách bác sĩ:', error);
      set({ availableDoctors: [] });
    } finally {
      set({ isDoctorLoading: false });
    }
  },

  // 3. Lấy khung giờ trống của Bác sĩ
  fetchSlotsForDoctor: async (doctorId: string, date?: string) => {
    set({ isDoctorLoading: true });
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
      const response = await bookingService.getDoctorSlots(doctorId, targetDate);
      const slotsList = (response as any)?.data || response || [];
      set({ availableSlots: slotsList });
    } catch (error) {
      console.error('Lỗi lấy khung giờ bác sĩ:', error);
      set({ availableSlots: [] });
    } finally {
      set({ isDoctorLoading: false });
    }
  },

  // 4. Thực hiện Đặt lịch với Bác sĩ & khung giờ cụ thể
  executeManualBooking: async (slotId: string) => {
    const { useAuthStore } = await import('./authStore');
    const authState = useAuthStore.getState();
    const patientId = authState.patientId || authState.citizenId || get().patientInfo?.idNumber;

    if (!patientId || !slotId) {
      get().showToast('Vui lòng chọn khung giờ khám hợp lệ!', 'error');
      return false;
    }

    set({ isBookingProcessing: true, isLoading: true, loadingMessage: 'Đang tạo đặt lịch khám & mã VietQR...' });

    try {
      const response = await bookingService.createBooking(patientId, slotId);

      if (response && (response.status === 'success' || response.code === 200 || response.data)) {
        const resData = response.data || (response as any);
        const stepId = resData.step_id;
        const bookingId = resData.booking_id || resData.data?.booking_id;
        const paymentData: BookingPaymentData = resData.payment?.data || resData.payment;

        set({
          activeStepId: stepId,
          activeBookingId: bookingId,
          paymentQrData: paymentData,
          activeBill: {
            billId: 'BILL-' + (paymentData?.orderCode || Date.now()),
            patientCode: patientId,
            patientName: get().patientInfo?.fullName || 'BỆNH NHÂN KHÁM KIOSK',
            items: [
              { name: paymentData?.description || 'Phí khám bệnh chuyên khoa', amount: paymentData?.amount || 150000 }
            ],
            totalAmount: paymentData?.amount || 150000,
            isPaid: false,
            stepId,
            bookingId
          },
          currentView: 'payment' as ActiveView,
          paymentMethod: 'bank'
        });

        get().showToast('Đặt lịch thành công! Vui lòng quét mã QR thanh toán.', 'success');
        return true;
      } else {
        get().showToast('Tạo đặt lịch thất bại. Vui lòng thử lại!', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Lỗi khi Đặt lịch thủ công:', error);
      get().showToast(error.message || 'Lỗi máy chủ khi đặt lịch khám!', 'error');
      return false;
    } finally {
      set({ isBookingProcessing: false, isLoading: false });
    }
  },

  // 5. Xác nhận Thanh toán & Sinh Số thứ tự (STT) cấp Ticket thực tế
  verifyPaymentAndIssueTicket: async () => {
    const stepId = get().activeStepId;

    if (!stepId) {
      // Nếu không có stepId thực tế (ví dụ chế độ fallback), sinh STT mẫu và chuyển trang
      get().payBill();
      return true;
    }

    set({ isPaymentChecking: true, isLoading: true, loadingMessage: 'Đang xác nhận thanh toán & sinh Số thứ tự (STT)...' });

    try {
      // Gọi API /api/booking/generate để backend kiểm tra PayOS và cấp STT
      const generateRes = await bookingService.fetchBookingGenerate(stepId);
      const generateData = generateRes.data || (generateRes as any);

      // Lấy thông tin phòng khám và vị trí từ /api/step/account/{stepId}
      const stepDetailRes = await bookingService.fetchStepDetail(stepId);
      const stepDetailData = stepDetailRes.data || (stepDetailRes as any);

      const queueNumber = generateData?.queue_number || generateData?.queueNo || stepDetailData?.queues?.[0]?.queue_number || 'A' + Math.floor(Math.random() * 90 + 10);
      const bookingSlot = stepDetailData?.flow?.booking?.slot;
      const roomObj = bookingSlot?.shift?.room;
      const roomName = roomObj?.room_name || get().selectedDoctor?.room || 'Phòng khám';
      const specialtyName = roomObj?.specialty?.specialty_name || get().selectedDoctor?.specialty || 'Chuyên khoa';
      const locationName = roomObj?.location || get().selectedDoctor?.location || 'Tầng 2 - Khu B';
      const startTime = bookingSlot?.start_time || '08:00';

      const generatedTicket: TicketData = {
        ticketNumber: queueNumber,
        patientName: get().patientInfo?.fullName || 'BỆNH NHÂN KHÁM KIOSK',
        dob: get().patientInfo?.dob || '',
        createdAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        clinicName: specialtyName,
        roomNumber: roomName,
        location: locationName,
        doctorName: get().selectedDoctor?.name || 'BS. Chuyên khoa',
        status: 'waiting',
        waitingCount: 3,
        currentCallingNo: 'A01',
        estimatedWaitMinutes: 10,
        stepId: stepId,
        bookingId: get().activeBookingId || undefined,
        startTime: startTime
      };

      set((s) => ({
        activeBill: s.activeBill ? { ...s.activeBill, isPaid: true } : null,
        activeTicket: generatedTicket,
        currentView: 'patient_info' as ActiveView
      }));

      get().showToast(`Thanh toán thành công! Số thứ tự của bạn: ${queueNumber}`, 'success');
      return true;
    } catch (error: any) {
      console.error('Lỗi khi xác nhận thanh toán & sinh STT:', error);
      // Fallback an toàn nếu backend chưa ghi nhận chuyển khoản PayOS
      get().showToast('Chưa ghi nhận giao dịch từ ngân hàng. Nếu bạn đã quét mã, vui lòng đợi vài giây và bấm lại!', 'error');
      return false;
    } finally {
      set({ isPaymentChecking: false, isLoading: false });
    }
  },

  // Actions hỗ trợ UI
  setAIRegisterStep: (step) => set({ aiRegisterStep: step as AIRegisterStep }),
  setGender: (gender) => set({ selectedGender: gender }),
  setSelectedBodyPart: (part) => set({ selectedBodyPart: part, selectedBodyParts: part ? [part] : [] }),
  toggleBodyPart: (part) => set((s) => ({ selectedBodyParts: s.selectedBodyParts.includes(part) ? s.selectedBodyParts.filter(p => p !== part) : [...s.selectedBodyParts, part] })),
  removeBodyPart: (part) => set((s) => ({ selectedBodyParts: s.selectedBodyParts.filter(p => p !== part) })),
  setSelectedDoctor: (doctor) => set({ selectedDoctor: doctor }),
  setSelectedSlotId: (slotId) => set({ selectedSlotId: slotId }),

  setPaymentMethod: (method) => set({ paymentMethod: method as PaymentMethod }),
  payBill: () => {
    set((s) => {
      const updatedBill = s.activeBill ? { ...s.activeBill, isPaid: true } : null;
      const generatedTicket: TicketData = {
        ticketNumber: 'A' + Math.floor(Math.random() * 90 + 10),
        clinicName: s.selectedDoctor?.specialty || 'Nội Tổng Quát',
        roomNumber: s.selectedDoctor?.room || 'P.204',
        location: s.selectedDoctor?.location || 'Tầng 2 - Khu B',
        patientName: s.patientInfo?.fullName || 'BỆNH NHÂN KHÁM KIOSK',
        dob: '',
        createdAt: new Date().toLocaleTimeString('vi-VN'),
        currentCallingNo: 'A01',
        estimatedWaitMinutes: 15,
        waitingCount: 4,
        status: 'waiting'
      };

      return {
        activeBill: updatedBill,
        activeTicket: generatedTicket,
        currentView: 'patient_info' as ActiveView
      } as Partial<KioskStoreState>;
    });
    get().showToast('Thanh toán viện phí thành công!', 'success');
  },

  goHome: () => {
    set({
      currentView: 'home' as ActiveView,
      activeModal: null,
      targetViewAfterScan: null,
      aiRegisterStep: 'body_select' as AIRegisterStep,
      isLoading: false,
    });
  },
  navigateToView: (view) => set({ currentView: view as ActiveView }),

  showToast: (msg, type = 'info') => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, message: msg, type }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  setLoading: (loading, message = 'Đang tải dữ liệu...') => set({ isLoading: loading, loadingMessage: message }),
}));