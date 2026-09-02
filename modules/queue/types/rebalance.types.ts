export interface RebalanceSuggestionData {
    suggestion_id: string;
    from_room_id: string;
    from_room_name: string;
    to_room_id: string;
    to_room_name: string;
    queue_id: string;
    queue_number: string | number;
    patient_name: string;
    eta_gain_minutes: number;
    expires_at: string;
    service_id?: string;
    status?: string;
}

export interface RebalanceResolvedData {
    suggestion_id: string;
    status: 'CONFIRMED' | 'REJECTED' | string;
}

/** TV overlay after a suggestion is confirmed (source room). */
export interface RedirectedPatient {
    queue_number: string | number;
    patient_name: string;
    to_room_name: string;
    expires_at?: string;
}
