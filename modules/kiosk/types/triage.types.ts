export interface SymptomItem {
    id: string;
    labelVn: string;
    labelEn: string;
    categoryNameVn?: string;
}

export interface InfermedicaSymptomRef {
    id: string;
    label: string;
}

export interface InfermedicaEvidence {
    id: string;
    choice_id: 'present' | 'absent' | 'unknown';
}

export interface InfermedicaQuestionItem {
    id: string;
    name: string;
    choices: Array<{
        id: 'present' | 'absent' | 'unknown';
        label: string;
    }>;
}

export interface InfermedicaQuestion {
    type: 'single' | 'group_single' | 'group_multiple';
    text: string;
    items: InfermedicaQuestionItem[];
    extras: Record<string, any>;
}

export interface InfermedicaDiagnoseResponse {
    question: InfermedicaQuestion | null;
    conditions: Array<{
        id: string;
        name: string;
        common_name: string;
        probability: number;
    }>;
    extras: Record<string, any>;
    has_emergency_evidence: boolean;
    interview_token: string;
    should_stop: boolean;
}

export interface InfermedicaRecommendedSpecialist {
    id?: string;
    specialty_id?: string;
    specialty_code?: string;
    name: string;
}

export interface ApiResponse<T> {
    code: number;
    status: 'success' | 'error';
    message: string;
    data: T;
}