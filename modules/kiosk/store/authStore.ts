import { create } from 'zustand';
import { authService } from '../services/authService';
import { CCCDInfo } from '../types/kiosk.types';
import { CCCDParsedResult } from '../utils/cccdParser';

interface AuthStoreState {
  authToken?: string;
  patientId?: string;
  citizenId?: string;
  patientInfo: CCCDInfo | null;

  loginCitizen: (citizenId: string) => Promise<boolean>;
  loginCitizenWithCCCDData: (parsedCCCD: CCCDParsedResult) => Promise<boolean>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  authToken: undefined,
  patientId: undefined,
  citizenId: undefined,
  patientInfo: null,

  clearAuth: () => {
    set({
      authToken: undefined,
      patientId: undefined,
      citizenId: undefined,
      patientInfo: null,
    });
  },

  loginCitizen: async (citizenId: string) => {
    try {
      const response = await authService.loginKiosk({ citizen_id: citizenId });
      const resData: any = (response as any)?.data || response;
      const token = resData?.token || (response as any)?.token;
      const patientId = resData?.patient_id || (response as any)?.patient_id;
      const resCitizenId = resData?.citizen_id || (response as any)?.citizen_id || citizenId;

      if (token && patientId) {
        set({
          authToken: token,
          patientId: patientId,
          citizenId: resCitizenId,
          patientInfo: {
            idNumber: citizenId,
            fullName: 'BỆNH NHÂN',
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
            fullName: parsedCCCD.fullName || 'BỆNH NHÂN',
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