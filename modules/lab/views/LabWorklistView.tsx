'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { useAuthStore } from '@/store/authStore';
import { labService } from '../services/labService';
import type { ShiftInfo } from '../types/lab.types';
import { useRoomQueue } from '@/modules/queue/hooks/useRoomQueue';
import { RoomQueueDesk } from '@/modules/queue/components/RoomQueueDesk';

const LAB_ROOM_TYPES = new Set([
    'LABORATORY',
    'IMAGING_ROOM',
    'FUNCTIONAL_EXPLORATION',
    'PROCEDURE_ROOM',
]);

function pickLabShift(shifts: ShiftInfo[]): ShiftInfo | null {
    const lab = shifts.find((s) =>
        LAB_ROOM_TYPES.has(String(s.room?.room_type || '').toUpperCase()),
    );
    return lab || shifts[0] || null;
}

export default function LabWorklistView() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);

    const [mounted, setMounted] = useState(false);
    const [shifts, setShifts] = useState<ShiftInfo[]>([]);
    const [activeShift, setActiveShift] = useState<ShiftInfo | null>(null);
    const [loadingShifts, setLoadingShifts] = useState(true);
    const [shiftError, setShiftError] = useState<string | null>(null);

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
                setActiveShift(pickLabShift(list));
            } catch (e) {
                if (cancelled) return;
                setShiftError(
                    e instanceof Error ? e.message : 'Không tải được ca trực',
                );
            } finally {
                if (!cancelled) setLoadingShifts(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [mounted, accessToken, todayStr]);

    const roomQueue = useRoomQueue({
        roomId: activeShift?.room_id,
        staffId: activeShift?.staff_id || user?.id,
        enabled: !!activeShift?.room_id && !!accessToken,
    });

    if (!mounted || !accessToken) {
        return (
            <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-neutral-50/50">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    return (
        <EMRWorkspaceLayout activeTabId="lab-patients" activeTabName="Hàng chờ CLS">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 pb-6">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-neutral-200/50 bg-white p-5 shadow-sm">
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

                    {!loadingShifts && !activeShift && !shiftError && (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                            <AlertCircle className="h-8 w-8 text-amber-400" />
                            <p className="text-sm font-semibold text-neutral-700">
                                Không có ca trực phòng CLS / thủ thuật hôm nay
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
                                title="Quản lý hàng chờ xét nghiệm / CLS"
                                roomLabel={`${activeShift.room?.room_name || 'Phòng'} · ${activeShift.start_time}–${activeShift.end_time}`}
                                roomQueue={roomQueue}
                            />
                        </>
                    )}
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
