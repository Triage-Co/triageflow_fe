import type { BackendQueuePatient } from '@/modules/clinical/services/clinicalService';
import type {
    BackendSpecialtyCatalogItem,
    HighPriorityPatient,
    QueuePatient,
    RecentActivity,
    ReceptionAccount,
    ReceptionPatientDetail,
    ReceptionPatientRecord,
    ReceptionPriority,
    ReceptionSlot,
    ReceptionSpecialty,
    ReceptionStat,
    ReceptionStatus,
} from '@/modules/reception/types/reception.types';

function asArray<T>(value: unknown): T[] {
    return Array.isArray(value) ? value : [];
}

export function getDoctorSelectionKey(specialty: ReceptionSpecialty, index: number): string {
    return specialty.doctor_id ?? specialty.specialty_id ?? specialty.specialty_code ?? String(index);
}

export function findDoctorBySelectionKey(doctors: ReceptionSpecialty[], selectionKey: string): ReceptionSpecialty | undefined {
    if (!selectionKey) return undefined;
    const byKey = doctors.find((doctor, index) => getDoctorSelectionKey(doctor, index) === selectionKey);
    if (byKey) return byKey;
    return doctors.find((doctor) => doctor.doctor_id === selectionKey);
}

export function formatSlotTimeLabel(slot?: ReceptionSlot): string {
    if (!slot?.start_time) return '';
    const start = slot.start_time.slice(0, 5);
    const end = slot.end_time?.slice(0, 5);
    return end ? `${start} – ${end}` : start;
}

export function getDoctorDisplayLabel(specialty?: ReceptionSpecialty): string {
    if (!specialty?.doctor_id) return 'Tự động phân công';
    const name = specialty.name ?? specialty.specialty_name ?? '';
    if (!name) return 'Tự động phân công';
    if (name.toLowerCase().startsWith('bs')) return name;
    return `BS. ${name}`;
}

function numberField(...values: unknown[]): number | undefined {
    for (const value of values) {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
            return Number(value);
        }
    }
    return undefined;
}

function mapDoctorRecord(
    doctor: Record<string, unknown>,
    specialtyById?: Map<string, Record<string, unknown>>,
): ReceptionSpecialty | null {
    const account = doctor.account as Record<string, unknown> | undefined;
    const explicitSpecialty = doctor.specialty as Record<string, unknown> | undefined;
    const doctorSpecialtyId = doctor.specialty_id as string | undefined;
    const nestedSpecialty =
        explicitSpecialty ??
        (doctorSpecialtyId ? specialtyById?.get(doctorSpecialtyId) : undefined);
    const doctorId = (doctor.staff_id as string | undefined) ?? (doctor.doctor_id as string | undefined) ?? (account?.account_id as string | undefined);
    const specialtyId = doctorSpecialtyId ?? (nestedSpecialty?.specialty_id as string | undefined);
    const doctorName = (doctor.full_name as string | undefined) ?? (account?.user_name as string | undefined) ?? (account?.full_name as string | undefined);
    const specialtyName = (nestedSpecialty?.specialty_name as string | undefined) ?? (doctor.specialty_name as string | undefined);
    const specialtyCode = (nestedSpecialty?.specialty_code as string | undefined) ?? (doctor.specialty_code as string | undefined);
    const profile = doctor.profile as Record<string, unknown> | undefined;
    if (!doctorId && !specialtyId) return null;
    return {
        doctor_id: doctorId,
        specialty_id: specialtyId ?? doctorId,
        specialty_code: specialtyCode ?? specialtyId,
        name: doctorName ?? `Bác sĩ ${(doctorId ?? specialtyId ?? '').slice(0, 8)}`,
        specialty_name: specialtyName,
        specialty_labels: specialtyName ? [specialtyName] : [],
        experience_years: typeof doctor.experience_years === 'number' ? doctor.experience_years : undefined,
        gender: (account?.gender as string | undefined) ?? (doctor.gender as string | undefined),
        license_number: doctor.license_number as string | undefined,
        avatar_url:
            (doctor.avatar_url as string | undefined) ??
            (doctor.profile_image as string | undefined) ??
            (profile?.avatar_url as string | undefined) ??
            (account?.avatar_url as string | undefined) ??
            (account?.profile_image as string | undefined),
        academic_degree:
            (doctor.academic_degree as string | undefined) ??
            (doctor.degree as string | undefined) ??
            (doctor.title as string | undefined) ??
            (doctor.qualification as string | undefined) ??
            (profile?.academic_degree as string | undefined),
        rating: numberField(
            doctor.rating,
            doctor.average_rating,
            doctor.rating_average,
            profile?.rating,
        ),
        review_count: numberField(
            doctor.review_count,
            doctor.total_reviews,
            doctor.rating_count,
            profile?.review_count,
        ),
    };
}

