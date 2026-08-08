import { apiClient } from '@/shared/services/apiClient';
import type {
    CreateExamPackageDto,
    ExamPackage,
    QueryExamPackageParams,
    UpdateExamPackageDto,
} from '../types/examPackage.types';

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

export function extractExamPackageList(raw: unknown): ExamPackage[] {
    if (Array.isArray(raw)) return raw as ExamPackage[];
    const root = asRecord(raw);
    if (!root) return [];
    if (Array.isArray(root.data)) return root.data as ExamPackage[];
    return [];
}

function buildQuery(params: QueryExamPackageParams = {}): string {
    const search = new URLSearchParams();
    if (params.is_active !== undefined) search.set('is_active', String(params.is_active));
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

export const examPackageService = {
    getPackages: (token: string, params: QueryExamPackageParams = {}) =>
        apiClient.get<unknown>(`/api/exam-package${buildQuery(params)}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    getPackageById: (id: string, token: string) =>
        apiClient.get<ExamPackage>(`/api/exam-package/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    createPackage: (body: CreateExamPackageDto, token: string) =>
        apiClient.post<ExamPackage>('/api/exam-package', body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    updatePackage: (id: string, body: UpdateExamPackageDto, token: string) =>
        apiClient.patch<ExamPackage>(`/api/exam-package/${id}`, body, {
            headers: { Authorization: `Bearer ${token}` },
        }),

    /** Soft-disable via DELETE; BE returns 409 if the package still has service order refs. */
    deletePackage: (id: string, token: string) =>
        apiClient.delete<ExamPackage>(`/api/exam-package/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        }),
};
