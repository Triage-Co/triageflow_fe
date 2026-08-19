import type { HospitalRoom } from '@/modules/admin/types/room.types';
import type { Staff } from '@/modules/admin/types/staff.types';
import type { Shift } from '@/modules/admin/types/shift.types';
import {
    asRecord,
    extractPersonName,
    isUnassignedStaffLabel,
    normalizeRoomKey,
} from './flowPickers';

export interface DutyCatalog {
    rooms: HospitalRoom[];
    staffs: Staff[];
    shifts: Shift[];
}

export function matchCurrentDoctorStaffId(input: {
    isDoctorRole: boolean;
    staffs: Staff[];
    userId?: string;
    userEmail?: string;
    profileAccountId?: string;
    profileEmail?: string;
}): string {
    if (!input.isDoctorRole) return '';

    const userId = (input.userId || '').toLowerCase();
    const userEmail = (input.userEmail || '').toLowerCase();
    const profileAccountId = (input.profileAccountId || '').toLowerCase();
    const profileEmail = (input.profileEmail || '').toLowerCase();

    const matched = input.staffs.find((staff) => {
        const rec = staff as unknown as Record<string, unknown>;
        const accountRec =
            rec.account && typeof rec.account === 'object'
                ? (rec.account as Record<string, unknown>)
                : null;

        const staffId = (staff.staff_id || '').toLowerCase();
        const accountId = (typeof rec.account_id === 'string' ? rec.account_id : '').toLowerCase();
        const accountRecId = (
            (typeof accountRec?.id === 'string' && accountRec.id) ||
            (typeof accountRec?.account_id === 'string' && accountRec.account_id) ||
            ''
        ).toLowerCase();
        const accountEmail = (
            typeof accountRec?.email === 'string' ? accountRec.email : ''
        ).toLowerCase();

        return Boolean(
            (userId && (staffId === userId || accountId === userId || accountRecId === userId)) ||
                (profileAccountId &&
                    (staffId === profileAccountId ||
                        accountId === profileAccountId ||
                        accountRecId === profileAccountId)) ||
                (userEmail && accountEmail === userEmail) ||
                (profileEmail && accountEmail === profileEmail)
        );
    });

    return matched?.staff_id || input.userId || input.profileAccountId || '';
}

export function collectDoctorRoomKeys(
    catalog: DutyCatalog,
    currentDoctorStaffId: string
): Set<string> {
    if (!currentDoctorStaffId) return new Set<string>();

    const keys = new Set<string>();
    catalog.shifts.forEach((shift) => {
        if (shift.staff_id !== currentDoctorStaffId) return;

        const shiftRoomId = normalizeRoomKey(shift.room_id);
        if (shiftRoomId) keys.add(shiftRoomId);

        const room = catalog.rooms.find(
            (r) => r.room_id === shift.room_id || r.room_name === shift.room_id
        );
        if (room) {
            const roomId = normalizeRoomKey(room.room_id);
            const roomName = normalizeRoomKey(room.room_name);
            const physicalRoomId = normalizeRoomKey(room.physical_room_id || '');

            if (roomId) keys.add(roomId);
            if (roomName) keys.add(roomName);
            if (physicalRoomId) keys.add(physicalRoomId);
        }
    });

    return keys;
}

export function canCurrentDoctorEditStepStatus(
    step: Record<string, unknown>,
    opts: { isDoctorRole: boolean; doctorRoomKeys: Set<string> }
): boolean {
    if (!opts.isDoctorRole) return true;

    const roomInfo = step.room_info as Record<string, unknown> | undefined;
    const candidateRoomKeys = [
        normalizeRoomKey(step.room_id as string),
        normalizeRoomKey(roomInfo?.room_id as string),
        normalizeRoomKey(roomInfo?.room_name as string),
    ].filter(Boolean);

    return candidateRoomKeys.some((key) => opts.doctorRoomKeys.has(key));
}

