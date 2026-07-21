export interface ApiBuilding {
  id: string;
  name: string;
  addressLabel: string;
  totalFloors: number;
  organizationId: string;
}

export interface ApiBoundary {
  id: string;
  roomId: string;
  seqNo: number;
  boundaryType: 'WALL' | 'DOOR' | 'WINDOW' | 'CORRIDOR' | 'OPENING';
  adjacentRoomId: string | null;
  hasWall: boolean;
  doorId: string | null;
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
  clinicId?: string | null;
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
  positionGeom: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface ApiClinicBoundary {
  id: string;
  clinicId: string;
  lineGeom: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
}

export interface ApiClinic {
  id: string;
  clinicCode: string;
  clinicLabel: string;
  boundaries?: ApiClinicBoundary[];
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
  clinics?: ApiClinic[];
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
