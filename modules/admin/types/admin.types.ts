import type { StaffRole } from '@/shared/types/auth.types';

export interface AccountProfile {
    id: string;
    user_name: string;
    gender?: string;
    phone?: string;
    dob?: string;
    citizen_id?: string;
}

export interface Account {
    id: string;
    account_id?: string;
    email: string;
    role: StaffRole;
    isBanned: boolean;
    createdAt: string;
    updatedAt: string;
    user_name?: string; // fallback in case name is direct
    gender?: string;    // directly on account
    dob?: string;       // directly on account
    profile?: AccountProfile | null;
}

export interface BanDuration {
    hours: number;
    minutes: number;
}
