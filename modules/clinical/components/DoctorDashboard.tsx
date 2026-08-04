'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { StatCards } from './StatCards';
import { PatientTable } from './PatientTable';
import { clinicalService, mapBackendPatientToFrontend } from '@/modules/clinical/services/clinicalService';
import type { BackendQueuePatient } from '@/modules/clinical/services/clinicalService';
import { queueService } from '@/modules/queue/services/queueService';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { Loader2, AlertCircle, PhoneCall, CheckCircle2, XCircle, Tv } from 'lucide-react';

export function DoctorDashboard() {
    const router = useRouter();
    const { openTab } = usePatientTabsStore();
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    const basePath = user?.role === 'NURSE' ? '/nurse' : '/doctor';

    // Generate tabs: 3 past days + today + 3 future days — timezone-safe
    const dateTabs = useMemo(() => {
        const days = [];
        const nowLocal = new Date();
        const localYear = nowLocal.getFullYear();
        const localMonth = nowLocal.getMonth();
        const localDay = nowLocal.getDate();

        for (let i = -3; i <= 3; i++) {
            // i=-3 → 3 days ago, i=0 → today, i=3 → 3 days in future
            const d = new Date(localYear, localMonth, localDay + i);

            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dateStr = `${yyyy}-${mm}-${dd}`;

            let label = '';
            if (i === 0) {
                label = `Hôm nay, ${dd}/${mm}`;
            } else if (i === -1) {
                label = `Hôm qua, ${dd}/${mm}`;
            } else if (i === 1) {
                label = `Ngày mai, ${dd}/${mm}`;
            } else {
                const weekday = d.getDay();
                const daysOfWeek = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                label = `${daysOfWeek[weekday]}, ${dd}/${mm}`;
            }

            days.push({ value: dateStr, label });
        }
        return days;
    }, []);

    const [selectedDate, setSelectedDate] = useState(() => {
        const nowLocal = new Date();
        const yyyy = nowLocal.getFullYear();
        const mm = String(nowLocal.getMonth() + 1).padStart(2, '0');
        const dd = String(nowLocal.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    });
    const [patients, setPatients] = useState<Patient[]>([]);
    const [rawPatients, setRawPatients] = useState<BackendQueuePatient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Call-next state
    const [isCallingNext, setIsCallingNext] = useState(false);
    const [callStatus, setCallStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [callMessage, setCallMessage] = useState<string>('');

    const fetchPatients = useCallback(async () => {
        if (!accessToken) return;

        try {
            setIsLoading(true);
            setError(null);
            const res = await clinicalService.getPatients(selectedDate, accessToken);
            if (res && res.data) {
                setRawPatients(res.data);
                const mapped = res.data.map(mapBackendPatientToFrontend);
                setPatients(mapped);
            } else {
                setRawPatients([]);
                setPatients([]);
            }
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : '';
            if (
                errMsg.includes('rỗng') ||
                errMsg.includes('empty') ||
                errMsg.includes('cơ sở dữ liệu') ||
                errMsg.includes('Prisma') ||
                errMsg.includes('404') ||
                errMsg.includes('500')
            ) {
                setPatients([]);
                setRawPatients([]);
                setError(null);
            } else {
                setError(errMsg || 'Không thể kết nối tới máy chủ.');
                setPatients([]);
                setRawPatients([]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, accessToken]);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    const stats = useMemo(() => {
        return [
            { value: patients.length, label: 'LỊCH HẸN' },
            { value: patients.filter((p) => p.status === 'Đang chờ').length, label: 'ĐANG CHỜ' },
            { value: patients.filter((p) => p.status === 'Đã khám').length, label: 'ĐÃ KHÁM' },
        ];
    }, [patients]);

    const handleSelectPatient = (patient: Patient) => {
        openTab({ id: patient.id, name: patient.name, stt: patient.stt });
        router.push(`${basePath}/${patient.id}`);
    };

    /**
     * call-next finds the first PENDING queue on the backend.
     * FE only needs step_id / room_id / staff_id from any PENDING (or WAITING legacy) row.
     */
    const nextWaitingRaw = useMemo(() => {
        return rawPatients.find((p) => {
            const queueStatus = (p.status || '').toUpperCase();
            const stepStatus = (p.step?.step_status || '').toUpperCase();

            // Skip items that are already in progress, calling, or completed
            if (
                stepStatus === 'IN_PROGRESS' ||
                stepStatus === 'PROCESSING' ||
                stepStatus === 'CALLING' ||
                stepStatus === 'COMPLETED' ||
                queueStatus === 'CALLING' ||
                queueStatus === 'IN_PROGRESS' ||
                queueStatus === 'COMPLETED'
            ) {
                return false;
            }

            return queueStatus === 'PENDING' || queueStatus === 'WAITING' || stepStatus === 'PENDING';
        });
    }, [rawPatients]);

    const handleCallNextPatient = async () => {
        if (!accessToken || !user?.id) {
            setCallStatus('error');
            setCallMessage('Vui lòng đăng nhập để thực hiện thao tác này.');
            setTimeout(() => setCallStatus('idle'), 3000);
            return;
        }
        if (!nextWaitingRaw) {
            setCallStatus('error');
            setCallMessage('Không có bệnh nhân nào đang chờ.');
            setTimeout(() => setCallStatus('idle'), 3000);
            return;
        }

        const stepId = nextWaitingRaw.step?.step_id;
        const roomId =
            nextWaitingRaw.step?.room_id ??
            nextWaitingRaw.step?.room?.room_id ??
            (user as unknown as { room_id?: string })?.room_id ??
            '201';

        if (!stepId) {
            setCallStatus('error');
            setCallMessage('Không tìm thấy thông tin bước khám của bệnh nhân.');
            setTimeout(() => setCallStatus('idle'), 3000);
            return;
        }

        try {
            setIsCallingNext(true);
            setCallStatus('idle');
            const res = await queueService.callNextPatient(
                {
                    step_id: stepId,
                    room_id: roomId,
                    staff_id: user.id,
                },
                accessToken,
            );
            const called = res?.data?.current_patient;
            const calledLabel = called
                ? `Số ${String(called.queue_number).padStart(2, '0')} — ${called.patient_name}`
                : null;
            setCallStatus('success');
            setCallMessage(
                calledLabel
                    ? `Đã gọi: ${calledLabel}`
                    : 'Đã gọi bệnh nhân tiếp theo thành công!',
            );
            // Refresh patient list in background asynchronously
            fetchPatients();
            setTimeout(() => {
                setCallStatus('idle');
            }, 2000);
        } catch (err) {
            setCallStatus('error');
            setCallMessage(err instanceof Error ? err.message : 'Gọi bệnh nhân thất bại. Vui lòng thử lại.');
            setTimeout(() => setCallStatus('idle'), 3000);
        } finally {
            setIsCallingNext(false);
        }
    };

    const nextWaitingPatient = useMemo(
        () => patients.find((p) => p.status === 'Đang chờ'),
        [patients],
    );

    return (
        <EMRWorkspaceLayout activeTabId="dashboard">
            {/* ── Page content ────────────────── */}
            <div className="flex-1 flex flex-col p-3 pb-5 overflow-hidden">
                <div className="h-fit max-h-full flex flex-col bg-white rounded-[24px] border border-neutral-200/50 shadow-[0_4px_24px_-4px_rgba(139,124,246,0.02)] overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6">
                    {/* Title + Stats row */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-6">
                        <div>
                            <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                Danh sách bệnh nhân
                            </h1>
                            <p className="text-[13px] text-[#7B7B7B] mt-1 font-medium">
                                Quản lý hàng đợi và tiếp nhận bệnh nhân khám bệnh.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <StatCards stats={stats} />

                            {/* ── Mở màn hình TV & Gọi bệnh nhân ── */}
                            <div className="flex flex-col items-end gap-1.5">
                                <div className="flex items-center gap-2">
                                    <a
                                        href={`/display/room/${nextWaitingRaw?.step?.room_id || nextWaitingRaw?.step?.room?.room_id || '101'}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Mở màn hình TV phòng khám trên tab mới"
                                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 shadow-sm transition active:scale-95 whitespace-nowrap"
                                    >
                                        <Tv className="w-4 h-4 text-[#8B7CF6]" />
                                        <span>Màn hình TV</span>
                                    </a>

                                    <button
                                        id="call-next-patient-btn"
                                        onClick={handleCallNextPatient}
                                        disabled={isCallingNext || !nextWaitingPatient}
                                        title={
                                            !nextWaitingPatient
                                                ? 'Không có bệnh nhân đang chờ'
                                                : `Gọi bệnh nhân: ${nextWaitingPatient.name && nextWaitingPatient.name !== 'undefined' ? nextWaitingPatient.name : 'Bệnh nhân'}`
                                        }
                                        className={[
                                            'flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all duration-200 shadow-sm border',
                                            isCallingNext
                                                ? 'bg-[#8B7CF6]/70 text-white border-[#8B7CF6]/50 cursor-wait'
                                                : !nextWaitingPatient
                                                ? 'bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed'
                                                : 'bg-[#8B7CF6] text-white border-[#8B7CF6] hover:bg-[#7C6EE6] hover:shadow-md active:scale-95',
                                        ].join(' ')}
                                    >
                                        {isCallingNext ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <PhoneCall className="w-4 h-4" />
                                        )}
                                        <span>
                                            {isCallingNext
                                                ? 'Đang gọi...'
                                                : nextWaitingPatient
                                                ? `Gọi: ${nextWaitingPatient.stt}${nextWaitingPatient.name && nextWaitingPatient.name !== 'undefined' ? ` — ${nextWaitingPatient.name}` : ''}`
                                                : 'Không có bệnh nhân chờ'}
                                        </span>
                                    </button>
                                </div>

                                {/* Feedback toast */}
                                {callStatus !== 'idle' && (
                                    <div
                                        className={[
                                            'flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl animate-in fade-in-0 slide-in-from-top-2 duration-200',
                                            callStatus === 'success'
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                : 'bg-red-50 text-red-700 border border-red-200',
                                        ].join(' ')}
                                    >
                                        {callStatus === 'success' ? (
                                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                        ) : (
                                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                                        )}
                                        {callMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Date Selector Tabs */}
                    <div className="flex border-b border-[#EBEBEB] mb-6 overflow-x-auto gap-8">
                        {dateTabs.map((tab) => {
                            const isActive = selectedDate === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => setSelectedDate(tab.value)}
                                    className={`pb-3 text-sm font-bold border-b-2 transition-all duration-200 shrink-0 cursor-pointer ${isActive
                                        ? 'border-[#8B7CF6] text-[#8B7CF6]'
                                        : 'border-transparent text-neutral-400 hover:text-neutral-700'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Main Table Content */}
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                            <p className="text-sm font-semibold">Đang tải danh sách bệnh nhân...</p>
                        </div>
                    ) : error ? (
                        <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 mb-6">
                            <AlertCircle className="w-5.5 h-5.5 text-red-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-red-800 font-bold">Lỗi tải dữ liệu</p>
                                <p className="text-xs text-red-700 font-semibold mt-1">{error}</p>
                            </div>
                        </div>
                    ) : patients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 gap-3 bg-[#FBFBFF] rounded-3xl border border-neutral-100 border-dashed">
                            <p className="text-sm font-bold text-neutral-500">Hôm nay không có bệnh nhân đến khám</p>
                        </div>
                    ) : (
                        <PatientTable
                            patients={patients}
                            onSelectPatient={handleSelectPatient}
                        />
                    )}
                </div>
            </div>
        </div>
        </EMRWorkspaceLayout>
    );
}