export function mapDoctorSpecialties(
    raw: unknown,
    specialtyRaw?: unknown,
): ReceptionSpecialty[] {
    const doctors = asArray<Record<string, unknown>>(raw);
    const specialtyById = new Map(
        asArray<Record<string, unknown>>(specialtyRaw)
            .filter((item) => typeof item.specialty_id === 'string')
            .map((item) => [String(item.specialty_id), item]),
    );
    const seen = new Set<string>();
    const specialties: ReceptionSpecialty[] = [];
    for (const doctor of doctors) {
        const mapped = mapDoctorRecord(doctor, specialtyById);
        if (!mapped) continue;
        const key = mapped.doctor_id ?? mapped.specialty_id ?? '';
        if (!key || seen.has(key)) continue;
        seen.add(key);
        specialties.push(mapped);
    }
    return specialties;
}

export function mapDoctorSpecialtyResponse(raw: unknown): ReceptionSpecialty[] {
    return mapDoctorSpecialties(raw);
}

export function mapSpecialtyCatalogResponse(raw: unknown): BackendSpecialtyCatalogItem[] {
    const list = asArray<Record<string, unknown>>(raw);
    const seen = new Set<string>();
    const items: BackendSpecialtyCatalogItem[] = [];

    for (const item of list) {
        const specialty_id = String(item.specialty_id ?? '').trim();
        const specialty_code = String(item.specialty_code ?? '').trim();
        const specialty_name = String(item.specialty_name ?? '').trim();
        if (!specialty_id || !specialty_name) continue;
        if (seen.has(specialty_id)) continue;
        seen.add(specialty_id);
        items.push({
            specialty_id,
            specialty_code: specialty_code || specialty_id,
            specialty_name,
            description: (item.description as string | null | undefined) ?? null,
        });
    }

    return items.sort((a, b) => a.specialty_name.localeCompare(b.specialty_name, 'vi'));
}

export function mapDoctorSlotsResponse(raw: unknown): ReceptionSlot[] {
    return mapShiftResponse(raw);
}

function mapSlotRecord(
    slot: Record<string, unknown>,
    fallback: { doctorId?: string; date?: string } = {},
): ReceptionSlot {
    const status = String(slot.status ?? '').trim().toUpperCase();
    const capacity = numberField(slot.capacity, slot.remaining_capacity);
    const maxCapacity = numberField(slot.max_capacity, slot.maximum_capacity);
    const isFull =
        Boolean(slot.is_full) ||
        ['FULL', 'BOOKED', 'UNAVAILABLE', 'CLOSED'].includes(status) ||
        (capacity !== undefined && capacity <= 0);

    return {
        slot_id: (slot.slot_id as string | undefined) ?? (slot.id as string | undefined),
        id: slot.id as string | undefined,
        doctor_id:
            (slot.doctor_id as string | undefined) ??
            (slot.staff_id as string | undefined) ??
            fallback.doctorId,
        start_time: String(slot.start_time ?? ''),
        end_time: String(slot.end_time ?? ''),
        capacity,
        max_capacity: maxCapacity,
        status: status || undefined,
        is_full: isFull,
        shift: {
            shift_id: slot.shift_id as string | undefined,
            date: fallback.date ?? (slot.date as string | undefined),
        },
    };
}

