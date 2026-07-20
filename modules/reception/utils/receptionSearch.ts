import type { BackendQueuePatient } from '@/modules/clinical/services/clinicalService';
import type {
    PatientSearchResult,
    ReceptionAccount,
    ReceptionPriority,
    ReceptionStatus,
} from '@/modules/reception/types/reception.types';
import { mapBackendToQueuePatient } from '@/modules/reception/utils/receptionMapper';

function normalizeQuery(q: string): string {
    return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function stripDiacritics(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

function normalizePhone(phone?: string | null): string {
    return (phone ?? '').replace(/\D/g, '');
}

function normalizeCitizenId(value?: string | null): string {
    return (value ?? '').replace(/\D/g, '');
}

function matchesQuery(result: PatientSearchResult, rawQuery: string): boolean {
    const q = normalizeQuery(rawQuery);
    if (!q) return false;

    const qDigits = q.replace(/\D/g, '');
    const citizenDigits = normalizeCitizenId(result.citizenId);
    const ticket = (result.ticketNo ?? '').toLowerCase();
    const ticketNum = ticket.replace('a-', '');

    const namePlain = stripDiacritics(result.name);
    const qPlain = stripDiacritics(q);

    return (
        result.name.toLowerCase().includes(q) ||
        namePlain.includes(qPlain) ||
        result.citizenId.toLowerCase().includes(q) ||
        (qDigits.length > 0 && citizenDigits.includes(qDigits)) ||
        (result.email?.toLowerCase().includes(q) ?? false) ||
        (result.bhyt?.toLowerCase().includes(q) ?? false) ||
        (qDigits.length > 0 && normalizePhone(result.phone).includes(qDigits)) ||
        ticket.includes(q) ||
        (qDigits.length > 0 && ticketNum.includes(qDigits)) ||
        result.accountId.toLowerCase().includes(q)
    );
}

function mapQueueItem(item: BackendQueuePatient): PatientSearchResult {
    const patientObj = item.step.flow.booking.patient;
    const queue = mapBackendToQueuePatient(item);

    return {
        accountId: patientObj.patient_id,
        queueId: item.queue_id,
        name: patientObj.full_name || patientObj.account.user_name || 'Bệnh nhân',
        citizenId: patientObj.citizen_id || '',
        phone: patientObj.account.phone || null,
        email: patientObj.account.email || '',
        ticketNo: queue.ticketNo,
        specialty: 'Nội khoa',
        bhyt: patientObj.medical_coverage_id,
        priority: queue.priority,
        status: queue.status,
        waitMinutes: queue.waitMinutes,
        bookingId: queue.bookingId,
        inQueueToday: true,
    };
}

function mapAccountOnly(account: ReceptionAccount): PatientSearchResult {
    const priority: ReceptionPriority =
        account.dob && new Date().getFullYear() - new Date(account.dob).getFullYear() >= 65
            ? 'Người cao tuổi'
            : 'Thường';

    return {
        accountId: account.patient_id ?? account.account_id,
        patient_id: account.patient_id,
        name: account.full_name,
        citizenId: account.citizen_id,
        phone: account.phone,
        email: account.email,
        specialty: '—',
        bhyt: account.bhyt ?? null,
        priority,
        status: 'Không trong hàng đợi',
        inQueueToday: false,
    };
}

export function searchPatientRecords(
    query: string,
    accounts: ReceptionAccount[],
    queueItems: BackendQueuePatient[],
): PatientSearchResult[] {
    const q = normalizeQuery(query);

    const queueResults = queueItems.map(mapQueueItem);
    const matchedQueue = q ? queueResults.filter((r) => matchesQuery(r, query)) : queueResults;

    const queueKeys = new Set<string>();
    for (const result of matchedQueue) {
        queueKeys.add(result.accountId);
        if (result.citizenId) queueKeys.add(result.citizenId);
    }

    const accountOnly = accounts
        .filter((a) => {
            const patientKey = a.patient_id ?? a.account_id;
            return !queueKeys.has(patientKey) && !queueKeys.has(a.account_id) && !queueKeys.has(a.citizen_id);
        })
        .map(mapAccountOnly)
        .filter((r) => !q || matchesQuery(r, query));

    return [...matchedQueue, ...accountOnly];
}

function extractPatientFields(patient: Record<string, unknown>): {
    patient_id: string;
    full_name: string;
    citizen_id: string;
    phone: string | null;
    email: string;
    medical_coverage_id: string | null;
} | null {
    const account = (patient.account ??
        patient.Account ??
        patient.user ??
        patient.User) as Record<string, unknown> | undefined;

    const patientId = String(patient.patient_id ?? patient.id ?? '');
    const fullName = String(
        account?.full_name ?? account?.user_name ?? patient.full_name ?? '',
    );
    const citizenId = String(account?.citizen_id ?? patient.citizen_id ?? '');

    if (!patientId && !citizenId && !fullName) return null;

    return {
        patient_id: patientId,
        full_name: fullName,
        citizen_id: citizenId,
        phone: (account?.phone as string | null | undefined) ?? (patient.phone as string | null) ?? null,
        email: String(account?.email ?? patient.email ?? ''),
        medical_coverage_id:
            (patient.medical_coverage_id as string | null | undefined) ?? null,
    };
}

function extractBookingPatient(raw: Record<string, unknown>): {
    patient_id: string;
    full_name: string;
    citizen_id: string;
    phone: string | null;
    email: string;
    medical_coverage_id: string | null;
} | null {
    const candidates: unknown[] = [
        raw.patient,
        raw.Patient,
        (raw.booking as Record<string, unknown> | undefined)?.patient,
        (raw.flow as Record<string, unknown> | undefined)?.booking &&
            ((raw.flow as Record<string, unknown>).booking as Record<string, unknown>).patient,
        (raw.step as Record<string, unknown> | undefined)?.flow &&
            (((raw.step as Record<string, unknown>).flow as Record<string, unknown>).booking as
                | Record<string, unknown>
                | undefined)?.patient,
    ];

    for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') continue;
        const extracted = extractPatientFields(candidate as Record<string, unknown>);
        if (extracted) return extracted;
    }

    return null;
}

export function searchPatientRecordsFromBookings(
    query: string,
    bookings: Record<string, unknown>[],
    queueItems: BackendQueuePatient[],
): PatientSearchResult[] {
    const q = normalizeQuery(query);
    if (!q) return [];

    const queueByPatientId = new Map<string, BackendQueuePatient>();
    for (const item of queueItems) {
        const pid = item.step?.flow?.booking?.patient?.patient_id;
        if (pid) queueByPatientId.set(pid, item);
    }

    const results: PatientSearchResult[] = [];
    const seen = new Set<string>();

    for (const booking of bookings) {
        const extracted = extractBookingPatient(booking);
        if (!extracted) continue;

        const key = `${extracted.citizen_id}:${extracted.patient_id}`;
        if (seen.has(key)) continue;

        const queued = queueByPatientId.get(extracted.patient_id);
        if (queued) {
            const mapped = mapQueueItem(queued);
            if (matchesQuery(mapped, query)) {
                seen.add(key);
                results.push(mapped);
            }
            continue;
        }

        const accountResult = mapAccountOnly({
            account_id: extracted.patient_id,
            full_name: extracted.full_name,
            citizen_id: extracted.citizen_id,
            phone: extracted.phone,
            email: extracted.email,
            dob: '',
            gender: '',
            role: 'USER',
            bhyt: extracted.medical_coverage_id,
        });

        if (matchesQuery(accountResult, query)) {
            seen.add(key);
            results.push(accountResult);
        }
    }

    return results;
}

export function formatPhoneDisplay(phone?: string | null): string {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
        return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return phone;
}

export function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function buildSearchPreview(result: PatientSearchResult): string {
    const parts = [
        `Tên: ${result.name}`,
        `CCCD: ${result.citizenId}`,
    ];
    if (result.ticketNo) parts.push(`Số vé: ${result.ticketNo}`);
    if (result.phone) parts.push(`SĐT: ${formatPhoneDisplay(result.phone)}`);
    return parts.join('   ');
}

const PRIORITY_STYLES: Record<ReceptionPriority, string> = {
    'Khẩn cấp': 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
    'Người cao tuổi': 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]',
    'Ưu tiên': 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    'Thường': 'bg-[#F9FAFB] text-[#6B7280] border-[#E5E7EB]',
};

const STATUS_STYLES: Record<ReceptionStatus | 'Không trong hàng đợi', string> = {
    'Đang khám': 'bg-[#ECFDF5] text-[#059669]',
    'Chờ khám': 'bg-[#EFF6FF] text-[#2563EB]',
    'Chờ TT': 'bg-[#FFFBEB] text-[#D97706]',
    'Đã TT': 'bg-[#ECFDF5] text-[#059669]',
    'Đã gọi': 'bg-[#F5F3FF] text-[#7C3AED]',
    'Check-in': 'bg-[#F3F4F6] text-[#6B7280]',
    'Không trong hàng đợi': 'bg-[#F3F4F6] text-[#6B7280]',
};

export function priorityBadgeClass(priority: ReceptionPriority): string {
    return PRIORITY_STYLES[priority];
}

export function statusBadgeClass(status: ReceptionStatus | 'Không trong hàng đợi'): string {
    return STATUS_STYLES[status];
}
