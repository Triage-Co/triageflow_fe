// ─── Login ───────────────────────────────────────────────────────────────────
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponseData {
    token: string;
    refreshToken: string;
    username: string;
    role: string;
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

export type StaffRole =
    | 'USER'
    | 'DOCTOR'
    | 'NURSE'
    | 'RECEPTIONIST'
    | 'LAB_STAFF'
    | 'PHARMACY_STAFF'
    | 'CASHIER'
    | 'ADMIN';

export interface RegisterRequest {
    email: string;
    fullName: string;
    dob: string;          // ISO date: YYYY-MM-DD
    password: string;
    gender: Gender;
    citizen_id: string;
    role: StaffRole;
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
    avatar?: string;
}

export interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    dob: string;          // ISO date: e.g. 2004-04-07T00:00:00.000Z
    role: string;
    gender: Gender;
    citizen_id: string;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateProfileRequest {
    fullName: string;
    dob: string;          // YYYY-MM-DD
    gender: Gender;
}