export function mapShiftResponse(raw: unknown): ReceptionSlot[] {
    if (!raw || typeof raw !== 'object') return [];
    const root = raw as Record<string, unknown>;
    const doctorId = (root.staff_id as string | undefined) ?? (root.doctor_id as string | undefined);
    for (const key of ['existedSlot', 'slots'] as const) {
        const list = asArray<Record<string, unknown>>(root[key]);
        if (list.length > 0) {
            return list
                .map((slot) =>
                    mapSlotRecord(slot, {
                        doctorId,
                        date: root.date as string | undefined,
                    }),
                )
                .filter((slot) => slot.slot_id && slot.start_time);
        }
    }
    const slots: ReceptionSlot[] = [];
    for (const item of asArray<Record<string, unknown>>(raw)) {
        const nestedSlots = asArray<Record<string, unknown>>(item.slots);
        if (nestedSlots.length > 0) {
            for (const slot of nestedSlots) {
                const slotId = (slot.slot_id as string | undefined) ?? (slot.id as string | undefined);
                if (!slotId || !slot.start_time) continue;
                slots.push(
                    mapSlotRecord(slot, {
                        doctorId: (item.doctor_id as string | undefined) ?? doctorId,
                        date: item.date as string | undefined,
                    }),
                );
            }
            continue;
        }
        const slotId = (item.slot_id as string | undefined) ?? (item.id as string | undefined);
        if (slotId && item.start_time) {
            slots.push(mapSlotRecord(item));
        }
    }
    return slots.filter((slot) => slot.slot_id && slot.start_time);
}

export function mapPatientRecordToAccount(record: ReceptionPatientRecord): ReceptionAccount {
    const account = record.account;
    const patientId = record.patient_id?.trim() || undefined;
    return {
        account_id: account?.account_id ?? '',
        patient_id: patientId,
        full_name: account?.full_name ?? record.full_name ?? '',
        citizen_id: account?.citizen_id ?? record.citizen_id ?? '',
        email: account?.email ?? record.email ?? '',
        dob: account?.dob ?? record.dob ?? '',
        gender: account?.gender ?? record.gender ?? '',
        role: account?.role ?? 'PATIENT',
        phone: account?.phone ?? record.phone ?? null,
        bhyt: record.medical_coverage_id ?? null,
    };
}

export function unwrapPatientListPayload(raw: unknown, depth = 0): unknown[] {
    if (depth > 5) return [];
    if (Array.isArray(raw)) return raw;
    if (!raw || typeof raw !== 'object') return [];

    const obj = raw as Record<string, unknown>;
    for (const key of ['items', 'patients', 'content', 'results', 'records', 'list']) {
        if (Array.isArray(obj[key])) return obj[key] as unknown[];
    }
    if (obj.data != null) {
        const nested = unwrapPatientListPayload(obj.data, depth + 1);
        if (nested.length > 0) return nested;
    }
    return [];
}

/** Chỉ nhận patient_id thật — không dùng account_id / CCCD thay thế. */
export function extractRealPatientId(raw: unknown): string | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const account = (record.account ?? record.Account) as Record<string, unknown> | undefined;
    const accountId = String(
        account?.account_id ?? account?.id ?? record.account_id ?? '',
    ).trim();
    const citizenId = String(account?.citizen_id ?? record.citizen_id ?? '').trim();
    const candidates = [
        record.patient_id,
        // một số BE trả id = patient_id ở root — chỉ dùng khi KHÔNG trùng account_id
        record.id,
    ];
    for (const candidate of candidates) {
        const id = String(candidate ?? '').trim();
        if (!id) continue;
        if (citizenId && id === citizenId) continue;
        if (accountId && id === accountId) continue;
        // bỏ fallback giả (tên, email...)
        if (id.includes('@')) continue;
        if (id.length < 8) continue;
        return id;
    }
    return null;
}

