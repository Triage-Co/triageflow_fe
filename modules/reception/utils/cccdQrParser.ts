import type { Gender } from '@/shared/types/auth.types';

export interface CccdScanResult {
    citizen_id: string;
    full_name: string;
    dob: string;
    gender: Gender;
    address: string;
    ekyc_verified?: boolean;
    ekyc_hash?: string;
    face_matched?: boolean;
    document_liveness?: boolean;
    face_liveness?: boolean;
}

export type QrParseErrorCode =
    | 'EMPTY'
    | 'INVALID_FORMAT'
    | 'MISSING_CCCD'
    | 'MISSING_NAME';

export interface QrParseError {
    code: QrParseErrorCode;
    message: string;
}

function parseGender(raw: string): Gender {
    const v = raw.trim().toLowerCase();
    if (v === 'nữ' || v === 'nu' || v === 'female' || v === 'f') return 'FEMALE';
    if (v === 'nam' || v === 'male' || v === 'm') return 'MALE';
    return 'OTHER';
}

/** Chuyển dd/mm/yyyy, ddmmyyyy, yyyy-mm-dd → yyyy-mm-dd (input date) */
function parseDob(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

    const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
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

/** Định dạng pipe-delimited chuẩn CCCD gắn chip (TT 16/2024/TT-BCA) */
function parsePipeFormat(raw: string): CccdScanResult | null {
    const parts = raw.split('|');
    if (parts.length < 5) return null;

    const citizen_id = parts[0]?.trim();
    const nameIdx = parts[2]?.trim() ? 2 : 1;
    const full_name = parts[nameIdx]?.trim();
    const dobRaw = parts[nameIdx + 1]?.trim();
    const genderRaw = parts[nameIdx + 2]?.trim();
    const address = parts[nameIdx + 3]?.trim() ?? '';

    if (!citizen_id || citizen_id.length < 9) return null;
    const dob = parseDob(dobRaw ?? '');
    if (!full_name || !dob) return null;

    return {
        citizen_id,
        full_name: normalizeName(full_name),
        dob,
        gender: parseGender(genderRaw ?? ''),
        address,
    };
}

/** JSON từ VNeID hoặc app bên thứ ba */
function parseJsonFormat(raw: string): CccdScanResult | null {
    try {
        const data = JSON.parse(raw) as Record<string, unknown>;
        const citizen_id = String(
            data.citizen_id ??
                data.id_number ??
                data.cccd_number ??
                data.soDinhDanh ??
                data.id ??
                '',
        ).trim();
        const full_name = String(
            data.full_name ?? data.fullName ?? data.name ?? data.hoTen ?? '',
        ).trim();
        const dobRaw = String(data.dob ?? data.date_of_birth ?? data.ngaySinh ?? '');
        const genderRaw = String(data.gender ?? data.gioiTinh ?? data.sex ?? '');
        const address = String(
            data.address ?? data.place_of_residence ?? data.diaChi ?? data.noiCuTru ?? '',
        ).trim();

        const dob = parseDob(dobRaw);
        if (!citizen_id || citizen_id.length < 9 || !full_name || !dob) return null;

        return {
            citizen_id,
            full_name: normalizeName(full_name),
            dob,
            gender: parseGender(genderRaw),
            address,
        };
    } catch {
        return null;
    }
}

export function parseCccdQr(raw: string): { ok: true; data: CccdScanResult } | { ok: false; error: QrParseError } {
    const trimmed = raw.trim();
    if (!trimmed) {
        return {
            ok: false,
            error: { code: 'EMPTY', message: 'Không đọc được dữ liệu từ mã QR.' },
        };
    }

    let result: CccdScanResult | null = null;

    if (trimmed.startsWith('{')) {
        result = parseJsonFormat(trimmed);
    } else if (trimmed.includes('|')) {
        result = parsePipeFormat(trimmed);
    } else {
        // Thử JSON không có prefix hoặc chuỗi base64 đơn giản
        result = parseJsonFormat(trimmed) ?? parsePipeFormat(trimmed.replace(/\|/g, '|'));
    }

    if (!result) {
        return {
            ok: false,
            error: {
                code: 'INVALID_FORMAT',
                message:
                    'Mã QR không hợp lệ hoặc không phải CCCD/VNeID. Vui lòng quét lại hoặc nhập thủ công.',
            },
        };
    }

    if (result.citizen_id.length < 9) {
        return {
            ok: false,
            error: { code: 'MISSING_CCCD', message: 'Không tìm thấy số CCCD trong mã QR.' },
        };
    }

    if (!result.full_name) {
        return {
            ok: false,
            error: { code: 'MISSING_NAME', message: 'Không tìm thấy họ tên trong mã QR.' },
        };
    }

    return { ok: true, data: result };
}
