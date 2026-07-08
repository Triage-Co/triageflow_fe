'use client';

import { use, useEffect, useState } from 'react';
import { EMRPageLayout } from '@/shared/components/layout/EMRPageLayout';
import { notFound } from 'next/navigation';
import { clinicalService, mapBackendPatientToFrontend } from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { Loader2, AlertCircle } from 'lucide-react';

export default function DoctorPatientPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const accessToken = useAuthStore((s) => s.accessToken);
    const { getPatientData, setPatientData } = usePatientTabsStore();

    // Synchronously initialize state from the Zustand cache to avoid useEffect setState lints
    const [patient, setPatient] = useState<Patient | null>(() => {
        return getPatientData(id) || null;
    });
    const [isLoading, setIsLoading] = useState(() => {
        return !getPatientData(id);
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (patient) return; // Already cached and loaded
        if (!id || !accessToken) return;

        const fetchPatient = async () => {
            try {
                setError(null);
                const res = await clinicalService.getPatientByQueueId(id, accessToken);
                if (res?.data) {
                    const mapped = mapBackendPatientToFrontend(res.data);
                    setPatient(mapped);
                    setPatientData(id, mapped);
                } else {
                    setError('Không tìm thấy thông tin bệnh nhân.');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải thông tin bệnh nhân.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchPatient();
    }, [id, accessToken, patient, setPatientData]);

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
