import { TicketData, PaymentBill, RouteStepItem } from '../types/kiosk.types';
import { flowService } from '../services/flowService';
import { sortStepsTopologically as sortFlowStepsTopologically } from '@/modules/clinical/workflow/sortStepsTopologically';

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

export const sortStepsTopologically = (steps: any[]): any[] =>
    sortFlowStepsTopologically(steps) as any[];

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
  const flowObj = stepData.flow || {};
  const bookingObj = flowObj.booking || stepData.booking || {};
  const roomObj =
    stepData.room_info ||
    stepData.room ||
    bookingObj.slot?.shift?.room ||
    bookingObj.room ||
    (typeof flowObj.room === 'string' ? { room_name: flowObj.room } : flowObj.room);
  const specialtyObj =
    stepData.specialty_info ||
    stepData.specialty ||
    roomObj?.specialty ||
    (bookingObj.package ? { specialty_name: bookingObj.package.package_name } : undefined) ||
    (flowObj.package_name ? { specialty_name: flowObj.package_name } : undefined);
  const staffObj =
    stepData.staff_info ||
    stepData.staff ||
    bookingObj.slot?.shift?.staff ||
    (typeof flowObj.doctor === 'string' ? { full_name: flowObj.doctor } : flowObj.doctor);
  const slotObj = bookingObj.slot || stepData.slot;

  const queueNumber = queueObj?.queue_number ?? stepData.queue_number ?? stepData.queueNo ?? '';
  const stepName = stepData.step_name ?? '';
  const isPaymentStep = stepName.toLowerCase().trim().startsWith('thanh toán');

  const roomNumber = isPaymentStep
    ? '---'
    : (typeof roomObj === 'string' ? roomObj : (roomObj?.room_name ?? ''));
  const clinicName = typeof specialtyObj === 'string'
    ? specialtyObj
    : (specialtyObj?.specialty_name ?? flowObj.package_name ?? (typeof bookingObj.package === 'string' ? bookingObj.package : bookingObj.package?.package_name) ?? '');
  const doctorName = typeof staffObj === 'string'
    ? staffObj
    : (staffObj?.full_name ?? '');
  const finalTicketCode = ticketCode || queueObj?.ticket_code || flowObj.ticket_code || stepData.ticket_code || '';

  return {
    ticketNumber: queueNumber,
    patientName: patientInfo?.fullName ?? '',
    dob: patientInfo?.dob ?? '',
    createdAt: stepData.created_at
      ? new Date(stepData.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    clinicName: clinicName,
    roomNumber: roomNumber,
    location: '',
    doctorName: doctorName,
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
    ticketCode: finalTicketCode,
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

    let status: 'completed' | 'in_progress' | 'waiting' | 'pending' | 'declined' = 'pending';
    if (step.step_status === 'COMPLETED') status = 'completed';
    else if (step.step_status === 'IN_PROGRESS') status = 'in_progress';
    else if (step.step_status === 'PENDING') status = 'pending';
    else if (step.step_status === 'WAITING') status = 'waiting';
    else if (step.step_status === 'DECLINED') status = 'declined';

    const queueObj = Array.isArray(step.queues) && step.queues.length > 0 ? step.queues[0] : null;
    const queueNoStr = queueObj?.queue_number ? `${queueObj.queue_number}` : undefined;

    return {
      id: index + 1,
      title: stepName || specialtyName || roomName || `Bước ${index + 1}`,
      subtitle: staffName ? `BS. ${staffName}` : (specialtyName || ''),
      doctorName: staffName || undefined,
      specialtyName: specialtyName || undefined,
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

