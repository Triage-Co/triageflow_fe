import { ApiFloor, ApiRoom, ApiBoundary, ApiDoor, ApiArea } from '../types/navigation.types';

const DEG_TO_METER_X = 111320;
const DEG_TO_METER_Z = 110540;

// ─── Wall Segment ──────────────────────────────────────────────────────────────

export interface WallSegment {
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  boundaryType: 'WALL' | 'DOOR' | 'WINDOW' | 'OPEN';
  length: number;
  angle: number;
  centerX: number;
  centerZ: number;
}

// ─── Area Partition Segment ──────────────────────────────────────────────────

export interface AreaPartitionSegment {
  areaId: string;
  areaCode: string;
  areaLabel: string;
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
  areaId: string | null;
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
  areaPartitions: AreaPartitionSegment[];
  standaloneDoors: StandaloneDoorData[];
  floorOutlinePoints: { x: number; z: number }[];
  floorWidth: number;
  floorHeight: number;
  floorId?: string;
  floorNumber?: number;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  standaloneWalls: WallSegment[];
  /** Shift applied when converting GeoJSON lng/lat → local meters */
  centerShiftX: number;
  centerShiftZ: number;
}

/** Convert WGS84 lng/lat to local Three.js XZ using the same shift as floorToRoomData */
export function lngLatToLocal(
  lng: number,
  lat: number,
  centerShiftX: number,
  centerShiftZ: number
): { x: number; z: number } {
  return {
    x: lng * DEG_TO_METER_X - centerShiftX,
    z: -(lat * DEG_TO_METER_Z) - centerShiftZ,
  };
}

/** Inverse of lngLatToLocal */
export function localToLngLat(
  x: number,
  z: number,
  centerShiftX: number,
  centerShiftZ: number
): { lng: number; lat: number } {
  return {
    lng: (x + centerShiftX) / DEG_TO_METER_X,
    lat: -((z + centerShiftZ) / DEG_TO_METER_Z),
  };
}

// ─── Area Colors ─────────────────────────────────────────────────────────────

export const AREA_COLORS: Record<string, number> = {
  OPH: 0xef476f,
  SUR: 0x1c6ef3,
  ORTH: 0xe85d04,
  DERM: 0x06b6d4, // Cyan
  PED_INT: 0x10b981, // Emerald green
  GARDEN: 0x84cc16, // Lime green
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
      areaId: room.areaId ?? null,
      points: centeredPoints,
      walls,
      centerX,
      centerZ,
      width,
      depth,
      height: 2.5,
      color: '#f1f5f9',
      pinColor: '#155DFC',
      pinIcon: getRoomIcon(room.roomLabel),
    };
  });

  // 3. Convert Area Partitions
  const areaPartitions: AreaPartitionSegment[] = [];
  if (floor.areas) {
    floor.areas.forEach((area) => {
      const color = AREA_COLORS[area.areaCode] || AREA_COLORS.Default;
      if (area.boundaries) {
        area.boundaries.forEach((b) => {
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

            areaPartitions.push({
              areaId: area.id,
              areaCode: area.areaCode,
              areaLabel: area.areaLabel,
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

        // Also check area partitions
        areaPartitions.forEach((cp) => {
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
  // 5. Convert Standalone Boundaries
  const standaloneWalls: WallSegment[] = [];
  if (floor.standaloneBoundaries) {
    floor.standaloneBoundaries.forEach((b) => {
      if (b.boundaryType === 'DOOR') {
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

          standaloneDoors.push({
            id: b.id,
            centerX: (startX + endX) / 2,
            centerZ: (startZ + endZ) / 2,
            width: length,
            angle,
          });
        }
      } else {
        const seg = boundaryToWallSegment(b, centerShiftX, centerShiftZ);
        if (seg) standaloneWalls.push(seg);
      }
    });
  }

  return {
    rooms,
    areaPartitions,
    standaloneDoors,
    standaloneWalls,
    floorOutlinePoints,
    floorWidth: globalMaxX - globalMinX,
    floorHeight: globalMaxZ - globalMinZ,
    floorId: floor.id,
    floorNumber: floor.floorNumber,
    centerShiftX,
    centerShiftZ,
    bounds: {
      minX: globalMinX - centerShiftX,
      maxX: globalMaxX - centerShiftX,
      minZ: globalMinZ - centerShiftZ,
      maxZ: globalMaxZ - centerShiftZ,
    },
  };
}
