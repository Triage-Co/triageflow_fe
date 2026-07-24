import type { HospitalRoom, Specialty } from '../types/room.types';
import type { Staff } from '../types/staff.types';
import type { Shift } from '../types/shift.types';

/** Check if shift is in the past (date before today) or completed */
export const isPastOrCompletedShift = (shift: { date?: string; status?: string; end_time?: string }): boolean => {
    const todayKey = new Date().toISOString().split('T')[0];
    const dateStr = shift.date ? shift.date.split('T')[0] : '';

    // Past date
    if (dateStr && dateStr < todayKey) {
        return true;
    }

    // Completed status
    const status = ((shift.status as string) || '').toUpperCase();
    if (status === 'COMPLETED' || status === 'FINISHED' || status === 'DONE') {
        return true;
    }

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
