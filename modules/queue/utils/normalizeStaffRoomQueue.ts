import type {
    FinishedEntry,
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
    const queueNumber = asString(m.queue_number);
    if (!queueId && !queueNumber) return null;
    return {
        queue_id: queueId || queueNumber,
        queue_number: queueNumber,
        patient_name: asString(m.patient_name || m.full_name),
        missed_at: m.missed_at != null ? asString(m.missed_at) : null,
        step_id: m.step_id != null ? asString(m.step_id) : undefined,
    };
}

/** Parse `missing` array from staff / socket payloads. */
export function normalizeMissingList(raw: unknown): MissingEntry[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map(normalizeMissing)
        .filter((x): x is MissingEntry => x != null);
}

function normalizeFinished(raw: unknown): FinishedEntry | null {
    const f = asRecord(raw);
    if (!f) return null;
    const queueId = asString(f.queue_id);
    if (!queueId) return null;
    const patientRaw = asRecord(f.patient);
    const stepRaw = asRecord(f.step);

    const patientName = patientRaw
        ? asString(patientRaw.full_name || patientRaw.patient_name)
        : asString(f.patient_name || f.full_name);

    return {
        queue_id: queueId,
        queue_number: asString(f.queue_number),
        queue_type: asString(f.queue_type, 'APPOINTMENT'),
        status: asString(f.status, 'FINISHED'),
        serving_started_at: f.serving_started_at != null ? asString(f.serving_started_at) : null,
        finished_at: f.finished_at != null ? asString(f.finished_at) : null,
        duration_minutes: asNumber(f.duration_minutes),
        refusal_reason: f.refusal_reason != null ? asString(f.refusal_reason) : null,
        patient_name: patientName,
        patient: patientRaw
            ? {
                  patient_id: asString(patientRaw.patient_id || patientRaw.id),
                  full_name: patientName,
                  dob: patientRaw.dob != null ? asString(patientRaw.dob) : null,
                  gender: asString(patientRaw.gender),
                  phone: patientRaw.phone != null ? asString(patientRaw.phone) : undefined,
                  citizen_id: patientRaw.citizen_id != null ? asString(patientRaw.citizen_id) : undefined,
              }
            : null,
        step: stepRaw
            ? {
                  step_id: asString(stepRaw.step_id || stepRaw.id),
                  step_name: asString(stepRaw.step_name || stepRaw.name),
                  step_type: asString(stepRaw.step_type),
                  step_status: asString(stepRaw.step_status || stepRaw.status),
                  service_code: stepRaw.service_code != null ? asString(stepRaw.service_code) : null,
              }
            : null,
        service_order: normalizeServiceOrder(f.service_order),
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

    // Staff payloads must expose waiting/serving/missing/finished.
    // Do NOT treat `room_id` alone as staff — TV broadcasts also carry room_id and
    // would otherwise normalize to empty waiting[] and wipe a good REST load.
    const hasStaffShape =
        'waiting' in body || 'serving' in body || 'missing' in body || 'finished' in body;
    if (!hasStaffShape) return null;

    const waitingRaw = Array.isArray(body.waiting) ? body.waiting : [];
    const missingRaw = Array.isArray(body.missing) ? body.missing : [];
    const finishedRaw = Array.isArray(body.finished) ? body.finished : [];

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
        finished: finishedRaw
            .map(normalizeFinished)
            .filter((x): x is FinishedEntry => x != null),
    };
}

/**
 * Map TV `current_patient` → staff `serving` when call-next omits `serving`.
 */
function servingFromCallNextPatient(raw: unknown): Serving | null {
    const p = asRecord(raw);
    if (!p) return null;
    const queueId = asString(p.queue_id);
    if (!queueId) return null;
    return {
        queue_id: queueId,
        queue_number: asString(p.queue_number),
        serving_started_at: null,
        patient: {
            patient_id: asString(p.patient_id),
            full_name: asString(p.patient_name || p.full_name),
            dob: p.dob != null ? asString(p.dob) : null,
            gender: asString(p.gender),
        },
        step: null,
        service_order: null,
    };
}

function unwrapQueueBody(raw: unknown): Record<string, unknown> | null {
    const envelope = asRecord(raw);
    if (!envelope) return null;
    const nested = asRecord(envelope.data);
    return nested || envelope;
}

/**
 * After call-next, BE may return TV fields + serving. Prefer staff shape when present.
 * If `waiting` is present but `serving` is omitted, fill serving from `current_patient`
 * so the desk does not clear the room panel while emptying the wait list.
 */
export function extractStaffQueueFromCallNext(
    raw: unknown,
    fallbackRoomId?: string,
): RoomQueueData | null {
    const body = unwrapQueueBody(raw);
    const servingFromTv = servingFromCallNextPatient(body?.current_patient);

    const staff = normalizeStaffRoomQueue(raw);
    if (staff) {
        const withRoom =
            !staff.room_id && fallbackRoomId
                ? { ...staff, room_id: fallbackRoomId }
                : staff;
        if (!withRoom.serving && servingFromTv) {
            return { ...withRoom, serving: servingFromTv };
        }
        return withRoom;
    }

    const finishedRaw = Array.isArray(body?.finished) ? body!.finished : [];
    const normalizedFinished = finishedRaw
        .map(normalizeFinished)
        .filter((x): x is FinishedEntry => x != null);

    if (servingFromTv) {
        const waitingRaw = Array.isArray(body?.waiting)
            ? body!.waiting
            : Array.isArray(body?.upcoming_patients)
              ? body!.upcoming_patients
              : [];
        const missingRaw = Array.isArray(body?.missing) ? body!.missing : [];
        return {
            room_id: fallbackRoomId || asString(body?.room_id),
            expected_service_minutes: asNumber(body?.expected_service_minutes),
            serving: servingFromTv,
            waiting: waitingRaw
                .map((item, i) => normalizeWaiting(item, i))
                .filter((x): x is WaitingEntry => x != null),
            missing: missingRaw
                .map(normalizeMissing)
                .filter((x): x is MissingEntry => x != null),
            finished: normalizedFinished,
        };
    }

    const nestedServing = normalizeServing(body?.serving);
    if (nestedServing) {
        return {
            room_id: fallbackRoomId || asString(body?.room_id),
            expected_service_minutes: asNumber(body?.expected_service_minutes),
            serving: nestedServing,
            waiting: Array.isArray(body?.waiting)
                ? body!.waiting
                      .map((item, i) => normalizeWaiting(item, i))
                      .filter((x): x is WaitingEntry => x != null)
                : [],
            missing: Array.isArray(body?.missing)
                ? body!.missing
                      .map(normalizeMissing)
                      .filter((x): x is MissingEntry => x != null)
                : [],
            finished: normalizedFinished,
        };
    }

    return null;
}
