export interface StaffAccount {
    avatar: string | null;
    user_name: string;
    email: string;
    role: 'DOCTOR' | 'RECEPTIONIST' | 'DOCTOR' | 'LAB_STAFF' | 'PHARMACY_STAFF' | 'CASHIER' | 'ADMIN' | 'NURSE';
    gender: 'MALE' | 'FEMALE' | 'OTHER';
    phone: string;
    is_banned: boolean;
}

export interface Staff {
    staff_id: string;
    full_name: string;
    license_number: string | null;
    experience_years: number | null;
    specialty_id: string | null;
    account: StaffAccount;
}

export interface CreateStaffDto {
    user_name: string;
    password?: string;
    full_name: string;
    email: string;
    role: string;
    gender: string;
    phone: string;
    license_number?: string;
    experience_years?: number;
    specialty_id?: string;
}

export interface UpdateStaffDto {
    user_name?: string;
    password?: string;
    full_name?: string;
    email?: string;
    role?: string;
    gender?: string;
    phone?: string;
    license_number?: string;
    experience_years?: number;
    specialty_id?: string;
}
