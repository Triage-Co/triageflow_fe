'use client';

import React, { useMemo } from 'react';
import { useBuildingMap } from '../hooks/useWayfinding';
import { useNavigationStore } from '../store/navigationStore';
import { BuildingMapCanvas } from './map/BuildingMapCanvas';
import { Loader2 } from 'lucide-react';
import type { CorridorDebugSteps, RoutePathNode } from '../types/navigation.types';

export interface PendingAddNode {
  tempId: string;
  coords: [number, number];
}

interface FloorMapProps {
  floorNumber?: number;
  refreshKey?: number;
  highlightRoomCode?: string | null;
  highlightAreaId?: string | null;
  startRoomId?: string | null;
  targetRoomId?: string | null;
  routePath?: RoutePathNode[] | null;
  onSelectRoom?: (roomId: string) => void;
  showNodes?: boolean;
  showWalkable?: boolean;
  debugSteps?: CorridorDebugSteps | null;
  showDebugStep1?: boolean;
  showDebugStep2?: boolean;
  showDebugStep3?: boolean;
  showDebugStep4?: boolean;
  nodeEditMode?: boolean;
  placingNode?: boolean;
  pendingAdds?: PendingAddNode[];
  pendingRemoves?: string[];
  selectedEditableNodeId?: string | null;
  onSelectEditableNode?: (nodeId: string | null) => void;
  onPlaceNode?: (coords: [number, number]) => void;
}

export const FloorMap: React.FC<FloorMapProps> = ({
  floorNumber = 1,
  refreshKey = 0,
  highlightRoomCode,
  highlightAreaId,
  startRoomId,
  targetRoomId,
  routePath,
  onSelectRoom,
  showNodes,
  showWalkable,
  debugSteps,
  showDebugStep1,
  showDebugStep2,
  showDebugStep3,
  showDebugStep4,
  nodeEditMode,
  placingNode,
  pendingAdds,
  pendingRemoves,
  selectedEditableNodeId,
  onSelectEditableNode,
  onPlaceNode,
}) => {
  const { data, rawMap, loading, error } = useBuildingMap(floorNumber, refreshKey);
  const highlightedRoomId = useNavigationStore((s) => s.highlightedRoomId);

  const apiFloor = useMemo(() => {
    if (!rawMap) return null;
    return (
      rawMap.floors.find((f) => f.floorNumber === floorNumber) ||
      rawMap.floors[0] ||
      null
    );
  }, [rawMap, floorNumber]);

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
      apiFloor={apiFloor}
      highlightedRoomId={highlightedRoomId}
      highlightRoomCode={highlightRoomCode}
      highlightAreaId={highlightAreaId}
      startRoomId={startRoomId}
      targetRoomId={targetRoomId}
      routePath={routePath}
      onSelectRoom={onSelectRoom}
      showNodes={showNodes || nodeEditMode}
      showWalkable={showWalkable || (nodeEditMode && placingNode)}
      debugSteps={debugSteps}
      showDebugStep1={showDebugStep1}
      showDebugStep2={showDebugStep2}
      showDebugStep3={showDebugStep3}
      showDebugStep4={showDebugStep4}
      nodeEditMode={nodeEditMode}
      placingNode={placingNode}
      pendingAdds={pendingAdds}
      pendingRemoves={pendingRemoves}
      selectedEditableNodeId={selectedEditableNodeId}
      onSelectEditableNode={onSelectEditableNode}
      onPlaceNode={onPlaceNode}
    />
  );
};

export default FloorMap;
