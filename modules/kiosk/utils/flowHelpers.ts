import { TicketData, PaymentBill, RouteStepItem } from '../types/kiosk.types';
import { flowService } from '../services/flowService';

// Bộ nhớ tạm để chống trùng lặp request API song song/gần nhau
export const activeTicketRequests = new Map<string, Promise<boolean>>();
export const doctorRouteRequests = new Map<string, Promise<boolean>>();
export const stepDetailRequests = new Map<string, Promise<any>>();
export const activeFlowKioskRequests = new Map<string, Promise<any>>();

export const getActivePatientFlowKioskWithCache = (patientId: string): Promise<any> => {
  const cacheKey = patientId;
  if (activeFlowKioskRequests.has(cacheKey)) {
    return activeFlowKioskRequests.get(cacheKey)!;
  }
  const promise = flowService.getActivePatientFlowKiosk(patientId)
    .then(res => (res as any)?.data || res)
    .catch((err) => {
      activeFlowKioskRequests.delete(cacheKey);
      throw err;
    })
    .finally(() => {
      setTimeout(() => {
        activeFlowKioskRequests.delete(cacheKey);
      }, 1000);
    });
  activeFlowKioskRequests.set(cacheKey, promise);
  return promise;
};

export const getStepDetailWithCache = (stepId: string, patientId: string): Promise<any> => {
  const cacheKey = `${stepId}-${patientId}`;
  if (stepDetailRequests.has(cacheKey)) {
    return stepDetailRequests.get(cacheKey)!;
  }
  const promise = flowService.getStepDetailByPatient(stepId, patientId)
    .then(res => (res as any)?.data || res)
    .catch((err) => {
      stepDetailRequests.delete(cacheKey);
      throw err;
    })
    .finally(() => {
      setTimeout(() => {
        stepDetailRequests.delete(cacheKey);
      }, 1000);
    });
  stepDetailRequests.set(cacheKey, promise);
  return promise;
};

export const sortStepsTopologically = (steps: any[]): any[] => {
  const sorted: any[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  const visit = (step: any) => {
    const stepId = step.step_id || step.id;
    if (!stepId) {
      if (!sorted.includes(step)) sorted.push(step);
      return;
    }
    if (visited.has(stepId)) return;
    if (temp.has(stepId)) return;

    temp.add(stepId);

    const deps = step.depends_on || [];
    for (const depId of deps) {
      const depStep = steps.find(s => (s.step_id || s.id) === depId);
      if (depStep) {
        visit(depStep);
      }
    }

    temp.delete(stepId);
    visited.add(stepId);
    sorted.push(step);
  };

  for (const step of steps) {
    visit(step);
  }
  return sorted;
};

export const computeWaitMinutes = (startTimeStr: string | undefined): number => {
  if (!startTimeStr) return 0;
  const now = new Date();
  const [h, m] = startTimeStr.split(':').map(Number);
  const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  const diffMs = slotStart.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
};

export const mapApiToTicketData = (stepData: any, patientInfo: any, bookingId: string | null): TicketData => {
  const queueObj = Array.isArray(stepData.queues) ? stepData.queues[0] : null;
  const roomObj = stepData.room_info || stepData.room || stepData.flow?.booking?.slot?.shift?.room;
  const specialtyObj = stepData.specialty_info || stepData.specialty || roomObj?.specialty;
  const staffObj = stepData.staff_info || stepData.staff;
  const slotObj = stepData.flow?.booking?.slot;

  const queueNumber = queueObj?.queue_number ?? stepData.queue_number ?? stepData.queueNo ?? '';
  const stepName = stepData.step_name ?? '';
  const isPaymentStep = stepName.toLowerCase().trim().startsWith('thanh toán');

  const roomNumber = isPaymentStep ? '---' : (roomObj?.room_name ?? '');

  return {
    ticketNumber: queueNumber,
    patientName: patientInfo?.fullName ?? '',
    dob: patientInfo?.dob ?? '',
    createdAt: stepData.created_at
      ? new Date(stepData.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    clinicName: specialtyObj?.specialty_name ?? '',
    roomNumber: roomNumber,
    location: '',
    doctorName: staffObj?.full_name ?? '',
    status: stepData.step_status === 'COMPLETED' ? 'completed' : 'waiting',
    waitingCount: 0,
    currentCallingNo: queueNumber,
    estimatedWaitMinutes: computeWaitMinutes(slotObj?.start_time) || 5,
    stepId: stepData.step_id,
    bookingId: bookingId || stepData.flow_id || undefined,
    startTime: slotObj?.start_time ?? '',
    roomId: isPaymentStep ? undefined : (roomObj?.physical_room_id || roomObj?.room_id || stepData.room_id || undefined),
    stepName: stepName,
  };
};

export const mapApiToRouteSteps = (detailedSteps: any[]): RouteStepItem[] => {
  return detailedSteps.map((result, index: number) => {
    const step = result.status === 'fulfilled' ? result.value : result;

    const roomObj = step.room_info || step.room || step.flow?.booking?.slot?.shift?.room;
    const stepName = step.step_name || '';
    const isPaymentStep = stepName.toLowerCase().trim().startsWith('thanh toán');

    const roomName = isPaymentStep ? '---' : (roomObj?.room_name || '');

    const specialtyObj = step.specialty_info || step.specialty || roomObj?.specialty;
    const specialtyName = specialtyObj?.specialty_name || '';

    const staffObj = step.staff_info || step.staff;
    const staffName = staffObj?.full_name || '';

    let status: 'completed' | 'in_progress' | 'waiting' | 'pending' = 'pending';
    if (step.step_status === 'COMPLETED') status = 'completed';
    else if (step.step_status === 'IN_PROGRESS') status = 'in_progress';
    else if (step.step_status === 'PENDING') status = 'pending';
    else if (step.step_status === 'WAITING') status = 'waiting';

    const queueObj = Array.isArray(step.queues) && step.queues.length > 0 ? step.queues[0] : null;
    const queueNoStr = queueObj?.queue_number ? `${queueObj.queue_number}` : undefined;

    return {
      id: index + 1,
      title: stepName || specialtyName || roomName || `Bước ${index + 1}`,
      subtitle: staffName || specialtyName || '',
      room: roomName || undefined,
      location: undefined,
      queueNo: queueNoStr,
      status: status
    };
  });
};

export const createPaymentBill = (
  paymentData: any,
  patientId: string,
  patientName: string,
  stepId: string,
  bookingId: string
): PaymentBill => {
  return {
    billId: 'BILL-' + (paymentData?.orderCode || Date.now()),
    patientCode: patientId,
    patientName: patientName,
    items: [
      { name: paymentData?.description ?? 'Phí khám bệnh chuyên khoa', amount: paymentData?.amount ?? 150000 }
    ],
    totalAmount: paymentData?.amount ?? 150000,
    isPaid: false,
    stepId,
    bookingId
  };
};

export const stripRoomName = (roomName: string): string => {
  const match = roomName.match(/^Phòng\s+(.+)$/i);
  if (!match) return roomName;
  const rest = match[1];
  // Ký tự đầu sau "Phòng" là số hoặc ký hiệu -> giữ nguyên
  if (/^[\d\W]/.test(rest)) return roomName;
  // Ký tự đầu là chữ -> bỏ "Phòng"
  return rest;
};