function normalizePatientRecord(raw: unknown): ReceptionPatientRecord | null {
    if (!raw || typeof raw !== 'object') return null;
    const record = raw as Record<string, unknown>;
    const account = (record.account ??
        record.Account ??
        record.user ??
        record.User) as ReceptionPatientRecord['account'];

    const patient_id = extractRealPatientId(record) ?? '';
    const citizen_id = String(account?.citizen_id ?? record.citizen_id ?? '').trim();
    const full_name = String(account?.full_name ?? record.full_name ?? '').trim();

    if (!patient_id && !citizen_id && !full_name) return null;

    return {
        patient_id,
        medical_coverage_id: (record.medical_coverage_id as string | null | undefined) ?? null,
        account,
        full_name: full_name || undefined,
        citizen_id: citizen_id || undefined,
        email: (account?.email ?? record.email) as string | undefined,
        dob: (account?.dob ?? record.dob) as string | undefined,
        gender: (account?.gender ?? record.gender) as string | undefined,
        phone: (account?.phone ?? record.phone) as string | null | undefined,
    };
}

export function normalizePatientListResponse(raw: unknown): ReceptionPatientRecord[] {
    const list = unwrapPatientListPayload(raw);
    if (list.length === 0 && raw && typeof raw === 'object') {
        const single = normalizePatientRecord(raw);
        return single ? [single] : [];
    }
    return list
        .map(normalizePatientRecord)
        .filter((record): record is ReceptionPatientRecord => record !== null);
}

export function normalizeBookingListResponse(raw: unknown): Record<string, unknown>[] {
    if (Array.isArray(raw)) return raw as Record<string, unknown>[];
    if (raw && typeof raw === 'object') {
        const obj = raw as Record<string, unknown>;
        if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
        if (Array.isArray(obj.items)) return obj.items as Record<string, unknown>[];
    }
    return [];
}

export function extractBookingCreateFields(raw: unknown): {
    queueNumber?: string;
    bookingId?: string;
    stepId?: string;
    queueId?: string;
} {
    if (raw == null) return {};
    if (typeof raw !== 'object') {
        const queueNumber = String(raw).trim();
        return queueNumber ? { queueNumber } : {};
    }

    const findValue = (value: unknown, keys: string[], depth = 0): unknown => {
        if (!value || typeof value !== 'object' || depth > 10) return undefined;
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = findValue(item, keys, depth + 1);
                if (found != null && String(found).trim()) return found;
            }
            return undefined;
        }

        const record = value as Record<string, unknown>;
        for (const key of keys) {
            const found = record[key];
            if (found != null && typeof found !== 'object' && String(found).trim()) return found;
        }
        for (const child of Object.values(record)) {
            const found = findValue(child, keys, depth + 1);
            if (found != null && String(found).trim()) return found;
        }
        return undefined;
    };

    const asOptionalString = (value: unknown) => String(value ?? '').trim() || undefined;

    return {
        queueNumber: asOptionalString(
            findValue(raw, ['queue_number', 'queueNumber', 'docNo', 'doc_no', 'order_number', 'orderNumber']),
        ),
        bookingId: asOptionalString(findValue(raw, ['booking_id', 'bookingId'])),
        stepId: asOptionalString(findValue(raw, ['step_id', 'stepId'])),
        queueId: asOptionalString(findValue(raw, ['queue_id', 'queueId'])),
    };
}

export function extractBookingFlowFields(
    raw: unknown,
    bookingId?: string,
    patientId?: string,
): ReturnType<typeof extractBookingCreateFields> {
    if (!raw || typeof raw !== 'object') return {};

    const targetBookingId = bookingId?.trim();
    const targetPatientId = patientId?.trim();
    const path: Record<string, unknown>[] = [];

    const findPath = (
        value: unknown,
        ancestors: Record<string, unknown>[],
        field: 'booking_id' | 'patient_id',
        target: string,
    ): boolean => {
        if (!value || typeof value !== 'object') return false;
        if (Array.isArray(value)) {
            return value.some((item) => findPath(item, ancestors, field, target));
        }

        const record = value as Record<string, unknown>;
        const nextAncestors = [...ancestors, record];
        if (String(record[field] ?? '').trim() === target) {
            path.push(...nextAncestors);
            return true;
        }
        return Object.values(record).some((child) =>
            findPath(child, nextAncestors, field, target),
        );
    };

    const matched =
        (targetBookingId && findPath(raw, [], 'booking_id', targetBookingId)) ||
        (targetPatientId && findPath(raw, [], 'patient_id', targetPatientId));
    if (!matched) return {};

    for (let index = path.length - 1; index >= 0; index -= 1) {
        const fields = extractBookingCreateFields(path[index]);
        if (fields.stepId || fields.queueNumber || fields.queueId) {
            return {
                ...fields,
                bookingId: fields.bookingId ?? targetBookingId,
            };
        }
    }

    return { bookingId: targetBookingId };
}

