import { apiClient } from '@/shared/services/apiClient';
import { BuildingMapData } from '../types/navigation.types';

export const HARDCODED_BUILDING_ID = '00b03ef8-7702-4b08-a07e-ec887432453c';

let cachedBuildingData: BuildingMapData | null = null;
let buildingDataPromise: Promise<BuildingMapData> | null = null;

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
    .get<BuildingMapData>(`/api/navigation/building/${buildingId}/map`)
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
