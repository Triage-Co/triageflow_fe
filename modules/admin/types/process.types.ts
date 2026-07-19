export interface Room {
    room_id: string;
    room_name: string;
    physical_room_id: string | null;
    specialty_id: string | null;
}

export interface FlowStep {
    step_id: string;
    flow_id: string;
    room_id: string;
    staff_id: string | null;
    step_status: 'PENDING' | 'RUNNING' | 'FINISHED' | 'IN_PROGRESS' | string;
    docNo: number | null;
    payment_status: 'PENDING' | 'SUCCESSED' | 'FAILED' | string;
    parent_step_id: string | null;
    physicalRoomId: string | null;
    
    // API updates support
    room_info?: {
        room_name: string;
        room_id: string;
    };
    specialty_info?: {
        specialty_name: string;
        specialty_id: string;
    } | null;
    staff_info?: {
        staff_id: string;
        full_name: string;
    } | null;
    depends_on?: string[];
    sub_steps?: FlowStep[];

    // Legacy fields mapping support
    room?: Room;
    dependencies?: string[];
    sub_step?: FlowStep[];
    parent_step?: FlowStep | null;
}

export interface Flow {
    flow_id: string;
    booking_id: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | string;
    steps: FlowStep[];
    current_processing_steps?: string[];
}

export interface FlowApiResponse {
    code: number;
    message: string;
    status: string;
    data: Flow[];
}
