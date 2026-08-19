export interface ShiftStaff {
    staff_id: string;
    full_name: string;
}

export interface ShiftRoomSpecialty {
    specialty_id: string;
    specialty_name: string;
    specialty_code: string;
}

export interface ShiftRoom {
    room_id: string;
    room_name: string;
    room_type?: string | null;
    specialty_id?: string | null;
    physical_room_id?: string | null;
    specialty?: ShiftRoomSpecialty | null;
}

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
    room?: ShiftRoom;
    staff?: ShiftStaff | null;
    staff_name?: string;
}

export interface QueryShiftParams {
    date?: string;
    from?: string;
    to?: string;
    room_id?: string;
    staff_id?: string;
    page?: number;
    limit?: number;
}

export interface ShiftListMeta {
    total: number;
    page: number;
    limit: number;
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

export interface BulkImportShiftItem {
    staff_id: string;
    room_id: string;
    date: string;
    start_time: string;
    end_time: string;
}

export interface BulkImportShiftDto {
    items: BulkImportShiftItem[];
    skip_conflicts?: boolean;
}
