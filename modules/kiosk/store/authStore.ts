import { create } from 'zustand';
import { authService } from '../services/authService';
import { CCCDInfo } from '../types/kiosk.types';
import { CCCDParsedResult } from '../utils/cccdParser';
import { getUserFromToken } from '@/shared/utils/jwt';

interface AuthStoreState {
  authToken?: string;
  patientId?: string;
  citizenId?: string;
  patientInfo: CCCDInfo | null;

  loginCitizen: (citizenId: string) => Promise<boolean>;
  loginCitizenWithCCCDData: (parsedCCCD: CCCDParsedResult) => Promise<boolean>;
  clearAuth: () => void;
}

const initialState = {
  authToken: undefined,
  patientId: undefined,
  citizenId: undefined,
  patientInfo: null,
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  ...initialState,

  clearAuth: () => {
    set(initialState);
  },

  loginCitizen: async (citizenId: string) => {
    try {
      const response = await authService.loginKiosk({ citizen_id: citizenId });
      const resData: any = (response as any)?.data || response;
      const token = resData?.token || (response as any)?.token;
      const patientId = resData?.patient_id || (response as any)?.patient_id;
      const resCitizenId = resData?.citizen_id || (response as any)?.citizen_id || citizenId;

      if (token && patientId) {
        // Decode token để lấy thông tin fullName
        const decodedUser = getUserFromToken(token);
        const nameFromToken = decodedUser?.fullName || '';

        set({
          authToken: token,
          patientId: patientId,
          citizenId: resCitizenId,
          patientInfo: {
            idNumber: citizenId,
            fullName: nameFromToken,
            dob: '',
            gender: '',
            address: '',
          },
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Lỗi xử lý Đăng nhập tại AuthStore:', error);
      return false;
    }
  },

  loginCitizenWithCCCDData: async (parsedCCCD: CCCDParsedResult) => {
    try {
      const response = await authService.loginKiosk({ citizen_id: parsedCCCD.citizenId });
      const resData: any = (response as any)?.data || response;
      const token = resData?.token || (response as any)?.token;
      const patientId = resData?.patient_id || (response as any)?.patient_id;
      const resCitizenId = resData?.citizen_id || (response as any)?.citizen_id || parsedCCCD.citizenId;

      if (token && patientId) {
        set({
          authToken: token,
          patientId: patientId,
          citizenId: resCitizenId,
          patientInfo: {
            idNumber: parsedCCCD.citizenId,
            fullName: parsedCCCD.fullName || '',
            dob: parsedCCCD.dob || '',
            gender: parsedCCCD.gender || '',
            address: parsedCCCD.address || '',
          },
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Lỗi xác thực CCCD tại AuthStore:', error);
      return false;
    }
  },
}));