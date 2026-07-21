import { ApiFloor, ApiRoom, ApiBoundary, ApiDoor, ApiClinic } from '../types/navigation.types';

const DEG_TO_METER_X = 111320;
const DEG_TO_METER_Z = 110540;

// ─── Wall Segment ──────────────────────────────────────────────────────────────

export interface WallSegment {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  boundaryType: 'WALL' | 'DOOR' | 'WINDOW' | 'CORRIDOR' | 'OPENING';
  length: number;
  angle: number;
  centerX: number;
  centerZ: number;
}

// ─── Clinic Partition Segment ──────────────────────────────────────────────────

export interface ClinicPartitionSegment {
  clinicId: string;
  clinicCode: string;
  clinicLabel: string;
  color: number;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  length: number;
  angle: number;
  centerX: number;
  centerZ: number;
}

// ─── Standalone Door Data ──────────────────────────────────────────────────────

export interface StandaloneDoorData {
  id: string;
  centerX: number;
  centerZ: number;
  width: number;
  angle: number;
}

// ─── Room Data ─────────────────────────────────────────────────────────────────

export interface RoomData {
  id: string;
  roomCode: string;
  roomLabel: string;
  type: string;
  clinicId: string | null;
  /** Polygon outline points (x = East/West, z = North/South) */
  points: { x: number; z: number }[];
  /** Wall segments from boundaries */
  walls: WallSegment[];
  centerX: number;
  centerZ: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  pinColor: string;
  pinIcon: string;
}

// ─── Floor Data ────────────────────────────────────────────────────────────────

export interface FloorData3D {
  rooms: RoomData[];
  clinicPartitions: ClinicPartitionSegment[];
  standaloneDoors: StandaloneDoorData[];
  floorOutlinePoints: { x: number; z: number }[];
  floorWidth: number;
  floorHeight: number;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
}

// ─── Clinic Colors ─────────────────────────────────────────────────────────────

export const CLINIC_COLORS: Record<string, number> = {
  OPH: 0xef476f,
  SUR: 0x1c6ef3,
  ORTH: 0xe85d04,
  Default: 0x64748b,
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getRoomIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('tim mạch')) return '❤️';
  if (l.includes('tiêu hóa')) return '🤢';
  if (l.includes('thần kinh')) return '🧠';
  if (l.includes('nhi')) return '👶';
  if (l.includes('mắt')) return '👁️';
  if (l.includes('tai mũi họng') || l.includes('họng')) return '👂';
  if (l.includes('chấn thương') || l.includes('ngoại')) return '🩹';
  if (l.includes('phế quản') || l.includes('hô hấp')) return '🫁';
  if (l.includes('da liễu')) return '🩺';
  if (l.includes('răng') || l.includes('hàm')) return '🦷';
  if (l.includes('phụ khoa') || l.includes('thai')) return '🤰';
  if (l.includes('tiêm chủng')) return '💉';
  if (l.includes('tiếp nhận')) return '🏥';
  return '🏥';
}

function getRoomColor(type: string): string {
  switch (type) {
    case 'CONSULTATION':
      return '#e0f2fe';
    case 'WAITING':
      return '#f0fdf4';
    case 'RESTROOM':
      return '#fef2f2';
    default:
      return '#f1f5f9';
  }
}

// ─── Boundary → Wall Segment ───────────────────────────────────────────────────

function boundaryToWallSegment(
  boundary: ApiBoundary,
  centerShiftX: number,
  centerShiftZ: number
): WallSegment | null {
  if (
    !boundary.lineGeom ||
    !boundary.lineGeom.coordinates ||
    boundary.lineGeom.coordinates.length < 2
  ) {
    return null;
  }

  const coords = boundary.lineGeom.coordinates;
  const startX = coords[0][0] * DEG_TO_METER_X - centerShiftX;
  const startZ = -(coords[0][1] * DEG_TO_METER_Z) - centerShiftZ;
  const endX = coords[1][0] * DEG_TO_METER_X - centerShiftX;
  const endZ = -(coords[1][1] * DEG_TO_METER_Z) - centerShiftZ;

  const dx = endX - startX;
  const dz = endZ - startZ;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx);

  return {
    startX,
    startZ,
    endX,
    endZ,
    boundaryType: boundary.boundaryType,
    length,
    angle,
    centerX: (startX + endX) / 2,
    centerZ: (startZ + endZ) / 2,
  };
}

// ─── Distance to Segment Helper ────────────────────────────────────────────────

function distToSegment(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2);
  let t = ((px - x1) * dx + (pz - z1) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;
  return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2);
}

// ─── Main Transform ────────────────────────────────────────────────────────────

