import type { PatientSearchResult } from '@/modules/reception/types/reception.types';

const PREFILL_KEY = 'reception_register_prefill';

export interface RegisterPrefill {
    citizen_id: string;
    full_name: string;
    phone?: string;
    email?: string;
    insurance_id?: string;
    account_id?: string;
    patient_id?: string;
    dob?: string;
    gender?: string;
}

export function buildRegisterPrefill(result: PatientSearchResult): RegisterPrefill {
    const bhyt = result.bhyt?.trim();
    return {
        citizen_id: result.citizenId,
        full_name: result.name,
        phone: result.phone ?? '',
        email: result.email,
        insurance_id: bhyt && bhyt !== 'N/A' ? bhyt : '',
        account_id: result.accountId,
        patient_id: result.patient_id ?? undefined,
        dob: result.dob ? result.dob.slice(0, 10) : undefined,
        gender: result.gender,
    };
}

export function saveRegisterPrefill(data: RegisterPrefill): void {
    if (typeof window === 'undefined') return;
    try {
        const payload = JSON.stringify(data);
        sessionStorage.setItem(PREFILL_KEY, payload);
        localStorage.setItem(PREFILL_KEY, payload);
    } catch {
        // ignore
    }
}

export function consumeRegisterPrefill(): RegisterPrefill | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(PREFILL_KEY) || localStorage.getItem(PREFILL_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(PREFILL_KEY);
        localStorage.removeItem(PREFILL_KEY);
        return JSON.parse(raw) as RegisterPrefill;
    } catch {
        return null;
    }
}

export function applyRegisterPrefillToForm<T extends Record<string, any>>(
    prev: T,
    prefill: RegisterPrefill,
): T {
    return {
        ...prev,
        citizen_id: prefill.citizen_id || prev.citizen_id,
        full_name: prefill.full_name || prev.full_name,
        phone: prefill.phone || prev.phone,
        email: prefill.email || prev.email,
        insurance_id: prefill.insurance_id || prev.insurance_id,
        dob: prefill.dob || prev.dob,
        gender: (prefill.gender as any) || prev.gender,
    };
}
