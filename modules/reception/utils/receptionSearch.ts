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
    const patient = item.step.flow.booking.patient;
    const account = patient.account;
    const queue = mapBackendToQueuePatient(item);

    return {
        accountId: patient.patient_id,
        patient_id: patient.patient_id,
        queueId: item.queue_id,
        name: patient.full_name || account?.full_name || account?.user_name || 'Bệnh nhân',
        citizenId: patient.citizen_id || account?.citizen_id || '',
        phone: account?.phone || null,
        email: account?.email || '',
        dob: patient.dob || account?.dob || undefined,
        gender: (patient.gender || account?.gender) as any,
        ticketNo: queue.ticketNo,
        specialty: 'Nội khoa',
        bhyt: patient.medical_coverage_id || null,
        priority: queue.priority,
        status: queue.status,
        waitMinutes: queue.waitMinutes,
        bookingId: queue.bookingId,
        inQueueToday: true,
        blood_type: (patient as any).blood_type || null,
        allergy_notes: (patient as any).allergy_notes || null,
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
        dob: account.dob ?? undefined,
        gender: account.gender ?? undefined,
        specialty: '—',
        bhyt: account.bhyt ?? null,
        priority,
        status: 'Không trong hàng đợi',
        inQueueToday: false,
        blood_type: account.blood_type ?? null,
        allergy_notes: account.allergy_notes ?? null,
        createdAt: account.createdAt,
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
