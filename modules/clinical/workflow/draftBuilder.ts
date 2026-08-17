import type { ProcessTemplate, TemplateStep } from '@/modules/admin/types/process.types';
import {
    normalizeRoomType,
    normalizeStepType,
} from '@/modules/admin/types/process.types';
import type { DraftStep, ServiceOption } from './types';
import { getRoomTypeValue } from './flowPickers';

export function getTemplateName(tpl?: ProcessTemplate | Record<string, unknown> | null): string {
    if (!tpl) return '';
    const rec = tpl as Record<string, unknown>;
    return (
        (tpl as ProcessTemplate).name ||
        (rec.template_name as string) ||
        (rec.flow_name as string) ||
        (rec.title as string) ||
        (rec.name as string) ||
        ''
    );
}

const SERVICE_CONTEXT_KEYWORD_MAP: Record<string, string[]> = {
    RECEPTION: ['KHAM', 'DANG_KY', 'TIEP_DON'],
    TRIAGE_AREA: ['KHAM_CAP_CUU', 'TRIAGE'],
    CLINICAL_ROOM: ['KHAM_CHUYEN_KHOA', 'KHAM'],
    PROCEDURE_ROOM: ['NOI_SOI', 'THU_THUAT', 'DIEU_TRI'],
    LABORATORY: ['XET_NGHIEM'],
    IMAGING_ROOM: ['X_QUANG', 'SIEU_AM', 'CT', 'MRI'],
    FUNCTIONAL_EXPLORATION: ['THAM_DO', 'FUNCTIONAL'],
    PHARMACY: ['THUOC', 'PHARMACY'],
    CASHIER: ['THANH_TOAN', 'VIEN_PHI'],
};

/**
 * Filters/reorders services so the ones matching the room/specialty context
 * (by room_type keyword map + tokens from room/specialty name) come first.
 * Falls back to the full candidate list when nothing matches, so the picker
 * never ends up empty for specialties without keyword coverage.
 */
export function filterServiceOptionsByContext(
    input: {
        roomType?: string;
        roomName?: string;
        specialtyName?: string;
    },
    services: ServiceOption[]
): ServiceOption[] {
    const source = services.filter((service) => service.is_active !== false);
    const candidates = source.length > 0 ? source : services;
    if (!candidates.length) return candidates;

    const roomType = (input.roomType || '').toUpperCase();
    const roomName = (input.roomName || '').toUpperCase();
    const specialtyName = (input.specialtyName || '').toUpperCase();

    const explicitKeywords = SERVICE_CONTEXT_KEYWORD_MAP[roomType] || [];
    const inferredKeywords = [roomName, specialtyName]
        .filter(Boolean)
        .flatMap((value) => value.split(/\s+/g))
        .filter((token) => token.length > 2);
    const keywords = [...explicitKeywords, ...inferredKeywords];
    if (!keywords.length) return candidates;

    const matches = candidates.filter((service) =>
        keywords.some(
            (keyword) =>
                service.service_code.toUpperCase().includes(keyword) ||
                service.service_name.toUpperCase().includes(keyword)
        )
    );

    return matches.length > 0 ? matches : candidates;
}

export function pickServiceCodeByContext(
    input: {
        roomType?: string;
        roomName?: string;
        specialtyName?: string;
    },
    services: ServiceOption[]
): string {
    const candidates = filterServiceOptionsByContext(input, services);
    return candidates[0]?.service_code || '';
}

