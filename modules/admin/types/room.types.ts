export interface HospitalRoom {
    room_id: string;
    room_name: string;
    physical_room_id: string | null;
    specialty_id: string;
}

export interface CreateRoomDto {
    room_name: string;
    specialty_id: string;
}

export interface UpdateRoomDto {
    room_name?: string;
    specialty_id?: string;
}
