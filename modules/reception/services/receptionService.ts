import {
    clinicalService,
    type BackendQueuePatient,
} from '@/modules/clinical/services/clinicalService';
import { authService } from '@/modules/auth/services/authService';
import { apiClient, ApiError, type ApiResponse } from '@/shared/services/apiClient';
import { resolveApiError } from '@/shared/utils/apiError';
import type {
    CreateBookingRecommendRequest,
    CreateBookingRequest,
    CreateTransactionRequest,
    PatientSearchResult,
    ReceptionAccount,
    ReceptionFlow,
    ReceptionPatientRecord,
    ReceptionSlot,
    ReceptionSpecialty,
    TransactionQrResponse,
} from '@/modules/reception/types/reception.types';
import type { Gender, RegisterRequest } from '@/shared/types/auth.types';
import { buildUserNameFromFullName } from '@/shared/utils/userName';
import {
    getTodayDateString,
    extractBookingCreateFields,
    extractBookingFlowFields,
    extractRealPatientId,
    mapDoctorSlotsResponse,
    mapDoctorSpecialties,
    mapDoctorSpecialtyResponse,
    mapSpecialtyCatalogResponse,
    mapPatientRecordToAccount,
    mapShiftResponse,
    normalizeBookingListResponse,
    normalizePatientListResponse,
} from '@/modules/reception/utils/receptionMapper';
import { searchPatientRecords, searchPatientRecordsFromBookings } from '@/modules/reception/utils/receptionSearch';

const CACHE_KEYS = {
    QUEUE_PATIENTS: 'triageflow_queue_patients_cache',
    PATIENT_ACCOUNTS: 'triageflow_patient_accounts_cache',
    PATIENT_LIST: 'triageflow_patient_list_cache',
};

function getLocalStorageCache<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        const parsed = JSON.parse(item);
        return (parsed?.data as T) ?? null;
    } catch {
        return null;
    }
}

function setLocalStorageCache<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(
            key,
            JSON.stringify({
                timestamp: Date.now(),
                data,
            }),
        );
    } catch {
        // ignore quota errors
    }
}

export function clearPatientLocalStorageCache(): void {
    if (typeof window === 'undefined') return;
    try {
        Object.values(CACHE_KEYS).forEach((k) => localStorage.removeItem(k));
        const today = getTodayDateString();
        localStorage.removeItem(`${CACHE_KEYS.QUEUE_PATIENTS}_${today}`);
    } catch {
        // ignore
    }
}