export function formatQueueTicketNo(queueNumber?: string): string {
    if (!queueNumber) return 'A-—';
    const trimmed = queueNumber.trim();
    if (/^[A-Z]-/i.test(trimmed)) return trimmed.toUpperCase();
    return `A-${trimmed}`;
}

function formatTicketNo(queueNumber?: string): string {
    return formatQueueTicketNo(queueNumber);
}

function calcWaitMinutes(startTime?: string): number {
    if (!startTime) return 0;
    const [hours, minutes] = startTime.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
    const now = new Date();
    const slot = new Date();
    slot.setHours(hours, minutes, 0, 0);
    const diff = Math.floor((now.getTime() - slot.getTime()) / 60000);
    return diff > 0 ? diff : 0;
}

function mapPriority(dob?: string, flowStatus?: string): ReceptionPriority {
    if (flowStatus === 'EMERGENCY') return 'Khẩn cấp';
    if (dob) {
        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        if (age >= 65) return 'Người cao tuổi';
    }
    return 'Thường';
}

function mapReceptionStatus(item: BackendQueuePatient): ReceptionStatus {
    const stepStatus = item.step.step_status;
    const payment = item.step.payment_status;
    if (stepStatus === 'PROCESSING' || stepStatus === 'IN_PROGRESS') return 'Đang khám';
    if (payment === 'PENDING' || payment === 'UNPAID') return 'Chờ TT';
    if (payment === 'PAID') return 'Đã TT';
    if (item.status === 'CALLED') return 'Đã gọi';
    if (item.status === 'CHECK_IN') return 'Check-in';
    return 'Chờ khám';
}

function mapSpecialtyIcon(specialty: string): QueuePatient['specialtyIcon'] {
    const s = specialty.toLowerCase();
    if (s.includes('cấp cứu') || s.includes('emergency')) return 'emergency';
    if (s.includes('da liễu') || s.includes('dermat')) return 'dermatology';
    if (s.includes('sản') || s.includes('phụ khoa') || s.includes('obgyn')) return 'obgyn';
    if (s.includes('chấn thương') || s.includes('ortho') || s.includes('trauma')) return 'trauma';
    if (s.includes('nội')) return 'internal';
    return 'general';
}

export function mapBackendToQueuePatient(item: BackendQueuePatient): QueuePatient {
    const account = item.step.flow.booking.patient.account;
    const specialty = 'Khám bệnh';
    return {
        id: item.queue_id,
        ticketNo: formatTicketNo(item.queue_number),
        name: account.full_name,
        specialty,
        specialtyIcon: mapSpecialtyIcon(specialty),
        priority: mapPriority(account.dob, item.step.flow.status),
        status: mapReceptionStatus(item),
        waitMinutes: calcWaitMinutes(item.step.flow.booking.slot.start_time),
        bookingId: item.step.flow.booking.booking_id,
        accountId: item.step.flow.booking.patient.patient_id,
    };
}

export function extractHighPriorityPatients(patients: QueuePatient[]): HighPriorityPatient[] {
    return patients
        .filter((p) => p.priority === 'Khẩn cấp' || p.priority === 'Ưu tiên')
        .slice(0, 5)
        .map((p) => ({ id: p.id, name: p.name, ticketNo: p.ticketNo, specialty: p.specialty, priority: p.priority }));
}

export function buildRecentActivities(patients: QueuePatient[]): RecentActivity[] {
    return patients.slice(0, 5).map((p, i) => ({
        id: String(i + 1),
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        title: 'Đăng ký mới',
        ticketNo: p.ticketNo,
        patientName: p.name,
        type: p.priority === 'Khẩn cấp' ? 'emergency' : 'register',
    }));
}

