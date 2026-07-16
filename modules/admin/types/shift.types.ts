export interface Shift {
    shift_id: string;
    staff_id: string;
    room_id: string;
    date: string;
    start_time: string;
    end_time: string;
    createdAt: string;
    updatedAt: string;
    physicalRoomId: string | null;
}

export interface CreateShiftDto {
    staff_id: string;
    room_id: string;
    date: string;
    start_time: string;
    end_time: string;
}
