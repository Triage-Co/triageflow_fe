'use client';

import { useEffect, useState } from 'react';
import {
    clinicalService,
    mapBackendPatientToFrontend,
    startExamStepIfPending,
} from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { isFutureLocalDate, toLocalYmd } from '@/modules/clinical/utils/appointmentDate';

/** Avoid duplicate PATCH when React Strict Mode remounts. */
const startedExamForQueueIds = new Set<string>();

export function useDoctorPatient(id: string) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const { getPatientData, setPatientData } = usePatientTabsStore();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [queueStepMeta, setQueueStepMeta] = useState<{
        stepId?: string;
        stepStatus?: string;
        stepName?: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;

        const cached = getPatientData(id);
        if (cached?.bookingId && cached?.flowId && cached?.patientId && cached?.appointmentDate) {
            const timer = setTimeout(() => {
                setPatient(cached);
                setQueueStepMeta(null);
                setIsLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        if (!accessToken) return;

        const fetchPatient = async () => {
            try {
                setError(null);
                const res = await clinicalService.getPatientByQueueId(id, accessToken);
                if (res?.data) {
                    const shiftDateRaw = res.data.step?.flow?.booking?.slot?.shift?.date;
                    const dateStr =
                        toLocalYmd(shiftDateRaw) ||
                        (() => {
                            const d = new Date();
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            return `${yyyy}-${mm}-${dd}`;
                        })();

                    const doctorPatientsRes = await clinicalService.getPatients(
                        dateStr,
                        accessToken
                    );
                    const isAssigned = doctorPatientsRes.data?.some((p) => p.queue_id === id);
                    if (!isAssigned) {
                        setError('Bạn không có quyền xem thông tin bệnh nhân này.');
                        setIsLoading(false);
                        return;
                    }

                    const finalPatient = mapBackendPatientToFrontend(res.data);
                    const stepRec = res.data.step;
                    setQueueStepMeta({
                        stepId: stepRec?.step_id,
                        stepStatus: stepRec?.step_status,
                        stepName: stepRec?.step_name,
                    });
                    setPatient(finalPatient);
                    setPatientData(id, finalPatient);
                } else {
                    setError('Không tìm thấy thông tin bệnh nhân.');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải thông tin bệnh nhân.');
            } finally {
                setIsLoading(false);
            }
        };

        void fetchPatient();
    }, [id, accessToken, getPatientData, setPatientData]);

    useEffect(() => {
        if (!patient || !accessToken || !id) return;
        if (isFutureLocalDate(patient.appointmentDate)) return;
        if (startedExamForQueueIds.has(id)) return;
        startedExamForQueueIds.add(id);

        void startExamStepIfPending(accessToken, {
            patientId: patient.patientId,
            flowId: patient.flowId,
            bookingId: patient.bookingId,
            queueStepId: queueStepMeta?.stepId,
            queueStepStatus: queueStepMeta?.stepStatus,
            queueStepName: queueStepMeta?.stepName,
        }).catch((err) => {
            startedExamForQueueIds.delete(id);
            console.warn('Failed to set Khám bệnh → IN_PROGRESS', err);
        });
    }, [patient, accessToken, id, queueStepMeta]);

    return { patient, isLoading, error };
}
