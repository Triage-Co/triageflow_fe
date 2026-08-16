'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRoomStore } from '@/modules/admin/store/roomStore';
import { useStaffStore } from '@/modules/admin/store/staffStore';
import { useShiftStore } from '@/modules/admin/store/shiftStore';
import { clinicalService } from '@/modules/clinical/services/clinicalService';
import { extractServiceOptions } from '@/modules/clinical/workflow/flowPickers';
import type { ServiceOption, SpecialtyOption } from '@/modules/clinical/workflow/types';
import {
    canCurrentDoctorEditStepStatus,
    collectDoctorRoomKeys,
    getStaffOnDutyForRoom,
    matchCurrentDoctorStaffId,
    pickDoctorOnDutyForRoom,
    resolveLiveStepStaff,
    resolveStaffNameById,
    type DutyCatalog,
} from '@/modules/clinical/workflow/duty';

interface UseWorkflowCatalogArgs {
    accessToken: string | null;
    isDoctorRole: boolean;
    userId?: string;
    userEmail?: string;
    profileAccountId?: string;
    profileEmail?: string;
}

export function useWorkflowCatalog({
    accessToken,
    isDoctorRole,
    userId,
    userEmail,
    profileAccountId,
    profileEmail,
}: UseWorkflowCatalogArgs) {
    const { rooms, fetchRooms } = useRoomStore();
    const { staffs, fetchStaffs } = useStaffStore();
    const { shifts, fetchShifts } = useShiftStore();
    const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(true);

    const catalog: DutyCatalog = useMemo(
        () => ({ rooms, staffs, shifts }),
        [rooms, staffs, shifts]
    );

    const currentDoctorStaffId = useMemo(
        () =>
            matchCurrentDoctorStaffId({
                isDoctorRole,
                staffs,
                userId,
                userEmail,
                profileAccountId,
                profileEmail,
            }),
        [isDoctorRole, staffs, userId, userEmail, profileAccountId, profileEmail]
    );

    const currentDoctorRoomKeys = useMemo(() => {
        if (!isDoctorRole || !currentDoctorStaffId) return new Set<string>();
        return collectDoctorRoomKeys(catalog, currentDoctorStaffId);
    }, [isDoctorRole, currentDoctorStaffId, catalog]);

    useEffect(() => {
        if (!accessToken) return;
        fetchRooms(accessToken).catch(() => {});
        fetchStaffs(accessToken).catch(() => {});
        fetchShifts(accessToken).catch(() => {});
    }, [accessToken, fetchRooms, fetchStaffs, fetchShifts]);

    useEffect(() => {
        if (!accessToken) return;

        let isCancelled = false;

        clinicalService
            .getServices(accessToken, 1, 100)
            .then((res) => {
                if (isCancelled) return;
                const options = extractServiceOptions(res.data);
                setServiceOptions(options);
            })
            .catch((err) => {
                console.error('Failed to load service list for workflow:', err);
            })
            .finally(() => {
                if (!isCancelled) setIsLoadingServices(false);
            });

        return () => {
            isCancelled = true;
        };
    }, [accessToken]);

    const specialties: SpecialtyOption[] = useMemo(() => {
        const byId = new Map<string, string>();
        rooms.forEach((room) => {
            if (!room.specialty_id) return;
            if (!byId.has(room.specialty_id)) {
                byId.set(room.specialty_id, room.specialty?.specialty_name || room.specialty_id);
            }
        });
        return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
    }, [rooms]);

    const getRoomsBySpecialty = useCallback(
        (specialtyId: string) => {
            if (!specialtyId) return [];
            return rooms.filter((room) => room.specialty_id === specialtyId);
        },
        [rooms]
    );

    const getStaffOnDuty = useCallback(
        (roomId: string) => getStaffOnDutyForRoom(roomId, catalog),
        [catalog]
    );

    const pickDoctorOnDuty = useCallback(
        (roomId: string) => pickDoctorOnDutyForRoom(roomId, catalog),
        [catalog]
    );

    const resolveStaffName = useCallback(
        (staffId: string) => resolveStaffNameById(staffId, staffs),
        [staffs]
    );

    const resolveStepStaff = useCallback(
        (step: Record<string, unknown>) => resolveLiveStepStaff(step, catalog),
        [catalog]
    );

    const canEditStepStatus = useCallback(
        (step: Record<string, unknown>) =>
            canCurrentDoctorEditStepStatus(step, {
                isDoctorRole,
                doctorRoomKeys: currentDoctorRoomKeys,
            }),
        [isDoctorRole, currentDoctorRoomKeys]
    );

    return {
        rooms,
        staffs,
        shifts,
        specialties,
        serviceOptions,
        isLoadingServices,
        getRoomsBySpecialty,
        getStaffOnDutyForRoom: getStaffOnDuty,
        pickDoctorOnDutyForRoom: pickDoctorOnDuty,
        resolveStaffNameById: resolveStaffName,
        resolveLiveStepStaff: resolveStepStaff,
        canCurrentDoctorEditStepStatus: canEditStepStatus,
    };
}
