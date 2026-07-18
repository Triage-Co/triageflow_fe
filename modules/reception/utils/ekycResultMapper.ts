import type { EkycResult } from '@ultranomic/vnpt-ekyc-sdk';
import type { CccdScanResult } from '@/modules/reception/utils/cccdQrParser';
import type { Gender } from '@/shared/types/auth.types';

function parseGender(raw?: string): Gender {
    const v = (raw ?? '').trim().toLowerCase();
    if (v.includes('nữ') || v.includes('nu') || v.includes('female') || v === 'f') return 'FEMALE';
    if (v.includes('nam') || v.includes('male') || v === 'm') return 'MALE';
    return 'OTHER';
}

function parseDob(raw?: string): string | null {
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const slash = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (slash) {
        const [, d, m, y] = slash;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const compact = trimmed.match(/^(\d{2})(\d{2})(\d{4})$/);
    if (compact) {
        const [, d, m, y] = compact;
        return `${y}-${m}-${d}`;
    }

    return null;
}

function isTruthy(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const v = value.toLowerCase();
        return v === 'true' || v === 'yes' || v === '1' || v === 'success' || v === 'pass';
    }
    return false;
}

function normalizeName(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

export function mapEkycResultToCccd(result: EkycResult): CccdScanResult | null {
    const ocr = result.ocr;
    if (!ocr?.id || !ocr?.name) return null;

    const dob = parseDob(ocr.birth_day);
    if (!dob) return null;

    const docLive =
        isTruthy(result.liveness_card_front?.liveness) &&
        isTruthy(result.liveness_card_back?.liveness);
    const faceLive = isTruthy(result.liveness_face?.liveness);
    const faceMatched = isTruthy(result.compare?.result);

    return {
        citizen_id: ocr.id.trim(),
        full_name: normalizeName(ocr.name),
        dob,
        gender: parseGender(ocr.gender),
        address: ocr.recent_location?.trim() || ocr.origin_location?.trim() || '',
        ekyc_verified: docLive && faceLive && faceMatched,
        ekyc_hash: result.hash_img || result.data_hash_document || undefined,
        face_matched: faceMatched,
        document_liveness: docLive,
        face_liveness: faceLive,
    };
}
