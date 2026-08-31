import { apiClient } from '@/shared/services/apiClient';
import {
  BuildingMapData,
  FetchRouteParams,
  RouteResult,
} from '../types/navigation.types';

/** Seed building: Tòa G2 – Khoa Khám Bệnh */
export const HARDCODED_BUILDING_ID = '17854b86-79d1-4c60-b776-784742c2597e';

let cachedBuildingData: BuildingMapData | null = null;
let buildingDataPromise: Promise<BuildingMapData> | null = null;

export function clearFetchedBuildingMap() {
  cachedBuildingData = null;
  buildingDataPromise = null;
}

/**
 * Fetches the complete map detail data for the building.
 * Utilizes a Promise-based cache to avoid redundant network calls.
 */
export async function fetchBuildingMap(
  buildingId: string = HARDCODED_BUILDING_ID,
  forceRefresh: boolean = false
): Promise<BuildingMapData> {
  if (cachedBuildingData && !forceRefresh) {
    return cachedBuildingData;
  }

  if (buildingDataPromise && !forceRefresh) {
    return buildingDataPromise;
  }

  buildingDataPromise = apiClient
    .get<BuildingMapData>(
      `/api/navigation/building/${buildingId}/map${
        forceRefresh ? `?_=${Date.now()}` : ''
      }`,
    )
    .then((response) => {
      if (response.data) {
        cachedBuildingData = response.data;
        buildingDataPromise = null;
        return cachedBuildingData;
      }
      throw new Error('Invalid API response format');
    })
    .catch((err) => {
      buildingDataPromise = null;
      throw err;
    });

  return buildingDataPromise;
}

/**
 * Finds the shortest indoor path between two locations via backend A*.
 */
export async function fetchRoute(params: FetchRouteParams): Promise<RouteResult> {
  const query = new URLSearchParams({
    startType: params.startType,
    startId: params.startId,
    targetType: params.targetType,
    targetId: params.targetId,
  });

  const response = await apiClient.get<RouteResult>(
    `/api/navigation/route?${query.toString()}`
  );

  if (!response.data) {
    throw new Error('Invalid route API response format');
  }

  return response.data;
}
