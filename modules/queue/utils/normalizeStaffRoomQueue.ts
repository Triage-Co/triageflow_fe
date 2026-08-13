import type {
    CallNextResponse,
    MissingEntry,
    RoomQueueData,
    Serving,
    ServingServiceOrder,
    ServingServiceOrderDetail,
    WaitingEntry,
} from '../types/queue.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
    if (value == null) return fallback;
    return String(value);
}

function asNumber(value: unknown, fallback = 0): number {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return fallback;
}

function asBool(value: unknown): boolean {
    return value === true || value === 'true';
}

function normalizeDetail(raw: unknown): ServingServiceOrderDetail | null {
    const d = asRecord(raw);
    if (!d) return null;
    const id = asString(d.service_order_detail_id || d.id);
    if (!id) return null;
    return {
        service_order_detail_id: id,
        name: d.name != null ? asString(d.name) : null,
        service_id: asString(d.service_id),
        service_code: d.service_code != null ? asString(d.service_code) : null,
        service_name: d.service_name != null ? asString(d.service_name) : null,
        quantity: asNumber(d.quantity, 1),
        status: asString(d.status, 'PENDING'),
    };
}

function normalizeServiceOrder(raw: unknown): ServingServiceOrder | null {
    const o = asRecord(raw);
    if (!o) return null;
    const id = asString(o.service_order_id || o.id);
    if (!id) return null;
    const detailsRaw = Array.isArray(o.details) ? o.details : [];
    const details = detailsRaw
        .map(normalizeDetail)
        .filter((x): x is ServingServiceOrderDetail => x != null);
    return {
        service_order_id: id,
        name: asString(o.name, 'Service order'),
        status: asString(o.status, 'PENDING'),
        details,
    };
}

function normalizeServing(raw: unknown): Serving | null {
    const s = asRecord(raw);
    if (!s) return null;
    const queueId = asString(s.queue_id);
    if (!queueId) return null;

    const patientRaw = asRecord(s.patient);
    const stepRaw = asRecord(s.step);

    return {
        queue_id: queueId,
        queue_number: asString(s.queue_number),
        serving_started_at:
            s.serving_started_at != null ? asString(s.serving_started_at) : null,
        patient: patientRaw
            ? {
                  patient_id: asString(patientRaw.patient_id || patientRaw.id),
                  full_name: asString(patientRaw.full_name || patientRaw.patient_name),
                  dob: patientRaw.dob != null ? asString(patientRaw.dob) : null,
                  gender: asString(patientRaw.gender),
              }
            : null,
        step: stepRaw
            ? {
                  step_id: asString(stepRaw.step_id || stepRaw.id),
                  step_name: asString(stepRaw.step_name || stepRaw.name),
                  step_type: asString(stepRaw.step_type),
                  step_status: asString(stepRaw.step_status || stepRaw.status),
                  service_code:
                      stepRaw.service_code != null ? asString(stepRaw.service_code) : null,
              }
            : null,
        service_order: normalizeServiceOrder(s.service_order),
    };
}

function normalizeWaiting(raw: unknown, index: number): WaitingEntry | null {
    const w = asRecord(raw);
    if (!w) return null;
    const queueId = asString(w.queue_id);
    if (!queueId) return null;
    const reasons = Array.isArray(w.reasons)
        ? w.reasons.map((r) => asString(r)).filter(Boolean)
        : [];
    return {
        position: asNumber(w.position, index + 1),
        queue_id: queueId,
        queue_number: asString(w.queue_number),
        patient_name: asString(w.patient_name || w.full_name),
        queue_type: asString(w.queue_type, 'NEW'),
        effective_score: asNumber(w.effective_score),
        reasons,
        is_pinned: asBool(w.is_pinned),
        enqueued_at: w.enqueued_at != null ? asString(w.enqueued_at) : null,
        waited_minutes: asNumber(w.waited_minutes),
        eta_minutes: asNumber(w.eta_minutes),
        eta_time: w.eta_time != null ? asString(w.eta_time) : null,
        step_id: w.step_id != null ? asString(w.step_id) : undefined,
    };
}

function normalizeMissing(raw: unknown): MissingEntry | null {
    const m = asRecord(raw);
    if (!m) return null;
    const queueId = asString(m.queue_id);
    if (!queueId) return null;
    return {
        queue_id: queueId,
        queue_number: asString(m.queue_number),
        patient_name: asString(m.patient_name || m.full_name),
        missed_at: m.missed_at != null ? asString(m.missed_at) : null,
        step_id: m.step_id != null ? asString(m.step_id) : undefined,
    };
}

/**
 * Normalize staff room queue payload (GET /queue/room or WS body with serving/waiting).
 * Preserves service_order.details — do not use TV normalize for staff UI.
 */
export function normalizeStaffRoomQueue(raw: unknown): RoomQueueData | null {
    if (!raw || typeof raw !== 'object') return null;
    const envelope = raw as Record<string, unknown>;
    const body = (envelope.data && typeof envelope.data === 'object'
        ? envelope.data
        : envelope) as Record<string, unknown>;

    // Staff payloads must have waiting array and/or serving key (even if null)
    const hasStaffShape =
        'waiting' in body ||
        'serving' in body ||
        'missing' in body ||
        'room_id' in body;
    if (!hasStaffShape) return null;

    const waitingRaw = Array.isArray(body.waiting) ? body.waiting : [];
    const missingRaw = Array.isArray(body.missing) ? body.missing : [];

    return {
        room_id: asString(body.room_id),
        expected_service_minutes: asNumber(body.expected_service_minutes),
        serving: normalizeServing(body.serving),
        waiting: waitingRaw
            .map((item, i) => normalizeWaiting(item, i))
            .filter((x): x is WaitingEntry => x != null),
        missing: missingRaw
            .map(normalizeMissing)
            .filter((x): x is MissingEntry => x != null),
    };
}

/**
 * After call-next, BE may return TV fields + serving. Prefer staff shape when present.
 */
export function extractStaffQueueFromCallNext(
    raw: unknown,
    fallbackRoomId?: string,
): RoomQueueData | null {
    const staff = normalizeStaffRoomQueue(raw);
    if (staff) {
        if (!staff.room_id && fallbackRoomId) {
            return { ...staff, room_id: fallbackRoomId };
        }
        return staff;
    }

    // TV-only response after call-next: keep previous waiting via null (caller refreshes)
    const tv = raw as Partial<CallNextResponse>;
    if (tv?.serving) {
        return {
            room_id: fallbackRoomId || asString(tv.room_id),
            expected_service_minutes: asNumber(tv.expected_service_minutes),
            serving: normalizeServing(tv.serving),
            waiting: Array.isArray(tv.waiting)
                ? tv.waiting
                      .map((item, i) => normalizeWaiting(item, i))
                      .filter((x): x is WaitingEntry => x != null)
                : [],
            missing: Array.isArray(tv.missing)
                ? tv.missing
                      .map(normalizeMissing)
                      .filter((x): x is MissingEntry => x != null)
                : [],
        };
    }
    return null;
}
