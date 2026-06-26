import { apiClient } from '@/shared/services/apiClient';
import type {
    LoginRequest,
    LoginResponseData,
    OtpSendRequest,
    OtpVerifyRequest,
    OtpVerifyResponseData,
    RegisterRequest,
    RegisterResponseData,
    AuthUser,
    UserProfile,
    UpdateProfileRequest,
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

    /** Fetch the current user's profile (includes real role from DB). */
    getMe: (token: string) =>
        apiClient.get<AuthUser>('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** Fetch user profile */
    getProfile: (token: string) =>
        apiClient.get<UserProfile>('/api/auth/profile', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** Update user profile */
    updateProfile: (data: UpdateProfileRequest, token: string) =>
        apiClient.patch<UserProfile>('/api/auth/update', data, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
