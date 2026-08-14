'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { labService } from '@/modules/lab/services/labService';
import type { ShiftInfo } from '@/modules/lab/types/lab.types';
import { useRoomQueue } from '@/modules/queue/hooks/useRoomQueue';
import { pickStaffShift } from '@/modules/clinical/utils/staffShift';

export function useDoctorDashboard() {
    const router = useRouter();
    const { openTab } = usePatientTabsStore();
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    const basePath = user?.role === 'NURSE' ? '/nurse' : '/doctor';

    const [mounted, setMounted] = useState(false);
    const [shifts, setShifts] = useState<ShiftInfo[]>([]);
    const [activeShift, setActiveShift] = useState<ShiftInfo | null>(null);
    const [shiftError, setShiftError] = useState<string | null>(null);
    const [loadingShifts, setLoadingShifts] = useState(true);

    const todayStr = useMemo(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !accessToken) return;
        let cancelled = false;
        (async () => {
            setLoadingShifts(true);
            setShiftError(null);
            try {
                const list = await labService.getMyShifts(todayStr);
                if (cancelled) return;
                setShifts(list);
                setActiveShift(pickStaffShift(list, user?.role));
            } catch (e) {
                if (cancelled) return;
                setShiftError(
                    e instanceof Error ? e.message : 'Không tải được ca trực hôm nay'
                );
                setShifts([]);
                setActiveShift(null);
            } finally {
                if (!cancelled) setLoadingShifts(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [mounted, accessToken, todayStr, user?.role]);

    const roomQueue = useRoomQueue({
        roomId: activeShift?.room_id,
        staffId: user?.id,
        enabled: Boolean(activeShift?.room_id && accessToken),
    });

    const openPatientEmr = (queueId: string) => {
        const serving = roomQueue.queue?.serving;
        const name = serving?.patient?.full_name || 'Bệnh nhân';
        const stt = serving?.queue_number || '';
        openTab({ id: queueId, name, stt });
        router.push(`${basePath}/${queueId}`);
    };

    return {
        mounted,
        user,
        shifts,
        activeShift,
        setActiveShift,
        shiftError,
        loadingShifts,
        roomQueue,
        openPatientEmr,
    };
}
