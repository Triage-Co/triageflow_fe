import { apiClient, ApiError } from '@/shared/services/apiClient';

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

function isMissingRouteError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  if (err.statusCode === 404) return true;
  return /cannot post/i.test(err.message);
}

export async function rebuildGraphEdges(
  floorId: string,
  token: string,
): Promise<GenerateGraphResult> {
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const response = await apiClient.post<GenerateGraphResult>(
      `/api/graph/${floorId}/rebuild-edges`,
      {},
      { headers, suppressLogError: true },
    );
    if (!response.data) {
      throw new Error('Invalid graph rebuild-edges API response');
    }
    return response.data;
  } catch (err) {
    if (!isMissingRouteError(err)) throw err;

    // Older BE builds do not have /rebuild-edges; corridor-edits with
    // empty add/remove still rebuilds edges from existing nodes.
    const fallback = await apiClient.post<{
      edgesCreated: number;
      durationMs: number;
    }>(
      `/api/graph/${floorId}/corridor-edits`,
      { add: [], remove: [] },
      { headers },
    );

    if (!fallback.data) {
      throw new Error('Invalid graph corridor-edits API response');
    }

    return {
      nodesCreated: 0,
      edgesCreated: fallback.data.edgesCreated,
      durationMs: fallback.data.durationMs,
    };
  }
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
