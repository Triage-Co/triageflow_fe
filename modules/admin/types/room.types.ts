import type { Specialty } from './specialty.types';

export type { Specialty };

export interface PhysicalRoomItem {
    id: string;
    floorId: string;
    roomCode: string;
    roomLabel: string;
}

export interface HospitalRoom {
    room_id: string;
    room_name: string;
    physical_room_id?: string | null;
    physical_room?: PhysicalRoomItem | null;
    specialty_id?: string | null;
    specialty?: Specialty;
    /** Present on some BE payloads — used to match CLS services */
    room_type?: string | null;
}

export interface CreateRoomDto {
    room_name: string;
    room_type: string;
    specialty_id?: string;
    physical_room_id?: string | null;
}

export interface UpdateRoomDto {
    room_name?: string;
    room_type?: string;
    specialty_id?: string;
    physical_room_id?: string | null;
}
