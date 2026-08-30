import { apiClient } from "@/shared/services/apiClient";
import {
  SendCitizenOtpRequest,
  VerifyCitizenOtpRequest,
  VerifyCitizenOtpResponse,
} from "../types/kiosk.types";

export const authService = {
  sendCitizenOtp: (body: SendCitizenOtpRequest) => {
    return apiClient.post<null>('/api/auth/login/citizen-id/otp', body);
  },

  verifyCitizenOtp: (body: VerifyCitizenOtpRequest) => {
    return apiClient.post<VerifyCitizenOtpResponse['data']>(
      '/api/auth/login/citizen-id/otp/verify',
      body,
    );
  },

  loginCitizenIdDirect: (body: { citizen_id: string }) => {
    return apiClient.post<VerifyCitizenOtpResponse['data']>(
      '/api/auth/login/citizen-id',
      body,
    );
  },
};