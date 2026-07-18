import { apiClient } from '@/shared/services/apiClient';
import type { Account, BanDuration } from '../types/admin.types';

type ApiAccount = {
    id?: string;
    account_id?: string;
    email?: string;
    role?: string;
    isBanned?: boolean;
    is_banned?: boolean;
    createdAt?: string;
    updatedAt?: string;
    user_name?: string;
    gender?: string;
    dob?: string;
    profile?: {
        id?: string;
        user_name?: string;
        gender?: string;
        phone?: string;
        dob?: string;
        citizen_id?: string;
    } | null;
};

const normalizeAccount = (raw: ApiAccount): Account => ({
    id: raw.id || raw.account_id || '',
    account_id: raw.account_id || raw.id,
    email: raw.email || '',
    role: (raw.role || 'USER') as Account['role'],
    isBanned: typeof raw.isBanned === 'boolean' ? raw.isBanned : Boolean(raw.is_banned),
    createdAt: raw.createdAt || '',
    updatedAt: raw.updatedAt || '',
    user_name: raw.user_name,
    gender: raw.gender,
    dob: raw.dob,
    profile: raw.profile
        ? {
            id: raw.profile.id || '',
            user_name: raw.profile.user_name || '',
            gender: raw.profile.gender,
            phone: raw.profile.phone,
            dob: raw.profile.dob,
            citizen_id: raw.profile.citizen_id,
        }
        : null,
});

export const adminService = {
    getAccounts: async (token: string) => {
        const res = await apiClient.get<ApiAccount[]>('/api/account', {
            headers: { Authorization: `Bearer ${token}` },
        });

        return {
            ...res,
            data: Array.isArray(res.data) ? res.data.map(normalizeAccount) : [],
        };
    },

    getAccountById: async (id: string, token: string) => {
        const res = await apiClient.get<ApiAccount>(`/api/account/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        return {
            ...res,
            data: normalizeAccount(res.data || {}),
        };
    },

    banAccount: (id: string, duration: BanDuration, token: string) =>
        apiClient.patch<Account>(`/api/account/${id}/ban`, duration, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    unbanAccount: (id: string, token: string) =>
        apiClient.patch<Account>(`/api/account/${id}/unban`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
