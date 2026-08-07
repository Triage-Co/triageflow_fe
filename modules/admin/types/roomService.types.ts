import type { CatalogService } from './service.types';
import type { HospitalRoom } from './room.types';

export interface RoomServiceMapping {
    id: string;
    room_id: string;
    service_id: string;
    is_active: boolean;
    createdAt?: string;
    updatedAt?: string;
    service?: Pick<CatalogService, 'service_id' | 'service_code' | 'service_name' | 'service_type' | 'price' | 'is_active'> & {
        service_id?: string;
    };
    room?: Pick<HospitalRoom, 'room_id' | 'room_name' | 'room_type'>;
}

export interface CreateRoomServiceDto {
    room_id: string;
    service_id: string;
}

export interface UpdateRoomServiceDto {
    is_active: boolean;
}
