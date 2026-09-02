'use client';

import { useEffect, useState } from 'react';
import {
    clinicalService,
    canStaffAccessPatientEmr,
    canStaffViewPatientEmr,
    mapBackendPatientToFrontend,
    startExamStepIfPending,
} from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { isFutureLocalDate, toLocalYmd } from '@/modules/clinical/utils/appointmentDate';

/** Avoid duplicate PATCH when React Strict Mode remounts. */
const startedExamForQueueIds = new Set<string>();

const EMR_CALL_REQUIRED_MESSAGE =
    'Vui lòng gọi bệnh nhân vào phòng trước khi xem hồ sơ.';

export function useDoctorPatient(id: string) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const { setPatientData } = usePatientTabsStore();

    const [patient, setPatient] = useState<Patient | null>(null);
    const [queueStepMeta, setQueueStepMeta] = useState<{
        stepId?: string;
        stepStatus?: string;
        stepName?: string;
        queueStatus?: string;
    } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id || !accessToken) return;

        let cancelled = false;

        const fetchPatient = async () => {
            try {
                setError(null);
                setIsLoading(true);

                const res = await clinicalService.getPatientByQueueId(id, accessToken);
                if (cancelled) return;

                if (!res?.data) {
                    setError('Không tìm thấy thông tin bệnh nhân.');
                    return;
                }

                const queueStatus = res.data.status;
                const stepStatus = res.data.step?.step_status;

                if (!canStaffAccessPatientEmr(queueStatus, stepStatus)) {
                    setError(EMR_CALL_REQUIRED_MESSAGE);
                    return;
                }

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

                const doctorPatientsRes = await clinicalService.getPatients(dateStr, accessToken);
                if (cancelled) return;

                const isAssigned = doctorPatientsRes.data?.some((p) => p.queue_id === id);
                if (!isAssigned) {
                    setError('Bạn không có quyền xem thông tin bệnh nhân này.');
                    return;
                }

                const finalPatient = mapBackendPatientToFrontend(res.data);
                const stepRec = res.data.step;
                setQueueStepMeta({
                    stepId: stepRec?.step_id,
                    stepStatus: stepRec?.step_status,
                    stepName: stepRec?.step_name,
                    queueStatus,
                });
                setPatient(finalPatient);
                setPatientData(id, finalPatient);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'Không thể tải thông tin bệnh nhân.');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void fetchPatient();

        return () => {
            cancelled = true;
        };
    }, [id, accessToken, setPatientData]);

    useEffect(() => {
        if (!patient || !accessToken || !id) return;
        if (isFutureLocalDate(patient.appointmentDate)) return;
        if (
            !canStaffViewPatientEmr(
                queueStepMeta?.queueStatus,
                queueStepMeta?.stepStatus,
            )
        ) {
            return;
        }
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
