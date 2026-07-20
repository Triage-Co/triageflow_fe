export interface Specialty {
    specialty_id: string;
    specialty_code: string;
    specialty_name: string;
    description: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface HospitalRoom {
    room_id: string;
    room_name: string;
    physical_room_id: string | null;
    specialty_id: string;
    specialty?: Specialty;
}

export interface CreateRoomDto {
    room_name: string;
    specialty_id: string;
}

export interface UpdateRoomDto {
    room_name?: string;
    specialty_id?: string;
}
