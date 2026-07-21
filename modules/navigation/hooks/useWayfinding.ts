import { useState, useEffect, useRef } from 'react';
import { fetchBuildingMap } from '../services/navigationService';
import { floorToRoomData, FloorData3D } from '../utils/buildingToThree';
import { BuildingMapData } from '../types/navigation.types';

const cache = new Map<number, FloorData3D>();

export function useBuildingMap(floorNumber: number = 2) {
  const [data, setData] = useState<FloorData3D | null>(() => cache.get(floorNumber) ?? null);
  const [rawMap, setRawMap] = useState<BuildingMapData | null>(null);
  const [loading, setLoading] = useState<boolean>(!cache.has(floorNumber));
  const [error, setError] = useState<Error | null>(null);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (cache.has(floorNumber)) {
      setData(cache.get(floorNumber)!);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    fetchBuildingMap()
      .then((buildingData) => {
        if (!isMounted.current) return;
        setRawMap(buildingData);

        const targetFloor =
          buildingData.floors.find((f) => f.floorNumber === floorNumber) ||
          buildingData.floors[0];

        if (!targetFloor) {
          throw new Error('Dữ liệu sơ đồ tòa nhà không hợp lệ');
        }

        const parsed = floorToRoomData(targetFloor);
        cache.set(floorNumber, parsed);
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
  return useBuildingMap(2);
}
