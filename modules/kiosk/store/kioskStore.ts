import { create } from 'zustand';
import { 
  ActiveView, 
  ActiveModal, 
  AIRegisterStep, 
  PaymentMethod, 
  CCCDInfo, 
  Doctor, 
  AIAnalysisResult, 
  RouteStepItem, 
  TicketData, 
  PaymentBill, 
  ToastItem 
} from '../types/kiosk.types';

interface KioskStoreState {
  currentView: ActiveView;
  activeModal: ActiveModal;
  targetViewAfterScan: ActiveView | null;
  
  // AI Register Flow State
  aiRegisterStep: AIRegisterStep;
  selectedBodyParts: string[];
  selectedSymptoms: string[];
  symptomDuration: string;
  painLevel: number;
  hasEmergency: boolean;
  aiAnalysisResult: AIAnalysisResult | null;
  selectedDoctor: Doctor | null;
  
  // Payment Flow State
  paymentMethod: PaymentMethod | null;
  activeBill: PaymentBill | null;
  
  // Patient & Ticket State
  patientInfo: CCCDInfo | null;
  activeTicket: TicketData | null;
  routeSteps: RouteStepItem[];
  
  // Global UI State
  toasts: ToastItem[];
  isLoading: boolean;
  loadingMessage: string;

  // Actions
  initialize: () => void;
  selectHomeOption: (view: ActiveView) => void;
  closeModal: () => void;
  simulateScanCCCD: () => void;
  
  // AI Register actions
  setAIRegisterStep: (step: AIRegisterStep) => void;
  toggleBodyPart: (part: string) => void;
  removeBodyPart: (part: string) => void;
  toggleSymptom: (symptom: string) => void;
  removeSymptom: (symptom: string) => void;
  setSymptomDuration: (duration: string) => void;
  setPainLevel: (level: number) => void;
  setHasEmergency: (emergency: boolean) => void;
  setSelectedDoctor: (doctor: Doctor) => void;
  runAIAnalysis: () => void;
  confirmRegistration: () => void;

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

const MOCK_PATIENT: CCCDInfo = {
  fullName: 'NGUYỄN VĂN A',
  idNumber: '038095001234',
  dob: '15/10/1995',
  gender: 'Nam',
  address: '123 Đường Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh'
};

const MOCK_TICKET: TicketData = {
  ticketNumber: 'A12',
  patientName: 'NGUYỄN VĂN A',
  dob: '15/10/1995',
  createdAt: new Date().toLocaleString('vi-VN'),
  clinicName: 'Nội Tổng Quát',
  roomNumber: 'P.204',
  location: 'Tầng 2 - Khu B',
  doctorName: 'BS. Nguyễn Minh Tuấn',
  status: 'waiting',
  waitingCount: 3,
  currentCallingNo: 'A09',
  estimatedWaitMinutes: 10
};

export const MOCK_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'BS. Nguyễn Minh Tuấn',
    specialty: 'Nội Tổng Quát',
    room: 'P.204',
    location: 'Tầng 2 - Khu B'
  },
  {
    id: 'doc-2',
    name: 'BS. Trần Thu Hà',
    specialty: 'Nội Tổng Quát',
    room: 'P.208',
    location: 'Tầng 2 - Khu B'
  },
  {
    id: 'doc-3',
    name: 'BS. Lê Văn An',
    specialty: 'Nội Tổng Quát',
    room: 'P.208',
    location: 'Tầng 2 - Khu B'
  }
];

export const MOCK_ROUTE_STEPS: RouteStepItem[] = [
  {
    id: 1,
    title: '1. Thanh toán CLS',
    subtitle: 'Thu ngân',
    room: 'TN-01',
    location: 'Tầng 1',
    status: 'completed'
  },
  {
    id: 2,
    title: '2. Xét nghiệm máu',
    subtitle: 'Xét nghiệm',
    room: 'LAB-02',
    location: 'Tầng 2 - Khu B',
    queueNo: 'A12',
    estimatedWait: '~10 phút',
    status: 'in_progress'
  },
  {
    id: 3,
    title: '3. X-Quang ngực',
    subtitle: 'Chẩn đoán hình ảnh',
    room: 'XR-05',
    location: 'Tầng 3 - Khu A',
    queueNo: 'B08',
    estimatedWait: '~25 phút',
    status: 'waiting'
  },
  {
    id: 4,
    title: '4. Quay lại bác sĩ',
    subtitle: 'Khoa Nội',
    room: 'P.201',
    location: 'Tầng 2 - Khu C',
    status: 'pending'
  },
  {
    id: 5,
    title: '5. Nhà thuốc',
    subtitle: 'Dược',
    room: 'NT-01',
    location: 'Tầng 1',
    status: 'pending'
  },
  {
    id: 6,
    title: '6. Hoàn tất',
    subtitle: 'Tổng kết',
    room: '-',
    location: '-',
    status: 'pending'
  }
];

const MOCK_BILL: PaymentBill = {
  billId: 'TF-9042A',
  patientCode: 'BN20260516001',
  patientName: 'NGUYỄN VĂN A',
  items: [
    { name: 'Phí khám bệnh', amount: 150000 },
    { name: 'Phí dịch vụ', amount: 50000 }
  ],
  totalAmount: 200000,
  isPaid: false
};