export function buildDraftFromTemplateStep(
    step: TemplateStep,
    idx: number,
    parentTemplateId: string,
    rooms: Array<{
        room_id: string;
        room_name: string;
        specialty_id?: string;
        specialty?: { specialty_name?: string };
    }>,
    serviceOptions: ServiceOption[],
    pickDoctorOnDutyForRoom: (roomId: string) => string,
    getStaffOnDutyForRoom: (roomId: string) => string
): DraftStep {
    const templateStepId = step.template_step_id || `step_${idx + 1}`;
    const roomType = normalizeRoomType(step.room_type);
    const defaultRoom =
        rooms.find((r) => r.room_name.toLowerCase().includes(roomType.toLowerCase())) || rooms[0];
    const rId = defaultRoom?.room_id || '';
    const defaultServiceCode =
        step.service_code ||
        pickServiceCodeByContext(
            {
                roomType: getRoomTypeValue(defaultRoom) || roomType,
                roomName: defaultRoom?.room_name,
                specialtyName: defaultRoom?.specialty?.specialty_name,
            },
            serviceOptions
        ) ||
        'NONE';

    return {
        tempId: `draft-${idx}-${Date.now()}`,
        step_name: step.step_name || roomType,
        specialty_id: defaultRoom?.specialty_id || '',
        room_type: roomType,
        room_id: rId,
        staff_id: rId ? pickDoctorOnDutyForRoom(rId) : '',
        service_code: defaultServiceCode,
        doctor_name: rId ? getStaffOnDutyForRoom(rId) || 'Chưa có bác sĩ' : 'Chưa có bác sĩ',
        template_id: step.template_id || parentTemplateId || templateStepId,
        template_step_id: templateStepId,
        step_type: normalizeStepType(step.step_type, roomType),
        requires_payment: Boolean(step.requires_payment),
        depends_on: Array.isArray(step.depends_on)
            ? step.depends_on
            : idx > 0
                ? [`step_${idx}`]
                : [],
    };
}

export function expandDraftsWithPaymentSteps(
    drafts: DraftStep[],
    rooms: Array<{ room_id: string; room_name: string }>,
    pickDoctorOnDutyForRoom: (roomId: string) => string,
    getStaffOnDutyForRoom: (roomId: string) => string
): DraftStep[] {
    if (
        drafts.some(
            (d) =>
                d.tempId?.startsWith('draft-pay-') ||
                (normalizeStepType(d.step_type, d.room_type) === 'PAYMENT' &&
                    (d.step_name || '').startsWith('Thanh toán:'))
        )
    ) {
        return drafts;
    }

    const result: DraftStep[] = [];
    let seq = 0;

    const findCashierRoomId = (): string => {
        const cashier = rooms.find((r) => {
            const type = normalizeRoomType(getRoomTypeValue(r));
            const name = (r.room_name || '').toLowerCase();
            return type === 'CASHIER' || name.includes('thu ngân') || name.includes('thanh toán');
        });
        return cashier?.room_id || '';
    };

    for (const draft of drafts) {
        const stepType = normalizeStepType(draft.step_type, draft.room_type);
        const roomType = normalizeRoomType(draft.room_type);

        if (stepType === 'PAYMENT' || roomType === 'CASHIER') {
            continue;
        }

        const prevId = seq > 0 ? `step_${seq}` : undefined;

        // Pay-first: thanh toán xong mới được làm dịch vụ / khám.
        if (draft.requires_payment) {
            seq += 1;
            const payId = `step_${seq}`;
            const payRoomId = findCashierRoomId() || draft.room_id || '';
            result.push({
                tempId: `draft-pay-${Date.now()}-${seq}`,
                step_name: `Thanh toán: ${draft.step_name || 'dịch vụ'}`,
                specialty_id: '',
                room_id: payRoomId,
                staff_id: payRoomId ? pickDoctorOnDutyForRoom(payRoomId) : '',
                service_code: draft.service_code?.trim() || 'NONE',
                room_type: 'CASHIER',
                doctor_name: payRoomId
                    ? getStaffOnDutyForRoom(payRoomId) || 'Thu ngân'
                    : 'Thu ngân',
                template_id: payId,
                template_step_id: payId,
                step_type: 'PAYMENT',
                requires_payment: false,
                depends_on: prevId ? [prevId] : [],
            });

            seq += 1;
            const serviceId = `step_${seq}`;
            result.push({
                ...draft,
                template_step_id: serviceId,
                template_id: draft.template_id || serviceId,
                step_type: stepType,
                room_type: roomType,
                depends_on: [payId],
            });
            continue;
        }

        seq += 1;
        const stepId = `step_${seq}`;
        result.push({
            ...draft,
            template_step_id: stepId,
            template_id: draft.template_id || stepId,
            step_type: stepType,
            room_type: roomType,
            depends_on: prevId ? [prevId] : [],
        });
    }

    return result;
}
