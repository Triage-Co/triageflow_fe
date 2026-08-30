import { create } from 'zustand';
import { authService } from '../services/authService';
import { CCCDInfo } from '../types/kiosk.types';
import { CCCDParsedResult } from '../utils/cccdParser';
import { decodeJwtPayload } from '@/shared/utils/jwt';

interface AuthStoreState {
  authToken?: string;
  patientId?: string;
  citizenId?: string;
  patientInfo: CCCDInfo | null;

  // OTP Flow States
  pendingCitizenId?: string;
  pendingParsedCCCD?: CCCDParsedResult | null;
  isRequestingOtp: boolean;
  isVerifyingOtp: boolean;
  isDirectLoggingIn: boolean;

  // Actions
  sendOtp: (
    citizenId: string,
    parsedCCCD?: CCCDParsedResult | null,
  ) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (otp: string) => Promise<{ success: boolean; message: string }>;
  loginDirect: (
    citizenId: string,
    parsedCCCD?: CCCDParsedResult | null,
  ) => Promise<{ success: boolean; message: string }>;
  resendOtp: () => Promise<{ success: boolean; message: string }>;
  clearPendingOtp: () => void;
  clearAuth: () => void;
}

const initialState = {
  authToken: undefined,
  patientId: undefined,
  citizenId: undefined,
  patientInfo: null,
  pendingCitizenId: undefined,
  pendingParsedCCCD: null,
  isRequestingOtp: false,
  isVerifyingOtp: false,
  isDirectLoggingIn: false,
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  ...initialState,

  clearPendingOtp: () => {
    set({
      pendingCitizenId: undefined,
      pendingParsedCCCD: null,
      isRequestingOtp: false,
      isVerifyingOtp: false,
      isDirectLoggingIn: false,
    });
  },

  clearAuth: () => {
    set(initialState);
  },

  loginDirect: async (citizenId: string, parsedCCCD?: CCCDParsedResult | null) => {
    const cleanCitizenId = citizenId.trim();
    set({ isDirectLoggingIn: true });

    try {
      const response = await authService.loginCitizenIdDirect({
        citizen_id: cleanCitizenId,
      });

      const resData: any = (response as any)?.data || response;
      const token = resData?.token || (response as any)?.token;
      const patientId = resData?.patient_id || (response as any)?.patient_id;
      const resCitizenId = resData?.citizen_id || (response as any)?.citizen_id || cleanCitizenId;

      if (token && patientId) {
        const payload = decodeJwtPayload(token);
        const patientData = (payload?.patient as any) || {};

        const rawGender = String(
          parsedCCCD?.gender || patientData?.gender || '',
        ).toLowerCase();
        const detectedGender: 'male' | 'female' =
          rawGender === 'female' || rawGender === 'nu' || rawGender === 'nữ' ? 'female' : 'male';

        const { useKioskStore } = await import('./kioskStore');
        useKioskStore.getState().setGender(detectedGender);

        set({
          authToken: token,
          patientId: patientId,
          citizenId: resCitizenId,
          patientInfo: {
            idNumber:
              parsedCCCD?.citizenId ||
              patientData?.citizen_id ||
              resCitizenId,
            fullName:
              parsedCCCD?.fullName ||
              patientData?.full_name ||
              '',
            dob: parsedCCCD?.dob || patientData?.dob || '',
            gender: detectedGender,
            address: parsedCCCD?.address || '',
          },
          pendingCitizenId: undefined,
          pendingParsedCCCD: null,
          isDirectLoggingIn: false,
        });

        return {
          success: true,
          message: response?.message || 'Đăng nhập thành công',
        };
      }

      set({ isDirectLoggingIn: false });
      return {
        success: false,
        message: 'Dữ liệu đăng nhập không hợp lệ từ máy chủ.',
      };
    } catch (error: any) {
      console.error('Lỗi khi đăng nhập trực tiếp CCCD:', error);
      set({ isDirectLoggingIn: false });
      const errorMessage =
        error?.detail ||
        error?.message ||
        'Không tìm thấy thông tin bệnh nhân tương ứng với số CCCD này.';
      return { success: false, message: errorMessage };
    }
  },

  sendOtp: async (citizenId: string, parsedCCCD?: CCCDParsedResult | null) => {
    set({ isRequestingOtp: true });
    try {
      const response = await authService.sendCitizenOtp({ citizen_id: citizenId.trim() });
      const message = response?.message || 'Gửi mã OTP thành công';

      set({
        pendingCitizenId: citizenId.trim(),
        pendingParsedCCCD: parsedCCCD || null,
        isRequestingOtp: false,
      });

      return { success: true, message };
    } catch (error: any) {
      console.error('Lỗi khi gửi mã OTP:', error);
      set({ isRequestingOtp: false });
      const errorMessage =
        error?.detail ||
        error?.message ||
        'Không thể gửi mã OTP. Vui lòng kiểm tra lại số CCCD hoặc liên hệ nhân viên tiếp đón.';
      return { success: false, message: errorMessage };
    }
  },

  resendOtp: async () => {
    const { pendingCitizenId, pendingParsedCCCD, sendOtp } = get();
    if (!pendingCitizenId) {
      return { success: false, message: 'Chưa có thông tin số CCCD để gửi lại OTP.' };
    }
    return sendOtp(pendingCitizenId, pendingParsedCCCD);
  },

  verifyOtp: async (otp: string) => {
    const { pendingCitizenId, pendingParsedCCCD } = get();
    if (!pendingCitizenId) {
      return { success: false, message: 'Phiên đăng nhập đã hết hạn. Vui lòng thử lại.' };
    }

    set({ isVerifyingOtp: true });

    try {
      const response = await authService.verifyCitizenOtp({
        citizen_id: pendingCitizenId,
        otp: otp.trim(),
      });

      const resData: any = (response as any)?.data || response;
      const token = resData?.token || (response as any)?.token;
      const patientId = resData?.patient_id || (response as any)?.patient_id;
      const resCitizenId = resData?.citizen_id || (response as any)?.citizen_id || pendingCitizenId;

      if (token && patientId) {
        const payload = decodeJwtPayload(token);
        const patientData = (payload?.patient as any) || {};

        const rawGender = String(
          pendingParsedCCCD?.gender || patientData?.gender || '',
        ).toLowerCase();
        const detectedGender: 'male' | 'female' =
          rawGender === 'female' || rawGender === 'nu' || rawGender === 'nữ' ? 'female' : 'male';

        const { useKioskStore } = await import('./kioskStore');
        useKioskStore.getState().setGender(detectedGender);

        set({
          authToken: token,
          patientId: patientId,
          citizenId: resCitizenId,
          patientInfo: {
            idNumber:
              pendingParsedCCCD?.citizenId ||
              patientData?.citizen_id ||
              resCitizenId,
            fullName:
              pendingParsedCCCD?.fullName ||
              patientData?.full_name ||
              '',
            dob: pendingParsedCCCD?.dob || patientData?.dob || '',
            gender: detectedGender,
            address: pendingParsedCCCD?.address || '',
          },
          pendingCitizenId: undefined,
          pendingParsedCCCD: null,
          isVerifyingOtp: false,
        });

        return {
          success: true,
          message: response?.message || 'Đăng nhập thành công',
        };
      }

      set({ isVerifyingOtp: false });
      return {
        success: false,
        message: 'Dữ liệu đăng nhập không hợp lệ từ máy chủ.',
      };
    } catch (error: any) {
      console.error('Lỗi khi xác thực OTP:', error);
      set({ isVerifyingOtp: false });
      const errorMessage =
        error?.detail ||
        error?.message ||
        'Mã OTP không chính xác hoặc đã hết hạn. Vui lòng thử lại.';
      return { success: false, message: errorMessage };
    }
  },
}));