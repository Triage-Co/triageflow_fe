import {
    clinicalService,
    type BackendQueuePatient,
} from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { apiClient, ApiError, type ApiResponse } from '@/shared/services/apiClient';
import { resolveApiError } from '@/shared/utils/apiError';
import type {
    CreateBookingRecommendRequest,
    CreateBookingRequest,
    PatientSearchResult,
    ReceptionAccount,
    ReceptionFlow,
    ReceptionSlot,
    ReceptionSpecialty,
} from '@/modules/reception/types/reception.types';
import type { Gender } from '@/shared/types/auth.types';
import {
    getTodayDateString,
    extractBookingCreateFields,
    extractBookingFlowFields,
    extractRealPatientId,
    mapDoctorSlotsResponse,
    mapDoctorSpecialtyResponse,
    mapSpecialtyCatalogResponse,
    mapPatientRecordToAccount,
    normalizeBookingListResponse,
    normalizePatientListResponse,
} from '@/modules/reception/utils/receptionMapper';
import { searchPatientRecords } from '@/modules/reception/utils/receptionSearch';

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

async function fetchPatientAccounts(
    token: string,
    params?: { search?: string; page?: number; limit?: number },
): Promise<ReceptionAccount[]> {
    const isSearch = !!params?.search;
    const cached = isSearch ? null : getLocalStorageCache<ReceptionAccount[]>(CACHE_KEYS.PATIENT_ACCOUNTS);

    const fetchFresh = async (): Promise<ReceptionAccount[]> => {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.page) queryParams.append('page', String(params.page));
        if (params?.limit) queryParams.append('limit', String(params.limit));

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

        const res = await apiClient.get<unknown>(`/api/patient${queryString}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 'error' || (typeof res.code === 'number' && res.code >= 400)) {
            throw new ApiError(res.code ?? 500, res.message || 'Không tải được danh sách bệnh nhân.');
        }

        const records = normalizePatientListResponse(res.data ?? res);
        const mapped = records
            .map(mapPatientRecordToAccount)
            .filter((a) => a.citizen_id || a.full_name || a.email);

        if (!isSearch) {
            setLocalStorageCache(CACHE_KEYS.PATIENT_ACCOUNTS, mapped);
        }
        return mapped;
    };

    if (cached && Array.isArray(cached) && cached.length > 0) {
        fetchFresh().catch(() => { });
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
                // Tiếp tục fallback
            }

            return [];
        };

        const cached = getLocalStorageCache<BackendQueuePatient[]>(cacheKey);
        if (cached && Array.isArray(cached) && cached.length > 0) {
            fetchFreshData().catch(() => { });
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

    getFlows: (token: string) =>
        apiClient.get<ReceptionFlow[]>('/api/flow', {
            headers: { Authorization: `Bearer ${token}` },
        }),

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

    async createBookingCash(data: { patient_id: string; slot_id: string }, token: string) {
        const res = await apiClient.post<Record<string, unknown>>('/api/booking/cash', data, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return assertApiSuccess(res, 'Không tạo được lịch khám tiền mặt.');
    },

    async createBookingWithPackage(data: { patient_id: string; slot_id: string; package_id: string; return_url?: string; cancel_url?: string }, token: string) {
        const res = await apiClient.post<Record<string, unknown>>('/api/booking/with-package', {
            ...data,
            return_url: data.return_url || 'https://triageflow.me/payment/success',
            cancel_url: data.cancel_url || 'https://triageflow.me/payment/cancel',
        }, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return assertApiSuccess(res, 'Không tạo được lịch khám theo gói.');
    },

    async getExamPackages(token?: string) {
        const res = await apiClient.get<unknown>('/api/exam-package', {
            ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        });
        const list = (res as { data?: unknown }).data ?? res;
        return Array.isArray(list) ? (list as import('@/modules/reception/types/reception.types').ExamPackage[]) : [];
    },

    async getExamPackageDetail(id: string, token?: string) {
        const res = await apiClient.get<unknown>(`/api/exam-package/${encodeURIComponent(id)}`, {
            ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        });
        return ((res as { data?: unknown }).data ?? res) as import('@/modules/reception/types/reception.types').ExamPackageDetail;
    },

    async getRoomSlots(date: string, token?: string, roomId = 'd6b5891e-3d1c-44f1-9636-aaeb66fae2d5') {
        const res = await apiClient.get<unknown>(
            `/api/room/${encodeURIComponent(roomId)}/slots?date=${encodeURIComponent(date)}`,
            {
                ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
            },
        );
        const list = (res as { data?: unknown }).data ?? res;
        return Array.isArray(list) ? (list as import('@/modules/reception/types/reception.types').RoomSlot[]) : [];
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

        // 1. Kiểm tra chi tiết Step (nếu BE đã cấp queue cho step)
        if (!fields.queueNumber && fields.stepId) {
            try {
                const stepData = await receptionService.getStepDetail(fields.stepId, token);
                if (stepData?.queues && Array.isArray(stepData.queues) && stepData.queues.length > 0 && stepData.queues[0]?.queue_number) {
                    fields = {
                        ...fields,
                        queueNumber: String(stepData.queues[0].queue_number),
                        queueId: stepData.queues[0].queue_id,
                    };
                }
            } catch {
                // bỏ qua
            }
        }

        // 2. Ưu tiên kiểm tra hàng đợi hôm nay (nếu BE/Webhook đã tự động tạo queue)
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

    /** Lấy toàn bộ bệnh nhân từ GET /api/patient (DB). */
    async listPatients(token: string): Promise<PatientSearchResult[]> {
        const cached = getLocalStorageCache<PatientSearchResult[]>(CACHE_KEYS.PATIENT_LIST);

        const fetchFresh = async (): Promise<PatientSearchResult[]> => {
            const accounts = await fetchPatientAccounts(token);
            const results = searchPatientRecords('', accounts, []);
            const sorted = results.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
            setLocalStorageCache(CACHE_KEYS.PATIENT_LIST, sorted);
            return sorted;
        };

        if (cached && Array.isArray(cached) && cached.length > 0) {
            fetchFresh().catch(() => { });
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
            accounts = await fetchPatientAccounts(token, { search: trimmed });
        } catch (err) {
            patientLoadError =
                err instanceof Error ? err : new Error('Không tải được danh sách bệnh nhân.');
        }

        const results = searchPatientRecords('', accounts, []);

        if (results.length === 0 && patientLoadError) {
            throw patientLoadError;
        }

        return results.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
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
            account_id?: string;
        },
        token: string,
        debug?: (stage: string, data: unknown) => void,
    ): Promise<string> {
        const cleanCitizenId = data.citizen_id.replace(/\D/g, '');

        // 1. Kiểm tra nếu bệnh nhân đã có patient_id trong DB
        const existingPatientId = await resolvePatientIdByCitizenId(cleanCitizenId, token);
        if (existingPatientId) return existingPatientId;

        // 2. Lấy account_id của lễ tân (từ param hoặc từ auth store user.id)
        const currentUser = useAuthStore.getState().user;
        const staffAccountId = data.account_id || (currentUser as any)?.account_id || currentUser?.id || undefined;

        // 3. Gọi trực tiếp POST /api/patient bằng token Lễ tân
        const payload: Record<string, unknown> = {
            citizen_id: cleanCitizenId,
            full_name: data.full_name,
            dob: data.dob,
            gender: data.gender,
            medical_coverage_id: data.medical_coverage_id || 'N/A',
        };
        if (staffAccountId) {
            payload.account_id = staffAccountId;
        }

        debug?.('patient.createStaff.start', payload);
        console.log('[createPatientProfile] POST /api/patient:', payload);

        const res = await apiClient.post<unknown>(
            '/api/patient',
            payload,
            { headers: { Authorization: `Bearer ${token}` } },
        );

        console.log('[createPatientProfile] POST /api/patient res:', res);

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

    async getPatientActiveFlows(patientId: string, token: string): Promise<any[]> {
        try {
            const res = await apiClient.get<any>(
                `/api/flow/patient/${encodeURIComponent(patientId)}/active`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const data = (res as any)?.data || res;
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.data)) return data.data;
            if (data && typeof data === 'object' && (data.flow_id || Array.isArray(data.steps))) return [data];
            return [];
        } catch (err) {
            console.error('[receptionService] getPatientActiveFlows error:', err);
            return [];
        }
    },

    async getStepDetail(stepId: string, token: string): Promise<any> {
        try {
            const res = await apiClient.get<any>(
                `/api/step/${encodeURIComponent(stepId)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            return (res as any)?.data || res;
        } catch (err) {
            console.error('[receptionService] getStepDetail error:', err);
            return null;
        }
    },

    async getPendingServiceOrders(patientId: string, token: string): Promise<any[]> {
        try {
            const res = await apiClient.get<any>(
                `/api/service-order/pending/${encodeURIComponent(patientId)}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            const data = (res as any)?.data || res;
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.data)) return data.data;
            return [];
        } catch (err) {
            console.error('[receptionService] getPendingServiceOrders error:', err);
            return [];
        }
    },

    async payCashServiceOrder(
        serviceOrderId: string,
        token: string,
    ): Promise<any> {
        try {
            const res = await apiClient.post<any>(
                '/api/transaction/cash',
                {
                    service_order_id: serviceOrderId,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                },
            );
            return res?.data || res;
        } catch (err) {
            console.error('[receptionService] payCashServiceOrder error:', err);
            throw err;
        }
    },

    resolvePatientIdByCitizenId,
    clearPatientCache: clearPatientLocalStorageCache,
};
