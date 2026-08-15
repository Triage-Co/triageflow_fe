import type { RegistrationResult } from '@/modules/reception/types/reception.types';
import { formatQueueTicketNo } from '@/modules/reception/utils/receptionMapper';

export interface PatientFlowStepInfo {
    stepId: string;
    stepName: string;
    stepStatus: string;
    statusLabel: string;
    statusBadgeClass: string;
    stepType?: string;
    roomName?: string;
    doctorName?: string;
    queueNumber?: string;
    paymentStatus?: string;
}

export interface PatientActiveFlowItem {
    flowId: string;
    bookingId?: string;
    ticketNo: string;
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

export function mapStepStatus(status?: string): { label: string; badgeClass: string } {
    const s = String(status || '').toUpperCase();
    switch (s) {
        case 'COMPLETED':
        case 'DONE':
            return {
                label: 'Hoàn thành',
                badgeClass: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
            };
        case 'IN_PROGRESS':
        case 'PROCESSING':
        case 'EXAMINING':
            return {
                label: 'Đang thực hiện',
                badgeClass: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
            };
        case 'WAITING':
        case 'QUEUED':
        case 'IN_QUEUE':
            return {
                label: 'Đang chờ',
                badgeClass: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
            };
        case 'PENDING':
            return {
                label: 'Chưa thực hiện',
                badgeClass: 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]',
            };
        case 'CANCELLED':
            return {
                label: 'Đã hủy',
                badgeClass: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
            };
        default:
            return {
                label: status || 'Chưa thực hiện',
                badgeClass: 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]',
            };
    }
}

export function mapFlowStatus(status?: string): { label: string; badgeClass: string } {
    const s = String(status || '').toUpperCase();
    switch (s) {
        case 'WAITING_EXAMINATION':
        case 'WAITING':
        case 'IN_QUEUE':
            return {
                label: 'Chờ khám',
                badgeClass: 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
            };
        case 'EXAMINING':
        case 'IN_PROGRESS':
        case 'PROCESSING':
            return {
                label: 'Đang khám',
                badgeClass: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
            };
        case 'PENDING_PAYMENT':
        case 'UNPAID':
            return {
                label: 'Chờ thanh toán',
                badgeClass: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
            };
        case 'COMPLETED':
        case 'DONE':
            return {
                label: 'Đã hoàn tất',
                badgeClass: 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]',
            };
        case 'TRIAGE':
        case 'CHECKIN':
            return {
                label: 'Tiếp nhận',
                badgeClass: 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]',
            };
        case 'CANCELLED':
            return {
                label: 'Đã hủy',
                badgeClass: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
            };
        default:
            return {
                label: status || 'Đang thực hiện',
                badgeClass: 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]',
            };
    }
}

