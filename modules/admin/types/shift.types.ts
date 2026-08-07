export interface Shift {
    shift_id: string;
    staff_id: string;
    room_id: string;
    date: string;
    start_time: string;
    end_time: string;
    createdAt?: string;
    updatedAt?: string;
    physicalRoomId?: string | null;
}

export interface CreateShiftDto {
    staff_id: string;
    room_id: string;
    date: string;
    start_time: string;
    end_time: string;
}

export interface BulkWeeklyAssignment {
    room_id: string;
    staff_id: string;
}

export interface BulkWeeklyShiftDto {
    /** Monday of the target week, `yyyy-MM-dd`, Asia/Ho_Chi_Minh */
    week_start: string;
    /** 0 = Monday ... 6 = Sunday */
    days: number[];
    start_time: string;
    end_time: string;
    assignments: BulkWeeklyAssignment[];
    skip_conflicts?: boolean;
}

export interface BulkWeeklySkipped {
    room_id: string;
    staff_id: string;
    date: string;
    reason: string;
}

export interface BulkWeeklyResult {
    created: number;
    skipped: BulkWeeklySkipped[];
    errors: unknown[];
}
