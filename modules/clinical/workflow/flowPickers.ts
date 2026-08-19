import type { ServiceOption } from './types';

export function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function firstServiceOrderDetailId(value: unknown): string {
    const rec = asRecord(value);
    if (!rec) return '';
    const id = rec.service_order_detail_id || rec.serviceOrderDetailId || rec.id;
    return typeof id === 'string' && id.trim() ? id.trim() : '';
}

export function pickDetailsList(obj: Record<string, unknown> | null | undefined): unknown[] {
    if (!obj) return [];
    if (Array.isArray(obj.service_order_details)) return obj.service_order_details;
    if (Array.isArray(obj.serviceOrderDetails)) return obj.serviceOrderDetails;
    if (Array.isArray(obj.details)) return obj.details;
    return [];
}

export function pickLinkedServiceOrderDetailId(
    step: Record<string, unknown> | null | undefined
): string {
    if (!step) return '';
    const direct = firstServiceOrderDetailId(step);
    if (direct) return direct;

    const nestedDetail =
        asRecord(step.service_order_detail) || asRecord(step.serviceOrderDetail);
    const nestedDirect = firstServiceOrderDetailId(nestedDetail);
    if (nestedDirect) return nestedDirect;

    const nestedOrder = asRecord(step.service_order) || asRecord(step.serviceOrder);
    for (const item of [...pickDetailsList(step), ...pickDetailsList(nestedOrder)]) {
        const id = firstServiceOrderDetailId(item);
        if (id) return id;
    }
    return '';
}

export function pickLiveServiceCode(rec: Record<string, unknown>): string {
    if (typeof rec.service_code === 'string' && rec.service_code.trim()) {
        return rec.service_code.trim().toLowerCase();
    }
    const nested = asRecord(rec.service);
    if (nested && typeof nested.service_code === 'string' && nested.service_code.trim()) {
        return nested.service_code.trim().toLowerCase();
    }
    return '';
}

export function extractPersonName(person: Record<string, unknown> | null | undefined): string {
    if (!person) return '';
    const account = asRecord(person.account);
    const profile = asRecord(person.profile) || asRecord(account?.profile);
    const candidates = [
        person.full_name,
        person.fullName,
        person.name,
        person.doctor_name,
        person.staff_name,
        person.user_name,
        account?.full_name,
        account?.fullName,
        account?.name,
        account?.user_name,
        profile?.full_name,
        profile?.fullName,
        profile?.name,
    ];
    for (const value of candidates) {
        if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
}

export function isUnassignedStaffLabel(label: string): boolean {
    const n = label.trim().toLowerCase();
    return (
        !n ||
        n.includes('chưa phân công') ||
        n.includes('chua phan cong') ||
        n.includes('chưa có bác sĩ') ||
        n.includes('chua co bac si')
    );
}

export function extractServiceOptions(raw: unknown): ServiceOption[] {
    const list: unknown[] = [];

    if (Array.isArray(raw)) {
        list.push(...raw);
    } else {
        const record = asRecord(raw);
        const firstData = record?.data;
        const firstDataRecord = asRecord(firstData);

        if (Array.isArray(firstData)) list.push(...firstData);
        if (Array.isArray(firstDataRecord?.data)) list.push(...(firstDataRecord.data as unknown[]));
        if (Array.isArray(record?.items)) list.push(...(record.items as unknown[]));
    }

    const dedup = new Map<string, ServiceOption>();
    list.forEach((item) => {
        const rec = asRecord(item);
        if (!rec) return;
        const serviceCode = typeof rec.service_code === 'string' ? rec.service_code.trim() : '';
        const serviceName = typeof rec.service_name === 'string' ? rec.service_name.trim() : '';
        const serviceId = typeof rec.service_id === 'string' ? rec.service_id : serviceCode;
        if (!serviceCode) return;

        dedup.set(serviceCode, {
            service_id: serviceId,
            service_code: serviceCode,
            service_name: serviceName || serviceCode,
            is_active: typeof rec.is_active === 'boolean' ? rec.is_active : true,
        });
    });

    return Array.from(dedup.values());
}

export function getRoomTypeValue(room: unknown): string {
    const rec = asRecord(room);
    const roomType = rec?.room_type;
    if (typeof roomType === 'string') return roomType;
    const altRoomType = rec?.roomType;
    if (typeof altRoomType === 'string') return altRoomType;
    return '';
}

export function normalizeRoomKey(value?: string): string {
    return (value || '').toLowerCase().trim();
}

export function pickStepOrderNumber(rec: Record<string, unknown>): number | null {
    for (const key of ['docNo', 'doc_no', 'order', 'sequence', 'seq', 'step_order']) {
        const val = rec[key];
        if (typeof val === 'number' && Number.isFinite(val)) return val;
        if (typeof val === 'string' && val.trim()) {
            const n = Number(val);
            if (Number.isFinite(n)) return n;
        }
    }

    for (const key of ['template_step_id', 'step_code', 'code']) {
        const raw = rec[key];
        if (typeof raw !== 'string') continue;
        const match = raw.match(/step[_\-]?(\d+)/i);
        if (match) {
            const n = Number(match[1]);
            if (Number.isFinite(n)) return n;
        }
    }

    return null;
}

export function pickLiveRequiredStepId(step: Record<string, unknown> | null | undefined): string {
    if (!step) return '';

    if (typeof step.required_step_id === 'string' && step.required_step_id.trim()) {
        return step.required_step_id.trim();
    }

    const deps = step.depends_on;
    if (Array.isArray(deps) && deps.length > 0) {
        const first = deps[0];
        if (typeof first === 'string' && first.trim()) return first.trim();
        const rec = asRecord(first);
        if (rec) {
            const nested =
                (typeof rec.step_id === 'string' && rec.step_id.trim()) ||
                (typeof rec.required_step_id === 'string' && rec.required_step_id.trim()) ||
                '';
            if (nested) return nested;
        }
    }

    const requiredSteps = step.required_steps;
    if (Array.isArray(requiredSteps) && requiredSteps.length > 0) {
        const first = requiredSteps[0];
        if (typeof first === 'string' && first.trim()) return first.trim();
        const rec = asRecord(first);
        if (rec && typeof rec.step_id === 'string' && rec.step_id.trim()) {
            return rec.step_id.trim();
        }
    }

    return '';
}