export const useKioskStore = create<KioskStoreState>((set, get) => ({
  currentView: 'home',
  activeModal: null,
  targetViewAfterScan: null,

  aiRegisterStep: 'body_select',
  selectedBodyParts: ['Ngực', 'Cánh tay phải'],
  selectedSymptoms: ['Bầm tím'],
  symptomDuration: '3-7 ngày',
  painLevel: 5,
  hasEmergency: false,
  aiAnalysisResult: {
    recommendedSpecialty: 'Nội Tổng Quát',
    priority: 'Thường',
    mainSymptoms: 'đau đầu, sốt',
    painLevel: 5,
    duration: '3-7days',
    hasEmergency: false
  },
  selectedDoctor: MOCK_DOCTORS[0],

  paymentMethod: null,
  activeBill: MOCK_BILL,
  patientInfo: MOCK_PATIENT,
  activeTicket: MOCK_TICKET,
  routeSteps: MOCK_ROUTE_STEPS,

  toasts: [],
  isLoading: false,
  loadingMessage: 'Đang tải dữ liệu...',

  initialize: () => {
    set({
      currentView: 'home',
      activeModal: null,
      targetViewAfterScan: null,
      aiRegisterStep: 'body_select',
      isLoading: false
    });
  },

  selectHomeOption: (targetView: ActiveView) => {
    if (targetView === 'support') {
      set({ currentView: 'support', activeModal: null });
      return;
    }
    set({
      targetViewAfterScan: targetView,
      activeModal: 'scan_cccd'
    });
  },

  closeModal: () => {
    set({ activeModal: null });
  },

  simulateScanCCCD: () => {
    const { targetViewAfterScan, showToast } = get();
    set({ isLoading: true, loadingMessage: 'Đang đọc thẻ CCCD gắn chip...' });

    setTimeout(() => {
      set({
        isLoading: false,
        activeModal: null,
        patientInfo: MOCK_PATIENT,
        activeTicket: MOCK_TICKET,
        activeBill: MOCK_BILL
      });

      showToast('Quét thẻ CCCD thành công!', 'success');

      if (targetViewAfterScan === 'register') {
        set({
          currentView: 'register',
          aiRegisterStep: 'body_select'
        });
      } else if (targetViewAfterScan === 'patient_info') {
        set({ currentView: 'patient_info' });
      } else if (targetViewAfterScan === 'doctor_route') {
        set({ currentView: 'doctor_route' });
      } else if (targetViewAfterScan === 'queue') {
        set({ currentView: 'queue' });
      } else if (targetViewAfterScan === 'map') {
        set({ currentView: 'map' });
      } else if (targetViewAfterScan === 'payment') {
        set({ currentView: 'payment' });
      } else {
        set({ currentView: 'patient_info' });
      }
    }, 1200);
  },

  setAIRegisterStep: (step: AIRegisterStep) => {
    set({ aiRegisterStep: step });
  },

  toggleBodyPart: (part: string) => {
    set((state) => {
      const exists = state.selectedBodyParts.includes(part);
      return {
        selectedBodyParts: exists 
          ? state.selectedBodyParts.filter(p => p !== part)
          : [...state.selectedBodyParts, part]
      };
    });
  },

  removeBodyPart: (part: string) => {
    set((state) => ({
      selectedBodyParts: state.selectedBodyParts.filter(p => p !== part)
    }));
  },

  toggleSymptom: (symptom: string) => {
    set((state) => {
      const exists = state.selectedSymptoms.includes(symptom);
      return {
        selectedSymptoms: exists
          ? state.selectedSymptoms.filter(s => s !== symptom)
          : [...state.selectedSymptoms, symptom]
      };
    });
  },

  removeSymptom: (symptom: string) => {
    set((state) => ({
      selectedSymptoms: state.selectedSymptoms.filter(s => s !== symptom)
    }));
  },

  setSymptomDuration: (duration: string) => {
    set({ symptomDuration: duration });
  },

  setPainLevel: (level: number) => {
    set({ painLevel: level });
  },

  setHasEmergency: (emergency: boolean) => {
    set({ hasEmergency: emergency });
  },

  setSelectedDoctor: (doctor: Doctor) => {
    set({ selectedDoctor: doctor });
  },

  runAIAnalysis: () => {
    const { showToast } = get();
    set({ isLoading: true, loadingMessage: 'Hệ thống AI đang phân tích triệu chứng...' });
    setTimeout(() => {
      set({
        isLoading: false,
        aiRegisterStep: 'ai_result',
        aiAnalysisResult: {
          recommendedSpecialty: 'Nội Tổng Quát',
          priority: 'Thường',
          mainSymptoms: 'đau đầu, sốt',
          painLevel: get().painLevel,
          duration: get().symptomDuration,
          hasEmergency: get().hasEmergency
        }
      });
      showToast('Phân tích AI hoàn tất!', 'success');
    }, 1200);
  },

  confirmRegistration: () => {
    const { showToast } = get();
    set({ isLoading: true, loadingMessage: 'Đang tạo hồ sơ đăng ký khám...' });
    setTimeout(() => {
      set({
        isLoading: false,
        aiRegisterStep: 'confirm_info'
      });
      showToast('Đăng ký khám thành công!', 'success');
    }, 1000);
  },

  setPaymentMethod: (method: PaymentMethod | null) => {
    set({ paymentMethod: method });
  },

  payBill: () => {
    const { showToast } = get();
    set({ isLoading: true, loadingMessage: 'Đang xử lý giao dịch thanh toán...' });
    setTimeout(() => {
      set((state) => ({
        isLoading: false,
        activeBill: state.activeBill ? { ...state.activeBill, isPaid: true } : null
      }));
      showToast('Thanh toán thành công!', 'success');
    }, 1500);
  },

  goHome: () => {
    set({
      currentView: 'home',
      activeModal: null,
      targetViewAfterScan: null,
      aiRegisterStep: 'body_select',
      isLoading: false
    });
  },

  navigateToView: (view: ActiveView) => {
    set({ currentView: view });
  },

  showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  setLoading: (loading: boolean, message: string = 'Đang tải dữ liệu...') => {
    set({ isLoading: loading, loadingMessage: message });
  }
}));
