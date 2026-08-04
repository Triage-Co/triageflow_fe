import { apiClient } from '@/shared/services/apiClient';
import {
    InfermedicaSymptomRef,
    InfermedicaEvidence,
    InfermedicaDiagnoseResponse,
    InfermedicaRecommendedSpecialist
} from '../types/triage.types';

export const triageService = {

    searchSymptoms: (phrase: string, age: number) => {
        const queryParams = new URLSearchParams({
            age: age.toString(),
            phrase: phrase,
        });
        return apiClient.get<InfermedicaSymptomRef[]>(`/api/infermedica/search?${queryParams.toString()}`);
    },

    diagnose: (
        payload: { sex: string; age: number; evidence: InfermedicaEvidence[] },
        citizenId: string,
        token?: string
    ) => {
        const queryParams = new URLSearchParams({ citizen_id: citizenId });
        if (token) {
            queryParams.append('interview_token', token);
        }
        return apiClient.post<InfermedicaDiagnoseResponse>(
            `/api/infermedica/diagnoise?${queryParams.toString()}`,
            payload
        );
    },

    recommendSpecialist: (
        payload: { sex: string; age: number; evidence: InfermedicaEvidence[] },
        token: string
    ) => {
        const queryParams = new URLSearchParams({ interview_token: token });
        return apiClient.post<InfermedicaRecommendedSpecialist[]>(
            `/api/infermedica/recommend_specialist?${queryParams.toString()}`,
            payload
        );
    }
};