export function getStaffOnDutyForRoom(roomId: string, catalog: DutyCatalog): string {
    if (!roomId) return '';

    const { rooms, staffs: staffDirectory, shifts } = catalog;

    const targetRoom = rooms.find(
        (r) =>
            r.room_id === roomId ||
            (r as unknown as Record<string, unknown>).id === roomId ||
            r.room_name === roomId
    );

    const possibleRoomIds = new Set<string>();
    if (roomId) possibleRoomIds.add(roomId);
    if (targetRoom) {
        if (targetRoom.room_id) possibleRoomIds.add(targetRoom.room_id);
        if ((targetRoom as unknown as Record<string, unknown>).id) {
            possibleRoomIds.add((targetRoom as unknown as Record<string, unknown>).id as string);
        }
        if (targetRoom.physical_room_id) possibleRoomIds.add(targetRoom.physical_room_id);
        if (targetRoom.room_name) possibleRoomIds.add(targetRoom.room_name);
    }

    let roomShifts = shifts.filter((s) => {
        if (!s.room_id) return false;
        return possibleRoomIds.has(s.room_id);
    });

    if (roomShifts.length === 0) {
        const roomName = targetRoom?.room_name || roomId;
        roomShifts = shifts.filter(
            (s) => s.room_id && (s.room_id === roomName || s.room_id.includes(roomName))
        );
    }

    if (roomShifts.length === 0) {
        const roomSpecialtyId = targetRoom?.specialty_id;
        const doctorInSpecialty =
            staffDirectory.find(
                (st) =>
                    roomSpecialtyId &&
                    st.specialty_id === roomSpecialtyId &&
                    (st.account?.role as string) === 'DOCTOR'
            ) || staffDirectory.find((st) => (st.account?.role as string) === 'DOCTOR');
        if (doctorInSpecialty?.full_name) {
            return doctorInSpecialty.full_name;
        }
        if (doctorInSpecialty?.account?.user_name) {
            return doctorInSpecialty.account.user_name;
        }
        return 'Chưa có bác sĩ';
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;
    const todayUtcKey = now.toISOString().split('T')[0];

    let matchedShift = roomShifts.find((s) => {
        if (!s.date) return false;
        const dStr = s.date.split('T')[0].slice(0, 10);
        return dStr === todayKey || dStr === todayUtcKey;
    });

    if (!matchedShift) {
        matchedShift = [...roomShifts].sort((a, b) => {
            const aTime = a.date ? new Date(a.date).getTime() : 0;
            const bTime = b.date ? new Date(b.date).getTime() : 0;
            return bTime - aTime;
        })[0];
    }

    if (!matchedShift) return '';

    const shiftObj = matchedShift as unknown as Record<string, unknown>;
    const staffInShift = (shiftObj.staff || shiftObj.staff_info || shiftObj.account) as
        | Record<string, unknown>
        | undefined;

    const directStaffName =
        shiftObj.staff_name ||
        shiftObj.doctor_name ||
        staffInShift?.full_name ||
        staffInShift?.name ||
        staffInShift?.user_name ||
        ((staffInShift?.profile || {}) as Record<string, unknown>)?.full_name;

    if (typeof directStaffName === 'string' && directStaffName.trim()) {
        return directStaffName;
    }

    const sId = matchedShift.staff_id;
    if (sId) {
        const staff = findStaffByAnyId(sId, staffDirectory);

        if (staff) {
            const name =
                extractPersonName(staff as unknown as Record<string, unknown>) ||
                staff.full_name ||
                staff.account?.user_name ||
                staff.account?.email;

            if (name && name.trim()) return name;
        }

        const roomSpecialtyId = targetRoom?.specialty_id;
        const doctorInSpecialty = staffDirectory.find(
            (st) =>
                (roomSpecialtyId && st.specialty_id === roomSpecialtyId) ||
                (st.account?.role as string) === 'DOCTOR'
        );
        const specialtyName =
            extractPersonName(doctorInSpecialty as unknown as Record<string, unknown>) ||
            doctorInSpecialty?.full_name ||
            doctorInSpecialty?.account?.user_name;
        if (specialtyName && specialtyName.trim()) {
            return specialtyName;
        }
    }

    return 'Chưa phân công bác sĩ trực';
}

export function pickDoctorOnDutyForRoom(roomId: string, catalog: DutyCatalog): string {
    if (!roomId) return '';

    const { rooms, staffs: staffDirectory, shifts } = catalog;

    const targetRoom = rooms.find(
        (r) =>
            r.room_id === roomId ||
            (r as unknown as Record<string, unknown>).id === roomId ||
            r.room_name === roomId
    );

    const possibleRoomIds = new Set<string>();
    if (roomId) possibleRoomIds.add(roomId);
    if (targetRoom) {
        if (targetRoom.room_id) possibleRoomIds.add(targetRoom.room_id);
        if ((targetRoom as unknown as Record<string, unknown>).id) {
            possibleRoomIds.add((targetRoom as unknown as Record<string, unknown>).id as string);
        }
        if (targetRoom.physical_room_id) possibleRoomIds.add(targetRoom.physical_room_id);
        if (targetRoom.room_name) possibleRoomIds.add(targetRoom.room_name);
    }

    let roomShifts = shifts.filter((s) => {
        if (!s.room_id) return false;
        return possibleRoomIds.has(s.room_id);
    });

    if (roomShifts.length === 0) {
        const roomName = targetRoom?.room_name || roomId;
        roomShifts = shifts.filter(
            (s) => s.room_id && (s.room_id === roomName || s.room_id.includes(roomName))
        );
    }

    if (roomShifts.length === 0) {
        const roomSpecialtyId = targetRoom?.specialty_id;
        const doctorInSpecialty =
            staffDirectory.find(
                (st) =>
                    roomSpecialtyId &&
                    st.specialty_id === roomSpecialtyId &&
                    (st.account?.role as string) === 'DOCTOR'
            ) || staffDirectory.find((st) => (st.account?.role as string) === 'DOCTOR');

        return doctorInSpecialty?.staff_id || '';
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayKey = `${year}-${month}-${day}`;
    const todayUtcKey = now.toISOString().split('T')[0];

    let matchedShift = roomShifts.find((s) => {
        if (!s.date) return false;
        const dStr = s.date.split('T')[0].slice(0, 10);
        return dStr === todayKey || dStr === todayUtcKey;
    });

    if (!matchedShift) {
        matchedShift = [...roomShifts].sort((a, b) => {
            const aTime = a.date ? new Date(a.date).getTime() : 0;
            const bTime = b.date ? new Date(b.date).getTime() : 0;
            return bTime - aTime;
        })[0];
    }

    if (!matchedShift) return '';

    const sId = matchedShift.staff_id;
    const staff = staffDirectory.find(
        (st) =>
            st.staff_id === sId ||
            (st as unknown as Record<string, unknown>).id === sId ||
            (st as unknown as Record<string, unknown>).account_id === sId
    );

    const resolvedStaffId = staff?.staff_id || sId || '';
    if (resolvedStaffId) return resolvedStaffId;

    const roomSpecialtyId = targetRoom?.specialty_id;
    const doctorInSpecialty =
        staffDirectory.find(
            (st) =>
                roomSpecialtyId &&
                st.specialty_id === roomSpecialtyId &&
                (st.account?.role as string) === 'DOCTOR'
        ) || staffDirectory.find((st) => (st.account?.role as string) === 'DOCTOR');

    return doctorInSpecialty?.staff_id || '';
}

export function findStaffByAnyId(sId: string, staffs: Staff[]): Staff | undefined {
    if (!sId) return undefined;
    return staffs.find((st) => {
        const stAny = st as unknown as Record<string, unknown>;
        const accAny = (st.account || {}) as unknown as Record<string, unknown>;
        const profAny = (accAny.profile || {}) as Record<string, unknown>;
        return (
            st.staff_id === sId ||
            stAny.id === sId ||
            stAny.account_id === sId ||
            stAny.user_id === sId ||
            stAny.staff_code === sId ||
            accAny.id === sId ||
            accAny.account_id === sId ||
            accAny.user_id === sId ||
            accAny.email === sId ||
            accAny.user_name === sId ||
            profAny.id === sId
        );
    });
}

export function resolveStaffNameById(sId: string, staffs: Staff[]): string {
    const staff = findStaffByAnyId(sId, staffs);
    if (!staff) return '';
    return (
        extractPersonName(staff as unknown as Record<string, unknown>) ||
        staff.full_name ||
        staff.account?.user_name ||
        staff.account?.email ||
        ''
    );
}

export function resolveLiveStepStaff(
    step: Record<string, unknown>,
    catalog: DutyCatalog
): { staffName: string; staffId: string } {
    const staffInfo = asRecord(step.staff_info) || asRecord(step.staff);
    const roomInfo = asRecord(step.room_info);

    const staffIdFromStep =
        (typeof step.staff_id === 'string' && step.staff_id.trim()) ||
        (typeof staffInfo?.staff_id === 'string' && staffInfo.staff_id.trim()) ||
        (typeof staffInfo?.id === 'string' && staffInfo.id.trim()) ||
        '';

    const roomCandidates = [
        typeof step.room_id === 'string' ? step.room_id : '',
        typeof roomInfo?.room_id === 'string' ? roomInfo.room_id : '',
        typeof roomInfo?.room_name === 'string' ? roomInfo.room_name : '',
    ].filter(Boolean);

    for (const roomKey of roomCandidates) {
        const dutyId = pickDoctorOnDutyForRoom(roomKey, catalog);
        if (dutyId) {
            const dutyNameById = resolveStaffNameById(dutyId, catalog.staffs);
            const dutyName = dutyNameById || getStaffOnDutyForRoom(roomKey, catalog);
            if (dutyName && !isUnassignedStaffLabel(dutyName)) {
                return { staffName: dutyName, staffId: dutyId };
            }
        }

        const dutyName = getStaffOnDutyForRoom(roomKey, catalog);
        if (dutyName && !isUnassignedStaffLabel(dutyName)) {
            return {
                staffName: dutyName,
                staffId: pickDoctorOnDutyForRoom(roomKey, catalog) || staffIdFromStep,
            };
        }
    }

    const fromInfo = extractPersonName(staffInfo);
    if (fromInfo) {
        return { staffName: fromInfo, staffId: staffIdFromStep };
    }

    if (staffIdFromStep) {
        const byId = resolveStaffNameById(staffIdFromStep, catalog.staffs);
        if (byId) return { staffName: byId, staffId: staffIdFromStep };
    }

    return {
        staffName: 'Chưa phân công bác sĩ trực',
        staffId: staffIdFromStep,
    };
}
