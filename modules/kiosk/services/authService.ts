import { apiClient } from "@/shared/services/apiClient";
import { LoginCitizenRequest, LoginCitizenResponse } from "../types/kiosk.types";

export const authService = {
    loginKiosk: (body: LoginCitizenRequest) => {
        return apiClient.post<LoginCitizenResponse['data']>('/api/auth/login/citizen-id', body);
    }
}