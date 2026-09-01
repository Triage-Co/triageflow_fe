import type { CallNextPatient, CallNextResponse, MissingEntry } from '../types/queue.types';
import { normalizeMissingList } from './normalizeStaffRoomQueue';

const MISSED_UPCOMING_STATUSES = new Set(['MISSING', 'SKIPPED', 'ABSENT']);

function mergeMissingEntries(entries: MissingEntry[]): MissingEntry[] {
    const byKey = new Map<string, MissingEntry>();
    for (const entry of entries) {
        const key = entry.queue_id || entry.queue_number;
        if (!key) continue;
        byKey.set(key, entry);
    }
    return Array.from(byKey.values());
}

function missingFromUpcomingPatient(p: CallNextPatient): MissingEntry | null {
    const queueId = p.queue_id ? String(p.queue_id) : '';
    const queueNumber = p.queue_number != null ? String(p.queue_number).trim() : '';
    if (!queueId && !queueNumber) return null;
    return {
        queue_id: queueId || queueNumber,
        queue_number: queueNumber,
        patient_name: String(p.patient_name ?? ''),
        missed_at: null,
        step_id: undefined,
    };
}

const LOG = '[TV Display][Normalize]';

/**
 * Normalize call-next / socket broadcast payload.
 * Ensures current_patient never appears again in upcoming_patients.
 */
export function normalizeQueueUpdatePayload(
    raw: unknown,
): CallNextResponse | null {
    if (!raw || typeof raw !== 'object') {
        console.warn(`${LOG} reject: raw is not an object`, { raw });
        return null;
    }

    const envelope = raw as Record<string, unknown>;
    const usedEnvelopeData = !!(envelope.data && typeof envelope.data === 'object');
    const body = (usedEnvelopeData
        ? envelope.data
        : envelope) as Partial<CallNextResponse> & Record<string, unknown>;

    console.log(`${LOG} unwrap`, {
        usedEnvelopeData,
        bodyKeys: Object.keys(body),
        has_room_info: !!body.room_info,
        has_current: body.current_patient != null,
        upcoming_raw_len: Array.isArray(body.upcoming_patients)
            ? body.upcoming_patients.length
            : `(not array: ${typeof body.upcoming_patients})`,
        missing_raw_len: Array.isArray(body.missing) ? body.missing.length : 0,
    });

    const roomInfo = body.room_info;
    if (!roomInfo || typeof roomInfo !== 'object') {
        console.warn(`${LOG} reject: missing room_info`, { body });
        return null;
    }

    const current = (body.current_patient ?? null) as CallNextPatient | null;
    const upcomingRaw = Array.isArray(body.upcoming_patients)
        ? (body.upcoming_patients as CallNextPatient[])
        : [];

    const currentId = current?.queue_id ? String(current.queue_id) : '';
    const currentNumber = current?.queue_number ? String(current.queue_number).trim() : '';
    const currentName = current?.patient_name ? current.patient_name.trim().toLowerCase() : '';

    const dropReasons: { queue_number?: string; reason: string }[] = [];
    const missedFromUpcoming: MissingEntry[] = [];

    const upcoming_patients = upcomingRaw
        .filter((p) => {
            if (!p) {
                dropReasons.push({ reason: 'null entry' });
                return false;
            }
            const pId = p.queue_id ? String(p.queue_id) : '';
            const pNum = p.queue_number ? String(p.queue_number).trim() : '';
            const pName = p.patient_name ? p.patient_name.trim().toLowerCase() : '';
            const status = String(p.status ?? '').toUpperCase();

            if (MISSED_UPCOMING_STATUSES.has(status)) {
                const missed = missingFromUpcomingPatient(p);
                if (missed) missedFromUpcoming.push(missed);
                dropReasons.push({ queue_number: pNum, reason: `status=${status} (missed)` });
                return false;
            }

            // 1. Filter out by matching queue_id if present
            if (currentId && pId && currentId === pId) {
                dropReasons.push({ queue_number: pNum, reason: 'same queue_id as current' });
                return false;
            }
            // 2. Filter out by matching exact queue_number
            if (currentNumber && pNum && currentNumber === pNum) {
                dropReasons.push({ queue_number: pNum, reason: 'same queue_number as current' });
                return false;
            }
            // 3. Filter out by matching exact patient_name
            if (currentName && pName && currentName === pName) {
                dropReasons.push({ queue_number: pNum, reason: 'same patient_name as current' });
                return false;
            }
            // 4. Filter out completed or in-progress status
            if (
                status === 'COMPLETED' ||
                status === 'DONE' ||
                status === 'IN_PROGRESS' ||
                status === 'CALLING' ||
                status === 'PROCESSING' ||
                status === 'FINISHED' ||
                status === 'CANCELLED' ||
                status === 'DECLINED'
            ) {
                dropReasons.push({ queue_number: pNum, reason: `status=${status}` });
                return false;
            }

            return true;
        })
        .slice(0, 7)
        .map((p) => ({
            ...p,
            eta_minutes: typeof p.eta_minutes === 'number' ? p.eta_minutes : undefined,
            queue_type: p.queue_type ? String(p.queue_type) : undefined,
            priority_reasons: Array.isArray(p.priority_reasons) ? p.priority_reasons : undefined,
        }));

    if (dropReasons.length > 0) {
        console.warn(`${LOG} filtered upcoming`, {
            raw: upcomingRaw.length,
            kept: upcoming_patients.length,
            dropped: dropReasons,
        });
    }

    const current_patient: CallNextPatient | null = current
        ? {
              ...current,
              queue_number: current.queue_number,
              patient_name: current.patient_name,
              queue_id: current.queue_id ? String(current.queue_id) : undefined,
              status: current.status
                  ? (String(current.status).toUpperCase() as CallNextPatient['status'])
                  : undefined,
          }
        : null;

    const missing = mergeMissingEntries([
        ...normalizeMissingList(body.missing),
        ...missedFromUpcoming,
    ]);

    const result: CallNextResponse = {
        room_info: {
            room_name: String(roomInfo.room_name ?? ''),
            specialty_name: String(roomInfo.specialty_name ?? ''),
            doctor_name: String(roomInfo.doctor_name ?? ''),
        },
        current_patient,
        upcoming_patients,
        missing,
    };

    console.log(`${LOG} result`, {
        current_number: current_patient?.queue_number ?? null,
        upcoming_numbers: upcoming_patients.map((p) => p.queue_number),
        missing_numbers: missing.map((m) => m.queue_number),
    });

    return result;
}


