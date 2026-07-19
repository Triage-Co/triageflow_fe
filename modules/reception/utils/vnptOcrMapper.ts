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

function normalizeName(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

type VnptOcrInput = {
    id: string;
    name: string;
    birth_day?: string;
    gender?: string;
    recent_location?: string;
    origin_location?: string;
};

export function mapVnptOcrToCccd(ocr: VnptOcrInput): CccdScanResult | null {
    if (!ocr?.id || !ocr?.name) return null;
    const dob = parseDob(ocr.birth_day);
    if (!dob) return null;

    return {
        citizen_id: ocr.id.trim(),
        full_name: normalizeName(ocr.name),
        dob,
        gender: parseGender(ocr.gender),
        address: ocr.recent_location?.trim() || ocr.origin_location?.trim() || '',
        ekyc_verified: false,
    };
}
