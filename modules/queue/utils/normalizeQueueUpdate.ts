import type { CallNextPatient, CallNextResponse, MissingEntry } from '../types/queue.types';
import type { RedirectedPatient } from '../types/rebalance.types';
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

function normalizeRedirectedPatients(raw: unknown): RedirectedPatient[] {
    if (!Array.isArray(raw)) return [];
    const out: RedirectedPatient[] = [];
    const seen = new Set<string>();
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const rec = item as Record<string, unknown>;
        const queueNumber = rec.queue_number != null ? String(rec.queue_number).trim() : '';
        if (!queueNumber) continue;
        const key = queueNumber.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
            queue_number: rec.queue_number as string | number,
            patient_name: rec.patient_name != null ? String(rec.patient_name) : '',
            to_room_name: rec.to_room_name != null ? String(rec.to_room_name) : '',
            expires_at: rec.expires_at != null ? String(rec.expires_at) : undefined,
        });
    }
    return out;
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

    const redirected_patients = normalizeRedirectedPatients(body.redirected_patients);
    const redirectedNumbers = new Set(
        redirected_patients.map((p) => String(p.queue_number).trim()),
    );
    const upcomingWithoutRedirected =
        redirectedNumbers.size === 0
            ? upcoming_patients
            : upcoming_patients.filter(
                  (p) => !redirectedNumbers.has(String(p.queue_number).trim()),
              );

    const result: CallNextResponse = {
        room_info: {
            room_name: String(roomInfo.room_name ?? ''),
            specialty_name: String(roomInfo.specialty_name ?? ''),
            doctor_name: String(roomInfo.doctor_name ?? ''),
        },
        current_patient,
        upcoming_patients: upcomingWithoutRedirected,
        missing,
        redirected_patients,
    };

    console.log(`${LOG} result`, {
        current_number: current_patient?.queue_number ?? null,
        upcoming_numbers: upcomingWithoutRedirected.map((p) => p.queue_number),
        redirected_numbers: redirected_patients.map((p) => p.queue_number),
        missing_numbers: missing.map((m) => m.queue_number),
    });

    return result;
}


