import type { HospitalRoom, Specialty } from '../types/room.types';
import type { Staff } from '../types/staff.types';
import type { Shift } from '../types/shift.types';

/* ─── Week helpers (Asia/Ho_Chi_Minh) ─────────────────────────────────────── */

export const DAY_OF_WEEK_LABELS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

export const BULK_WEEKLY_MAX_SLOTS = 500;

/** Returns the Monday (`yyyy-MM-dd`) of the week containing `dateStr`, in Asia/Ho_Chi_Minh. */
export function getMondayOfWeek(dateStr: string): string {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    // Use UTC noon to avoid DST/timezone edge shifts when only the date part matters.
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    const dow = date.getUTCDay(); // 0 = Sunday ... 6 = Saturday
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    date.setUTCDate(date.getUTCDate() + diffToMonday);
    return date.toISOString().split('T')[0];
}

/** True if `dateStr` (`yyyy-MM-dd`) falls on a Monday. */
export function isMonday(dateStr: string): boolean {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return false;
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    return date.getUTCDay() === 1;
}

/** Adds `days` (0-indexed, 0 = Monday) to a Monday `week_start` and returns `yyyy-MM-dd`. */
export function addDaysToWeekStart(weekStart: string, dayOffset: number): string {
    const [y, m, d] = weekStart.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d, 12));
    date.setUTCDate(date.getUTCDate() + dayOffset);
    return date.toISOString().split('T')[0];
}

/** Check if shift is in the past (always returns false so all shifts are visible) */
export const isPastOrCompletedShift = (_shift: { date?: string; status?: string; end_time?: string }): boolean => {
    return false;
};

interface ShiftValidationParams {
    roomId: string;
    staffId: string;
    date: string;
    excludeShiftId?: string;
    rooms: HospitalRoom[];
    staffs: Staff[];
    specialties: Specialty[];
    shifts: Shift[];
}

export function validateShiftAssignment({
    roomId,
    staffId,
    date,
    excludeShiftId,
    rooms,
    staffs,
    specialties,
    shifts,
}: ShiftValidationParams): string | null {
    const targetRoom = rooms.find((r) => r.room_id === roomId);
    const targetStaff = staffs.find((s) => s.staff_id === staffId);

    if (!targetRoom || !targetStaff) return null;

    const roleKey = (targetStaff.account?.role || '').toUpperCase().replace(/^ROLE_/, '');
    const isDoctor = roleKey === 'DOCTOR';

    if (isDoctor) {
        // 1. Specialty matching validation
        const roomSpecialtyId = targetRoom.specialty_id || targetRoom.specialty?.specialty_id || '';
        const doctorSpecialtyId = targetStaff.specialty_id || '';

        if (roomSpecialtyId && doctorSpecialtyId && roomSpecialtyId !== doctorSpecialtyId) {
            const doctorSpecObj = specialties.find((s) => s.specialty_id === doctorSpecialtyId);
            const doctorSpecName = doctorSpecObj?.specialty_name || doctorSpecObj?.specialty_code || 'Khác';

            const roomSpecObj = specialties.find((s) => s.specialty_id === roomSpecialtyId);
            const roomSpecName =
                targetRoom.specialty?.specialty_name ||
                roomSpecObj?.specialty_name ||
                roomSpecObj?.specialty_code ||
                'Khác';

            return `Bác sĩ ${targetStaff.full_name} thuộc chuyên khoa "${doctorSpecName}", không cùng chuyên khoa với phòng ${targetRoom.room_name} ("${roomSpecName}").`;
        }

        // 2. Only 1 Doctor per Room validation
        const targetDateKey = date.split('T')[0];
        const existingShiftsOnDate = shifts.filter(
            (s) =>
                s.room_id === roomId &&
                s.date &&
                s.date.split('T')[0] === targetDateKey &&
                s.shift_id !== excludeShiftId &&
                !isPastOrCompletedShift(s)
        );

        const existingDoctorShift = existingShiftsOnDate.find((s) => {
            const st = staffs.find((staff) => staff.staff_id === s.staff_id);
            const rKey = (st?.account?.role || '').toUpperCase().replace(/^ROLE_/, '');
            return rKey === 'DOCTOR';
        });

        if (existingDoctorShift) {
            const existingDoctor = staffs.find((st) => st.staff_id === existingDoctorShift.staff_id);
            const doctorName = existingDoctor?.full_name || 'khác';
            return `Phòng ${targetRoom.room_name} đã có Bác sĩ ${doctorName} phân công ca trực ngày ${targetDateKey}. Mỗi phòng chỉ được phân công 1 bác sĩ.`;
        }
    }

    return null;
}

/** Filter staff list to only include Doctors matching room's specialty and all Nurses */
export function filterEligibleStaffForRoom(
    staffs: Staff[],
    room?: HospitalRoom | null
): Staff[] {
    if (!room) {
        return staffs.filter((st) => {
            const roleKey = (st.account?.role || '').toUpperCase().replace(/^ROLE_/, '');
            return roleKey === 'DOCTOR' || roleKey === 'NURSE';
        });
    }

    const roomSpecialtyId = room.specialty_id || room.specialty?.specialty_id || '';

    return staffs.filter((st) => {
        const roleKey = (st.account?.role || '').toUpperCase().replace(/^ROLE_/, '');
        if (roleKey === 'NURSE') return true;
        if (roleKey === 'DOCTOR') {
            return !!roomSpecialtyId && st.specialty_id === roomSpecialtyId;
        }
        return false;
    });
}
