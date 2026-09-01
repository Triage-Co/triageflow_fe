import type { RegistrationResult } from "@/modules/reception/types/reception.types";
import { formatQueueTicketNo } from "@/modules/reception/utils/receptionMapper";

export interface PatientFlowStepInfo {
  stepId: string;
  stepName: string;
  stepStatus: string;
  statusLabel: string;
  statusBadgeClass: string;
  stepType?: string;
  roomName?: string;
  doctorName?: string;
  specialtyName?: string;
  queueNumber?: string;
  paymentStatus?: string;
  slotTimeLabel?: string;
  startTime?: string;
  endTime?: string;
  shiftDate?: string;
  raw?: any;
}

export interface PatientActiveFlowItem {
  flowId: string;
  bookingId?: string;
  appointmentDate?: string;
  ticketNo: string;
  ticketCode?: string;
  queueNumber?: string;
  specialty: string;
  doctorLabel: string;
  roomLabel: string;
  slotTimeLabel: string;
  flowStatus: string;
  statusLabel: string;
  statusBadgeClass: string;
  createdAt?: string;
  steps: PatientFlowStepInfo[];
  raw: Record<string, unknown>;
}

export function mapStepStatus(status?: string): {
  label: string;
  badgeClass: string;
} {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "COMPLETED":
    case "DONE":
      return {
        label: "Hoàn thành",
        badgeClass: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
      };
    case "IN_PROGRESS":
    case "PROCESSING":
    case "EXAMINING":
      return {
        label: "Đang thực hiện",
        badgeClass: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
      };
    case "WAITING":
    case "QUEUED":
    case "IN_QUEUE":
      return {
        label: "Đang chờ",
        badgeClass: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
      };
    case "PENDING":
      return {
        label: "Chưa thực hiện",
        badgeClass: "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]",
      };
    case "CANCELLED":
      return {
        label: "Đã hủy",
        badgeClass: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
      };
    default:
      return {
        label: status || "Chưa thực hiện",
        badgeClass: "bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]",
      };
  }
}

export function mapFlowStatus(status?: string): {
  label: string;
  badgeClass: string;
} {
  const s = String(status || "").toUpperCase();
  switch (s) {
    case "WAITING_EXAMINATION":
    case "WAITING":
    case "IN_QUEUE":
      return {
        label: "Chờ khám",
        badgeClass: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
      };
    case "EXAMINING":
    case "IN_PROGRESS":
    case "PROCESSING":
      return {
        label: "Đang khám",
        badgeClass: "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]",
      };
    case "PENDING_PAYMENT":
    case "UNPAID":
      return {
        label: "Chờ thanh toán",
        badgeClass: "bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]",
      };
    case "COMPLETED":
    case "DONE":
      return {
        label: "Đã hoàn tất",
        badgeClass: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]",
      };
    case "TRIAGE":
    case "CHECKIN":
      return {
        label: "Tiếp nhận",
        badgeClass: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
      };
    case "CANCELLED":
      return {
        label: "Đã hủy",
        badgeClass: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
      };
    default:
      return {
        label: status || "Đang thực hiện",
        badgeClass: "bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]",
      };
  }
}

