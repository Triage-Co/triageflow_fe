import { StateCreator } from 'zustand';
import { TicketData, RouteStepItem } from '../types/kiosk.types';
import { FlowStoreState } from './flowStore';
import { useAuthStore } from './authStore';
import { useKioskStore } from './kioskStore';
import {
  activeTicketRequests,
  doctorRouteRequests,
  getActivePatientFlowKioskWithCache,
  getStepDetailWithCache,
  sortStepsTopologically,
  mapApiToTicketData,
  mapApiToRouteSteps,
} from '../utils/flowHelpers';
import { flowService } from '../services/flowService';

export interface TicketSlice {
  activeStepId: string | null;
  activeBookingId: string | null;
  activeTicket: TicketData | null;
  routeSteps: RouteStepItem[];

  fetchActiveTicketForPatient: (patientId: string) => Promise<boolean>;
  fetchDoctorRouteSteps: (patientId: string, preFetchedFlow?: any) => Promise<boolean>;
}

export const createTicketSlice: StateCreator<
  FlowStoreState,
  [],
  [],
  TicketSlice
> = (set, get) => ({
  activeStepId: null,
  activeBookingId: null,
  activeTicket: null,
  routeSteps: [],

  fetchDoctorRouteSteps: async (patientId: string, preFetchedFlow?: any) => {
    const cacheKey = patientId;
    if (doctorRouteRequests.has(cacheKey)) {
      return doctorRouteRequests.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        let rawRes: any = preFetchedFlow;
        if (!rawRes) {
          try {
            rawRes = await getActivePatientFlowKioskWithCache(patientId);
          } catch (e) {
            console.warn('Lấy active kiosk flow cho doctor route không thành công, thử getPatientFlows:', e);
          }

          if (!rawRes || (Array.isArray(rawRes) && rawRes.length === 0)) {
            try {
              const patientFlowsRes = await flowService.getPatientFlows(patientId);
              rawRes = (patientFlowsRes as any)?.data || patientFlowsRes;
            } catch (e) {
              console.warn('Lấy patient flows cho doctor route không thành công:', e);
            }
          }
        }

        let stepsArray: any[] = [];
        let activeFlowObj: any = null;
        if (Array.isArray(rawRes)) {
          const inProgressFlows = rawRes.filter((f: any) => f.status === 'IN_PROGRESS');
          if (inProgressFlows.length > 0) {
            inProgressFlows.sort((a: any, b: any) => {
              const timeA = a.create_at ? new Date(a.create_at).getTime() : 0;
              const timeB = b.create_at ? new Date(b.create_at).getTime() : 0;
              return timeB - timeA;
            });
            activeFlowObj = inProgressFlows[0];
          } else {
            activeFlowObj = rawRes[0];
          }
          stepsArray = activeFlowObj?.steps || [];
        } else if (rawRes) {
          activeFlowObj = rawRes;
          stepsArray = Array.isArray(rawRes.steps) ? rawRes.steps : (rawRes.step_id ? [rawRes] : []);
        }

        if (stepsArray.length === 0) {
          set({ routeSteps: [] });
          return true;
        }

        stepsArray = sortStepsTopologically(stepsArray);
        const detailedSteps = await Promise.allSettled(
          stepsArray.map(async (step: any) => {
            const stepId = step.step_id || step.id;
            if (!stepId) return step;
            const isCompletedOrCancelled = step.step_status === 'COMPLETED' || step.step_status === 'CANCELLED';
            if (isCompletedOrCancelled) {
              return step;
            }

            try {
              const stepDetail = await getStepDetailWithCache(stepId, patientId);
              return { ...step, ...stepDetail };
            } catch (e) {
              console.warn(`Không thể lấy chi tiết step ${stepId}:`, e);
              return step;
            }
          })
        );

        const mappedRouteSteps = mapApiToRouteSteps(detailedSteps);

        set({
          routeSteps: mappedRouteSteps,
          activeBookingId: activeFlowObj?.booking_id || activeFlowObj?.bookingId || null
        });
        return true;
      } catch (error) {
        console.error('Lỗi nạp lộ trình bác sĩ chỉ định:', error);
        return false;
      } finally {
        doctorRouteRequests.delete(cacheKey);
      }
    })();

    doctorRouteRequests.set(cacheKey, promise);
    return promise;
  },

  fetchActiveTicketForPatient: async (patientId: string) => {
    const cacheKey = patientId;
    if (activeTicketRequests.has(cacheKey)) {
      return activeTicketRequests.get(cacheKey)!;
    }

    const kioskState = useKioskStore.getState();
    const authPatientInfo = useAuthStore.getState().patientInfo;
    kioskState.setLoading(true, 'Đang tra cứu phiếu khám...');

    const promise = (async () => {
      try {
        let flowRes: any = null;
        try {
          flowRes = await getActivePatientFlowKioskWithCache(patientId);
        } catch (e: any) {
          console.warn('Lỗi khi lấy active kiosk flow:', e?.message || e);
        }

        const flowData: any = flowRes && (flowRes as any)?.data !== undefined ? (flowRes as any).data : flowRes;
        const isEmpty = !flowData || (Array.isArray(flowData) && flowData.length === 0);
        if (isEmpty) {
          set({ activeTicket: null, routeSteps: [] });
          kioskState.showToast('Bạn chưa có phiếu khám hôm nay!', 'info');
          return false;
        }

        let activeFlow = null;
        if (Array.isArray(flowData)) {
          const inProgressFlows = flowData.filter((f: any) => f.status === 'IN_PROGRESS');
          if (inProgressFlows.length > 0) {
            inProgressFlows.sort((a: any, b: any) => {
              const timeA = a.create_at ? new Date(a.create_at).getTime() : 0;
              const timeB = b.create_at ? new Date(b.create_at).getTime() : 0;
              return timeB - timeA;
            });
            activeFlow = inProgressFlows[0];
          } else {
            activeFlow = flowData[0];
          }
        } else {
          activeFlow = flowData;
        }
        let stepId: string | null = null;
        if (activeFlow && Array.isArray(activeFlow.steps)) {
          const activeSteps = activeFlow.steps.filter(
            (s: any) => s.step_status !== 'COMPLETED' && s.step_status !== 'CANCELLED'
          );

          const currentActiveStep = activeSteps.find((s: any) => {
            if (!s.depends_on || s.depends_on.length === 0) return true;
            return s.depends_on.every((depId: string) => {
              const depStep = activeFlow.steps.find((fs: any) => fs.step_id === depId);
              return !depStep || depStep.step_status === 'COMPLETED' || depStep.step_status === 'CANCELLED';
            });
          });

          stepId = currentActiveStep?.step_id || activeSteps[0]?.step_id || activeFlow.steps[0]?.step_id || null;
        } else {
          stepId = flowData?.step_id || null;
        }

        if (!stepId) {
          set({ activeTicket: null, routeSteps: [] });
          kioskState.showToast('Bạn chưa có phiếu khám hôm nay!', 'info');
          return false;
        }
        get().fetchDoctorRouteSteps(patientId, activeFlow).catch(() => { });
        const stepData = await getStepDetailWithCache(stepId, patientId);

        if (!stepData) {
          kioskState.showToast('Không thể lấy chi tiết bước khám của bệnh nhân!', 'error');
          return false;
        }

        const activeBookingId = activeFlow?.booking_id || stepData.flow?.booking_id || stepData.flow_id || null;
        const generatedTicket = mapApiToTicketData(stepData, authPatientInfo, activeBookingId);

        set({
          activeStepId: stepData.step_id,
          activeBookingId: activeBookingId,
          activeTicket: generatedTicket,
        });

        return true;
      } catch (error: any) {
        console.error('Lỗi khi tra cứu phiếu khám 2 bước:', error);

        const is401Error =
          error?.statusCode === 401 ||
          (typeof error?.message === 'string' && (error.message.includes('Token') || error.message.includes('401'))) ||
          (typeof error?.detail === 'string' && error.detail.includes('token'));

        if (is401Error) {
          useAuthStore.getState().clearAuth();
          get().resetFlow();
          kioskState.showToast('Phiên làm việc đã hết hạn. Vui lòng quét lại CCCD!', 'error');
          kioskState.openModal('scan_cccd', 'patient_info');
          return false;
        }

        kioskState.showToast(error?.message || 'Lỗi hệ thống khi tra cứu phiếu khám!', 'error');
        return false;
      } finally {
        kioskState.setLoading(false);
        activeTicketRequests.delete(cacheKey);
      }
    })();

    activeTicketRequests.set(cacheKey, promise);
    return promise;
  },
});
