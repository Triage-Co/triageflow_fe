import { create } from 'zustand';
import { authService } from '../services/authService';

interface AuthStoreState {
  authToken?: string;
  patientId?: string;
  citizenId?: string;
  loginCitizen: (citizenId: string) => Promise<boolean>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  authToken: undefined,
  patientId: undefined,
  citizenId: undefined,

  clearAuth: () => {
    set({ authToken: undefined, patientId: undefined, citizenId: undefined });
  },

  loginCitizen: async (citizenId: string) => {
    try {
      const response = await authService.loginKiosk({ citizen_id: citizenId });

      if (response.status === 'success' && response.data) {
        set({
          authToken: response.data.token,
          patientId: response.data.patient_id,
          citizenId: response.data.citizen_id,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Lỗi xử lý Đăng nhập tại AuthStore:', error);
      return false;
    }
  },
}));