export function formatRealTimeRange(
  startTime?: string,
  endTime?: string,
  date?: string,
  fallbackTimestamp?: string,
): string {
  const s = (startTime || "").trim().slice(0, 5);
  const e = (endTime || "").trim().slice(0, 5);

  let timeText = "";
  if (s && e) {
    timeText = `${s} – ${e}`;
  } else if (s) {
    timeText = s;
  } else if (fallbackTimestamp) {
    try {
      const d = new Date(fallbackTimestamp);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        timeText = `${hh}:${mm}`;
      }
    } catch {
      // ignore
    }
  }

  let dateText = "";
  if (date) {
    const cleanDate = date.slice(0, 10);
    const parts = cleanDate.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      if (d && m && y && y.length === 4) {
        dateText = `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      }
    }
    if (!dateText) {
      try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const yyyy = d.getFullYear();
          dateText = `${dd}/${mm}/${yyyy}`;
        }
      } catch {
        // ignore
      }
    }
  }

  if (!dateText) {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yyyy = now.getFullYear();
    dateText = `${dd}/${mm}/${yyyy}`;
  }

  return timeText ? `${dateText}, ${timeText}` : dateText;
}

export const sortStepsTopologically = (steps: any[]): any[] => {
  if (!Array.isArray(steps) || steps.length === 0) return [];

  const isPaymentStep = (step: any): boolean => {
    const name = (step.step_name || step.name || "").toLowerCase();
    const isPayName =
      name.includes("thanh toán") || name.includes("thanh toan");
    const isPayType =
      (step.step_type || step.type || "").toUpperCase() === "PAYMENT";
    const isPendingPay = step.payment_status === "PENDING";
    return isPayName || isPayType || isPendingPay;
  };

  const getCreatedTime = (step: any): number => {
    const dateStr = step.created_at || step.create_at || step.updated_at;
    if (!dateStr) return 0;
    return new Date(dateStr).getTime();
  };

  // Xây dựng inDegree và đồ thị quan hệ phụ thuộc depends_on
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

  // Nhóm theo service_order_id
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

  for (const [, groupSteps] of orderGroups.entries()) {
    groupSteps.sort((a, b) => getCreatedTime(a) - getCreatedTime(b));
  }

  const sorted: any[] = [];
  const sortedIds = new Set<string>();

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
          const neighborStep = steps.find(
            (s) => (s.step_id || s.id) === neighborId,
          );
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
      continue;
    }

    sorted.push(current);
    if (currentId) {
      sortedIds.add(currentId);
    }

    processNeighbors(current, queue);

    if (isPaymentStep(current) && current.service_order_id) {
      const siblings = orderGroups.get(current.service_order_id) || [];
      const testSiblings = siblings.filter((s) => !isPaymentStep(s));

      for (const sibling of testSiblings) {
        const siblingId = sibling.step_id || sibling.id;
        if (siblingId && !sortedIds.has(siblingId)) {
          sorted.push(sibling);
          sortedIds.add(siblingId);
          processNeighbors(sibling, queue);
        }
      }
    }

    sortQueue(queue);
  }

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

export function mapActiveFlowsList(
  rawFlows: unknown[],
): PatientActiveFlowItem[] {
  if (!Array.isArray(rawFlows)) return [];

  // Sắp xếp các flow theo thời gian tạo mới nhất lên đầu
  const sortedRawFlows = [...rawFlows].sort((a: any, b: any) => {
    const tA = new Date(a?.created_at || a?.create_at || 0).getTime();
    const tB = new Date(b?.created_at || b?.create_at || 0).getTime();
    return tB - tA;
  });

  return sortedRawFlows.map((flowObj) => {
    const flow = (flowObj || {}) as Record<string, unknown>;
    const flowId = String(flow.flow_id || flow.id || "");
    const booking = (flow.booking || {}) as Record<string, unknown>;
    const bookingId = String(booking.booking_id || flow.booking_id || "");
    const appointmentDate = String(flow.date || "");
    const flowCreatedAt = String(flow.create_at || flow.created_at || "");

    // Slot & Shift details
    const slot = (booking.slot || {}) as Record<string, unknown>;
    const shift = (slot.shift || {}) as Record<string, unknown>;
    const room = (shift.room || flow.room || {}) as Record<string, unknown>;
    const specialtyObj = (room.specialty || {}) as Record<string, unknown>;
    const doctorObj = (shift.doctor || booking.doctor || {}) as Record<
      string,
      unknown
    >;

    // Sắp xếp Topological chuẩn Kiosk cho toàn bộ các bước trong flow
    const rawSteps = sortStepsTopologically(
      Array.isArray(flow.steps) ? flow.steps : [],
    );
    const steps: PatientFlowStepInfo[] = rawSteps.map((st: any) => {
      const stRoom = st.room_info || st.room || {};
      const stStaff = st.staff_info || st.staff || {};
      const stQueues = Array.isArray(st.queues) ? st.queues : [];
      const qNum = stQueues[0]?.queue_number || st.queue_number;
      const stStatus = String(st.step_status || st.status || "PENDING");
      const { label: statusLabel, badgeClass: statusBadgeClass } =
        mapStepStatus(stStatus);

      return {
        stepId: String(st.step_id || st.id || ""),
        stepName:
          st.step_name ||
          st.name ||
          (st.specialty_info?.specialty_name
            ? `Khám ${st.specialty_info.specialty_name}`
            : "Bước khám"),
        stepStatus: stStatus,
        statusLabel,
        statusBadgeClass,
        stepType: st.step_type || st.type,
        roomName: stRoom.room_name || stRoom.name || "",
        doctorName: stStaff.full_name || stStaff.name || "",
        specialtyName: st.specialty_info?.specialty_name || "",
        queueNumber: qNum ? String(qNum) : undefined,
        paymentStatus: st.payment_status,
      };
    });

    // 1. Lọc bỏ các bước thanh toán
    const nonPaymentSteps = rawSteps.filter((st: any) => {
      const name = String(st.step_name || st.name || "").toLowerCase();
      const type = String(st.step_type || st.type || "").toUpperCase();
      const isPay =
        name.includes("thanh toán") ||
        name.includes("thanh toan") ||
        type === "PAYMENT" ||
        Boolean(st.service_order_id && st.step_status === "COMPLETED");
      return !isPay;
    });

    // 2. Tìm bước IN_PROGRESS (hoặc bước đang thực hiện)
    const activeStepRaw =
      nonPaymentSteps.find((st: any) => {
        const status = String(st.step_status || st.status || "").toUpperCase();
        return (
          status === "IN_PROGRESS" ||
          status === "PROCESSING" ||
          status === "EXAMINING"
        );
      }) ||
      nonPaymentSteps.find((st: any) => {
        const queues = Array.isArray(st.queues) ? st.queues : [];
        return queues.length > 0 && queues[0]?.queue_number;
      }) ||
      nonPaymentSteps.find((st: any) => {
        const status = String(st.step_status || st.status || "").toUpperCase();
        return status === "WAITING" || status === "QUEUED";
      }) ||
      nonPaymentSteps[0] ||
      rawSteps[0];

    const activeStepQueues = Array.isArray(activeStepRaw?.queues)
      ? activeStepRaw.queues
      : [];
    const queueNumber = activeStepQueues[0]?.queue_number
      ? String(activeStepQueues[0].queue_number)
      : steps.find((s) => s.queueNumber)?.queueNumber;

    const ticketNo = queueNumber
      ? String(queueNumber).trim()
      : flow.ticket_code
        ? String(flow.ticket_code)
        : "—";

    // Chuyên khoa lấy từ step hoặc room/shift
    const specialty = String(
      activeStepRaw?.specialty_info?.specialty_name ||
        specialtyObj.specialty_name ||
        specialtyObj.name ||
        flow.specialty ||
        "Khám chuyên khoa",
    );

    // Tên Bác sĩ phụ trách từ staff_info của active step hoặc doctor của shift
    const stepDoctorName = String(
      activeStepRaw?.staff_info?.full_name ||
        activeStepRaw?.staff_info?.name ||
        "",
    ).trim();
    const shiftDoctorName = String(
      doctorObj.full_name || doctorObj.name || "",
    ).trim();
    const rawDoctorName = stepDoctorName || shiftDoctorName;
    const doctorLabel = rawDoctorName
      ? rawDoctorName.toLowerCase().startsWith("bs")
        ? rawDoctorName
        : `BS. ${rawDoctorName}`
      : "Bác sĩ phụ trách";

    // Phòng khám từ room_info của active step hoặc room của shift
    const stepRoomName = String(
      activeStepRaw?.room_info?.room_name ||
        activeStepRaw?.room_info?.name ||
        "",
    ).trim();
    const shiftRoomName = String(room.room_name || room.name || "").trim();
    const roomLabel =
      stepRoomName || shiftRoomName || `Phòng khám ${specialty}`;

    // Slot time label kết hợp flow.date và slot/create_at
    const startTime = slot.start_time
      ? String(slot.start_time).slice(0, 5)
      : "";
    const endTime = slot.end_time ? String(slot.end_time).slice(0, 5) : "";
    const dateForSlot = appointmentDate || (shift.date ? String(shift.date).slice(0, 10) : "");
    const slotTimeLabel = formatRealTimeRange(
      startTime,
      endTime,
      dateForSlot,
      flowCreatedAt || (flow.created_at ? String(flow.created_at) : undefined),
    );

    const flowStatus = String(flow.status || "WAITING_EXAMINATION");
    const { label: statusLabel, badgeClass: statusBadgeClass } =
      mapFlowStatus(flowStatus);

    return {
      flowId,
      appointmentDate,
      bookingId: bookingId || undefined,
      ticketNo,
      ticketCode: flow.ticket_code ? String(flow.ticket_code).trim() : undefined,
      queueNumber,
      specialty,
      doctorLabel,
      roomLabel,
      slotTimeLabel,
      flowStatus,
      statusLabel,
      statusBadgeClass,
      createdAt: flowCreatedAt || (flow.created_at ? String(flow.created_at) : undefined),
      steps,
      raw: flow,
    };
  });
}

export function mapStepDetailToInfo(detail: any): PatientFlowStepInfo | null {
  if (!detail || typeof detail !== "object") return null;
  const stepId = String(detail.step_id || detail.id || "");
  const stepStatus = String(detail.step_status || detail.status || "PENDING");
  const { label: statusLabel, badgeClass: statusBadgeClass } =
    mapStepStatus(stepStatus);
  const queues = Array.isArray(detail.queues) ? detail.queues : [];
  const qNum = queues[0]?.queue_number || detail.queue_number;

  const staffName =
    detail.staff?.full_name ||
    detail.staff_info?.full_name ||
    detail.staff?.name ||
    "";
  const slotObj = detail.flow?.booking?.slot || {};
  const shiftObj = slotObj.shift || {};
  const roomObj = shiftObj.room || detail.room_info || detail.room || {};
  const roomName = roomObj.room_name || roomObj.name || "";
  const specialtyName =
    roomObj.specialty?.specialty_name ||
    detail.specialty_info?.specialty_name ||
    detail.specialty?.specialty_name ||
    "";

  const startTime = slotObj.start_time
    ? String(slotObj.start_time).slice(0, 5)
    : "";
  const endTime = slotObj.end_time ? String(slotObj.end_time).slice(0, 5) : "";
  const shiftDate = shiftObj.date
    ? String(shiftObj.date).slice(0, 10)
    : String(detail.flow?.date || "").slice(0, 10);
  const slotTimeLabel = formatRealTimeRange(
    startTime,
    endTime,
    shiftDate,
    detail.created_at || queues[0]?.enqueued_at,
  );

  return {
    stepId,
    stepName: detail.step_name || "Bước khám",
    stepStatus,
    statusLabel,
    statusBadgeClass,
    stepType: detail.step_type,
    roomName,
    doctorName: staffName,
    specialtyName,
    queueNumber: qNum ? String(qNum) : undefined,
    paymentStatus: detail.payment_status,
    slotTimeLabel,
    startTime,
    endTime,
    shiftDate,
    raw: detail,
  };
}

export function flowItemToRegistrationResult(
  flowItem: PatientActiveFlowItem,
  patient: {
    full_name: string;
    citizen_id: string;
    phone?: string | null;
    dob?: string | null;
    medical_coverage_id?: string | null;
    bhyt?: string | null;
  },
): RegistrationResult {
  const qrPayload = JSON.stringify({
    ticket: flowItem.ticketNo,
    bookingId: flowItem.bookingId,
    flowId: flowItem.flowId,
    citizenId: patient.citizen_id,
  });

  return {
    appointmentDate: flowItem.appointmentDate,
    ticketNo: flowItem.ticketNo,
    ticketCode: flowItem.ticketCode,
    queueNumber: flowItem.queueNumber,
    bookingId: flowItem.bookingId,
    stepId: flowItem.steps[0]?.stepId || "step-1",
    fullName: patient.full_name,
    citizenId: patient.citizen_id,
    phone: patient.phone || "",
    specialty: flowItem.specialty,
    paymentLabel: "Đã xác nhận",
    doctorLabel: flowItem.doctorLabel,
    slotTimeLabel: flowItem.slotTimeLabel,
    roomLabel: flowItem.roomLabel,
    waitTimeLabel: "—",
    insuranceId: patient.medical_coverage_id || patient.bhyt || "",
    qrPayload,
    isPaymentPending: false,
  };
}
