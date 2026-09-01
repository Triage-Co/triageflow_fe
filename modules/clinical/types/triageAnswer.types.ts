export interface TriageAnswerDetail {
    id: string;
    choice_id: 'present' | 'absent' | string;
    name?: string;
    choice_label?: string;
}

export interface TriageHistoryItem {
    turn: number;
    question_text: string;
    question_type?: 'initial' | 'single' | 'group_single' | string;
    answers?: TriageAnswerDetail[];
    answer?: TriageAnswerDetail;
}

export interface QuestionnaireData {
    age?: number;
    sex?: 'male' | 'female' | string;
    history: TriageHistoryItem[];
}

export interface LatestTriageAnswerData {
    patient_answer_id: string;
    patient_id: string;
    citizen_id?: string;
    questionnaire_data: QuestionnaireData;
    created_at: string;
    updated_at?: string;
}

export interface LatestTriageAnswerResponse {
    code: number;
    message: string;
    status: string;
    data: LatestTriageAnswerData;
}
