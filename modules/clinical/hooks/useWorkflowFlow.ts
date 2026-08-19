'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProcessTemplate } from '@/modules/admin/types/process.types';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import {
    clinicalService,
    extractFlowSteps,
    resolvePatientFlow,
} from '@/modules/clinical/services/clinicalService';
import {
    extractServiceOrderList,
    serviceOrderService,
} from '@/modules/clinical/services/serviceOrderService';
import type { ServiceOrder } from '@/modules/clinical/types/serviceOrder.types';
import { filterOrdersByBookingId } from '@/modules/clinical/types/serviceOrder.types';
import { detectUnlabeledPaymentStepIds, orderFlowStepsForTimeline } from '@/modules/clinical/workflow/flowOrder';

interface UseWorkflowFlowArgs {
    accessToken: string | null;
    patientId: string;
    patient?: Patient;
    refreshKey: number;
    onFlowResolved?: (info: { flowId: string; bookingId: string }) => void;
}

export function useWorkflowFlow({
    accessToken,
    patientId,
    patient,
    refreshKey,
    onFlowResolved,
}: UseWorkflowFlowArgs) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [flowData, setFlowData] = useState<Record<string, unknown> | null>(null);
    const [pendingOrders, setPendingOrders] = useState<ServiceOrder[]>([]);
    const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
    const flowIdRef = useRef<string>('');

    const rawFlowSteps = useMemo(() => extractFlowSteps(flowData), [flowData]);
    const orderedFlowSteps = useMemo(
        () => orderFlowStepsForTimeline(rawFlowSteps),
        [rawFlowSteps]
    );
    const unlabeledPaymentStepIds = useMemo(
        () => detectUnlabeledPaymentStepIds(orderedFlowSteps),
        [orderedFlowSteps]
    );
    const hasLiveSteps = rawFlowSteps.length > 0;

    useEffect(() => {
        const id = typeof flowData?.flow_id === 'string' ? flowData.flow_id : '';
        if (id) flowIdRef.current = id;
    }, [flowData]);

    const reloadFlow = useCallback(async (): Promise<Record<string, unknown> | null> => {
        const resolvedPatientId = (patient?.patientId || '').trim();
        if (!accessToken || !resolvedPatientId) return null;
        try {
            const preferredFlowId =
                flowIdRef.current ||
                (typeof flowData?.flow_id === 'string' && flowData.flow_id) ||
                patient?.flowId ||
                '';
            const flowObj = await resolvePatientFlow(accessToken, {
                flowId: preferredFlowId,
                patientId: resolvedPatientId,
                bookingId: patient?.bookingId,
            });
            setFlowData(flowObj);
            return flowObj;
        } catch (err) {
            console.error('Failed to reload active flow:', err);
            return null;
        }
    }, [accessToken, flowData, patient]);

    useEffect(() => {
        if (!accessToken) return;
        const resolvedPatientId = (patient?.patientId || '').trim();
        if (!resolvedPatientId) {
            setError('Thiếu patient_id — không tải được quy trình.');
            setFlowData(null);
            return;
        }

        let cancelled = false;
        setError(null);
        setIsLoading(true);

        const loadData = async () => {
            try {
                const flowObj = await resolvePatientFlow(accessToken, {
                    flowId: patient?.flowId,
                    patientId: resolvedPatientId,
                    bookingId: patient?.bookingId,
                });
                if (cancelled) return;
                setFlowData(flowObj);

                const bookingIdFromFlow =
                    (typeof flowObj?.booking_id === 'string' && flowObj.booking_id) ||
                    patient?.bookingId ||
                    '';

                try {
                    const pendingRes = await serviceOrderService.getPendingByPatientId(
                        resolvedPatientId,
                        accessToken
                    );
                    if (!cancelled) {
                        const all = extractServiceOrderList(pendingRes?.data);
                        setPendingOrders(filterOrdersByBookingId(all, bookingIdFromFlow));
                    }
                } catch {
                    if (!cancelled) setPendingOrders([]);
                }

                if (!flowObj) {
                    setError('Không tìm thấy flow đang chạy cho bệnh nhân.');
                } else {
                    const flowId = typeof flowObj.flow_id === 'string' ? flowObj.flow_id : '';
                    const bookingId =
                        typeof flowObj.booking_id === 'string' ? flowObj.booking_id : '';
                    if (flowId) flowIdRef.current = flowId;
                    if (flowId || bookingId) {
                        onFlowResolved?.({ flowId, bookingId });
                    }
                }

                try {
                    const tplRes = await clinicalService.getProcessTemplates(accessToken);
                    if (cancelled) return;
                    let tplList: ProcessTemplate[] = [];
                    if (tplRes?.data) {
                        const tData = tplRes.data as unknown;
                        if (Array.isArray(tData)) {
                            tplList = tData as ProcessTemplate[];
                        } else if (tData && typeof tData === 'object') {
                            const rec = tData as Record<string, unknown>;
                            if (Array.isArray(rec.data)) {
                                tplList = rec.data as ProcessTemplate[];
                            } else if (Array.isArray(rec.templates)) {
                                tplList = rec.templates as ProcessTemplate[];
                            }
                        }
                    }
                    setTemplates(tplList);
                } catch {
                    // ignore template fetch error if any
                }
            } catch (err) {
                if (cancelled) return;
                console.error('Failed to fetch active flow:', err);
                setError('Không thể tải quy trình.');
                setFlowData(null);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void loadData();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, patient?.patientId, patient?.flowId, patient?.bookingId, accessToken, refreshKey]);

    return {
        isLoading,
        error,
        setError,
        flowData,
        pendingOrders,
        setPendingOrders,
        templates,
        rawFlowSteps,
        orderedFlowSteps,
        unlabeledPaymentStepIds,
        hasLiveSteps,
        reloadFlow,
    };
}
