'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { StatCards } from './StatCards';
import { PatientTable } from './PatientTable';
import { PatientDrawer } from './PatientDrawer';
import { MOCK_PATIENTS, MOCK_STATS } from '@/modules/clinical/services/clinicalService';

export function DoctorDashboard() {
    const router = useRouter();
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

    const handleSelectPatient = (patient: Patient) => {
        // Row click → open drawer
        setSelectedPatient(patient);
    };

    return (
        <EMRWorkspaceLayout activeTabId="dashboard">
            {/* ── Page content ────────────────── */}
            <div className="flex-1 flex flex-col bg-white border-t border-l border-[#EBEBEB] overflow-hidden">
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
                        <StatCards stats={MOCK_STATS} />
                    </div>

                    {/* Table with search, filter, pagination */}
                    <PatientTable
                        patients={MOCK_PATIENTS}
                        onSelectPatient={handleSelectPatient}
                    />
                </div>
            </div>

            {/* ── Patient Detail Drawer ────────── */}
            <PatientDrawer
                patient={selectedPatient}
                onClose={() => setSelectedPatient(null)}
            />
        </EMRWorkspaceLayout>
    );
}
