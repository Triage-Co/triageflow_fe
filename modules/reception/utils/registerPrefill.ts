import type { PatientSearchResult } from '@/modules/reception/types/reception.types';
import type { Gender } from '@/shared/types/auth.types';

const PREFILL_KEY = 'reception_register_prefill';
const DRAFT_KEY = 'reception_register_step1_draft';

export interface RegisterPrefill {
    citizen_id: string;
    full_name: string;
    phone?: string;
    email?: string;
    insurance_id?: string;
    account_id?: string;
    patient_id?: string;
}

/** Bản nháp bước 1 — giữ qua refresh trang. */
export interface RegisterStep1Draft {
    citizen_id: string;
    full_name: string;
    email: string;
    dob: string;
    gender: Gender;
    phone: string;
    address: string;
    insurance_id: string;
    existing_patient_id?: string | null;
    existing_account_id?: string | null;
    lookup_banner?: 'found' | 'new' | null;
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
    };
}

export function saveRegisterPrefill(data: RegisterPrefill): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(PREFILL_KEY, JSON.stringify(data));
}

export function consumeRegisterPrefill(): RegisterPrefill | null {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PREFILL_KEY);
    try {
        return JSON.parse(raw) as RegisterPrefill;
    } catch {
        return null;
    }
}

export function applyRegisterPrefillToForm(
    prev: {
        citizen_id: string;
        full_name: string;
        email: string;
        phone: string;
        insurance_id: string;
    },
    prefill: RegisterPrefill,
) {
    return {
        ...prev,
        citizen_id: prefill.citizen_id || prev.citizen_id,
        full_name: prefill.full_name || prev.full_name,
        phone: prefill.phone || prev.phone,
        email: prefill.email || prev.email,
        insurance_id: prefill.insurance_id || prev.insurance_id,
    };
}

export function saveRegisterStep1Draft(draft: RegisterStep1Draft): void {
    if (typeof window === 'undefined') return;
    const hasContent =
        draft.citizen_id.trim().length > 0 ||
        draft.full_name.trim().length > 0 ||
        draft.phone.trim().length > 0 ||
        draft.dob.length > 0;
    if (!hasContent) {
        localStorage.removeItem(DRAFT_KEY);
        return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadRegisterStep1Draft(): RegisterStep1Draft | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as RegisterStep1Draft;
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            citizen_id: String(parsed.citizen_id ?? ''),
            full_name: String(parsed.full_name ?? ''),
            email: String(parsed.email ?? ''),
            dob: String(parsed.dob ?? '').slice(0, 10),
            gender: parsed.gender === 'MALE' || parsed.gender === 'FEMALE' ? parsed.gender : 'FEMALE',
            phone: String(parsed.phone ?? ''),
            address: String(parsed.address ?? ''),
            insurance_id: String(parsed.insurance_id ?? ''),
            existing_patient_id: parsed.existing_patient_id ?? null,
            existing_account_id: parsed.existing_account_id ?? null,
            lookup_banner: parsed.lookup_banner ?? null,
        };
    } catch {
        return null;
    }
}

export function clearRegisterStep1Draft(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(DRAFT_KEY);
}

export function applyRegisterStep1DraftToForm<T extends RegisterStep1Draft>(
    prev: T,
    draft: RegisterStep1Draft,
): T {
    return {
        ...prev,
        citizen_id: draft.citizen_id || prev.citizen_id,
        full_name: draft.full_name || prev.full_name,
        email: draft.email || prev.email,
        dob: draft.dob || prev.dob,
        gender: draft.gender || prev.gender,
        phone: draft.phone || prev.phone,
        address: draft.address || prev.address,
        insurance_id: draft.insurance_id || prev.insurance_id,
    };
}
