import { create } from 'zustand';
import { packageBookingService } from '../services/packageBookingService';
import { ExamPackage, ExamPackageDetail, RoomSlot } from '../types/packageBooking.types';
import { useAuthStore } from './authStore';
import { useKioskStore } from './kioskStore';
import { useFlowStore } from './flowStore';
import { getActivePatientId } from '../utils/kioskHelpers';

interface PackageBookingStoreState {
  packages: ExamPackage[];
  isFetchingPackages: boolean;
  selectedPackageId: string | null;
  selectedPackageDetail: ExamPackageDetail | null;
  isFetchingPackageDetail: boolean;
  selectedDate: string | null;
  slots: RoomSlot[];
  isFetchingSlots: boolean;
  selectedSlotId: string | null;
  isBookingProcessing: boolean;

  // Actions
  fetchPackages: () => Promise<void>;
  selectPackage: (id: string) => Promise<void>;
  fetchPackageDetail: (id: string) => Promise<void>;
  selectDate: (date: string) => Promise<void>;
  fetchSlots: (date: string) => Promise<void>;
  selectSlot: (slotId: string | null) => void;
  executePackageBooking: () => Promise<boolean>;
  resetStore: () => void;
}

const initialState = {
  packages: [],
  isFetchingPackages: false,
  selectedPackageId: null,
  selectedPackageDetail: null,
  isFetchingPackageDetail: false,
  selectedDate: null,
  slots: [],
  isFetchingSlots: false,
  selectedSlotId: null,
  isBookingProcessing: false,
};

export const usePackageBookingStore = create<PackageBookingStoreState>((set, get) => ({
  ...initialState,

  resetStore: () => {
    set(initialState);
  },

  fetchPackages: async () => {
    set({ isFetchingPackages: true });
    const kioskState = useKioskStore.getState();
    try {
      const response = await packageBookingService.getAllPackages();
      const list = (response as any)?.data || response || [];
      set({ packages: Array.isArray(list) ? list : [] });
    } catch (error: any) {
      console.error('Lỗi khi lấy danh sách gói khám:', error);
      kioskState.showToast(error?.message || 'Không thể tải danh sách gói khám!', 'error');
      set({ packages: [] });
    } finally {
      set({ isFetchingPackages: false });
    }
  },

  selectPackage: async (id: string) => {
    set({ selectedPackageId: id, selectedPackageDetail: null, selectedDate: null, slots: [], selectedSlotId: null });
    const kioskState = useKioskStore.getState();
    kioskState.navigateToView('package_detail');
    await get().fetchPackageDetail(id);
  },

  fetchPackageDetail: async (id: string) => {
    set({ isFetchingPackageDetail: true });
    const kioskState = useKioskStore.getState();
    try {
      const response = await packageBookingService.getPackageDetail(id);
      const detail = (response as any)?.data || response || null;
      set({ selectedPackageDetail: detail });
    } catch (error: any) {
      console.error('Lỗi khi lấy chi tiết gói khám:', error);
      kioskState.showToast(error?.message || 'Không thể tải chi tiết gói khám!', 'error');
      set({ selectedPackageDetail: null });
    } finally {
      set({ isFetchingPackageDetail: false });
    }
  },

  selectDate: async (date: string) => {
    set({ selectedDate: date, slots: [], selectedSlotId: null });
    await get().fetchSlots(date);
  },

  fetchSlots: async (date: string) => {
    set({ isFetchingSlots: true });
    const kioskState = useKioskStore.getState();
    try {
      const response = await packageBookingService.getRoomSlots(date);
      const list = (response as any)?.data || response || [];
      const availableSlots = Array.isArray(list)
        ? list.filter((s: RoomSlot) => s.status === 'AVAILABLE')
        : [];
      set({ slots: availableSlots });
    } catch (error: any) {
      console.error('Lỗi khi tải danh sách slots khám:', error);
      kioskState.showToast(error?.message || 'Không thể tải danh sách khung giờ trống!', 'error');
      set({ slots: [] });
    } finally {
      set({ isFetchingSlots: false });
    }
  },

  selectSlot: (slotId: string | null) => {
    set({ selectedSlotId: slotId });
  },

  executePackageBooking: async () => {
    const authState = useAuthStore.getState();
    const kioskState = useKioskStore.getState();
    const flowStore = useFlowStore.getState();

    const patientId = getActivePatientId(authState);
    const { selectedSlotId, selectedPackageId, selectedPackageDetail } = get();

    if (!patientId) {
      kioskState.showToast('Vui lòng quét thẻ CCCD đăng nhập trước!', 'error');
      return false;
    }

    if (!selectedPackageId) {
      kioskState.showToast('Vui lòng chọn một gói khám!', 'error');
      return false;
    }

    if (!selectedSlotId) {
      kioskState.showToast('Vui lòng chọn một khung giờ khám!', 'error');
      return false;
    }

    set({ isBookingProcessing: true });
    kioskState.setLoading(true, 'Đang khởi tạo đăng ký gói khám & mã VietQR...');

    try {
      const response = await packageBookingService.createBookingWithPackage(
        patientId,
        selectedSlotId,
        selectedPackageId
      );

      const resData = response.data || (response as any);
      if (resData && (response.status === 'success' || response.code === 200 || response.data)) {
        const dataBody = resData.data || resData;
        const bookingId = dataBody.booking_id;
        const paymentData = dataBody.payment?.data || dataBody.payment;
        flowStore.setBookingPaymentState('', bookingId || '', paymentData, patientId);

        kioskState.navigateToView('payment');
        kioskState.showToast('Đặt gói khám thành công! Vui lòng quét mã QR thanh toán.', 'success');
        return true;
      } else {
        kioskState.showToast(response.message || 'Tạo đăng ký gói khám thất bại!', 'error');
        return false;
      }
    } catch (error: any) {
      console.error('Lỗi khi thực hiện đặt gói khám:', error);
      kioskState.showToast(error?.message || 'Lỗi kết nối khi đặt gói khám!', 'error');
      return false;
    } finally {
      set({ isBookingProcessing: false });
      kioskState.setLoading(false);
    }
  }
}));
