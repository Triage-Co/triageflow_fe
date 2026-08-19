'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { RoomQueueDesk } from '@/modules/queue/components/RoomQueueDesk';
import { useDoctorDashboard } from '@/modules/clinical/hooks/useDoctorDashboard';

export function DoctorDashboard() {
    const {
        mounted,
        user,
        shifts,
        activeShift,
        setActiveShift,
        shiftError,
        loadingShifts,
        roomQueue,
        openPatientEmr,
    } = useDoctorDashboard();

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
                                onOpenEmr={openPatientEmr}
                            />
                        </>
                    )}
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
