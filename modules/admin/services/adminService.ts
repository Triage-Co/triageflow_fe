import { apiClient } from '@/shared/services/apiClient';
import type { Account, BanDuration } from '../types/admin.types';

export interface QueryUserParams {
    page?: number;
    limit?: number;
    is_active?: boolean;
    search?: string;
}

function buildUserQuery(params: QueryUserParams = {}): string {
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.is_active !== undefined) search.set('is_active', String(params.is_active));
    if (params.search?.trim()) search.set('search', params.search.trim());
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

type ApiAccount = {
    id?: string;
    account_id?: string;
    email?: string;
    role?: string;
    isBanned?: boolean;
    is_banned?: boolean;
    is_active?: boolean;
    isActive?: boolean;
    phone?: string;
    createdAt?: string;
    updatedAt?: string;
    user_name?: string;
    gender?: string;
    dob?: string;
    citizen_id?: string;
    profile?: {
        id?: string;
        user_name?: string;
        gender?: string;
        phone?: string;
        dob?: string;
        citizen_id?: string;
    } | null;
};

const normalizeAccount = (raw: ApiAccount): Account => {
    const isBanned =
        raw.is_active !== undefined
            ? !raw.is_active
            : raw.isActive !== undefined
            ? !raw.isActive
            : typeof raw.isBanned === 'boolean'
            ? raw.isBanned
            : Boolean(raw.is_banned);

    return {
        id: raw.id || raw.account_id || '',
        account_id: raw.account_id || raw.id,
        email: raw.email || '',
        role: (raw.role || 'USER') as Account['role'],
        isBanned,
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
                  phone: raw.profile.phone || raw.phone,
                  dob: raw.profile.dob,
                  citizen_id: raw.profile.citizen_id || raw.citizen_id,
              }
            : raw.phone || raw.citizen_id
            ? {
                  id: raw.id || '',
                  user_name: raw.user_name || '',
                  gender: raw.gender,
                  phone: raw.phone,
                  dob: raw.dob,
                  citizen_id: raw.citizen_id,
              }
            : null,
    };
};

function extractAccountList(raw: unknown): ApiAccount[] {
    if (Array.isArray(raw)) return raw as ApiAccount[];
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data as ApiAccount[];
        if (Array.isArray(obj.users)) return obj.users as ApiAccount[];
        if (Array.isArray(obj.items)) return obj.items as ApiAccount[];
        if (obj.data && typeof obj.data === 'object') {
            const nested = obj.data as Record<string, unknown>;
            if (Array.isArray(nested.data)) return nested.data as ApiAccount[];
            if (Array.isArray(nested.users)) return nested.users as ApiAccount[];
            if (Array.isArray(nested.items)) return nested.items as ApiAccount[];
        }
    }
    return [];
}

export const adminService = {
    getAccounts: async (token: string, params: QueryUserParams = {}) => {
        const res = await apiClient.get<unknown>(`/api/account/users${buildUserQuery(params)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        const list = extractAccountList(res?.data);
        return {
            ...res,
            data: list.map(normalizeAccount),
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
