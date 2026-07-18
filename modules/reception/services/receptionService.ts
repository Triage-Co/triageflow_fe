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

async function fetchPatientAccounts(token: string): Promise<ReceptionAccount[]> {
    const res = await apiClient.get<unknown>('/api/patient', {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 'error' || (typeof res.code === 'number' && res.code >= 400)) {
        throw new ApiError(res.code ?? 500, res.message || 'Không tải được danh sách bệnh nhân.');
    }

    const records = normalizePatientListResponse(res.data ?? res);
    return records
        .map(mapPatientRecordToAccount)
        .filter((a) => a.citizen_id || a.full_name || a.email);
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

    /** Lễ tân không có quyền GET /api/doctor/patients — dùng booking/flow thay thế. */
    async getQueueByDate(_date: string, _token: string): Promise<BackendQueuePatient[]> {
        return [];
    },

    getPatientByQueueId: (queueId: string, token: string) =>
        clinicalService.getPatientByQueueId(queueId, token),

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

    generateBookingNumber: (stepId: string, token: string) =>
        apiClient.get<unknown>(
            `/api/booking/generate?step-id=${encodeURIComponent(stepId)}`,
            { headers: { Authorization: `Bearer ${token}` } },
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

        if (!fields.queueNumber && fields.stepId) {
            try {
                const genRes = await receptionService.generateBookingNumber(fields.stepId, token);
                const generated = extractBookingCreateFields(genRes.data);
                mergeFields(generated);
            } catch {
                // BE có thể đã trả queue_number trong response create
            }
        }

        if (!fields.queueNumber) {
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
        }

        return fields;
    },

    async createTransaction(data: CreateTransactionRequest, token: string) {
        const res = await apiClient.post<TransactionQrResponse>('/api/transaction', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return assertApiSuccess(res, 'Tạo link thanh toán không thành công.');
    },

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

        return merged.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
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
        },
        token: string,
    ): Promise<string | null> {
        // Swagger: POST /api/patient/me = [USER] tạo BN của chính user.
        // Token lễ tân (STAFF) gọi endpoint này thường bị 401 — không dùng làm cách tạo chính.
        const res = await apiClient.post<unknown>(
            '/api/patient/me',
            {
                citizen_id: data.citizen_id,
                full_name: data.full_name,
                dob: data.dob,
                gender: data.gender,
                medical_coverage_id: data.medical_coverage_id || 'N/A',
            },
            { headers: { Authorization: `Bearer ${token}` } },
        );

        if (res.status === 'error' || (typeof res.code === 'number' && res.code >= 400)) {
            const msg = (res.message || '').toLowerCase();
            if (msg.includes('exist') || msg.includes('tồn tại') || msg.includes('ton tai') || res.code === 409) {
                return resolvePatientIdByCitizenId(data.citizen_id, token);
            }
            const { message, detail } = resolveApiError(res, res.message || 'Không tạo được hồ sơ bệnh nhân.');
            throw new ApiError(res.code ?? 500, message, detail);
        }

        return (
            extractPatientIdFromCreateResponse(res) ??
            (await resolvePatientIdByCitizenId(data.citizen_id, token))
        );
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
            note: 'STAFF chỉ GET /api/patient; tạo BN phải register + login BN + POST /api/patient/me',
        });

        const existingPatientId = await resolvePatientIdByCitizenId(normalizedData.citizen_id, token);
        debug?.('patient.lookup-db', {
            resolved_patient_id: existingPatientId,
            known_patient_id: normalizedData.known_patient_id ?? null,
        });
        if (existingPatientId) return existingPatientId;

        // Không gọi /patient/me bằng token STAFF — sẽ 401.
        // Tạo account BN → login bằng account đó → POST /patient/me bằng token BN.
        const email =
            normalizedData.email?.trim() || `bn.${normalizedData.citizen_id.slice(-8)}@patient.triageflow.me`;
        const suffix = normalizedData.citizen_id.slice(-6) || '000000';
        const password = `Patient@${suffix}`;

        try {
            debug?.('patient.register+create-as-user.start', { email });
            const patientId = await receptionService.registerPatient(
                {
                    email,
                    full_name: normalizedData.full_name,
                    dob: normalizedData.dob,
                    password,
                    gender: normalizedData.gender,
                    citizen_id: normalizedData.citizen_id,
                    phone: normalizedData.phone?.trim() || undefined,
                    bhyt: normalizedData.medical_coverage_id,
                },
                token,
                debug,
            );
            debug?.('patient.register+create-as-user.result', { patient_id: patientId });
            if (patientId) return patientId;
        } catch (err) {
            debug?.('patient.register+create-as-user.error', {
                message: err instanceof Error ? err.message : String(err),
            });
        }

        const finalPatientId = await resolvePatientIdByCitizenId(normalizedData.citizen_id, token);
        debug?.('patient.final-lookup', { resolved_patient_id: finalPatientId });
        if (!finalPatientId) {
            throw new Error(
                `Không có patient_id trong DB cho CCCD ${cleanCitizenId}. ` +
                    'Lễ tân không tạo được BN qua /api/patient/me (chỉ USER). ' +
                    'Hãy chọn BN đã có trong Tra cứu, hoặc BE cần thêm API STAFF tạo patient.',
            );
        }
        return finalPatientId;
    },

    async registerPatient(
        data: {
            email: string;
            full_name: string;
            dob: string;
            password: string;
            gender: Gender;
            citizen_id: string;
            phone?: string;
            bhyt?: string;
        },
        token: string,
        debug?: (stage: string, data: unknown) => void,
    ): Promise<string> {
        const citizenId = data.citizen_id.replace(/\D/g, '');
        const payload: RegisterRequest = {
            user_name: buildUserNameFromFullName(data.full_name, `bn${citizenId.slice(-6)}`),
            email: data.email,
            password: data.password,
            gender: data.gender,
            phone: data.phone?.trim() || '0000000000',
        };

        try {
            const res = await authService.register(payload);
            debug?.('auth.register', {
                ok: true,
                account_id:
                    (res.data as { account_id?: string }).account_id ?? res.data.id ?? null,
            });
        } catch (err) {
            // Account có thể đã tồn tại — vẫn login để tạo patient/me
            debug?.('auth.register', {
                ok: false,
                message: err instanceof Error ? err.message : String(err),
                next: 'thử login bằng email BN',
            });
        }

        // Bắt buộc: POST /api/patient/me bằng token của USER bệnh nhân, không dùng token STAFF
        const loginRes = await authService.login({
            email: data.email,
            password: data.password,
        });
        const patientToken = loginRes.data?.token;
        if (!patientToken) {
            throw new Error('Đăng ký được account nhưng không login được để tạo hồ sơ patient.');
        }
        debug?.('auth.login-as-patient', { email: data.email, has_token: true });

        const createRes = await apiClient.post<unknown>(
            '/api/patient/me',
            {
                citizen_id: citizenId,
                full_name: data.full_name,
                dob: data.dob,
                gender: data.gender,
                medical_coverage_id: data.bhyt || 'N/A',
            },
            { headers: { Authorization: `Bearer ${patientToken}` } },
        );

        if (createRes.status === 'error' || (typeof createRes.code === 'number' && createRes.code >= 400)) {
            const msg = (createRes.message || '').toLowerCase();
            if (!(msg.includes('exist') || msg.includes('tồn tại') || msg.includes('ton tai') || createRes.code === 409)) {
                const { message, detail } = resolveApiError(
                    createRes,
                    createRes.message || 'Không tạo được hồ sơ patient bằng token BN.',
                );
                throw new ApiError(createRes.code ?? 500, message, detail);
            }
            debug?.('patient.me.exists', { message: createRes.message });
        } else {
            debug?.('patient.me.created', {
                patient_id: extractPatientIdFromCreateResponse(createRes),
            });
        }

        // Staff token đọc lại danh sách để lấy patient_id
        const patientId =
            extractPatientIdFromCreateResponse(createRes) ??
            (await resolvePatientIdByCitizenId(citizenId, token));
        if (!patientId) {
            throw new Error('Đã gọi /api/patient/me nhưng staff vẫn không thấy patient_id trong GET /api/patient.');
        }
        return patientId;
    },

    resolvePatientIdByCitizenId,
};
