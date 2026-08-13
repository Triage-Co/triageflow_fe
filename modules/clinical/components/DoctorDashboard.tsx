'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { labService } from '@/modules/lab/services/labService';
import type { ShiftInfo } from '@/modules/lab/types/lab.types';
import { useRoomQueue } from '@/modules/queue/hooks/useRoomQueue';
import { RoomQueueDesk } from '@/modules/queue/components/RoomQueueDesk';

const CLINICAL_ROOM_TYPES = new Set([
    'CLINICAL_ROOM',
    'CLINIC',
    'EXAMINATION',
    'CONSULTATION',
]);

const PROCEDURE_ROOM_TYPES = new Set([
    'PROCEDURE_ROOM',
    'PROCEDURE',
    'LABORATORY',
    'IMAGING_ROOM',
    'FUNCTIONAL_EXPLORATION',
]);

function pickStaffShift(shifts: ShiftInfo[], role?: string): ShiftInfo | null {
    const upperRole = (role || '').toUpperCase();
    if (upperRole === 'NURSE' || upperRole === 'LAB_TECHNICIAN' || upperRole === 'LAB_STAFF') {
        const proc = shifts.find((s) =>
            PROCEDURE_ROOM_TYPES.has(String(s.room?.room_type || '').toUpperCase()),
        );
        return proc || shifts[0] || null;
    }
    const clinical = shifts.find((s) =>
        CLINICAL_ROOM_TYPES.has(String(s.room?.room_type || '').toUpperCase()),
    );
    return clinical || shifts[0] || null;
}

export function DoctorDashboard() {
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
                    e instanceof Error ? e.message : 'Không tải được ca trực hôm nay',
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
        enabled: !!activeShift?.room_id && !!accessToken,
    });

    const handleOpenEmr = (queueId: string) => {
        const serving = roomQueue.queue?.serving;
        const name = serving?.patient?.full_name || 'Bệnh nhân';
        const stt = serving?.queue_number || '';
        openTab({ id: queueId, name, stt });
        router.push(`${basePath}/${queueId}`);
    };

    if (!mounted) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <EMRWorkspaceLayout activeTabId="dashboard" activeTabName="Hàng chờ phòng">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 pb-6">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-neutral-200/60 bg-white p-5 shadow-sm">
                    {loadingShifts && (
                        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-500">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Đang tải ca trực…
                        </div>
                    )}

                    {!loadingShifts && shiftError && (
                        <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            {shiftError}
                        </div>
                    )}

                    {!loadingShifts && !shiftError && !activeShift && (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                            <AlertCircle className="h-8 w-8 text-amber-400" />
                            <p className="text-sm font-semibold text-neutral-700">
                                Không có ca trực hôm nay
                            </p>
                            <p className="max-w-md text-xs text-neutral-500">
                                Cần được xếp ca tại phòng khám để xem hàng chờ và gọi bệnh nhân.
                            </p>
                        </div>
                    )}

                    {!loadingShifts && activeShift && (
                        <>
                            {shifts.length > 1 && (
                                <div className="mb-3 flex flex-wrap gap-2">
                                    {shifts.map((s) => (
                                        <button
                                            key={s.shift_id}
                                            type="button"
                                            onClick={() => setActiveShift(s)}
                                            className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                                                activeShift.shift_id === s.shift_id
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'bg-neutral-100 text-neutral-600'
                                            }`}
                                        >
                                            {s.room?.room_name || s.room_id}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <RoomQueueDesk
                                title={
                                    user?.role === 'NURSE'
                                        ? 'Hàng chờ điều dưỡng / thủ thuật'
                                        : 'Hàng chờ phòng khám'
                                }
                                roomLabel={`${activeShift.room?.room_name || 'Phòng'} · ${activeShift.start_time}–${activeShift.end_time}`}
                                roomQueue={roomQueue}
                                onOpenEmr={handleOpenEmr}
                            />
                        </>
                    )}
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
