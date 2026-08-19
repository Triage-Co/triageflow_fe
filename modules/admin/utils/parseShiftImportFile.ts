import type { HospitalRoom, Specialty } from '../types/room.types';
import type { Staff } from '../types/staff.types';
import type { Shift } from '../types/shift.types';
import { validateShiftAssignment } from './shiftValidation';

export const SHIFT_IMPORT_MAX_ROWS = 600;

export const SHIFT_IMPORT_HEADERS = ['email', 'room_name', 'date', 'start_time', 'end_time'] as const;

export type ShiftImportHeader = (typeof SHIFT_IMPORT_HEADERS)[number];

export interface ParsedShiftImportRow {
    rowNumber: number;
    email: string;
    room_name: string;
    date: string;
    start_time: string;
    end_time: string;
}

export interface ResolvedShiftImportRow extends ParsedShiftImportRow {
    staff_id?: string;
    room_id?: string;
    staff_name?: string;
    error?: string;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function isBlank(value: unknown): boolean {
    if (value == null) return true;
    return String(value).trim() === '';
}

function normalizeHeader(value: unknown): string {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
}

function normalizeDate(value: unknown): string | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
    }

    if (typeof value === 'number' && Number.isFinite(value) && value > 20000 && value < 80000) {
        const utc = Date.UTC(1899, 11, 30) + Math.round(value) * 86400000;
        const dt = new Date(utc);
        return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
    }

    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(raw);
    if (dmy) {
        return `${dmy[3]}-${pad2(Number(dmy[2]))}-${pad2(Number(dmy[1]))}`;
    }

    return null;
}

