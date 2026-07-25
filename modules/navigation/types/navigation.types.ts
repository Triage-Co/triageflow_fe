export interface ApiBuilding {
  id: string;
  name: string;
  addressLabel: string;
  totalFloors: number;
  organizationId: string;
}

export interface ApiBoundary {
  id: string;
  floorId: string;
  roomId: string | null;
  areaId: string | null;
  seqNo: number;
  boundaryType: 'WALL' | 'DOOR' | 'WINDOW' | 'CORRIDOR' | 'OPENING';
  adjacentRoomId: string | null;
  hasWall: boolean;
  doorId: string | null;
  label: string | null;
  lineGeom: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
}

export interface ApiRoom {
  id: string;
  floorId: string;
  roomCode: string;
  roomLabel: string;
  type: string; // e.g. "CONSULTATION", "WAITING", "RESTROOM", "OTHER"
  heightMeters: number;
  areaId?: string | null;
  centerGeom: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  outlineGeom: {
    type: 'Polygon';
    coordinates: [number, number][][]; // array of polygons of [lng, lat]
  };
  boundaries: ApiBoundary[];
  pois: any[];
}

export interface ApiDoor {
  id: string;
  floorId: string;
  nodeId: string | null;
  roomAId: string | null;
  roomBId: string | null;
  isAccessible: boolean;
  isEmergency: boolean;
  active: boolean;
  areaId: string | null;
  positionGeom: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface ApiNode {
  id: string;
  type: string; // e.g. 'ROOM_ENTRANCE', 'CORRIDOR', etc.
  active: boolean;
  metadata: Record<string, any>;
  coordsGeom: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface ApiArea {
  id: string;
  floorId: string;
  areaCode: string;
  areaLabel: string;
  description: string | null;
  centerGeom: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  outlineGeom: {
    type: 'Polygon';
    coordinates: [number, number][][]; // array of polygons of [lng, lat]
  };
  boundaries: ApiBoundary[];
}

export interface ApiFloor {
  id: string;
  buildingId: string;
  floorNumber: number;
  floorPlanImageUrl: string | null;
  widthMeters: number;
  heightMeters: number;
  scalePixelsPerMeter: number;
  outlineGeom: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  rooms: ApiRoom[];
  doors: ApiDoor[];
  areas?: ApiArea[];
  standaloneBoundaries?: ApiBoundary[];
  nodes?: ApiNode[];
}

export interface BuildingMapData {
  building: ApiBuilding;
  floors: ApiFloor[];
}

export interface BuildingMapResponse {
  code: number;
  message: string;
  status: string;
  data: BuildingMapData;
}
