'use client';

import { notFound } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { EMRPageLayout } from '@/shared/components/layout/EMRPageLayout';
import { useDoctorPatient } from '@/modules/clinical/hooks/useDoctorPatient';

export function DoctorPatientPage({ id }: { id: string }) {
    const { patient, isLoading, error } = useDoctorPatient(id);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-neutral-400 gap-3 min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
                <p className="text-sm font-semibold">Đang tải thông tin bệnh nhân...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 m-6">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                    <p className="text-sm text-red-800 font-bold">Lỗi tải dữ liệu</p>
                    <p className="text-xs text-red-700 font-semibold mt-1">{error}</p>
                </div>
            </div>
        );
    }

    if (!patient) {
        notFound();
    }

    return <EMRPageLayout key={patient.id} patient={patient} />;
}