export function floorToRoomData(floor: ApiFloor): FloorData3D {
  const rawRooms: {
    room: ApiRoom;
    points: { x: number; z: number }[];
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  }[] = [];

  let globalMinX = Infinity;
  let globalMaxX = -Infinity;
  let globalMinZ = Infinity;
  let globalMaxZ = -Infinity;

  floor.rooms.forEach((room) => {
    if (
      !room.outlineGeom ||
      !room.outlineGeom.coordinates ||
      room.outlineGeom.coordinates.length === 0
    ) {
      return;
    }

    const polygon = room.outlineGeom.coordinates[0];
    const points = polygon.map(([lng, lat]) => ({
      x: lng * DEG_TO_METER_X,
      z: -(lat * DEG_TO_METER_Z),
    }));

    const xValues = points.map((p) => p.x);
    const zValues = points.map((p) => p.z);

    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minZ = Math.min(...zValues);
    const maxZ = Math.max(...zValues);

    if (minX < globalMinX) globalMinX = minX;
    if (maxX > globalMaxX) globalMaxX = maxX;
    if (minZ < globalMinZ) globalMinZ = minZ;
    if (maxZ > globalMaxZ) globalMaxZ = maxZ;

    rawRooms.push({ room, points, minX, maxX, minZ, maxZ });
  });

  if (globalMinX === Infinity) {
    globalMinX = 0;
    globalMaxX = floor.widthMeters || 120;
    globalMinZ = 0;
    globalMaxZ = floor.heightMeters || 80;
  }

  const centerShiftX = (globalMinX + globalMaxX) / 2;
  const centerShiftZ = (globalMinZ + globalMaxZ) / 2;

  // 1. Convert Floor Outline Polygon
  const floorOutlinePoints: { x: number; z: number }[] = [];
  if (floor.outlineGeom && floor.outlineGeom.coordinates && floor.outlineGeom.coordinates.length > 0) {
    floor.outlineGeom.coordinates[0].forEach(([lng, lat]) => {
      floorOutlinePoints.push({
        x: lng * DEG_TO_METER_X - centerShiftX,
        z: -(lat * DEG_TO_METER_Z) - centerShiftZ,
      });
    });
  }

  // 2. Convert Rooms
  const rooms: RoomData[] = rawRooms.map(({ room, points, minX, maxX, minZ, maxZ }) => {
    const centeredPoints = points.map((p) => ({
      x: p.x - centerShiftX,
      z: p.z - centerShiftZ,
    }));

    const width = maxX - minX;
    const depth = maxZ - minZ;
    const centerX = (minX + maxX) / 2 - centerShiftX;
    const centerZ = (minZ + maxZ) / 2 - centerShiftZ;

    const walls: WallSegment[] = [];
    if (room.boundaries && room.boundaries.length > 0) {
      room.boundaries.forEach((b) => {
        const seg = boundaryToWallSegment(b, centerShiftX, centerShiftZ);
        if (seg) walls.push(seg);
      });
    }

    return {
      id: room.id,
      roomCode: room.roomCode,
      roomLabel: room.roomLabel,
      type: room.type,
      clinicId: room.clinicId ?? null,
      points: centeredPoints,
      walls,
      centerX,
      centerZ,
      width,
      depth,
      height: 2.5,
      color: getRoomColor(room.type),
      pinColor: '#155DFC',
      pinIcon: getRoomIcon(room.roomLabel),
    };
  });

  // 3. Convert Clinic Partitions
  const clinicPartitions: ClinicPartitionSegment[] = [];
  if (floor.clinics) {
    floor.clinics.forEach((clinic) => {
      const color = CLINIC_COLORS[clinic.clinicCode] || CLINIC_COLORS.Default;
      if (clinic.boundaries) {
        clinic.boundaries.forEach((b) => {
          if (b.lineGeom && b.lineGeom.coordinates && b.lineGeom.coordinates.length >= 2) {
            const coords = b.lineGeom.coordinates;
            const startX = coords[0][0] * DEG_TO_METER_X - centerShiftX;
            const startZ = -(coords[0][1] * DEG_TO_METER_Z) - centerShiftZ;
            const endX = coords[1][0] * DEG_TO_METER_X - centerShiftX;
            const endZ = -(coords[1][1] * DEG_TO_METER_Z) - centerShiftZ;

            const dx = endX - startX;
            const dz = endZ - startZ;
            const length = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx);

            clinicPartitions.push({
              clinicId: clinic.id,
              clinicCode: clinic.clinicCode,
              clinicLabel: clinic.clinicLabel,
              color,
              startX,
              startZ,
              endX,
              endZ,
              length,
              angle,
              centerX: (startX + endX) / 2,
              centerZ: (startZ + endZ) / 2,
            });
          }
        });
      }
    });
  }

  // 4. Convert Standalone Doors (roomAId === null or in floor.doors)
  const standaloneDoors: StandaloneDoorData[] = [];
  if (floor.doors) {
    floor.doors.forEach((door) => {
      if (door.roomAId === null && door.positionGeom && door.positionGeom.coordinates) {
        const ptX = door.positionGeom.coordinates[0] * DEG_TO_METER_X - centerShiftX;
        const ptZ = -(door.positionGeom.coordinates[1] * DEG_TO_METER_Z) - centerShiftZ;

        let angle = Math.PI / 2; // Default vertical wall direction
        let minDist = Infinity;

        // Check distance to room wall segments to find matching wall angle
        rooms.forEach((r) => {
          r.walls.forEach((w) => {
            const d = distToSegment(ptX, ptZ, w.startX, w.startZ, w.endX, w.endZ);
            if (d < minDist) {
              minDist = d;
              angle = w.angle;
            }
          });
        });

        // Also check clinic partitions
        clinicPartitions.forEach((cp) => {
          const d = distToSegment(ptX, ptZ, cp.startX, cp.startZ, cp.endX, cp.endZ);
          if (d < minDist) {
            minDist = d;
            angle = cp.angle;
          }
        });

        standaloneDoors.push({
          id: door.id,
          centerX: ptX,
          centerZ: ptZ,
          width: 1.5,
          angle,
        });
      }
    });
  }

  return {
    rooms,
    clinicPartitions,
    standaloneDoors,
    floorOutlinePoints,
    floorWidth: globalMaxX - globalMinX,
    floorHeight: globalMaxZ - globalMinZ,
    bounds: {
      minX: globalMinX - centerShiftX,
      maxX: globalMaxX - centerShiftX,
      minZ: globalMinZ - centerShiftZ,
      maxZ: globalMaxZ - centerShiftZ,
    },
  };
}
