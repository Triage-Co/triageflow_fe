'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { StatCards } from './StatCards';
import { PatientTable } from './PatientTable';
import { clinicalService, mapBackendPatientToFrontend } from '@/modules/clinical/services/clinicalService';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { Loader2, AlertCircle } from 'lucide-react';

export function DoctorDashboard() {
    const router = useRouter();
    const { openTab } = usePatientTabsStore();
    const accessToken = useAuthStore((s) => s.accessToken);

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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken) return;

        const fetchPatients = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const res = await clinicalService.getPatients(selectedDate, accessToken);
                if (res && res.data) {
                    const mapped = res.data.map(mapBackendPatientToFrontend);
                    setPatients(mapped);
                } else {
                    setPatients([]);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể kết nối tới máy chủ.');
                setPatients([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPatients();
    }, [selectedDate, accessToken]);

    const stats = useMemo(() => {
        return [
            { value: patients.length, label: 'LỊCH HẸN' },
            { value: patients.filter((p) => p.status === 'Đang chờ').length, label: 'ĐANG CHỜ' },
            { value: patients.filter((p) => p.status === 'Đã khám').length, label: 'ĐÃ KHÁM' },
        ];
    }, [patients]);

    const handleSelectPatient = (patient: Patient) => {
        openTab({ id: patient.id, name: patient.name });
        router.push(`/doctor/${patient.id}`);
    };

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
                        <StatCards stats={stats} />
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