export function mapActiveFlowsList(rawFlows: unknown[]): PatientActiveFlowItem[] {
    if (!Array.isArray(rawFlows)) return [];

    return rawFlows.map((flowObj) => {
        const flow = (flowObj || {}) as Record<string, unknown>;
        const flowId = String(flow.flow_id || flow.id || '');
        const booking = (flow.booking || {}) as Record<string, unknown>;
        const bookingId = String(booking.booking_id || flow.booking_id || '');

        // Slot & Shift details
        const slot = (booking.slot || {}) as Record<string, unknown>;
        const shift = (slot.shift || {}) as Record<string, unknown>;
        const room = (shift.room || flow.room || {}) as Record<string, unknown>;
        const specialtyObj = (room.specialty || {}) as Record<string, unknown>;
        const doctorObj = (shift.doctor || booking.doctor || {}) as Record<string, unknown>;

        // Steps & queues
        const rawSteps = Array.isArray(flow.steps) ? flow.steps : [];
        const steps: PatientFlowStepInfo[] = rawSteps.map((st: any) => {
            const stRoom = st.room_info || st.room || {};
            const stStaff = st.staff_info || st.staff || {};
            const stQueues = Array.isArray(st.queues) ? st.queues : [];
            const qNum = stQueues[0]?.queue_number || st.queue_number;
            const stStatus = String(st.step_status || st.status || 'PENDING');
            const { label: statusLabel, badgeClass: statusBadgeClass } = mapStepStatus(stStatus);

            return {
                stepId: String(st.step_id || st.id || ''),
                stepName: st.step_name || st.name || (st.specialty_info?.specialty_name ? `Khám ${st.specialty_info.specialty_name}` : 'Bước khám'),
                stepStatus: stStatus,
                statusLabel,
                statusBadgeClass,
                stepType: st.step_type || st.type,
                roomName: stRoom.room_name || stRoom.name || '',
                doctorName: stStaff.full_name || stStaff.name || '',
                queueNumber: qNum ? String(qNum) : undefined,
                paymentStatus: st.payment_status,
            };
        });

        // Tìm step chính (ưu tiên step có queue_number, hoặc step không phụ thuộc depends_on, hoặc step khám bệnh)
        const nonPaymentSteps = rawSteps.filter((st: any) => {
            const name = String(st.step_name || st.name || '').toLowerCase();
            return !name.includes('thanh toán');
        });

        const examStepRaw =
            nonPaymentSteps.find((st: any) => Array.isArray(st.queues) && st.queues.length > 0 && st.queues[0]?.queue_number) ||
            nonPaymentSteps.find((st: any) => (!st.depends_on || st.depends_on.length === 0) && st.room_info?.room_name) ||
            nonPaymentSteps.find((st: any) => String(st.step_name || '').toLowerCase().includes('khám')) ||
            nonPaymentSteps[0] ||
            rawSteps[0];

        const examStepQueues = Array.isArray(examStepRaw?.queues) ? examStepRaw.queues : [];
        const queueNumber = examStepQueues[0]?.queue_number
            ? String(examStepQueues[0].queue_number)
            : steps.find((s) => s.queueNumber)?.queueNumber;

        const ticketNo = queueNumber ? String(queueNumber).trim() : '—';

        // Chuyên khoa lấy từ step hoặc phòng/lịch khám
        const specialty =
            String(
                examStepRaw?.specialty_info?.specialty_name ||
                specialtyObj.specialty_name ||
                specialtyObj.name ||
                flow.specialty ||
                'Khám chuyên khoa',
            );

        // Tên Bác sĩ phụ trách từ staff_info của step hoặc doctor của shift
        const stepDoctorName = String(examStepRaw?.staff_info?.full_name || examStepRaw?.staff_info?.name || '').trim();
        const shiftDoctorName = String(doctorObj.full_name || doctorObj.name || '').trim();
        const rawDoctorName = stepDoctorName || shiftDoctorName;
        const doctorLabel = rawDoctorName
            ? (rawDoctorName.toLowerCase().startsWith('bs') ? rawDoctorName : `BS. ${rawDoctorName}`)
            : 'Bác sĩ phụ trách';

        // Phòng khám từ room_info của step hoặc room của shift
        const stepRoomName = String(examStepRaw?.room_info?.room_name || examStepRaw?.room_info?.name || '').trim();
        const shiftRoomName = String(room.room_name || room.name || '').trim();
        const roomLabel = stepRoomName || shiftRoomName || `Phòng khám ${specialty}`;

        // Slot time label
        const startTime = slot.start_time ? String(slot.start_time).slice(0, 5) : '';
        const endTime = slot.end_time ? String(slot.end_time).slice(0, 5) : '';
        const shiftDate = shift.date ? String(shift.date).slice(0, 10) : '';
        let slotTimeLabel = startTime && endTime ? `${startTime} – ${endTime}` : (startTime || 'Trong ngày');
        if (shiftDate) {
            const [y, m, d] = shiftDate.split('-');
            if (d && m && y) {
                slotTimeLabel = `${d}/${m}/${y}, ${slotTimeLabel}`;
            }
        }

        const flowStatus = String(flow.status || 'WAITING_EXAMINATION');
        const { label: statusLabel, badgeClass: statusBadgeClass } = mapFlowStatus(flowStatus);

        return {
            flowId,
            bookingId,
            ticketNo,
            queueNumber,
            specialty,
            doctorLabel,
            roomLabel,
            slotTimeLabel,
            flowStatus,
            statusLabel,
            statusBadgeClass,
            createdAt: String(flow.create_at || flow.created_at || ''),
            steps,
            raw: flow,
        };
    });
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
        ticketNo: flowItem.ticketNo,
        queueNumber: flowItem.queueNumber,
        bookingId: flowItem.bookingId,
        stepId: flowItem.steps[0]?.stepId || 'step-1',
        fullName: patient.full_name,
        citizenId: patient.citizen_id,
        phone: patient.phone || '',
        specialty: flowItem.specialty,
        paymentLabel: 'Đã xác nhận',
        doctorLabel: flowItem.doctorLabel,
        slotTimeLabel: flowItem.slotTimeLabel,
        roomLabel: flowItem.roomLabel,
        waitTimeLabel: '—',
        insuranceId: patient.medical_coverage_id || patient.bhyt || '',
        qrPayload,
        isPaymentPending: false,
    };
}
