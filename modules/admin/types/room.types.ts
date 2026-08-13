import type { Specialty } from './specialty.types';

export type { Specialty };

export interface HospitalRoom {
    room_id: string;
    room_name: string;
    physical_room_id: string | null;
    specialty_id: string;
    specialty?: Specialty;
    /** Present on some BE payloads — used to match CLS services */
    room_type?: string | null;
}

export interface CreateRoomDto {
    room_name: string;
    specialty_id: string;
}

export interface UpdateRoomDto {
    room_name?: string;
    specialty_id?: string;
}
