import { apiClient } from '@/shared/services/apiClient';

export interface BackendRoom {
    room_id: string;
    room_name: string;
    room_type: string;
    specialty_id?: string;
    specialty?: {
        specialty_id: string;
        specialty_code: string;
        specialty_name: string;
    };
}

export interface SpecialtyGroup {
    specialtyId: string;
    specialtyName: string;
    rooms: BackendRoom[];
}

export interface PaginatedMeta {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
}

export interface RoomCategoryConfig {
    key: string;
    name: string;
    description: string;
    types: string[];
}

export const ROOM_CATEGORY_CONFIGS: RoomCategoryConfig[] = [
    {
        key: 'CLINICAL_ROOM',
        name: 'Phòng khám bệnh',
        description: 'Các phòng khám chuyên khoa',
        types: ['CLINICAL_ROOM'],
    },
    {
        key: 'PROCEDURE_ROOM',
        name: 'Phòng thủ thuật',
        description: 'Phòng thủ thuật & tiểu phẫu',
        types: ['PROCEDURE_ROOM'],
    },
    {
        key: 'LABORATORY',
        name: 'Phòng lab',
        description: 'Xét nghiệm sinh hóa, huyết học, vi sinh',
        types: ['LABORATORY'],
    },
    {
        key: 'FUNCTIONAL_EXPLORATION',
        name: 'Phòng thăm dò chức năng',
        description: 'Điện tim, nội soi, đo chức năng',
        types: ['FUNCTIONAL_EXPLORATION'],
    },
    {
        key: 'PHARMACY',
        name: 'Phòng dược',
        description: 'Cấp phát thuốc & Nhà thuốc',
        types: ['PHARMACY'],
    },
    {
        key: 'IMAGING_ROOM',
        name: 'Phòng chẩn đoán hình ảnh',
        description: 'X-Quang, CT, MRI, Siêu âm',
        types: ['IMAGING_ROOM'],
    },
    {
        key: 'RECEPTION_CASHIER',
        name: 'Lễ tân & Thu ngân',
        description: 'Tiếp đón & Quầy thu ngân',
        types: ['RECEPTION', 'CASHIER'],
    },
    {
        key: 'OTHER',
        name: 'Phòng khác',
        description: 'Phân loại Triage & Các phòng khác',
        types: ['OTHER', 'EMPTY', 'TRIAGE_AREA'],
    },
];

export interface RoomCategoryGroup {
    categoryKey: string;
    categoryName: string;
    description: string;
    rooms: BackendRoom[];
    specialtyGroups?: SpecialtyGroup[];
}

export const roomService = {
    /**
     * GET /api/room — Lấy danh sách toàn bộ phòng khám (bao gồm tất cả các trang)
     */
    async getRooms(): Promise<BackendRoom[]> {
        try {
            const limit = 100;
            const firstRes = await apiClient.get<BackendRoom[]>(`/api/room?page=1&limit=${limit}`, {
                suppressLogError: true,
            });

            const extractRooms = (res: any): BackendRoom[] => {
                if (res?.data && Array.isArray(res.data)) return res.data;
                if (Array.isArray(res)) return res as BackendRoom[];
                return [];
            };

            const allRooms = extractRooms(firstRes);
            const meta = (firstRes as any)?.meta as PaginatedMeta | undefined;
            const totalPages = meta?.totalPages ?? 1;

            if (totalPages > 1) {
                const fetchPromises: Promise<any>[] = [];
                for (let page = 2; page <= totalPages; page += 1) {
                    fetchPromises.push(
                        apiClient.get<BackendRoom[]>(`/api/room?page=${page}&limit=${limit}`, {
                            suppressLogError: true,
                        })
                    );
                }
                const pageResults = await Promise.all(fetchPromises);
                for (const res of pageResults) {
                    allRooms.push(...extractRooms(res));
                }
            }

            return allRooms;
        } catch {
            return [];
        }
    },

    /**
     * Lấy danh sách phòng đã phân chia theo Loại phòng (Room Type Category)
     * Đối với "Phòng khám bệnh" (CLINICAL_ROOM), các phòng được tiếp tục phân chia theo Chuyên khoa.
     */
    async getRoomsByCategory(): Promise<RoomCategoryGroup[]> {
        const allRooms = await this.getRooms();

        const categoryMap = new Map<string, { config: RoomCategoryConfig; rooms: BackendRoom[] }>();
        for (const config of ROOM_CATEGORY_CONFIGS) {
            categoryMap.set(config.key, { config, rooms: [] });
        }

        for (const room of allRooms) {
            const rawType = (room.room_type || '').toUpperCase();
            let matchedKey = 'OTHER';

            for (const config of ROOM_CATEGORY_CONFIGS) {
                if (config.types.includes(rawType)) {
                    matchedKey = config.key;
                    break;
                }
            }

            categoryMap.get(matchedKey)!.rooms.push(room);
        }

        const result: RoomCategoryGroup[] = [];

        for (const config of ROOM_CATEGORY_CONFIGS) {
            const item = categoryMap.get(config.key)!;
            if (item.rooms.length === 0) continue;

            const specialtyMap = new Map<string, SpecialtyGroup>();
            for (const room of item.rooms) {
                const specId = room.specialty?.specialty_id || room.specialty_id || 'OTHER';
                const specName = room.specialty?.specialty_name || 'KHOA KHÁM BỆNH GIA ĐÌNH';

                if (!specialtyMap.has(specId)) {
                    specialtyMap.set(specId, {
                        specialtyId: specId,
                        specialtyName: specName,
                        rooms: [],
                    });
                }
                specialtyMap.get(specId)!.rooms.push(room);
            }

            const specialtyGroups = Array.from(specialtyMap.values()).sort((a, b) =>
                a.specialtyName.localeCompare(b.specialtyName, 'vi'),
            );

            result.push({
                categoryKey: config.key,
                categoryName: config.name,
                description: config.description,
                rooms: item.rooms,
                specialtyGroups: config.key === 'CLINICAL_ROOM' ? specialtyGroups : (specialtyGroups.length > 1 ? specialtyGroups : undefined),
            });
        }

        return result;
    },

    /**
     * Lấy danh sách phòng đã nhóm theo khoa (specialty)
     */
    async getRoomsBySpecialty(): Promise<SpecialtyGroup[]> {
        const rooms = await this.getRooms();
        const map = new Map<string, SpecialtyGroup>();

        for (const room of rooms) {
            const specId = room.specialty?.specialty_id || room.specialty_id || 'OTHER';
            const specName = room.specialty?.specialty_name || 'KHOA KHÁM BỆNH GIA ĐÌNH';

            if (!map.has(specId)) {
                map.set(specId, {
                    specialtyId: specId,
                    specialtyName: specName,
                    rooms: [],
                });
            }
            map.get(specId)!.rooms.push(room);
        }

        return Array.from(map.values()).sort((a, b) =>
            a.specialtyName.localeCompare(b.specialtyName, 'vi'),
        );
    },
};