export function buildReceptionStats(patients: QueuePatient[]): ReceptionStat[] {
    const waiting = patients.filter((p) => p.status === 'Chờ khám').length;
    const payment = patients.filter((p) => p.status === 'Chờ TT').length;
    const emergency = patients.filter((p) => p.priority === 'Khẩn cấp').length;
    const avgWait = patients.length ? Math.round(patients.reduce((s, p) => s + p.waitMinutes, 0) / patients.length) : 0;
    return [
        { value: waiting, label: 'Đang chờ khám', icon: 'waiting', iconBg: 'bg-[#E8F2FF]', iconColor: 'text-[#3B82F6]' },
        { value: patients.length, label: 'Đăng ký hôm nay', icon: 'registered', iconBg: 'bg-[#E2F7EB]', iconColor: 'text-[#10B981]' },
        { value: Math.max(1, Math.ceil(patients.length / 8)), label: 'Hàng đợi đang hoạt động', icon: 'queues', iconBg: 'bg-[#E2F7EB]', iconColor: 'text-[#10B981]' },
        { value: payment, label: 'Chờ thanh toán', icon: 'payment', iconBg: 'bg-[#FFF4E5]', iconColor: 'text-[#F59E0B]' },
        { value: emergency, label: 'Ca khẩn cấp', icon: 'emergency', iconBg: 'bg-[#FEE2E2]', iconColor: 'text-[#EF4444]' },
        { value: `${avgWait || 0} phút`, label: 'Thời gian chờ TB', icon: 'avgTime', iconBg: 'bg-[#F3E8FF]', iconColor: 'text-[#8B7CF6]' },
        { value: Math.round(patients.length * 0.35), label: 'Vãng lai (walk-in)', icon: 'walkin', iconBg: 'bg-[#E8F2FF]', iconColor: 'text-[#3B82F6]' },
        { value: 0, label: 'Vé cấp lại', icon: 'reissue', iconBg: 'bg-[#F3F4F6]', iconColor: 'text-[#6B7280]' },
    ];
}

export function getTodayDateString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getTomorrowDateString(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
}

export interface UpcomingDateOption { value: string; weekday: string; day: number; month: number; isToday: boolean; }
const VI_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function buildUpcomingDateOptions(count = 7): UpcomingDateOption[] {
    const today = new Date();
    const options: UpcomingDateOption[] = [];
    for (let i = 0; i < count; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const yyyy = date.getFullYear();
        const mm = date.getMonth() + 1;
        const dd = date.getDate();
        options.push({ value: `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`, weekday: VI_WEEKDAYS[date.getDay()], day: dd, month: mm, isToday: i === 0 });
    }
    return options;
}

export function formatSlotTimeRange(start?: string, end?: string): string {
    const from = start?.slice(0, 5) ?? '';
    const to = end?.slice(0, 5) ?? '';
    if (!from) return '';
    return to ? `${from} – ${to}` : from;
}

function formatGender(gender?: string): string {
    if (gender === 'FEMALE') return 'Nữ';
    if (gender === 'MALE') return 'Nam';
    return gender ?? '—';
}

function formatDobDisplay(dob?: string): string {
    if (!dob) return '—';
    try {
        const d = new Date(dob);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
        return dob;
    }
}

export function mapBackendToReceptionDetail(item: BackendQueuePatient): ReceptionPatientDetail {
    const account = item.step.flow.booking.patient.account;
    const slot = item.step.flow.booking.slot;
    return {
        queueId: item.queue_id,
        ticketNo: formatTicketNo(item.queue_number),
        name: account.full_name,
        citizenId: account.citizen_id,
        email: account.email,
        phone: account.phone,
        dob: formatDobDisplay(account.dob),
        gender: formatGender(account.gender),
        queueStatus: item.status,
        paymentStatus: item.step.payment_status,
        stepStatus: item.step.step_status,
        slotTime: slot.start_time?.slice(0, 5) ?? '—',
        slotDate: slot.shift?.date ?? '—',
        bookingStatus: item.step.flow.booking.status,
        bookingId: item.step.flow.booking.booking_id,
        waitMinutes: calcWaitMinutes(slot.start_time),
        priority: mapPriority(account.dob, item.step.flow.status),
        status: mapReceptionStatus(item),
    };
}
