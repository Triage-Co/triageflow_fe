import { create } from 'zustand';
import { DoctorItem, DoctorSlotItem, BookingPaymentData } from '../types/booking.types';
import { bookingService } from '../services/bookingService';
import { useAuthStore } from './authStore';
import { useTriageStore } from './triageStore';
import { useKioskStore } from './kioskStore';
import { useFlowStore } from '@/modules/kiosk/store/flowStore';

interface BookingStoreState {
  availableDoctors: DoctorItem[];
  availableSlots: DoctorSlotItem[];
  selectedSlotId: string | null;
  isDoctorLoading: boolean;
  isBookingProcessing: boolean;

  fetchDoctorsAndSlots: (specialtyCode: string) => Promise<void>;
  fetchSlotsForDoctor: (doctorId: string, date?: string) => Promise<void>;
  executeAutoBooking: () => Promise<boolean>;
  executeManualBooking: (slotId: string) => Promise<boolean>;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingStoreState>((set, get) => ({
  availableDoctors: [],
  availableSlots: [],
  selectedSlotId: null,
  isDoctorLoading: false,
  isBookingProcessing: false,

  resetBooking: () => {
    set({
      availableDoctors: [],
      availableSlots: [],
      selectedSlotId: null,
      isDoctorLoading: false,
      isBookingProcessing: false,
    });
  },

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

  executeAutoBooking: async () => {
    const authState = useAuthStore.getState();
    const triageState = useTriageStore.getState();
    const kioskState = useKioskStore.getState();
    const flowStore = useFlowStore.getState();

    const patientId = authState.patientId || authState.citizenId || authState.patientInfo?.idNumber;
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
        const resData = response.data || (response as any);
        const stepId = resData.step_id;
        const bookingId = resData.booking_id || resData.data?.booking_id;
        const paymentData: BookingPaymentData = resData.payment?.data || resData.payment;

        flowStore.setBookingPaymentState(stepId || '', bookingId || '', paymentData, patientId);
        kioskState.navigateToView('payment');
        kioskState.showToast('Khởi tạo lịch khám & mã VietQR thành công!', 'success');
        return true;
      } else {
        kioskState.showToast('Phân phòng tự động chưa thành công. Vui lòng chọn Bác sĩ cụ thể!', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Lỗi khi thực hiện Auto Booking:', error);
      kioskState.showToast(error.message || 'Lỗi kết nối khi tự động xếp phòng!', 'error');
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

    const patientId = authState.patientId || authState.citizenId || authState.patientInfo?.idNumber;

    if (!patientId || !slotId) {
      kioskState.showToast('Vui lòng chọn khung giờ khám hợp lệ!', 'error');
      return false;
    }

    set({ isBookingProcessing: true });
    kioskState.setLoading(true, 'Đang tạo đặt lịch khám & mã VietQR...');

    try {
      const response = await bookingService.createBooking(patientId, slotId);

      if (response && (response.status === 'success' || response.code === 200 || response.data)) {
        const resData = response.data || (response as any);
        const stepId = resData.step_id;
        const bookingId = resData.booking_id || resData.data?.booking_id;
        const paymentData: BookingPaymentData = resData.payment?.data || resData.payment;

        flowStore.setBookingPaymentState(stepId || '', bookingId || '', paymentData, patientId);
        kioskState.navigateToView('payment');
        kioskState.showToast('Đặt lịch thành công! Vui lòng quét mã QR thanh toán.', 'success');
        return true;
      } else {
        kioskState.showToast('Tạo đặt lịch thất bại. Vui lòng thử lại!', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Lỗi khi Đặt lịch thủ công:', error);
      kioskState.showToast(error.message || 'Lỗi máy chủ khi đặt lịch khám!', 'error');
      return false;
    } finally {
      set({ isBookingProcessing: false });
      kioskState.setLoading(false);
    }
  },
}));
