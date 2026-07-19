import type { VnptCredentials, VnptKeyPayload } from '@/modules/reception/types/vnpt.types';
import type { DocumentType } from '@ultranomic/vnpt-ekyc-sdk';

const DEFAULT_BACKEND_URL = 'https://api.idg.vnpt.vn';
const SANDBOX_BACKEND_URL = 'https://sandbox-idg.vnpt.vn';

function shouldPreferLocalVnptEnv(): boolean {
    return (
        process.env.NEXT_PUBLIC_VNPT_USE_LOCAL_ENV === 'true' ||
        process.env.VNPT_USE_LOCAL_ENV === 'true'
    );
}

function getApiBaseUrl(): string {
    // Trình duyệt dùng same-origin để đi qua Next.js rewrite (/api → backend)
    if (typeof window !== 'undefined') return '';
    return process.env.NEXT_PUBLIC_API_URL?.trim() || 'https://www.triageflow.me';
}

export function normalizeAccessToken(raw?: string): string | undefined {
    if (!raw?.trim()) return undefined;
    return raw.trim().replace(/^bearer\s+/i, '');
}

function pickString(payload: VnptKeyPayload, ...keys: (keyof VnptKeyPayload)[]): string | undefined {
    for (const key of keys) {
        const value = payload[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return undefined;
}

export function mapVnptCredentials(payload: VnptKeyPayload): VnptCredentials | null {
    const tokenKey = pickString(payload, 'token_key', 'tokenKey', 'TOKEN_KEY');
    const tokenId = pickString(payload, 'token_id', 'tokenId', 'TOKEN_ID');
    const accessToken = normalizeAccessToken(
        pickString(payload, 'access_token', 'accessToken', 'ACCESS_TOKEN'),
    );

    if (!tokenKey || !tokenId || !accessToken) return null;

    return {
        backendUrl:
            pickString(payload, 'backend_url', 'backendUrl', 'BACKEND_URL') ?? DEFAULT_BACKEND_URL,
        tokenKey,
        tokenId,
        accessToken,
        publicKeyCa: pickString(payload, 'public_key_ca', 'publicKeyCa', 'PUBLIC_KEY_CA'),
    };
}

export function getEnvVnptCredentials(): VnptCredentials | null {
    const tokenId =
        process.env.VNPT_TOKEN_ID?.trim() ?? process.env.NEXT_PUBLIC_VNPT_TOKEN_ID?.trim();
    const tokenKey =
        process.env.VNPT_TOKEN_KEY?.trim() ?? process.env.NEXT_PUBLIC_VNPT_TOKEN_KEY?.trim();
    const publicKeyCa =
        process.env.VNPT_PUBLIC_KEY_CA?.trim() ??
        process.env.NEXT_PUBLIC_VNPT_PUBLIC_KEY_CA?.trim();
    const accessToken = normalizeAccessToken(
        process.env.VNPT_ACCESS_TOKEN ?? process.env.NEXT_PUBLIC_VNPT_ACCESS_TOKEN,
    );

    if (!tokenId || !accessToken) return null;

    const backendUrl =
        process.env.VNPT_BACKEND_URL?.trim() ??
        process.env.NEXT_PUBLIC_VNPT_BACKEND_URL?.trim();

    return {
        backendUrl:
            backendUrl ??
            (shouldPreferLocalVnptEnv() ? SANDBOX_BACKEND_URL : DEFAULT_BACKEND_URL),
        tokenId,
        tokenKey: tokenKey ?? publicKeyCa ?? '',
        accessToken,
        publicKeyCa,
    };
}

export async function fetchVnptCredentialsFromApi(
    bearerToken: string,
): Promise<VnptCredentials | null> {
    const res = await fetch(`${getApiBaseUrl()}/api/vnpt/key`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${bearerToken}`,
        },
        cache: 'no-store',
    });

    if (!res.ok) return null;

    const json = (await res.json().catch(() => ({}))) as {
        data?: VnptKeyPayload | VnptKeyPayload[];
        status?: string;
        code?: number;
    };

    if (json.status === 'error' || (typeof json.code === 'number' && json.code >= 400)) {
        return null;
    }

    const raw = json.data;
    const payload = Array.isArray(raw) ? raw[0] : raw;
    if (!payload || typeof payload !== 'object') return null;

    return mapVnptCredentials(payload);
}

/** Ưu tiên env local (dev eKYC), fallback GET /api/vnpt/key khi không cấu hình env. */
export async function resolveVnptCredentials(
    bearerToken?: string | null,
): Promise<VnptCredentials | null> {
    if (shouldPreferLocalVnptEnv()) {
        return getEnvVnptCredentials();
    }

    const fromEnv = getEnvVnptCredentials();
    if (fromEnv) return fromEnv;

    const token = bearerToken?.trim();
    if (!token) return null;

    return fetchVnptCredentialsFromApi(token);
}

function uniqueStrings(values: Array<string | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))];
}

/** VNPT browser SDK đọc AUTHORIZION (không phải ACCESS_TOKEN). */
export function buildVnptSdkLaunchConfig(creds: VnptCredentials) {
    return {
        BACKEND_URL: creds.backendUrl,
        TOKEN_KEY: creds.tokenKey,
        TOKEN_ID: creds.tokenId,
        AUTHORIZION: creds.accessToken ?? '',
        CHALLENGE_CODE: '00000',
        HAS_BACKGROUND_IMAGE: true,
        HAS_QR_SCAN: true,
        LIST_TYPE_DOCUMENT: [9 as DocumentType],
        DEFAULT_LANGUAGE: 'vi' as const,
        HAS_RESULT_SCREEN: false,
        SHOW_STEP: true,
        // Chỉ OCR + QR, tắt face/liveness để tránh IDG-00000500 trên sandbox
        SDK_FLOW: 'DOCUMENT' as const,
        ENABLE_API_LIVENESS_DOCUMENT: true,
        ENABLE_API_LIVENESS_FACE: false,
        ENABLE_API_COMPARE_FACE: false,
        ENABLE_API_MASKED_FACE: false,
        DOUBLE_LIVENESS: false,
        USE_METHOD: 'BOTH' as const,
    };
}

export function buildVnptCredentialVariants(base: VnptCredentials): VnptCredentials[] {
    const tokenKeys = uniqueStrings([base.tokenKey, base.publicKeyCa]);
    const backendUrls = uniqueStrings([base.backendUrl, DEFAULT_BACKEND_URL, SANDBOX_BACKEND_URL]);

    const variants: VnptCredentials[] = [];
    for (const backendUrl of backendUrls) {
        for (const tokenKey of tokenKeys) {
            variants.push({
                ...base,
                backendUrl,
                tokenKey,
            });
        }
    }

    return variants.length > 0 ? variants : [base];
}
