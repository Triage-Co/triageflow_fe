import { create } from 'zustand';
import {
  ActiveView,
  ActiveModal,
  AIRegisterStep,
  Doctor,
  ToastItem,
} from '../types/kiosk.types';
import { useAuthStore } from './authStore';
import { useTriageStore } from './triageStore';
import { useBookingStore } from './bookingStore';
import { useFlowStore } from './flowStore';

export interface KioskStoreState {
  currentView: ActiveView;
  activeModal: ActiveModal;
  targetViewAfterScan: ActiveView | null;
  aiRegisterStep: AIRegisterStep;
  bookingFlowMode: 'direct' | 'ai';
  selectedGender: 'male' | 'female';
  selectedBodyPart: string | null;
  selectedBodyParts: string[];
  selectedDoctor: Doctor | null;
  toasts: ToastItem[];
  isLoading: boolean;
  loadingMessage: string;

  // Actions
  initialize: () => void;
  selectHomeOption: (optionId: string) => void;
  openModal: (modal: ActiveModal, targetView?: ActiveView) => void;
  closeModal: () => void;
  setLoading: (isLoading: boolean, message?: string) => void;
  setAIRegisterStep: (step: AIRegisterStep) => void;
  setBookingFlowMode: (mode: 'direct' | 'ai') => void;
  setGender: (gender: 'male' | 'female') => void;
  setSelectedBodyPart: (part: string | null) => void;
  toggleBodyPart: (part: string) => void;
  removeBodyPart: (part: string) => void;
  setSelectedDoctor: (doctor: Doctor | null) => void;
  goHome: () => void;
  navigateToView: (view: ActiveView) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useKioskStore = create<KioskStoreState>((set, get) => ({
  currentView: 'home',
  activeModal: null,
  targetViewAfterScan: null,
  aiRegisterStep: 'body_select',
  bookingFlowMode: 'ai',
  selectedGender: 'male',
  selectedBodyPart: null,
  selectedBodyParts: [],
  selectedDoctor: null,
  toasts: [],
  isLoading: false,
  loadingMessage: 'Đang xử lý dữ liệu Kiosk...',

  initialize: () => {
    get().goHome();
  },

  selectHomeOption: (optionId) => {
    const authState = useAuthStore.getState();
    const patientId = authState.patientId || authState.citizenId || '';

    switch (optionId) {
      case 'register':
        if (!authState.citizenId && !authState.authToken) {
          get().openModal('scan_cccd', 'booking_mode');
        } else {
          get().navigateToView('booking_mode');
        }
        break;
      case 'patient_info':
      case 'info':
        if (!authState.citizenId && !authState.authToken) {
          get().openModal('scan_cccd', 'patient_info');
        } else {
          if (patientId) {
            useFlowStore.getState().fetchActiveTicketForPatient(patientId);
          }
          get().navigateToView('patient_info');
        }
        break;
      case 'doctor_route':
      case 'route':
        if (!authState.citizenId && !authState.authToken) {
          get().openModal('scan_cccd', 'doctor_route');
        } else {
          if (patientId) {
            useFlowStore.getState().fetchActiveTicketForPatient(patientId);
          }
          get().navigateToView('doctor_route');
        }
        break;
      case 'queue':
        if (!authState.citizenId && !authState.authToken) {
          get().openModal('scan_cccd', 'queue');
        } else {
          if (patientId) {
            useFlowStore.getState().fetchActiveTicketForPatient(patientId);
          }
          get().navigateToView('queue');
        }
        break;
      case 'map':
        get().navigateToView('map');
        break;
      case 'payment':
      case 'pay':
        if (!authState.citizenId && !authState.authToken) {
          get().openModal('scan_cccd', 'pending_bills');
        } else {
          if (patientId) {
            useFlowStore.getState().fetchPendingPaymentSteps(patientId);
          } else {
            get().openModal('scan_cccd', 'pending_bills');
          }
        }
        break;
      case 'support':
        get().navigateToView('support');
        break;
      default:
        get().navigateToView('home');
    }
  },

  openModal: (modal, targetView) => {
    set({
      activeModal: modal,
      targetViewAfterScan: targetView ?? null,
    });
  },

  closeModal: () => set({ activeModal: null, targetViewAfterScan: null }),

  setLoading: (isLoading, message) => set({
    isLoading,
    loadingMessage: message || 'Đang xử lý dữ liệu Kiosk...'
  }),

  setAIRegisterStep: (step) => set({ aiRegisterStep: step as AIRegisterStep }),
  setBookingFlowMode: (mode) => set({ bookingFlowMode: mode }),
  setGender: (gender) => set({ selectedGender: gender }),
  setSelectedBodyPart: (part) => set({ selectedBodyPart: part, selectedBodyParts: part ? [part] : [] }),
  toggleBodyPart: (part) => set((s) => ({
    selectedBodyParts: s.selectedBodyParts.includes(part)
      ? s.selectedBodyParts.filter(p => p !== part)
      : [...s.selectedBodyParts, part]
  })),
  removeBodyPart: (part) => set((s) => ({ selectedBodyParts: s.selectedBodyParts.filter(p => p !== part) })),
  setSelectedDoctor: (doctor) => set({ selectedDoctor: doctor }),

  goHome: () => {
    useAuthStore.getState().clearAuth();
    useTriageStore.getState().resetTriageFlow();
    useBookingStore.getState().resetBooking();
    useFlowStore.getState().resetFlow();

    set({
      currentView: 'home',
      activeModal: null,
      targetViewAfterScan: null,
      aiRegisterStep: 'body_select',
      bookingFlowMode: 'ai',
      isLoading: false,
    });
  },

  navigateToView: (view) => set({ currentView: view }),

  showToast: (msg, type = 'info') => {
    const id = Date.now().toString();
    set((s) => ({ toasts: [...s.toasts, { id, message: msg, type }] }));

    setTimeout(() => {
      get().removeToast(id);
    }, 4000);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));