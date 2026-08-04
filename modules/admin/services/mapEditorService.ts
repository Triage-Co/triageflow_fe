import { apiClient } from '@/shared/services/apiClient';

export interface PointGeom {
  type: 'Point';
  coordinates: [number, number];
}

export interface LineStringGeom {
  type: 'LineString';
  coordinates: [[number, number], [number, number]];
}

export interface PolygonGeom {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface MapEditorBatchPayload {
  rooms: {
    create: {
      tempKey: string;
      roomCode: string;
      roomLabel: string;
      heightMeters?: number;
      areaId?: string;
      outlineGeom: PolygonGeom;
      centerGeom: PointGeom;
    }[];
    update: {
      id: string;
      roomCode?: string;
      roomLabel?: string;
      heightMeters?: number;
      areaId?: string | null;
      outlineGeom?: PolygonGeom;
      centerGeom?: PointGeom;
    }[];
    delete: string[];
  };
  boundaries: {
    create: {
      tempKey: string;
      roomId?: string;
      roomTempKey?: string;
      seqNo: number;
      boundaryType: 'WALL' | 'DOOR' | 'WINDOW' | 'OPEN';
      hasWall: boolean;
      label?: string;
      lineGeom: LineStringGeom;
    }[];
    update: {
      id: string;
      seqNo?: number;
      boundaryType?: 'WALL' | 'DOOR' | 'WINDOW' | 'OPEN';
      hasWall?: boolean;
      label?: string;
      lineGeom?: LineStringGeom;
    }[];
    delete: string[];
  };
}

export interface MapEditorBatchResult {
  roomIdMap: Record<string, string>;
  boundaryIdMap: Record<string, string>;
  counts: {
    roomsCreated: number;
    roomsUpdated: number;
    roomsDeleted: number;
    boundariesCreated: number;
    boundariesUpdated: number;
    boundariesDeleted: number;
  };
}

export interface GenerateGraphResult {
  nodesCreated: number;
  edgesCreated: number;
  durationMs: number;
}

export async function saveMapGeometry(
  floorId: string,
  payload: MapEditorBatchPayload,
  token: string,
): Promise<MapEditorBatchResult> {
  const response = await apiClient.post<MapEditorBatchResult>(
    `/api/map-editor/floor/${floorId}/batch`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.data) {
    throw new Error('Invalid map-editor batch API response');
  }

  return response.data;
}

export async function generateGraph(
  floorId: string,
  token: string,
): Promise<GenerateGraphResult> {
  const response = await apiClient.post<GenerateGraphResult>(
    `/api/graph/${floorId}/generate`,
    {},
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.data) {
    throw new Error('Invalid graph generate API response');
  }

  return response.data;
}
