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
    user_name: string;
    email: string;
    password: string;
    gender: Gender;
    phone: string;
    /** BE hiện không nhận field này — role gán phía server. */
    role?: StaffRole;
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
    id?: string;
    account_id?: string;
    user_name?: string;
    full_name?: string;
    email: string;
    dob?: string;          // ISO date or DD-MM-YYYY
    role: string;
    gender: Gender;
    citizen_id?: string;
    createdAt?: string;
    updatedAt?: string;
    phone?: string;
    avatar?: string | null;
}

export interface UpdateProfileRequest {
    user_name?: string;
    gender?: Gender;
    phone?: string;
    avatar?: string | null;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ForgotPasswordVerifyRequest {
    email: string;
    otp: string;
    password: string;
}
