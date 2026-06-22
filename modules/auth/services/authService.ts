import { apiClient } from '@/shared/services/apiClient';
import type {
    LoginRequest,
    LoginResponseData,
    OtpSendRequest,
    OtpVerifyRequest,
    OtpVerifyResponseData,
    RegisterRequest,
    RegisterResponseData,
} from '@/shared/types/auth.types';

export const authService = {
    login: (data: LoginRequest) =>
        apiClient.post<LoginResponseData>('/api/auth/login', data),

    sendOtp: (data: OtpSendRequest, token?: string) =>
        apiClient.post<null>('/api/auth/otp/send', data, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }),

    verifyOtp: (data: OtpVerifyRequest) =>
        apiClient.post<OtpVerifyResponseData>('/api/auth/otp/verify', data),

    register: (data: RegisterRequest) =>
        apiClient.post<RegisterResponseData>('/api/auth/register', data),
};
