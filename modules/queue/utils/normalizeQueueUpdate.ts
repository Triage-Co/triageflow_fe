import type { CallNextPatient, CallNextResponse } from '../types/queue.types';

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

    const currentId = current?.queue_id ? String(current.queue_id) : '';
    const currentNumber = current?.queue_number ? String(current.queue_number).trim() : '';
    const currentName = current?.patient_name ? current.patient_name.trim().toLowerCase() : '';

    const upcoming_patients = upcomingRaw
        .filter((p) => {
            if (!p) return false;
            const pId = p.queue_id ? String(p.queue_id) : '';
            const pNum = p.queue_number ? String(p.queue_number).trim() : '';
            const pName = p.patient_name ? p.patient_name.trim().toLowerCase() : '';
            const status = String(p.status ?? '').toUpperCase();

            // 1. Filter out by matching queue_id if present
            if (currentId && pId && currentId === pId) return false;
            // 2. Filter out by matching exact queue_number
            if (currentNumber && pNum && currentNumber === pNum) return false;
            // 3. Filter out by matching exact patient_name
            if (currentName && pName && currentName === pName) return false;
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
                return false;
            }

            return true;
        })
        .slice(0, 5)
        .map((p) => ({
            ...p,
            eta_minutes: typeof p.eta_minutes === 'number' ? p.eta_minutes : undefined,
            queue_type: p.queue_type ? String(p.queue_type) : undefined,
            priority_reasons: Array.isArray(p.priority_reasons) ? p.priority_reasons : undefined,
        }));

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

    return {
        room_info: {
            room_name: String(roomInfo.room_name ?? ''),
            specialty_name: String(roomInfo.specialty_name ?? ''),
            doctor_name: String(roomInfo.doctor_name ?? ''),
        },
        current_patient,
        upcoming_patients,
    };
}


