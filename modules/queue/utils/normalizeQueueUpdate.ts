import type { CallNextPatient, CallNextResponse } from '../types/queue.types';

function normalizeQueueNumber(value: string | number | undefined | null): string {
    if (value === undefined || value === null) return '';
    const str = String(value).trim();
    // Remove leading zeros for numerical comparison ("001" -> "1")
    return str.replace(/^0+/, '') || '0';
}

/**
 * Normalize call-next / socket broadcast payload.
 * Ensures current_patient never appears again in upcoming_patients.
 */
export function normalizeQueueUpdatePayload(
    raw: unknown,
): CallNextResponse | null {
    if (!raw || typeof raw !== 'object') return null;

    const envelope = raw as Record<string, unknown>;
    const body = (envelope.data && typeof envelope.data === 'object'
        ? envelope.data
        : envelope) as Partial<CallNextResponse> & Record<string, unknown>;

    const roomInfo = body.room_info;
    if (!roomInfo || typeof roomInfo !== 'object') return null;

    const current = (body.current_patient ?? null) as CallNextPatient | null;
    const upcomingRaw = Array.isArray(body.upcoming_patients)
        ? (body.upcoming_patients as CallNextPatient[])
        : [];

    const currentNumber = normalizeQueueNumber(current?.queue_number);
    const currentId = current?.queue_id ? String(current.queue_id) : '';
    const currentName = current?.patient_name ? current.patient_name.trim().toLowerCase() : '';

    const currentNumVal = parseInt(currentNumber, 10);

    const upcoming_patients = upcomingRaw
        .filter((p) => {
            if (!p) return false;
            const num = normalizeQueueNumber(p.queue_number);
            const numVal = parseInt(num, 10);
            const name = p.patient_name ? p.patient_name.trim().toLowerCase() : '';
            const status = String(p.status ?? '').toUpperCase();

            // 1. Filter out by matching queue_id if present
            if (currentId && p.queue_id && String(p.queue_id) === currentId) return false;
            // 2. Filter out by matching exact patient_name
            if (currentName && name && currentName === name) return false;
            // 3. Filter out completed or in-progress status
            if (
                status === 'COMPLETED' ||
                status === 'DONE' ||
                status === 'IN_PROGRESS' ||
                status === 'CALLING' ||
                status === 'PROCESSING'
            ) {
                return false;
            }
            // 4. Filter out any patient whose queue number is <= current patient's queue number (already examined)
            if (!isNaN(currentNumVal) && currentNumVal > 0 && !isNaN(numVal) && numVal <= currentNumVal) {
                return false;
            }

            return true;
        })
        .slice(0, 5);

    return {
        room_info: {
            room_name: String(roomInfo.room_name ?? ''),
            specialty_name: String(roomInfo.specialty_name ?? ''),
            doctor_name: String(roomInfo.doctor_name ?? ''),
        },
        current_patient: current,
        upcoming_patients,
    };
}
