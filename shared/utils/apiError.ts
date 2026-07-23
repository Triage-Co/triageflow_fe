function extractPayosDetail(body: Record<string, unknown>): string | null {
    const error = body.error as Record<string, unknown> | undefined;
    if (!error || typeof error !== 'object') return null;

    const nested = error.error as Record<string, unknown> | undefined;
    const desc =
        (typeof nested?.desc === 'string' && nested.desc.trim()) ||
        (typeof error.desc === 'string' && error.desc.trim()) ||
        null;
    if (!desc) return null;

    const code =
        (typeof nested?.code === 'string' && nested.code) ||
        (typeof nested?.code === 'number' && String(nested.code)) ||
        (typeof error.code === 'string' && error.code) ||
        (typeof error.code === 'number' && String(error.code)) ||
        null;

    return code ? `${desc} (mã ${code})` : desc;
}

function isGenericBackendMessage(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('da xay ra loi') || message === 'Đã xảy ra lỗi';
}

export function resolveApiError(
    json: unknown,
    fallback: string,
): { message: string; detail?: string } {
    if (!json || typeof json !== 'object') {
        return { message: fallback };
    }

    const body = json as Record<string, unknown>;
    const payosDetail = extractPayosDetail(body);
    const detail = body.detail as Record<string, unknown> | undefined;
    const nestedResponse = detail?.response as Record<string, unknown> | undefined;

    const genericMessage =
        (typeof nestedResponse?.message === 'string' && nestedResponse.message) ||
        (typeof detail?.message === 'string' && detail.message) ||
        (typeof body.message === 'string' && body.message) ||
        fallback;

    const message = isGenericBackendMessage(genericMessage) ? fallback : genericMessage;

    if (payosDetail && payosDetail !== message && !message.includes(payosDetail)) {
        return { message, detail: payosDetail };
    }

    return { message: payosDetail || message };
}

export function extractApiErrorMessage(json: unknown, fallback: string): string {
    const { message, detail } = resolveApiError(json, fallback);
    if (detail) {
        return `${message}\nChi tiết: ${detail}`;
    }
    return message;
}

export function formatCaughtError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'message' in err) {
        const apiErr = err as Error & { detail?: unknown; statusCode?: number };
        const detailText =
            typeof apiErr.detail === 'string'
                ? apiErr.detail
                : apiErr.detail && typeof apiErr.detail === 'object'
                  ? JSON.stringify(apiErr.detail)
                  : '';
        if (detailText.includes('P2003') || detailText.includes('patient_anwser_patient_id_fkey')) {
            return 'BE P2003: /diagnoise không gắn được patient_anwser → patient_id (Search thấy CCCD trên Account ≠ đủ để FK Patient). Xem log patient.verify-db. (code 401 trong body ≠ hết hạn đăng nhập.)';
        }
        if (detailText && apiErr.message && !apiErr.message.includes(detailText)) {
            return `${apiErr.message} (${detailText.slice(0, 180)})`;
        }
        return apiErr.message || fallback;
    }
    return fallback;
}

export function isPaymentLinkError(message: string): boolean {
    return /tạo.*link|link.*thanh toán|payos.*lỗi|không tạo được.*giao dịch|tạo mã thanh toán/i.test(message);
}