function isRealDate(dateStr: string): boolean {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function normalizeTime(value: unknown): string | null {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`;
    }

    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1) {
        const totalMins = Math.round(value * 24 * 60) % (24 * 60);
        return `${pad2(Math.floor(totalMins / 60))}:${pad2(totalMins % 60)}`;
    }

    const raw = String(value ?? '').trim();
    const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(raw);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return `${pad2(hours)}:${pad2(minutes)}`;
}

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    return aStart < bEnd && aEnd > bStart;
}

export function downloadShiftImportTemplate(): void {
    const csv =
        'email,room_name,date,start_time,end_time\nbs.an@hospital.vn,Phòng khám Tim mạch 1,2026-08-17,08:00,17:00\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'mau-import-ca-truc.csv';
    anchor.click();
    URL.revokeObjectURL(url);
}

export async function parseShiftImportFile(file: File): Promise<ParsedShiftImportRow[]> {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls')) {
        throw new Error('Chỉ hỗ trợ file .csv hoặc .xlsx.');
    }

    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        throw new Error('File không có sheet dữ liệu.');
    }

    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<(string | number | Date | boolean | null)[]>(sheet, {
        header: 1,
        raw: true,
        defval: '',
        blankrows: false,
    });

    if (matrix.length === 0) {
        throw new Error('File trống. Vui lòng dùng file mẫu với các cột email, room_name, date, start_time, end_time.');
    }

    const headerRow = matrix[0].map(normalizeHeader);
    const colIndex: Partial<Record<ShiftImportHeader, number>> = {};
    for (const header of SHIFT_IMPORT_HEADERS) {
        const idx = headerRow.indexOf(header);
        if (idx >= 0) colIndex[header] = idx;
    }

    const missing = SHIFT_IMPORT_HEADERS.filter((h) => colIndex[h] === undefined);
    if (missing.length > 0) {
        throw new Error(
            `Thiếu cột bắt buộc: ${missing.join(', ')}. Header cần có: ${SHIFT_IMPORT_HEADERS.join(', ')}.`
        );
    }

    const rows: ParsedShiftImportRow[] = [];
    for (let i = 1; i < matrix.length; i++) {
        const line = matrix[i];
        if (!line || line.every((cell) => isBlank(cell))) continue;

        const email = String(line[colIndex.email!] ?? '').trim();
        const room_name = String(line[colIndex.room_name!] ?? '').trim();
        const dateRaw = line[colIndex.date!];
        const startRaw = line[colIndex.start_time!];
        const endRaw = line[colIndex.end_time!];

        rows.push({
            rowNumber: i + 1,
            email,
            room_name,
            date: normalizeDate(dateRaw) ?? String(dateRaw ?? '').trim(),
            start_time: normalizeTime(startRaw) ?? String(startRaw ?? '').trim(),
            end_time: normalizeTime(endRaw) ?? String(endRaw ?? '').trim(),
        });
    }

    if (rows.length === 0) {
        throw new Error('File không có dòng dữ liệu nào.');
    }

    if (rows.length > SHIFT_IMPORT_MAX_ROWS) {
        throw new Error(`File có ${rows.length} dòng, vượt giới hạn ${SHIFT_IMPORT_MAX_ROWS} ca/lần.`);
    }

    return rows;
}

export function resolveShiftImportRows(
    parsed: ParsedShiftImportRow[],
    staffs: Staff[],
    rooms: HospitalRoom[],
    specialties: Specialty[],
    existingShifts: Shift[]
): ResolvedShiftImportRow[] {
    const staffByEmail = new Map<string, Staff>();
    for (const staff of staffs) {
        const email = staff.account?.email?.trim().toLowerCase();
        if (email) staffByEmail.set(email, staff);
    }

    const roomsByName = new Map<string, HospitalRoom[]>();
    for (const room of rooms) {
        const key = room.room_name.trim().toLowerCase();
        const list = roomsByName.get(key) ?? [];
        list.push(room);
        roomsByName.set(key, list);
    }

    const previewShifts: Shift[] = [...existingShifts];
    const resolved: ResolvedShiftImportRow[] = [];

    for (const row of parsed) {
        const next: ResolvedShiftImportRow = { ...row };
        const errors: string[] = [];

        if (!row.email) errors.push('Thiếu email');
        if (!row.room_name) errors.push('Thiếu tên phòng');

        const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(row.date) && isRealDate(row.date);
        if (!dateOk) errors.push('Ngày không hợp lệ (cần yyyy-MM-dd)');

        const startOk = TIME_RE.test(row.start_time);
        const endOk = TIME_RE.test(row.end_time);
        if (!startOk) errors.push('Giờ bắt đầu không hợp lệ (HH:mm)');
        if (!endOk) errors.push('Giờ kết thúc không hợp lệ (HH:mm)');
        if (startOk && endOk && row.start_time >= row.end_time) {
            errors.push('Giờ bắt đầu phải nhỏ hơn giờ kết thúc');
        }

        const staff = row.email ? staffByEmail.get(row.email.toLowerCase()) : undefined;
        if (row.email && !staff) errors.push(`Không tìm thấy nhân viên với email ${row.email}`);

        const roomMatches = row.room_name ? roomsByName.get(row.room_name.trim().toLowerCase()) ?? [] : [];
        if (row.room_name && roomMatches.length === 0) {
            errors.push(`Không tìm thấy phòng "${row.room_name}"`);
        } else if (roomMatches.length > 1) {
            errors.push('Tên phòng bị trùng, vui lòng dùng tên duy nhất');
        }

        if (errors.length > 0) {
            next.error = errors.join('. ');
            resolved.push(next);
            continue;
        }

        const room = roomMatches[0];
        next.staff_id = staff!.staff_id;
        next.room_id = room.room_id;
        next.staff_name = staff!.full_name;

        const assignmentError = validateShiftAssignment({
            roomId: room.room_id,
            staffId: staff!.staff_id,
            date: row.date,
            rooms,
            staffs,
            specialties,
            shifts: previewShifts,
        });
        if (assignmentError) {
            next.error = assignmentError;
            resolved.push(next);
            continue;
        }

        const overlapping = previewShifts.find(
            (s) =>
                s.staff_id === staff!.staff_id &&
                s.date.split('T')[0] === row.date &&
                timesOverlap(s.start_time, s.end_time, row.start_time, row.end_time)
        );
        if (overlapping) {
            next.error = 'Trùng khung giờ với một ca khác trong file hoặc lịch hiện có';
            resolved.push(next);
            continue;
        }

        previewShifts.push({
            shift_id: `import-preview-${row.rowNumber}`,
            staff_id: staff!.staff_id,
            room_id: room.room_id,
            date: row.date,
            start_time: row.start_time,
            end_time: row.end_time,
        });

        resolved.push(next);
    }

    return resolved;
}
