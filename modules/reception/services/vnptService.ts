import {
    getEnvVnptCredentials,
    resolveVnptCredentials,
} from '@/modules/reception/services/vnptCredentials';
import type { VnptCredentials } from '@/modules/reception/types/vnpt.types';

export { mapVnptCredentials } from '@/modules/reception/services/vnptCredentials';

async function fetchLocalVnptConfigFromApi(): Promise<VnptCredentials | null> {
    const res = await fetch('/api/vnpt/config', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => ({}))) as { data?: VnptCredentials };
    return json.data ?? null;
}

async function verifyLocalVnptConfig(): Promise<{ ok: boolean; message?: string }> {
    const res = await fetch('/api/vnpt/verify', { cache: 'no-store' });
    const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        results?: Array<{ message?: string }>;
    };

    if (json.ok) return { ok: true };

    const message =
        json.message ||
        json.results?.find((item) => item.message)?.message ||
        'VNPT từ chối xác thực key.';

    return { ok: false, message };
}

export const vnptService = {
    async getCredentials(token?: string | null): Promise<VnptCredentials | null> {
        const useLocal =
            process.env.NEXT_PUBLIC_VNPT_USE_LOCAL_ENV === 'true' ||
            process.env.VNPT_USE_LOCAL_ENV === 'true';

        if (useLocal && typeof window !== 'undefined') {
            const fromApi = await fetchLocalVnptConfigFromApi();
            if (fromApi) return fromApi;
        }

        return resolveVnptCredentials(token);
    },

    async validateCredentials(): Promise<{ ok: boolean; message?: string }> {
        const useLocal =
            process.env.NEXT_PUBLIC_VNPT_USE_LOCAL_ENV === 'true' ||
            process.env.VNPT_USE_LOCAL_ENV === 'true';

        if (useLocal && typeof window !== 'undefined') {
            return verifyLocalVnptConfig();
        }

        const creds = await resolveVnptCredentials();
        return creds?.accessToken
            ? { ok: true }
            : { ok: false, message: 'Chưa cấu hình VNPT credentials.' };
    },
};
