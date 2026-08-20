import type { Gender } from '@/shared/types/auth.types';

export interface CccdScanResult {
    citizen_id: string;
    full_name: string;
    dob: string; // YYYY-MM-DD
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

export function parseGender(raw: string): Gender {
    const v = (raw || '').trim().toLowerCase();
    if (v === 'nữ' || v === 'nu' || v === 'female' || v === 'f') return 'FEMALE';
    if (v === 'nam' || v === 'male' || v === 'm') return 'MALE';
    return 'OTHER';
}

/** Chuyển dd/mm/yyyy, ddmmyyyy, yyyy-mm-dd → yyyy-mm-dd (chuẩn HTML date input) */
export function parseDob(raw: string): string | null {
    const trimmed = (raw || '').trim();
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

export function normalizeName(name: string): string {
    return (name || '')
        .trim()
        .split(/\s+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

/** Định dạng pipe-delimited chuẩn CCCD gắn chip (TT 16/2024/TT-BCA) */
function parsePipeFormat(raw: string): CccdScanResult | null {
    const parts = raw.split('|');
    if (parts.length < 3) return null;

    const rawCitizenId = parts[0]?.trim() || '';
    const citizen_id = rawCitizenId.replace(/\D/g, '');
    if (!citizen_id || citizen_id.length < 9) return null;

    // Xác định chỉ số của Name & Dob
    // Trường hợp 1: Có cột CMND cũ -> parts[1] là 9 số/rỗng, parts[2] là Tên, parts[3] là Dob
    // Trường hợp 2: Không có cột CMND cũ -> parts[1] là Tên, parts[2] là Dob
    let nameIdx = 2;
    let dobIdx = 3;
    let genderIdx = 4;
    let addressIdx = 5;

    // Nếu parts[1] không phải số CMND mà là chữ và parts[2] là ngày sinh (8 số hoặc dd/mm/yyyy)
    if (parts[1] && isNaN(Number(parts[1])) && parts[2] && (parts[2].length === 8 || parts[2].includes('/'))) {
        nameIdx = 1;
        dobIdx = 2;
        genderIdx = 3;
        addressIdx = 4;
    }

    const full_name = parts[nameIdx]?.trim() || '';
    const dobRaw = parts[dobIdx]?.trim() || '';
    const genderRaw = parts[genderIdx]?.trim() || '';
    const address = parts[addressIdx]?.trim() ?? '';

    const dob = parseDob(dobRaw) || '';

    return {
        citizen_id,
        full_name: normalizeName(full_name),
        dob,
        gender: parseGender(genderRaw),
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
        ).replace(/\D/g, '').trim();

        const full_name = String(
            data.full_name ?? data.fullName ?? data.name ?? data.hoTen ?? '',
        ).trim();
        const dobRaw = String(data.dob ?? data.date_of_birth ?? data.ngaySinh ?? '');
        const genderRaw = String(data.gender ?? data.gioiTinh ?? data.sex ?? '');
        const address = String(
            data.address ?? data.place_of_residence ?? data.diaChi ?? data.noiCuTru ?? '',
        ).trim();

        const dob = parseDob(dobRaw) || '';
        if (!citizen_id || citizen_id.length < 9) return null;

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
    const trimmed = (raw || '').trim();
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
        // Thử JSON hoặc chuỗi số 12 chữ số thuần
        result = parseJsonFormat(trimmed) ?? parsePipeFormat(trimmed);
        if (!result) {
            const cleanDigits = trimmed.replace(/\D/g, '');
            if (cleanDigits.length === 12 || cleanDigits.length === 9) {
                result = {
                    citizen_id: cleanDigits,
                    full_name: '',
                    dob: '',
                    gender: 'FEMALE',
                    address: '',
                };
            }
        }
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

    return { ok: true, data: result };
}
