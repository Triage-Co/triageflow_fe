'use client';

import { use, useEffect, useState } from 'react';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { receptionService } from '@/modules/reception/services/receptionService';
import { mapBackendToReceptionDetail } from '@/modules/reception/utils/receptionMapper';
import type { ReceptionPatientDetail } from '@/modules/reception/types/reception.types';
import { ReceptionPatientDetailView } from '@/modules/reception/components/ReceptionPatientDetail';

export function ReceptionPatientPage({ params }: { params: Promise<{ patientId: string }> }) {
    const { patientId } = use(params);
    const accessToken = useAuthStore((s) => s.accessToken);

    const [patient, setPatient] = useState<ReceptionPatientDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!accessToken || !patientId) return;

        const fetchPatient = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const res = await receptionService.getPatientByQueueId(patientId, accessToken);
                if (res?.data) {
                    setPatient(mapBackendToReceptionDetail(res.data));
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
    }, [patientId, accessToken]);

    return (
        <ReceptionPatientDetailView
            patient={patient}
            isLoading={isLoading}
            error={error}
        />
    );
}
