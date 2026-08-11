import { create } from 'zustand';
import { DoctorItem, DoctorSlotItem, BookingPaymentData, SpecialtyItem } from '../types/booking.types';
import { bookingService } from '../services/bookingService';
import { useAuthStore } from './authStore';
import { useTriageStore } from './triageStore';
import { useKioskStore } from './kioskStore';
import { useFlowStore } from '@/modules/kiosk/store/flowStore';
import { getActivePatientId } from '../utils/kioskHelpers';

interface BookingStoreState {
  specialties: SpecialtyItem[];
  isFetchingSpecialties: boolean;
  availableDoctors: DoctorItem[];
  availableSlots: DoctorSlotItem[];
  selectedSlotId: string | null;
  isDoctorLoading: boolean;
  isBookingProcessing: boolean;

  fetchSpecialties: () => Promise<void>;
  fetchDoctorsAndSlots: (specialtyCode: string, dateTime?: string) => Promise<void>;
  fetchSlotsForDoctor: (doctorId: string, date?: string) => Promise<void>;
  executeAutoBooking: () => Promise<boolean>;
  executeManualBooking: (slotId: string) => Promise<boolean>;
  resetBooking: () => void;
}

const initialState = {
  specialties: [],
  isFetchingSpecialties: false,
  availableDoctors: [],
  availableSlots: [],
  selectedSlotId: null,
  isDoctorLoading: false,
  isBookingProcessing: false,
};

const handleBookingSuccess = (response: any, patientId: string) => {
  const flowStore = useFlowStore.getState();
  const kioskState = useKioskStore.getState();

  const resData = response.data || (response as any);
  const stepId = resData.step_id;
  const bookingId = resData.booking_id || resData.data?.booking_id;
  const paymentData: BookingPaymentData = resData.payment?.data || resData.payment;

  flowStore.setBookingPaymentState(stepId || '', bookingId || '', paymentData, patientId);
  kioskState.navigateToView('payment');
};

export const useBookingStore = create<BookingStoreState>((set, get) => ({
  ...initialState,

  resetBooking: () => {
    set(initialState);
  },

  fetchSpecialties: async () => {
    set({ isFetchingSpecialties: true });
    try {
      const response = await bookingService.getAllSpecialties({ limit: 50 });
      const apiResponse = response?.data as any;
      const list = apiResponse?.data?.data || apiResponse?.data || apiResponse || [];
      set({ specialties: Array.isArray(list) ? list : [] });
    } catch (error) {
      console.warn('Lỗi lấy danh sách chuyên khoa:', error);
      set({ specialties: [] });
    } finally {
      set({ isFetchingSpecialties: false });
    }
  },

  fetchDoctorsAndSlots: async (specialtyCode: string, dateTime?: string) => {
    set({ isDoctorLoading: true });
    const targetDate = dateTime || new Date().toISOString().split('T')[0];
    try {
      const response = await bookingService.getDoctorsBySpecialty(specialtyCode, targetDate);
      const apiResponse = response?.data as any;
      const doctorsList = apiResponse?.data?.data || apiResponse?.data || apiResponse || [];
      set({ availableDoctors: Array.isArray(doctorsList) ? doctorsList : [] });
    } catch (error) {
      console.error('Lỗi lấy danh sách bác sĩ:', error);
      set({ availableDoctors: [] });
    } finally {
      set({ isDoctorLoading: false });
    }
  },

  fetchSlotsForDoctor: async (doctorId: string, date?: string) => {
    set({ isDoctorLoading: true });
    const targetDate = date || new Date().toISOString().split('T')[0];
    try {
      const response = await bookingService.getDoctorSlots(doctorId, targetDate);
      const apiResponse = response?.data as any;
      const slotsList = apiResponse?.data?.data || apiResponse?.data || apiResponse || [];
      set({ availableSlots: Array.isArray(slotsList) ? slotsList : [] });
    } catch (error) {
      console.error('Lỗi lấy khung giờ bác sĩ:', error);
      set({ availableSlots: [] });
    } finally {
      set({ isDoctorLoading: false });
    }
  },

  executeAutoBooking: async () => {
    const authState = useAuthStore.getState();
    const triageState = useTriageStore.getState();
    const kioskState = useKioskStore.getState();
    const flowStore = useFlowStore.getState();

    const patientId = getActivePatientId(authState);
    const interviewToken = triageState.interviewToken;

    if (!patientId || !interviewToken) {
      kioskState.showToast('Thiếu thông tin bệnh nhân hoặc phiên chẩn đoán AI!', 'error');
      return false;
    }

    set({ isBookingProcessing: true });
    kioskState.setLoading(true, 'Đang tự động phân phòng khám & khởi tạo thanh toán...');

    try {
      const response = await bookingService.createAutoBooking(patientId, interviewToken);

      if (response && (response.status === 'success' || response.code === 200 || response.data)) {
        handleBookingSuccess(response, patientId);
        kioskState.showToast('Khởi tạo lịch khám & mã QR thanh toán thành công!', 'success');
        return true;
      } else {
        kioskState.showToast('Phân phòng tự động chưa thành công. Vui lòng chọn Bác sĩ cụ thể!', 'error');
        return false;
      }
    } catch (error: any) {
      console.warn('Lỗi khi thực hiện Auto Booking:', error?.message || error);
      const errorMsg = error?.message || 'Lỗi kết nối khi tự động xếp phòng!';
      kioskState.showToast(errorMsg, 'error');
      try {
        const mainSpecialtyCode = useTriageStore.getState().recommendedSpecialists[0]?.specialty_code || 'SP_20';
        get().fetchDoctorsAndSlots(mainSpecialtyCode);
        kioskState.setAIRegisterStep('doctor_select');
      } catch (e) {
      }
      return false;
    } finally {
      set({ isBookingProcessing: false });
      kioskState.setLoading(false);
    }
  },

  executeManualBooking: async (slotId: string) => {
    const authState = useAuthStore.getState();
    const kioskState = useKioskStore.getState();
    const flowStore = useFlowStore.getState();

    const patientId = getActivePatientId(authState);

    if (!patientId || !slotId) {
      kioskState.showToast('Vui lòng chọn khung giờ khám hợp lệ!', 'error');
      return false;
    }

    set({ isBookingProcessing: true });
    kioskState.setLoading(true, 'Đang tạo đặt lịch khám & mã QR...');

    try {
      const response = await bookingService.createBooking(patientId, slotId);

      if (response && (response.status === 'success' || response.code === 200 || response.data)) {
        handleBookingSuccess(response, patientId);
        kioskState.showToast('Đặt lịch thành công! Vui lòng quét mã QR thanh toán.', 'success');
        return true;
      } else {
        kioskState.showToast('Tạo đặt lịch thất bại. Vui lòng thử lại!', 'error');
        return false;
      }
    } catch (error: any) {
      console.warn('Lỗi khi Đặt lịch thủ công:', error?.message || error);
      kioskState.showToast(error?.message || 'Lỗi máy chủ khi đặt lịch khám!', 'error');
      return false;
    } finally {
      set({ isBookingProcessing: false });
      kioskState.setLoading(false);
    }
  },
}));
