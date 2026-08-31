'use client';

import React, { useMemo } from 'react';
import { useBuildingMap } from '../hooks/useWayfinding';
import { useNavigationStore } from '../store/navigationStore';
import { BuildingMapCanvas } from './map/BuildingMapCanvas';
import { Loader2 } from 'lucide-react';
import type { CorridorDebugSteps, RoutePathNode } from '../types/navigation.types';
import type {
  DraftBoundary,
  DraftRoom,
  GeometryTool,
} from '@/modules/admin/hooks/useMapGeometryEditor';
import type { EditorHit } from './map/mapEditorLayers';
import type { LngLat } from '@/modules/admin/utils/mapEditorGeometry';

import type { HeatmapRoom } from '@/modules/admin/hooks/useQueueHeatmap';

export interface PendingAddNode {
  tempId: string;
  coords: [number, number];
}

export interface EditorPointerEvent {
  lngLat: LngLat;
  hit: EditorHit | null;
  shiftKey: boolean;
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
  /** Geometry editor */
  topDown?: boolean;
  geometryEditMode?: boolean;
  geometryTool?: GeometryTool;
  editorRooms?: DraftRoom[];
  editorBoundaries?: DraftBoundary[];
  editorSelectedKey?: string | null;
  editorSelectedVertex?: { roomKey: string; index: number } | null;
  editorPreviewPoints?: LngLat[];
  editorErrorKeys?: string[];
  onEditorPointerDown?: (e: EditorPointerEvent) => void;
  onEditorPointerMove?: (e: EditorPointerEvent) => void;
  onEditorPointerUp?: (e: EditorPointerEvent) => void;
  onHoverRoom?: (roomId: string | null) => void;
  heatmapEnabled?: boolean;
  heatmapRooms?: HeatmapRoom[];
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
  onHoverRoom,
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
  topDown,
  geometryEditMode,
  geometryTool,
  editorRooms,
  editorBoundaries,
  editorSelectedKey,
  editorSelectedVertex,
  editorPreviewPoints,
  editorErrorKeys,
  onEditorPointerDown,
  onEditorPointerMove,
  onEditorPointerUp,
  heatmapEnabled,
  heatmapRooms,
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
    <div className="w-full h-full min-h-0">
      <BuildingMapCanvas
        key={`map-${refreshKey}-${apiFloor?.nodes?.length ?? 0}-${apiFloor?.edges?.length ?? 0}`}
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
        topDown={topDown}
        geometryEditMode={geometryEditMode}
        geometryTool={geometryTool}
        editorRooms={editorRooms}
        editorBoundaries={editorBoundaries}
        editorSelectedKey={editorSelectedKey}
        editorSelectedVertex={editorSelectedVertex}
        editorPreviewPoints={editorPreviewPoints}
        editorErrorKeys={editorErrorKeys}
        onEditorPointerDown={onEditorPointerDown}
        onEditorPointerMove={onEditorPointerMove}
        onEditorPointerUp={onEditorPointerUp}
        onHoverRoom={onHoverRoom}
        heatmapEnabled={heatmapEnabled}
        heatmapRooms={heatmapRooms}
      />
    </div>
  );
};

export default FloorMap;

