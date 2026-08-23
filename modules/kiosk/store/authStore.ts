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
        const payload = decodeJwtPayload(token);
        const patientData = (payload?.patient as any) || {};

        const rawGender = String(patientData?.gender || '').toLowerCase();
        const detectedGender: 'male' | 'female' =
          rawGender === 'female' || rawGender === 'nu' || rawGender === 'nữ' ? 'female' : 'male';
        const { useKioskStore } = await import('./kioskStore');
        useKioskStore.getState().setGender(detectedGender);

        set({
          authToken: token,
          patientId: patientId,
          citizenId: resCitizenId,
          patientInfo: {
            idNumber: patientData?.citizen_id || citizenId,
            fullName: patientData?.full_name || '',
            dob: patientData?.dob || '',
            gender: detectedGender,
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
        const payload = decodeJwtPayload(token);
        const patientData = (payload?.patient as any) || {};

        const rawGender = String(parsedCCCD.gender || patientData?.gender || '').toLowerCase();
        const detectedGender: 'male' | 'female' =
          rawGender === 'female' || rawGender === 'nu' || rawGender === 'nữ' ? 'female' : 'male';
        const { useKioskStore } = await import('./kioskStore');
        useKioskStore.getState().setGender(detectedGender);

        set({
          authToken: token,
          patientId: patientId,
          citizenId: resCitizenId,
          patientInfo: {
            idNumber: parsedCCCD.citizenId || patientData?.citizen_id || '',
            fullName: parsedCCCD.fullName || patientData?.full_name || '',
            dob: parsedCCCD.dob || patientData?.dob || '',
            gender: detectedGender,
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