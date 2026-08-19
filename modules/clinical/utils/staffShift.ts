import type { ShiftInfo } from '@/modules/lab/types/lab.types';

const CLINICAL_ROOM_TYPES = new Set([
    'CLINICAL_ROOM',
    'CLINIC',
    'EXAMINATION',
    'CONSULTATION',
]);

export const PROCEDURE_ROOM_TYPES = new Set([
    'PROCEDURE_ROOM',
    'PROCEDURE',
    'LABORATORY',
    'IMAGING_ROOM',
    'FUNCTIONAL_EXPLORATION',
]);

export function pickStaffShift(shifts: ShiftInfo[], role?: string): ShiftInfo | null {
    const upperRole = (role || '').toUpperCase();
    if (upperRole === 'NURSE' || upperRole === 'LAB_TECHNICIAN' || upperRole === 'LAB_STAFF') {
        const proc = shifts.find((s) =>
            PROCEDURE_ROOM_TYPES.has(String(s.room?.room_type || '').toUpperCase())
        );
        return proc || shifts[0] || null;
    }
    const clinical = shifts.find((s) =>
        CLINICAL_ROOM_TYPES.has(String(s.room?.room_type || '').toUpperCase())
    );
    return clinical || shifts[0] || null;
}
