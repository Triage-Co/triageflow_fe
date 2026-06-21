import { apiClient } from '@/shared/services/apiClient';
import type {
    LoginRequest,
    LoginResponseData,
    RegisterRequest,
    RegisterResponseData,
} from '@/shared/types/auth.types';

export const authService = {
    login: (data: LoginRequest) =>
        apiClient.post<LoginResponseData>('/api/auth/login', data),

    register: (data: RegisterRequest) =>
        apiClient.post<RegisterResponseData>('/api/auth/register', data),
};