async function fetchPatientAccounts(token: string): Promise<ReceptionAccount[]> {
    const cached = getLocalStorageCache<ReceptionAccount[]>(CACHE_KEYS.PATIENT_ACCOUNTS);

    const fetchFresh = async (): Promise<ReceptionAccount[]> => {
        const res = await apiClient.get<unknown>('/api/patient', {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 'error' || (typeof res.code === 'number' && res.code >= 400)) {
            throw new ApiError(res.code ?? 500, res.message || 'Không tải được danh sách bệnh nhân.');
        }

        const records = normalizePatientListResponse(res.data ?? res);
        const mapped = records
            .map(mapPatientRecordToAccount)
            .filter((a) => a.citizen_id || a.full_name || a.email);
        setLocalStorageCache(CACHE_KEYS.PATIENT_ACCOUNTS, mapped);
        return mapped;
    };

    if (cached && Array.isArray(cached) && cached.length > 0) {
        fetchFresh().catch(() => {});
        return cached;
    }

    return fetchFresh();
}

async function resolvePatientIdByCitizenId(
    citizenId: string,
    token: string,
): Promise<string | null> {
    const cleanId = citizenId.replace(/\D/g, '');
    if (!cleanId) return null;
    const accounts = await fetchPatientAccounts(token);
    const matched = accounts.find(
        (a) => {
            const dbId = (a.citizen_id || '').replace(/\D/g, '');
            return dbId === cleanId;
        }
    );
    const patientId = matched?.patient_id?.trim();
    if (!patientId) return null;
    return patientId;
}

/** Đối chiếu CCCD / patient_id với GET /api/patient — chứng minh Search thấy nhưng /diagnoise vẫn P2003. */
async function verifyPatientAgainstDb(
    citizenId: string,
    knownPatientId: string | null | undefined,
    token: string,
): Promise<{
    citizen_id: string;
    known_patient_id: string | null;
    found_by_cccd: ReceptionAccount | null;
    found_by_patient_id: ReceptionAccount | null;
    get_by_id_ok: boolean;
    get_by_id_error: string | null;
    get_by_id_raw: unknown;
    conclusion: string;
}> {
    const cleanId = citizenId.replace(/\D/g, '');
    const accounts = await fetchPatientAccounts(token);
    const foundByCccd =
        accounts.find((a) => (a.citizen_id || '').replace(/\D/g, '') === cleanId) ?? null;
    const known = knownPatientId?.trim() || null;
    const foundByPatientId = known
        ? accounts.find((a) => a.patient_id === known) ?? null
        : null;

    let getByIdOk = false;
    let getByIdError: string | null = null;
    let getByIdRaw: unknown = null;
    if (known) {
        try {
            const res = await apiClient.get<unknown>(`/api/patient/${known}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            getByIdRaw = res;
            getByIdOk = !(res.status === 'error' || (typeof res.code === 'number' && res.code >= 400));
            if (!getByIdOk) {
                getByIdError = res.message || `code ${res.code}`;
            }
        } catch (err) {
            getByIdError = err instanceof Error ? err.message : String(err);
        }
    }

    const idsMatch =
        !!foundByCccd?.patient_id &&
        !!known &&
        foundByCccd.patient_id === known;
    const accountIdLooksLikePatientId =
        !!known &&
        !!foundByCccd?.account_id &&
        foundByCccd.account_id === known;

    let conclusion: string;
    if (accountIdLooksLikePatientId) {
        conclusion =
            'Form đang giữ account_id chứ không phải patient_id. Search vẫn thấy CCCD (vì join Account) nhưng /diagnoise lưu patient_anwser bằng FK Patient → P2003.';
    } else if (foundByCccd?.patient_id && (getByIdOk || idsMatch)) {
        conclusion =
            'GET /api/patient CÓ BN với CCCD này. Search đúng. Nếu /diagnoise vẫn P2003 → BE tra/gán patient_id sai khi lưu patient_anwser (bug backend).';
    } else if (foundByCccd && !foundByCccd.patient_id) {
        conclusion =
            'Search thấy CCCD trên Account nhưng bản ghi không có patient_id (chưa có hồ sơ Patient) → P2003 là đúng kỳ vọng.';
    } else if (!foundByCccd && known) {
        conclusion =
            'Có known patient_id trên form nhưng GET /api/patient không tìm thấy CCCD khớp — lệch dữ liệu form/DB.';
    } else {
        conclusion = 'GET /api/patient không thấy CCCD này — Search và form đang lệch nhau.';
    }

    return {
        citizen_id: cleanId,
        known_patient_id: known,
        found_by_cccd: foundByCccd
            ? {
                  ...foundByCccd,
              }
            : null,
        found_by_patient_id: foundByPatientId,
        get_by_id_ok: getByIdOk,
        get_by_id_error: getByIdError,
        get_by_id_raw: getByIdRaw,
        conclusion,
    };
}

function extractPatientIdFromCreateResponse(res: ApiResponse<unknown>): string | null {
    const fromData = extractRealPatientId(res.data);
    if (fromData) return fromData;
    if (res.data && typeof res.data === 'object') {
        const nested = (res.data as Record<string, unknown>).patient;
        const fromNested = extractRealPatientId(nested);
        if (fromNested) return fromNested;
    }
    return extractRealPatientId(res);
}

function assertApiSuccess<T>(res: ApiResponse<T>, fallbackMessage: string): ApiResponse<T> {
    if (res.status === 'error' || (typeof res.code === 'number' && res.code >= 400)) {
        const { message, detail } = resolveApiError(res, res.message || fallbackMessage);
        throw new ApiError(res.code ?? 500, message, detail);
    }
    return res;
}

export const receptionService = {
    verifyPatientAgainstDb,

    async getQueueByDate(date: string, token: string): Promise<BackendQueuePatient[]> {
        const cacheKey = `${CACHE_KEYS.QUEUE_PATIENTS}_${date}`;

        const fetchFreshData = async (): Promise<BackendQueuePatient[]> => {
            try {
                const res = await clinicalService.getPatients(date, token);
                const list = (res as { data?: unknown }).data ?? res;
                if (Array.isArray(list) && list.length > 0) {
                    setLocalStorageCache(cacheKey, list as BackendQueuePatient[]);
                    return list as BackendQueuePatient[];
                }
            } catch {
                // Lễ tân hoặc role khác không gọi được API doctor -> tiếp tục fallback
            }

            try {
                const [bookingRes, patientRes] = await Promise.all([
                    receptionService.getBookings(token).catch(() => null),
                    fetchPatientAccounts(token).catch(() => []),
                ]);

                const rawBookings = bookingRes
                    ? normalizeBookingListResponse((bookingRes as { data?: unknown }).data ?? bookingRes)
                    : [];

                const patientMap = new Map<string, ReceptionAccount>();
                if (Array.isArray(patientRes)) {
                    patientRes.forEach((acc) => {
                        if (acc.patient_id) patientMap.set(acc.patient_id, acc);
                        if (acc.account_id) patientMap.set(acc.account_id, acc);
                    });
                }

                if (rawBookings.length > 0) {
                    const result = rawBookings.map((b, index) => {
                        const bPatient = (b.patient as Record<string, unknown>) ?? {};
                        const bPatientId = String(bPatient.patient_id ?? b.patient_id ?? '');
                        const accFromMap = patientMap.get(bPatientId);
                        const bAcc = (bPatient.account as Record<string, unknown>) ?? (b.account as Record<string, unknown>) ?? {};
                        const slotObj = (b.slot as Record<string, unknown>) ?? {};
                        const shiftObj = (slotObj.shift as Record<string, unknown>) ?? {};

                        const fullName = String(
                            accFromMap?.full_name ?? bAcc.full_name ?? bAcc.user_name ?? b.full_name ?? `Bệnh nhân ${index + 1}`
                        );
                        const citizenId = String(accFromMap?.citizen_id ?? bAcc.citizen_id ?? b.citizen_id ?? '');
                        const email = String(accFromMap?.email ?? bAcc.email ?? b.email ?? '');
                        const dob = String(accFromMap?.dob ?? bAcc.dob ?? b.dob ?? '1995-01-01');
                        const gender = String(accFromMap?.gender ?? bAcc.gender ?? b.gender ?? 'MALE');
                        const phone = (accFromMap?.phone ?? bAcc.phone ?? b.phone ?? null) as string | null;

                        return {
                            queue_id: String(b.queue_id ?? b.booking_id ?? `q-${index + 1}`),
                            queue_number: String(b.queue_number ?? b.ticket_no ?? index + 1),
                            status: String(b.queue_status ?? b.status ?? 'WAITING'),
                            step: {
                                step_id: String(b.step_id ?? `step-${index + 1}`),
                                next_step_id: null,
                                step_status: String(b.step_status ?? 'WAITING'),
                                docNo: 1,
                                payment_status: String(b.payment_status ?? (b.status === 'PAID' || b.is_paid ? 'PAID' : 'PENDING')),
                                flow: {
                                    flow_id: String(b.flow_id ?? `flow-${index + 1}`),
                                    status: String(b.priority ?? b.flow_status ?? 'NORMAL'),
                                    booking: {
                                        booking_id: String(b.booking_id ?? `b-${index + 1}`),
                                        status: String(b.status ?? 'CONFIRMED'),
                                        slot: {
                                            slot_id: String(slotObj.slot_id ?? `s-${index + 1}`),
                                            start_time: String(slotObj.start_time ?? '08:00'),
                                            end_time: String(slotObj.end_time ?? '08:30'),
                                            shift: {
                                                date: String(shiftObj.date ?? date),
                                            },
                                        },
                                        patient: {
                                            patient_id: bPatientId || `p-${index + 1}`,
                                            medical_coverage_id: (bPatient.medical_coverage_id as string) ?? null,
                                            account: {
                                                full_name: fullName,
                                                citizen_id: citizenId,
                                                email: email,
                                                dob: dob,
                                                gender: gender,
                                                role: 'PATIENT',
                                                phone: phone,
                                            },
                                        },
                                    },
                                },
                            },
                        };
                    });
                    setLocalStorageCache(cacheKey, result);
                    return result;
                }
            } catch {
                // fallback
            }

            return [];
        };

        const cached = getLocalStorageCache<BackendQueuePatient[]>(cacheKey);
        if (cached && Array.isArray(cached) && cached.length > 0) {
            fetchFreshData().catch(() => {});
            return cached;
        }

        return fetchFreshData();
    },

    async getPatientByQueueId(queueId: string, token: string): Promise<{ data: BackendQueuePatient }> {
        try {
            const res = await clinicalService.getPatientByQueueId(queueId, token, true);
            const dataObj = (res as { data?: BackendQueuePatient }).data ?? res;
            if (dataObj && typeof dataObj === 'object' && 'queue_id' in dataObj) {
                return { data: dataObj as BackendQueuePatient };
            }
        } catch {
            // endpoint bác sĩ 404 hoặc không có quyền -> tiếp tục fallback
        }

        try {
            const queueItems = await receptionService.getQueueByDate(getTodayDateString(), token);
            const matched = queueItems.find(
                (item) =>
                    item.queue_id === queueId ||
                    item.step?.flow?.booking?.booking_id === queueId ||
                    item.step?.flow?.booking?.patient?.patient_id === queueId ||
                    item.step?.flow?.booking?.patient?.account?.citizen_id === queueId,
            );
            if (matched) {
                return { data: matched };
            }
        } catch {
            // ignore
        }

        throw new ApiError(404, `Không tìm thấy bệnh nhân nào với mã hàng đợi ${queueId}`);
    },

    getBookings: (token: string) =>
        apiClient.get<unknown>('/api/booking', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getFlows: (token: string) =>
        apiClient.get<ReceptionFlow[]>('/api/flow', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getTransactions: (token: string) =>
        apiClient.get<Record<string, unknown>[]>('/api/transaction', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPatients: (token: string) =>
        apiClient.get<ReceptionPatientRecord[]>('/api/patient', {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPatientById: (id: string, token: string) =>
        apiClient.get<ReceptionPatientRecord>(`/api/patient/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    async getSlots(token: string): Promise<ReceptionSlot[]> {
        try {
            const res = await apiClient.get<unknown>('/api/shift', {
                headers: { Authorization: `Bearer ${token}` },
            });
            return mapShiftResponse(res.data);
        } catch (err) {
            if (err instanceof ApiError && err.statusCode === 404) return [];
            throw err;
        }
    },

    async getSpecialtyCatalog(token: string) {
        try {
            const res = await apiClient.get<unknown>('/api/specialty', {
                headers: { Authorization: `Bearer ${token}` },
            });
            return mapSpecialtyCatalogResponse(res.data ?? res);
        } catch (err) {
            if (err instanceof ApiError && err.statusCode === 404) return [];
            throw err;
        }
    },

    async getSpecialties(token: string): Promise<ReceptionSpecialty[]> {
        try {
            const headers = { Authorization: `Bearer ${token}` };
            const [doctorRes, specialtyRes] = await Promise.all([
                apiClient.get<unknown>('/api/doctor', { headers }),
                apiClient.get<unknown>('/api/specialty', { headers }),
            ]);
            return mapDoctorSpecialties(doctorRes.data, specialtyRes.data);
        } catch (err) {
            if (err instanceof ApiError && err.statusCode === 404) return [];
            throw err;
        }
    },

    async getDoctorsBySpecialtyCode(
        specialtyCode: string,
        dateTime: string,
        token: string,
    ): Promise<ReceptionSpecialty[]> {
        try {
            const res = await apiClient.get<unknown>(
                `/api/doctor/specialty?specialty_code=${encodeURIComponent(specialtyCode)}&date_time=${encodeURIComponent(dateTime)}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            return mapDoctorSpecialtyResponse(res.data);
        } catch (err) {
            if (err instanceof ApiError && err.statusCode === 404) return [];
            throw err;
        }
    },

    async getDoctorSlots(doctorId: string, date: string, token: string): Promise<ReceptionSlot[]> {
        if (!doctorId?.trim() || !date?.trim()) return [];
        try {
            const res = await apiClient.get<unknown>(
                `/api/doctor/${encodeURIComponent(doctorId)}/slot?date=${encodeURIComponent(date)}`,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            return mapDoctorSlotsResponse(res.data);
        } catch (err) {
            if (err instanceof ApiError && err.statusCode === 404) return [];
            throw err;
        }
    },

    async createBooking(data: CreateBookingRequest, token: string) {
        const res = await apiClient.post<Record<string, unknown>>('/api/booking', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return assertApiSuccess(res, 'Không tạo được lịch khám.');
    },

    async createBookingRecommend(data: CreateBookingRecommendRequest, token: string) {
        const res = await apiClient.post<Record<string, unknown>>('/api/booking/recommend', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return assertApiSuccess(res, 'Không tạo được lịch khám theo gợi ý AI.');
    },

    generateBookingNumber: (stepId: string, token: string, suppressLogError = true) =>
        apiClient.get<unknown>(
            `/api/booking/generate?step-id=${encodeURIComponent(stepId)}`,
            { headers: { Authorization: `Bearer ${token}` }, suppressLogError },
        ),

    async resolveQueueNumberAfterBooking(
        bookingData: unknown,
        patientId: string,
        token: string,
    ): Promise<{
        queueNumber?: string;
        bookingId?: string;
        stepId?: string;
        queueId?: string;
        debugLogs?: string[];
    }> {
        let fields = extractBookingCreateFields(bookingData);

        const mergeFields = (next: typeof fields) => {
            fields = {
                queueNumber: next.queueNumber ?? fields.queueNumber,
                bookingId: next.bookingId ?? fields.bookingId,
                stepId: next.stepId ?? fields.stepId,
                queueId: next.queueId ?? fields.queueId,
            };
        };

        if (!fields.stepId) {
            // POST /api/booking chỉ trả booking_id/patient_id/slot_id/status.
            // step_id nằm trong flow vừa được BE tạo cho booking đó.
            for (let attempt = 0; attempt < 3 && !fields.stepId; attempt += 1) {
                try {
                    const flowRes = await receptionService.getFlows(token);
                    mergeFields(
                        extractBookingFlowFields(flowRes.data, fields.bookingId, patientId),
                    );
                } catch {
                    break;
                }
                if (!fields.stepId && attempt < 2) {
                    await new Promise((resolve) => setTimeout(resolve, 250));
                }
            }
        }

        // 1. Ưu tiên kiểm tra hàng đợi hôm nay (nếu BE/Webhook đã tự động tạo queue)
        if (!fields.queueNumber) {
            try {
                const queueItems = await receptionService.getQueueByDate(getTodayDateString(), token);
                const matched = queueItems.find(
                    (item) =>
                        item.step?.flow?.booking?.patient?.patient_id === patientId ||
                        (fields.bookingId &&
                            item.step?.flow?.booking?.booking_id === fields.bookingId),
                );
                if (matched) {
                    fields = {
                        ...fields,
                        queueNumber: matched.queue_number,
                        queueId: matched.queue_id,
                        bookingId: fields.bookingId ?? matched.step?.flow?.booking?.booking_id,
                        stepId: fields.stepId ?? matched.step?.step_id,
                    };
                }
            } catch {
                // bỏ qua lỗi fetch queue
            }
        }

        // 2. Nếu chưa có queueNumber, thử gọi API cấp số thứ tự
        // Webhook PAID đã được gọi trước từ PayOsPaymentPanel nên BE đã ghi nhận thanh toán.
        // Nếu BE chưa ghi nhận (trả 400), catch bỏ qua và polling tiếp theo sẽ thử lại.
        if (!fields.queueNumber && fields.stepId) {
            try {
                const genRes = await receptionService.generateBookingNumber(fields.stepId, token, true);
                const generated = extractBookingCreateFields(genRes.data);
                mergeFields(generated);
            } catch {
                // BE trả 400 do chưa thanh toán — sẽ retry ở lần polling tiếp theo
            }
        }

        return fields;
    },

    async createTransaction(data: CreateTransactionRequest, token: string) {
        const res = await apiClient.post<TransactionQrResponse>('/api/transaction', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return assertApiSuccess(res, 'Tạo link thanh toán không thành công.');
    },

    getTransactionById: (id: string, token: string) =>
        apiClient.get<Record<string, unknown>>(`/api/transaction/${encodeURIComponent(id)}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    triggerTransactionWebhook: (payload?: unknown, token?: string) =>
        apiClient.post<unknown>(
            '/api/transaction/webhook',
            payload ?? {},
            token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        ),

    async findAccountByCitizenId(citizenId: string, token: string): Promise<ReceptionAccount | null> {
        const cleanId = citizenId.replace(/\D/g, '');
        if (!cleanId) return null;
        const accounts = await fetchPatientAccounts(token);
        return (
            accounts.find(
                (a) => {
                    const dbId = (a.citizen_id || '').replace(/\D/g, '');
                    return dbId === cleanId;
                }
            ) ?? null
        );
    },

    async searchAccounts(query: string, token: string): Promise<ReceptionAccount[]> {
        const accounts = await fetchPatientAccounts(token);
        const q = query.trim().toLowerCase();
        if (!q) return accounts;

        return accounts.filter(
            (a) =>
                a.citizen_id.includes(q) ||
                a.full_name.toLowerCase().includes(q) ||
                a.email.toLowerCase().includes(q) ||
                (a.phone?.includes(q) ?? false),
        );
    },

    /** Lấy toàn bộ bệnh nhân từ GET /api/patient (DB). */
    async listPatients(token: string): Promise<PatientSearchResult[]> {
        const cached = getLocalStorageCache<PatientSearchResult[]>(CACHE_KEYS.PATIENT_LIST);

        const fetchFresh = async (): Promise<PatientSearchResult[]> => {
            const accounts = await fetchPatientAccounts(token);
            const [queueItems, bookingRes] = await Promise.all([
                receptionService.getQueueByDate(getTodayDateString(), token),
                receptionService.getBookings(token).catch(() => null),
            ]);

            const bookings =
                bookingRes && bookingRes.status !== 'error' && (bookingRes.code ?? 200) < 400
                    ? normalizeBookingListResponse(bookingRes.data ?? bookingRes)
                    : [];

            const fromPatients = searchPatientRecords('', accounts, queueItems);
            const fromBookings = searchPatientRecordsFromBookings('', bookings, queueItems);

            const seen = new Set<string>();
            const merged: PatientSearchResult[] = [];
            for (const item of [...fromPatients, ...fromBookings]) {
                const key = `${item.citizenId}:${item.accountId}:${item.queueId ?? ''}`;
                if (seen.has(key)) continue;
                seen.add(key);
                merged.push(item);
            }

            const sorted = merged.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
            setLocalStorageCache(CACHE_KEYS.PATIENT_LIST, sorted);
            return sorted;
        };

        if (cached && Array.isArray(cached) && cached.length > 0) {
            fetchFresh().catch(() => {});
            return cached;
        }

        return fetchFresh();
    },

    async searchPatients(query: string, token: string): Promise<PatientSearchResult[]> {
        const trimmed = query.trim();
        if (!trimmed) {
            return receptionService.listPatients(token);
        }

        let patientLoadError: Error | null = null;
        let accounts: ReceptionAccount[] = [];

        try {
            accounts = await fetchPatientAccounts(token);
        } catch (err) {
            patientLoadError =
                err instanceof Error ? err : new Error('Không tải được danh sách bệnh nhân.');
        }

        const [queueItems, bookingRes] = await Promise.all([
            receptionService.getQueueByDate(getTodayDateString(), token),
            receptionService.getBookings(token).catch(() => null),
        ]);

        const bookings =
            bookingRes && bookingRes.status !== 'error' && (bookingRes.code ?? 200) < 400
                ? normalizeBookingListResponse(bookingRes.data ?? bookingRes)
                : [];

        const fromPatients = searchPatientRecords(query, accounts, queueItems);
        const fromBookings = searchPatientRecordsFromBookings(query, bookings, queueItems);

        const seen = new Set<string>();
        const merged: PatientSearchResult[] = [];
        for (const item of [...fromPatients, ...fromBookings]) {
            const key = `${item.citizenId}:${item.accountId}:${item.queueId ?? ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(item);
        }

        if (merged.length === 0 && patientLoadError) {
            throw patientLoadError;
        }

        return merged.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    },

    async createPatientProfile(
        data: {
            citizen_id: string;
            full_name: string;
            dob: string;
            gender: Gender;
            medical_coverage_id?: string;
            phone?: string;
            email?: string;
        },
        token: string,
        debug?: (stage: string, data: unknown) => void,
    ): Promise<string> {
        const cleanCitizenId = data.citizen_id.replace(/\D/g, '');

        // 1. Kiểm tra nếu bệnh nhân đã có patient_id trong DB
        const existingPatientId = await resolvePatientIdByCitizenId(cleanCitizenId, token);
        if (existingPatientId) return existingPatientId;

        // 2. Tìm xem account_id đã tồn tại chưa
        let accountId: string | undefined = undefined;
        const existingAccounts = await fetchPatientAccounts(token).catch(() => []);
        const matchedAccount = existingAccounts.find(
            (a) => (a.citizen_id || '').replace(/\D/g, '') === cleanCitizenId,
        );
        if (matchedAccount?.account_id) {
            accountId = matchedAccount.account_id;
        }

        // 3. Nếu chưa có, BẮT BUỘC gọi POST /api/auth/register trước để tạo account
        if (!accountId) {
            const baseUser = buildUserNameFromFullName(data.full_name, 'bn');
            const user_name = `${baseUser}${cleanCitizenId.slice(-6)}`.toLowerCase();
            const email = data.email?.trim() || `bn.${cleanCitizenId.slice(-8)}@patient.triageflow.systems`;
            const suffix = cleanCitizenId.slice(-6) || '000000';
            const password = `Patient@${suffix}`;
            const phone = data.phone?.trim() || (`09${cleanCitizenId.slice(-8)}`).padEnd(10, '0');

            const registerPayload: RegisterRequest = {
                user_name,
                email,
                password,
                gender: data.gender,
                phone,
            };

            debug?.('auth.register.start', registerPayload);
            console.log('[createPatientProfile] Step 1: POST /api/auth/register:', registerPayload);

            try {
                const regRes = await authService.register(registerPayload);
                console.log('[createPatientProfile] Step 1 res:', regRes);
                const resData = regRes.data as any;
                accountId = resData?.id || resData?.account_id || resData?.data?.id || resData?.data?.account_id;
                debug?.('auth.register.success', { account_id: accountId });
            } catch (err) {
                console.warn('[createPatientProfile] Step 1 register exception:', err);
                debug?.('auth.register.failed_or_exists', { message: String(err) });
                
                // Nếu account đã tồn tại, tìm lại account_id từ danh sách bệnh nhân
                const accountsAfter = await fetchPatientAccounts(token).catch(() => []);
                const match = accountsAfter.find(
                    (a) => (a.citizen_id || '').replace(/\D/g, '') === cleanCitizenId,
                );
                if (match?.account_id) {
                    accountId = match.account_id;
                }
            }
        }

        // 4. Bước 2: Gọi POST /api/patient [STAFF - ADMIN] với account_id (không truyền phone vì BE báo property phone should not exist)
        const payload: Record<string, unknown> = {
            citizen_id: cleanCitizenId,
            full_name: data.full_name,
            dob: data.dob,
            gender: data.gender,
            medical_coverage_id: data.medical_coverage_id || 'N/A',
        };
        if (accountId) {
            payload.account_id = accountId;
        }

        debug?.('patient.createStaff.start', payload);
        console.log('[createPatientProfile] Step 2: POST /api/patient:', payload);

        const res = await apiClient.post<unknown>(
            '/api/patient',
            payload,
            { headers: { Authorization: `Bearer ${token}` } },
        );

        console.log('[createPatientProfile] Step 2 res:', res);

        if (res.status === 'error' || (typeof res.code === 'number' && res.code >= 400)) {
            const msg = (res.message || '').toLowerCase();
            if (msg.includes('exist') || msg.includes('tồn tại') || msg.includes('ton tai') || res.code === 409) {
                const existing = await resolvePatientIdByCitizenId(cleanCitizenId, token);
                if (existing) return existing;
            }
            const { message, detail } = resolveApiError(res, res.message || 'Không tạo được hồ sơ bệnh nhân.');
            throw new ApiError(res.code ?? 500, message, detail);
        }

        const patientId =
            extractPatientIdFromCreateResponse(res) ??
            (await resolvePatientIdByCitizenId(cleanCitizenId, token));

        if (!patientId) {
            throw new Error('Đã tạo bệnh nhân nhưng không nhận được patient_id từ DB.');
        }

        return patientId;
    },

    /**
     * BE lưu câu trả lời AI vào patient_anwser theo citizen_id → patient_id.
     * Form bước 1 có thông tin ≠ đã có bản ghi patient trong DB.
     */
    async ensurePatientProfileForTriage(
        data: {
            citizen_id: string;
            full_name: string;
            dob: string;
            gender: Gender;
            medical_coverage_id?: string;
            phone?: string;
            email?: string;
            known_patient_id?: string | null;
        },
        token: string,
        debug?: (stage: string, data: unknown) => void,
    ): Promise<string> {
        const cleanCitizenId = data.citizen_id.replace(/\D/g, '');
        const normalizedData = { ...data, citizen_id: cleanCitizenId };
        debug?.('patient.input', {
            citizen_id: cleanCitizenId,
            known_patient_id: normalizedData.known_patient_id ?? null,
            full_name: normalizedData.full_name,
            dob: normalizedData.dob,
            note: 'STAFF gọi POST /api/patient trực tiếp bằng token Lễ tân',
        });

        return receptionService.createPatientProfile(
            {
                citizen_id: normalizedData.citizen_id,
                full_name: normalizedData.full_name,
                dob: normalizedData.dob,
                gender: normalizedData.gender,
                medical_coverage_id: normalizedData.medical_coverage_id,
                phone: normalizedData.phone,
                email: normalizedData.email,
            },
            token,
            debug,
        );
    },

    async registerPatient(
        data: {
            email?: string;
            full_name: string;
            dob: string;
            password?: string;
            gender: Gender;
            citizen_id: string;
            phone?: string;
            bhyt?: string;
        },
        token: string,
        debug?: (stage: string, data: unknown) => void,
    ): Promise<string> {
        return receptionService.createPatientProfile(
            {
                citizen_id: data.citizen_id,
                full_name: data.full_name,
                dob: data.dob,
                gender: data.gender,
                medical_coverage_id: data.bhyt,
                phone: data.phone,
                email: data.email,
            },
            token,
            debug,
        );
    },

    resolvePatientIdByCitizenId,
    clearPatientCache: clearPatientLocalStorageCache,
};
