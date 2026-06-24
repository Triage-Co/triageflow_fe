'use client';

import { MOCK_PATIENTS, MOCK_STATS } from '@/modules/clinical/services/clinicalService';
import { DoctorHeader } from './DoctorHeader';
import { StatCards } from './StatCards';
import { PatientTable } from './PatientTable';

// ── Main component ─────────────────────────────────────────────────────────
export function DoctorDashboard() {
    return (
        <div className="flex flex-col h-full">
            {/* ── Purple gradient header bar ─── */}
            <DoctorHeader />

            {/* ── Page content ────────────────── */}
            <div className="flex-1 overflow-y-auto p-8">
                {/* Title + Stats row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-7">
                    <div>
                        <h1 className="text-[22px] font-bold text-neutral-900 tracking-tight">
                            Danh sách bệnh nhân
                        </h1>
                        <p className="text-sm text-neutral-400 mt-1 font-medium">
                            Quản lý hàng đợi và tiếp nhận bệnh nhân khám bệnh.
                        </p>
                    </div>
                    <StatCards stats={MOCK_STATS} />
                </div>

                {/* Table with search, filter, pagination */}
                <PatientTable
                    patients={MOCK_PATIENTS}
                    onSelectPatient={() => { }}
                />
            </div>
        </div>
    );
}
