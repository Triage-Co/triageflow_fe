import { ApiError, apiClient, type ApiResponse } from '@/shared/services/apiClient';
import {
    DEFAULT_DIAGNOSIS_QUESTION_COUNT,
    type InfermedicaDiagnoseResult,
    type InfermedicaParseResult,
    type InfermedicaRecommendResult,
    type InfermedicaSearchItem,
    type InfermedicaTriagePayload,
    type InfermedicaTriageResult,
    type TriageConfigRule,
} from '@/modules/reception/types/infermedica.types';

const DIAGNOSIS_CONFIG_KEY = 'DIAGNOSIS_CONFIG';

export { extractApiErrorMessage } from '@/shared/utils/apiError';
import { resolveApiError } from '@/shared/utils/apiError';
import { sanitizeEvidenceForApi, normalizeDiagnoseResult } from '@/modules/reception/utils/infermedicaMapper';

function sanitizeTriagePayload(body: InfermedicaTriagePayload): InfermedicaTriagePayload {
    return {
        ...body,
        evidence: sanitizeEvidenceForApi(body.evidence),
    };
}

function assertInfermedicaSuccess<T>(res: ApiResponse<T>, fallbackMessage: string): ApiResponse<T> {
    if (res.status === 'error' || (typeof res.code === 'number' && res.code >= 400)) {
        const raw = res as ApiResponse<T> & { detail?: Record<string, unknown> | string };
        const detailStr =
            typeof raw.detail === 'string'
                ? raw.detail
                : raw.detail
                  ? JSON.stringify(raw.detail)
                  : '';
        if (raw.detail && typeof raw.detail === 'object' && raw.detail.code === 'P2003') {
            throw new ApiError(
                res.code ?? 500,
                'BE P2003: không lưu được patient_anwser vì patient_id không tồn tại cho CCCD gửi lên /diagnoise. (code 401 trong body ≠ hết hạn đăng nhập — đó là mã lỗi BE.)',
                detailStr,
            );
        }
        if (detailStr.includes('P2003') || detailStr.includes('patient_anwser_patient_id_fkey')) {
            throw new ApiError(
                res.code ?? 500,
                'BE P2003: không lưu được patient_anwser vì patient_id không tồn tại cho CCCD gửi lên /diagnoise. (code 401 trong body ≠ hết hạn đăng nhập — đó là mã lỗi BE.)',
                detailStr,
            );
        }
        const { message, detail } = resolveApiError(res, res.message || fallbackMessage);
        throw new ApiError(res.code ?? 500, message, detail);
    }
    return res;
}

function parseDiagnosisQuestionCount(configs: unknown): number {
    const list = Array.isArray(configs) ? configs : configs ? [configs] : [];
    const rule = list.find(
        (item): item is TriageConfigRule =>
            typeof item === 'object' &&
            item !== null &&
            'rule_key' in item &&
            (item as TriageConfigRule).rule_key === DIAGNOSIS_CONFIG_KEY,
    );
    const count = rule?.rule_value?.number_of_diagnoise;
    return typeof count === 'number' && count > 0 ? count : DEFAULT_DIAGNOSIS_QUESTION_COUNT;
}

export const infermedicaService = {
    async getDiagnosisQuestionCount(accessToken?: string): Promise<number> {
        try {
            const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
            const res = await apiClient.get<TriageConfigRule[] | TriageConfigRule>(
                '/api/triage-config',
                headers ? { headers } : undefined,
            );
            return parseDiagnosisQuestionCount(res.data);
        } catch {
            return DEFAULT_DIAGNOSIS_QUESTION_COUNT;
        }
    },
    async parseSymptoms(body: { question: string; age: number }) {
        const res = await apiClient.post<InfermedicaParseResult>('/api/infermedica/parse', body);
        return assertInfermedicaSuccess(res, 'Không phân tích được triệu chứng.');
    },

    async diagnose(
        body: InfermedicaTriagePayload,
        citizenId: string,
        interviewToken?: string,
        accessToken?: string,
    ) {
        const cleanCitizenId = citizenId.replace(/\D/g, '');
        const params = new URLSearchParams({ citizen_id: cleanCitizenId });
        if (interviewToken) params.set('interview_token', interviewToken);
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const res = await apiClient.post<InfermedicaDiagnoseResult>(
            `/api/infermedica/diagnoise?${params.toString()}`,
            sanitizeTriagePayload(body),
            headers ? { headers } : undefined,
        );
        const asserted = assertInfermedicaSuccess(res, 'Không thực hiện được chẩn đoán AI.');
        const normalized = normalizeDiagnoseResult(asserted.data);
        return {
            ...asserted,
            data: normalized ?? asserted.data,
        };
    },

    async syncInterviewToken(
        body: InfermedicaTriagePayload,
        citizenId: string,
        interviewToken: string,
        accessToken?: string,
    ): Promise<string> {
        if (!interviewToken) return '';
        try {
            const res = await this.diagnose(body, citizenId, interviewToken, accessToken);
            if (res.status === 'error' || (typeof res.code === 'number' && res.code >= 400)) {
                return interviewToken;
            }
            return res.data?.interview_token?.trim() || interviewToken.trim();
        } catch {
            return interviewToken;
        }
    },

    async getTriageLevel(body: InfermedicaTriagePayload, accessToken?: string) {
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const res = await apiClient.post<InfermedicaTriageResult>(
            '/api/infermedica/triage',
            sanitizeTriagePayload(body),
            headers ? { headers } : undefined,
        );
        return assertInfermedicaSuccess(res, 'Không lấy được mức độ triage.');
    },

    async recommendSpecialist(
        body: InfermedicaTriagePayload,
        interviewToken: string,
        accessToken?: string,
    ) {
        if (!interviewToken) {
            throw new ApiError(
                400,
                'Thiếu interview_token — hãy trả lời đủ câu hỏi phỏng vấn trước khi gợi ý chuyên khoa.',
            );
        }
        const params = new URLSearchParams({ interview_token: interviewToken });
        const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
        const res = await apiClient.post<InfermedicaRecommendResult>(
            `/api/infermedica/recommend_specialist?${params.toString()}`,
            sanitizeTriagePayload(body),
            headers ? { headers } : undefined,
        );
        return assertInfermedicaSuccess(
            res,
            'Không gợi ý được chuyên khoa — phiên phỏng vấn có thể đã hết hạn, hãy phân tích lại.',
        );
    },

    searchSymptoms(phrase: string, age: number) {
        const params = new URLSearchParams({
            phrase: phrase.trim(),
            age: String(age),
        });
        return apiClient.get<InfermedicaSearchItem[]>(`/api/infermedica/search?${params.toString()}`);
    },
};
