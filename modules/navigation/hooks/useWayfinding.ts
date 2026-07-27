import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchBuildingMap } from '../services/navigationService';
import { floorToRoomData, FloorData3D } from '../utils/buildingToThree';
import { BuildingMapData } from '../types/navigation.types';

const floorCache = new Map<number, FloorData3D>();
let rawMapCache: BuildingMapData | null = null;

export function clearBuildingMapCache() {
  floorCache.clear();
  rawMapCache = null;
}

export function useBuildingMap(floorNumber: number = 1, refreshKey: number = 0) {
  const [data, setData] = useState<FloorData3D | null>(
    () => floorCache.get(floorNumber) ?? null
  );
  const [rawMap, setRawMap] = useState<BuildingMapData | null>(() => rawMapCache);
  const [loading, setLoading] = useState<boolean>(!floorCache.has(floorNumber));
  const [error, setError] = useState<Error | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const load = useCallback(
    (forceRefresh: boolean) => {
      if (!forceRefresh && floorCache.has(floorNumber) && rawMapCache) {
        setData(floorCache.get(floorNumber)!);
        setRawMap(rawMapCache);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      fetchBuildingMap(undefined, forceRefresh)
        .then((buildingData) => {
          if (!isMounted.current) return;
          rawMapCache = buildingData;
          setRawMap(buildingData);

          const targetFloor =
            buildingData.floors.find((f) => f.floorNumber === floorNumber) ||
            buildingData.floors[0];

          if (!targetFloor) {
            throw new Error('Dữ liệu sơ đồ tòa nhà không hợp lệ');
          }

          const parsed = floorToRoomData(targetFloor);
          floorCache.set(floorNumber, parsed);
          setData(parsed);
        })
        .catch((err) => {
          if (isMounted.current) {
            setError(
              err instanceof Error ? err : new Error('Không thể tải sơ đồ tòa nhà')
            );
          }
        })
        .finally(() => {
          if (isMounted.current) {
            setLoading(false);
          }
        });
    },
    [floorNumber]
  );

  useEffect(() => {
    const force = refreshKey > 0;
    if (force) {
      clearBuildingMapCache();
    }
    load(force);
  }, [floorNumber, refreshKey, load]);

  return { data, rawMap, loading, error, reload: () => load(true) };
}

export function useWayfinding() {
  return useBuildingMap(1);
}
