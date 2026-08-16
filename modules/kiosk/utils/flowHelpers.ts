import { TicketData, PaymentBill, RouteStepItem } from '../types/kiosk.types';
import { flowService } from '../services/flowService';

// Bộ nhớ tạm để chống trùng lặp request API song song/gần nhau
export const activeTicketRequests = new Map<string, Promise<boolean>>();
export const doctorRouteRequests = new Map<string, Promise<boolean>>();
export const stepDetailRequests = new Map<string, Promise<any>>();
export const activeFlowKioskRequests = new Map<string, Promise<any>>();

export const QUEUE_TYPE_MAP: Record<string, string> = {
  NEW: "Bệnh nhân mới",
  APPOINTMENT: "Đặt lịch hẹn",
  RETURNING: "Quay lại",
  TRANSFER: "Chuyển phòng",
  QUICK_TASK: "Tác vụ nhanh",
  FOLLOW_UP: "Tái khám",
};

export const getActivePatientFlowKioskWithCache = (patientId: string, date?: string): Promise<any> => {
  const cacheKey = date ? `${patientId}_${date}` : patientId;
  if (activeFlowKioskRequests.has(cacheKey)) {
    return activeFlowKioskRequests.get(cacheKey)!;
  }
  const promise = flowService.getActivePatientFlowKiosk(patientId, date)
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
  if (!Array.isArray(steps) || steps.length === 0) return [];

  const isPaymentStep = (step: any): boolean => {
    const name = (step.step_name || '').toLowerCase();
    const isPayName = name.includes('thanh toán') || name.includes('thanh toan');
    const isPayType = (step.step_type || '').toUpperCase() === 'PAYMENT';
    const isPendingPay = step.payment_status === 'PENDING';
    return isPayName || isPayType || isPendingPay;
  };

  const getCreatedTime = (step: any): number => {
    const dateStr = step.created_at || step.create_at || step.updated_at;
    if (!dateStr) return 0;
    return new Date(dateStr).getTime();
  };

  // Build the adjacency list and in-degree map
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();

  for (const step of steps) {
    const id = step.step_id || step.id;
    if (id) {
      inDegree.set(id, 0);
      graph.set(id, []);
    }
  }

  for (const step of steps) {
    const id = step.step_id || step.id;
    if (!id) continue;

    const deps = step.depends_on || [];
    for (const depId of deps) {
      if (inDegree.has(depId)) {
        graph.get(depId)!.push(id);
        inDegree.set(id, inDegree.get(id)! + 1);
      }
    }
  }

  // Group steps by service_order_id
  const orderGroups = new Map<string, any[]>();
  for (const step of steps) {
    const serviceOrderId = step.service_order_id;
    if (serviceOrderId) {
      if (!orderGroups.has(serviceOrderId)) {
        orderGroups.set(serviceOrderId, []);
      }
      orderGroups.get(serviceOrderId)!.push(step);
    }
  }

  // Sort steps inside each service order group by created_at time
  for (const [key, groupSteps] of orderGroups.entries()) {
    groupSteps.sort((a, b) => getCreatedTime(a) - getCreatedTime(b));
  }

  const sorted: any[] = [];
  const sortedIds = new Set<string>();

  // Helper to process a step, decrementing neighbors' inDegrees
  const processNeighbors = (step: any, q: any[]) => {
    const id = step.step_id || step.id;
    if (!id) return;
    const neighbors = graph.get(id) || [];
    for (const neighborId of neighbors) {
      const currentDeg = inDegree.get(neighborId);
      if (currentDeg !== undefined) {
        const newDeg = currentDeg - 1;
        inDegree.set(neighborId, newDeg);
        if (newDeg === 0) {
          const neighborStep = steps.find((s) => (s.step_id || s.id) === neighborId);
          if (neighborStep) {
            q.push(neighborStep);
          }
        }
      }
    }
  };

  const sortQueue = (arr: any[]) => {
    return arr.sort((a, b) => {
      const payA = isPaymentStep(a) ? 1 : 0;
      const payB = isPaymentStep(b) ? 1 : 0;
      if (payA !== payB) return payB - payA;

      const tA = getCreatedTime(a);
      const tB = getCreatedTime(b);
      if (tA !== tB) return tA - tB;
      return 0;
    });
  };

  // Find start nodes
  const startNodes = steps.filter((step) => {
    const id = step.step_id || step.id;
    return !id || inDegree.get(id) === 0;
  });

  const queue = [...startNodes];
  sortQueue(queue);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentId = current.step_id || current.id;

    if (currentId && sortedIds.has(currentId)) {
      continue; // Already processed as part of a service order group
    }

    sorted.push(current);
    if (currentId) {
      sortedIds.add(currentId);
    }

    // Process neighbors of the current step
    processNeighbors(current, queue);

    // Grouping logic: If this is a Payment step belonging to a service order,
    // pull all its sibling test steps and output them immediately.
    if (isPaymentStep(current) && current.service_order_id) {
      const siblings = orderGroups.get(current.service_order_id) || [];
      const testSiblings = siblings.filter((s) => !isPaymentStep(s));

      for (const sibling of testSiblings) {
        const siblingId = sibling.step_id || sibling.id;
        if (siblingId && !sortedIds.has(siblingId)) {
          sorted.push(sibling);
          sortedIds.add(siblingId);
          // Process neighbors of the sibling as well
          processNeighbors(sibling, queue);
        }
      }
    }

    sortQueue(queue);
  }

  // Fallback for any step not processed
  for (const step of steps) {
    const id = step.step_id || step.id;
    if (id && !sortedIds.has(id)) {
      sorted.push(step);
      sortedIds.add(id);
    } else if (!id && !sorted.includes(step)) {
      sorted.push(step);
    }
  }

  return sorted;
};

export const computeWaitMinutes = (startTimeStr: string | undefined): number => {
  if (!startTimeStr) return 5;
  const now = new Date();
  const [h, m] = startTimeStr.split(':').map(Number);
  const slotStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
  const diffMs = slotStart.getTime() - now.getTime();
  return Math.max(0, Math.floor(diffMs / 60000));
};

export const mapApiToTicketData = (stepData: any, patientInfo: any, bookingId: string | null, ticketCode?: string): TicketData => {
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
    status: stepData.step_status === 'COMPLETED'
      ? 'completed'
      : stepData.step_status === 'IN_PROGRESS'
        ? 'in_consultation'
        : 'waiting',
    waitingCount: 0,
    currentCallingNo: queueNumber,
    estimatedWaitMinutes: computeWaitMinutes(slotObj?.start_time),
    stepId: stepData.step_id,
    bookingId: bookingId || stepData.flow_id || undefined,
    startTime: slotObj?.start_time ?? '',
    roomId: isPaymentStep ? undefined : (roomObj?.physical_room_id || roomObj?.room_id || stepData.room_id || undefined),
    stepName: stepName,
    ticketCode: ticketCode || stepData.flow?.ticket_code || '',
    queueType: queueObj?.queue_type ?? '',
    doctorExperience: staffObj?.experience_years,
    doctorLicense: staffObj?.license_number,
  };
};

export const mapApiToRouteSteps = (detailedSteps: any[]): RouteStepItem[] => {
  const steps = detailedSteps
    .map((result) => (result.status === 'fulfilled' ? result.value : result))
    .filter((step) => step && step.step_status !== 'CANCELLED');

  return steps.map((step, index: number) => {
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
      status: status,
      stepId: step.step_id || step.id || '',
      rawStep: step,
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

