import type { VnptCredentials } from '@/modules/reception/types/vnpt.types';
import {
    buildVnptCredentialVariants,
    resolveVnptCredentials,
} from '@/modules/reception/services/vnptCredentials';

export { resolveVnptCredentials as resolveServerVnptCredentials } from '@/modules/reception/services/vnptCredentials';

export function buildVnptHeaders(creds: VnptCredentials, json = false): HeadersInit {
    const headers: Record<string, string> = {
        Authorization: `Bearer ${creds.accessToken ?? ''}`,
        'Token-id': creds.tokenId,
        'Token-key': creds.tokenKey,
        'mac-address': 'WEB-001',
    };
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
}

const CCCD_CHIP_TYPE = 9;

export interface VnptOcrPayload {
    id: string;
    name: string;
    birth_day?: string;
    gender?: string;
    recent_location?: string;
    origin_location?: string;
}

function isAuthError(message: string): boolean {
    const lower = message.toLowerCase();
    return (
        lower.includes('401') ||
        lower.includes('unauthorized') ||
        lower.includes('idg-00000401') ||
        lower.includes('no permission')
    );
}

async function withVnptRetry<T>(
    bearerToken: string | undefined,
    action: (creds: VnptCredentials) => Promise<T>,
): Promise<T> {
    const base = await resolveVnptCredentials(bearerToken);
    if (!base?.accessToken) {
        throw new Error(
            'VNPT OCR chưa cấu hình. Cấu hình NEXT_PUBLIC_VNPT_* trong .env.local hoặc đăng nhập lễ tân để lấy key từ /api/vnpt/key.',
        );
    }

    const variants = buildVnptCredentialVariants(base);

    let lastError: Error | null = null;

    for (const creds of variants) {
        try {
            return await action(creds);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            lastError = error;
            if (!isAuthError(error.message)) {
                throw error;
            }
        }
    }

    throw new Error(
        'VNPT từ chối xác thực (IDG-00000401). Token ID, Token Key và Access Token phải lấy cùng một lúc từ portal VNPT eKYC/SmartReader.',
    );
}

export async function uploadImageToVnpt(
    file: Blob,
    filename: string,
    creds?: VnptCredentials,
    bearerToken?: string,
): Promise<{ hash: string; creds: VnptCredentials }> {
    if (creds) {
        const hash = await uploadImageOnce(file, filename, creds);
        return { hash, creds };
    }

    return withVnptRetry(bearerToken, async (variant) => {
        const hash = await uploadImageOnce(file, filename, variant);
        return { hash, creds: variant };
    });
}

async function uploadImageOnce(
    file: Blob,
    filename: string,
    creds: VnptCredentials,
): Promise<string> {
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('title', 'upload_file');
    formData.append('description', 'ic_upload_file');

    const res = await fetch(`${creds.backendUrl}/file-service/v1/addFile`, {
        method: 'POST',
        headers: buildVnptHeaders(creds),
        body: formData,
    });

    const json = (await res.json().catch(() => ({}))) as {
        object?: { hash?: string };
        message?: string;
        error?: string;
    };

    if (!res.ok) {
        const detail = json.message || json.error || `VNPT upload failed (${res.status})`;
        throw new Error(detail);
    }

    const hash = json.object?.hash;
    if (!hash) {
        throw new Error(json.message || 'Không upload được ảnh lên VNPT OCR.');
    }

    return hash;
}

export async function ocrCccdFront(
    hash: string,
    creds: VnptCredentials,
): Promise<VnptOcrPayload | null> {
    const res = await fetch(`${creds.backendUrl}/ai/v1/web/ocr/id/front`, {
        method: 'POST',
        headers: buildVnptHeaders(creds, true),
        body: JSON.stringify({
            img_front: hash,
            client_session: crypto.randomUUID(),
            token: 'e41-1b6d-45c9-9',
            type: CCCD_CHIP_TYPE,
            crop_param: '0,0',
            validate_postcode: true,
        }),
    });

    const json = (await res.json().catch(() => ({}))) as {
        object?: VnptOcrPayload;
        message?: string;
        error?: string;
    };

    if (!res.ok) {
        const detail = json.message || json.error || `VNPT OCR failed (${res.status})`;
        throw new Error(detail);
    }

    if (!json.object?.id) {
        throw new Error(json.message || 'OCR không đọc được thông tin CCCD.');
    }

    return json.object;
}
