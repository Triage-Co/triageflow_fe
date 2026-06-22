// ─── Login ───────────────────────────────────────────────────────────────────
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponseData {
    token: string;
    refreshToken: string;
}

// ─── OTP ─────────────────────────────────────────────────────────────────────
export interface OtpSendRequest {
    email: string;
}

export interface OtpVerifyRequest {
    email: string;
    otp: string;
}

// OTP verify returns a token pair (same shape as login)
export type OtpVerifyResponseData = LoginResponseData;

// ─── Register ────────────────────────────────────────────────────────────────
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface RegisterRequest {
    email: string;
    fullName: string;
    dob: string;          // ISO date: YYYY-MM-DD
    password: string;
    gender: Gender;
    citizen_id: string;
    role: 'USER';
}

export interface RegisterResponseData {
    email: string;
    id: string;
}

// ─── Shared user shape stored in auth state ───────────────────────────────────
export interface AuthUser {
    id: string;
    email: string;
    fullName?: string;
    role: string;
}
