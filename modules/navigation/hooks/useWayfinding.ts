import { useState, useEffect, useRef } from 'react';
import { fetchBuildingMap } from '../services/navigationService';
import { floorToRoomData, FloorData3D } from '../utils/buildingToThree';
import { BuildingMapData } from '../types/navigation.types';

const floorCache = new Map<number, FloorData3D>();
let rawMapCache: BuildingMapData | null = null;

export function useBuildingMap(floorNumber: number = 1) {
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

  useEffect(() => {
    if (floorCache.has(floorNumber) && rawMapCache) {
      setData(floorCache.get(floorNumber)!);
      setRawMap(rawMapCache);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchBuildingMap()
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
          setError(err instanceof Error ? err : new Error('Không thể tải sơ đồ tòa nhà'));
        }
      })
      .finally(() => {
        if (isMounted.current) {
          setLoading(false);
        }
      });
  }, [floorNumber]);

  return { data, rawMap, loading, error };
}

export function useWayfinding() {
  return useBuildingMap(1);
}
