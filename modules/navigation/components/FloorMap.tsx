'use client';

import React from 'react';
import { useBuildingMap } from '../hooks/useWayfinding';
import { useNavigationStore } from '../store/navigationStore';
import { BuildingMapCanvas } from './map/BuildingMapCanvas';
import { Loader2 } from 'lucide-react';

interface FloorMapProps {
  highlightRoomCode?: string | null;
  highlightClinicId?: string | null;
}

export const FloorMap: React.FC<FloorMapProps> = ({
  highlightRoomCode,
  highlightClinicId,
}) => {
  const { data, loading, error } = useBuildingMap(2);
  const highlightedRoomId = useNavigationStore((s) => s.highlightedRoomId);

  if (loading && !data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-10 h-10 text-[#155DFC] animate-spin" />
        <p className="text-slate-600 font-bold text-sm">Đang tải sơ đồ bệnh viện 3D...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center max-w-sm">
          <p className="text-rose-500 font-bold text-sm mb-1">Không thể tải bản đồ</p>
          <p className="text-slate-400 text-xs">{error?.message || 'Lỗi dữ liệu tòa nhà'}</p>
        </div>
      </div>
    );
  }

  return (
    <BuildingMapCanvas
      floorData={data}
      highlightedRoomId={highlightedRoomId}
      highlightRoomCode={highlightRoomCode}
      highlightClinicId={highlightClinicId}
    />
  );
};

export default FloorMap;
