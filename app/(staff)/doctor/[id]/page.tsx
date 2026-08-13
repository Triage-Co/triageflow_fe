'use client';

import { use, useEffect, useState } from 'react';
import { EMRPageLayout } from '@/shared/components/layout/EMRPageLayout';
import { notFound } from 'next/navigation';
import {
    clinicalService,
    mapBackendPatientToFrontend,
    startExamStepIfPending,
} from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { isFutureLocalDate, toLocalYmd } from '@/modules/clinical/utils/appointmentDate';
import { Loader2, AlertCircle } from 'lucide-react';

/** Avoid duplicate PATCH when React Strict Mode remounts. */
const startedExamForQueueIds = new Set<string>();

export default function DoctorPatientPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const accessToken = useAuthStore((s) => s.accessToken);
    const { getPatientData, setPatientData } = usePatientTabsStore();

    // Always start with isLoading=true and patient=null so server+client initial render is identical.
    // The Zustand persist store only hydrates on the client, so reading from it during useState init
    // causes a server/client mismatch (hydration error). We defer reading the cache to useEffect.
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

        // 1. Check Zustand cache first (client-only, safe in useEffect)
        // Re-fetch when cache thiếu bookingId/flowId (schema mới / patient cũ trong persist)
        const cached = getPatientData(id);
        // Require appointmentDate so future-day view-only works after cache hydrate
        if (cached?.bookingId && cached?.flowId && cached?.patientId && cached?.appointmentDate) {
            const timer = setTimeout(() => {
                setPatient(cached);
                setQueueStepMeta(null);
                setIsLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        // 2. Fetch from API (also refreshes stale cache)
        if (!accessToken) return;

        const fetchPatient = async () => {
            try {
                setError(null);
                const res = await clinicalService.getPatientByQueueId(id, accessToken);
                if (res?.data) {
                    // Check if this patient belongs to the logged-in doctor (timezone-safe)
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
                    const isAssigned = doctorPatientsRes.data?.some(p => p.queue_id === id);
                    if (!isAssigned) {
                        setError('Bạn không có quyền xem thông tin bệnh nhân này.');
                        setIsLoading(false);
                        return;
                    }

                    // No auto-assign: doctor picks template in Quy trình and assigns via new API body
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

        fetchPatient();
    }, [id, accessToken, getPatientData, setPatientData]);

    // Open EMR → Khám bệnh PENDING → IN_PROGRESS (skip future-day view-only visits)
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
