export interface InfermedicaEvidence {
    id: string;
    choice_id: 'present' | 'absent' | 'unknown' | string;
    /** Chỉ gửi cho triệu chứng ban đầu (parse/search) — phỏng vấn động không có source. */
    source?: 'initial' | 'suggest' | 'predefined' | 'red_flags';
}

export interface InfermedicaMention {
    id: string;
    name: string;
    common_name?: string;
    type?: string;
    choice_id?: string;
}

export interface InfermedicaQuestionChoice {
    id: string;
    label: string;
}

export interface InfermedicaQuestionItem {
    id: string;
    name: string;
    choices: InfermedicaQuestionChoice[];
}

export interface InfermedicaQuestion {
    type: string;
    text: string;
    items: InfermedicaQuestionItem[];
}

export interface InfermedicaSearchItem {
    id: string;
    label: string;
}

export interface InfermedicaParseResult {
    mentions: InfermedicaMention[];
    obvious?: boolean;
}

export interface InfermedicaDiagnoseResult {
    question?: InfermedicaQuestion;
    conditions?: Array<{
        id: string;
        name: string;
        common_name?: string;
        probability?: number;
    }>;
    interview_token: string;
    has_emergency_evidence?: boolean;
    should_stop?: boolean;
}

export interface InfermedicaTriageResult {
    triage_level: string;
    serious?: Array<{
        id: string;
        name: string;
        common_name?: string;
        is_emergency?: boolean;
    }>;
    root_cause?: string;
    teleconsultation_applicable?: boolean;
}

export interface InfermedicaRecommendedSpecialist {
    /** Mã Infermedica (sp_XX) hoặc mã bệnh viện (SP_X) */
    id?: string;
    specialty_id?: string;
    specialty_code?: string;
    name: string;
}

export interface InfermedicaRecommendResult {
    recommended_specialist?: InfermedicaRecommendedSpecialist;
    recommended_channel?: string;
}

export interface InfermedicaTriagePayload {
    sex: string;
    age: number;
    evidence: InfermedicaEvidence[];
}

export interface TriageConfigRule {
    rule_key: string;
    rule_value?: {
        number_of_diagnoise?: number;
    };
}

export const DEFAULT_DIAGNOSIS_QUESTION_COUNT = 5;

export interface SymptomTriageSession {
    interview_token: string;
    evidence: InfermedicaEvidence[];
    triage_level: string | null;
    triage_label: string | null;
    recommended_specialist: InfermedicaRecommendedSpecialist | null;
    pending_question: InfermedicaQuestion | null;
    /** Chỉ số câu hỏi con đang hiển thị (mỗi lần 1 câu) */
    pending_item_index: number;
    /** Khoa được AI gợi ý — map với grid chuyên khoa */
    recommended_department_id: string | null;
    recommended_department_label: string | null;
    is_analyzed: boolean;
    is_emergency: boolean;
    /** Số câu hỏi phỏng vấn user đã trả lời */
    questions_answered: number;
    /** Số câu bắt buộc từ BE (triage-config DIAGNOSIS_CONFIG) */
    required_questions: number;
    /** Ghi chú khi không gợi ý được chuyên khoa */
    routing_note?: string | null;
}

export const EMPTY_TRIAGE_SESSION: SymptomTriageSession = {
    interview_token: '',
    evidence: [],
    triage_level: null,
    triage_label: null,
    recommended_specialist: null,
    pending_question: null,
    pending_item_index: 0,
    recommended_department_id: null,
    recommended_department_label: null,
    is_analyzed: false,
    is_emergency: false,
    questions_answered: 0,
    required_questions: DEFAULT_DIAGNOSIS_QUESTION_COUNT,
};
