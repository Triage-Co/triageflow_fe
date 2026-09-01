'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import {
  Eye,
  Pencil,
  Maximize2,
  Minimize2,
  Navigation,
  Loader2,
  X,
  MapPin,
  Route,
  CircleDot,
  Footprints,
  Bug,
  DoorOpen,
  Plus,
  Trash2,
  Save,
  Waypoints,
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Spline,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AutoRebalanceToggle } from './AutoRebalanceToggle';
import {
  FloorMap,
  type PendingAddNode,
  type EditorPointerEvent,
  type SelectedGraphEdge,
} from '@/modules/navigation/components/FloorMap';
import {
  clearBuildingMapCache,
  useBuildingMap,
} from '@/modules/navigation/hooks/useWayfinding';
import { fetchRoute } from '@/modules/navigation/services/navigationService';
import {
  fetchDebugSteps,
  saveCorridorEdits,
  saveEdgeEdits,
} from '@/modules/navigation/services/graphService';
import type {
  ApiRoom,
  CorridorDebugSteps,
  RouteResult,
} from '@/modules/navigation/types/navigation.types';
import { ApiError } from '@/shared/services/apiClient';
import { useAuthStore } from '@/modules/auth/store/authStore';
import {
  useMapGeometryEditor,
  type GeometrySelection,
  type GeometryTool,
} from '../hooks/useMapGeometryEditor';
import {
  generateGraph,
  rebuildGraphEdges,
  saveMapGeometry,
} from '../services/mapEditorService';
import { GeometryEditorPanel } from './GeometryEditorPanel';
import { snapPoint } from '../utils/mapEditorSnap';
import type { LngLat } from '../utils/mapEditorGeometry';
import { CONGESTION_STYLES, useQueueHeatmap } from '../hooks/useQueueHeatmap';

type MapMode = 'watch' | 'edit';
type EditTab = 'geometry' | 'nodes';

const DEBUG_STEPS = [
  {
    key: 1 as const,
    label: 'Step 1: tạo điểm nối',
    activeClass: 'bg-red-500 border-red-500 text-white',
  },
  {
    key: 2 as const,
    label: 'Step 2: Delaunay Triangulation',
    activeClass: 'bg-slate-500 border-slate-500 text-white',
  },
  {
    key: 3 as const,
    label: 'Step 3: E-zigzag',
    activeClass: 'bg-cyan-500 border-cyan-500 text-white',
  },
  {
    key: 4 as const,
    label: 'Step 4: tạo trung điểm',
    activeClass: 'bg-amber-500 border-amber-500 text-white',
  },
];

export function AdminMapPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<MapMode>('watch');
  const [editTab] = useState<EditTab>('nodes');
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [watchPanelCollapsed, setWatchPanelCollapsed] = useState(false);
  const [startRoomId, setStartRoomId] = useState<string>('');
  const [targetRoomId, setTargetRoomId] = useState<string>('');
  const [pickStep, setPickStep] = useState<'start' | 'target'>('start');
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [inspectedRoomId, setInspectedRoomId] = useState<string | null>(null);
  const [mapRefreshKey, setMapRefreshKey] = useState(0);

  // Edit overlays
  const [showNodes, setShowNodes] = useState(false);
  const [showWalkable, setShowWalkable] = useState(false);
  const [showDebugStep1, setShowDebugStep1] = useState(false);
  const [showDebugStep2, setShowDebugStep2] = useState(false);
  const [showDebugStep3, setShowDebugStep3] = useState(false);
  const [showDebugStep4, setShowDebugStep4] = useState(false);
  const [debugSteps, setDebugSteps] = useState<CorridorDebugSteps | null>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);

  // Node edit
  const [nodeEditMode, setNodeEditMode] = useState(false);
  const [placingNode, setPlacingNode] = useState(false);
  const [pendingAdds, setPendingAdds] = useState<PendingAddNode[]>([]);
  const [pendingRemoves, setPendingRemoves] = useState<string[]>([]);
  const [selectedEditableNodeId, setSelectedEditableNodeId] = useState<
    string | null
  >(null);
  const [savingNodes, setSavingNodes] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [edgeEditMode, setEdgeEditMode] = useState(false);
  const [pendingEdgeRemoves, setPendingEdgeRemoves] = useState<string[]>([]);
  const [selectedEdge, setSelectedEdge] = useState<SelectedGraphEdge | null>(
    null,
  );
  const [savingEdges, setSavingEdges] = useState(false);
  const [edgeSaveError, setEdgeSaveError] = useState<string | null>(null);

  // Geometry editor (UI hidden; kept for unused editor code paths)
  const [geometryTool, setGeometryTool] = useState<GeometryTool>('select');
  const [geometrySelection, setGeometrySelection] =
    useState<GeometrySelection>(null);
  const [previewPoints, setPreviewPoints] = useState<LngLat[]>([]);
  const [savingGeometry, setSavingGeometry] = useState(false);
  const [geometrySaveError, setGeometrySaveError] = useState<string | null>(
    null,
  );
  const [showGenerateGraph, setShowGenerateGraph] = useState(false);
  const [generatingGraph, setGeneratingGraph] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [lastGraphResult, setLastGraphResult] = useState<{
    nodesCreated: number;
    edgesCreated: number;
  } | null>(null);
  const [hoverPreview, setHoverPreview] = useState<LngLat | null>(null);
  const dragRef = useRef<{
    kind: 'vertex' | 'wall-endpoint';
    roomKey?: string;
    vertexIndex?: number;
    boundaryKey?: string;
    endpoint?: 0 | 1;
  } | null>(null);

  const { rawMap } = useBuildingMap(1, mapRefreshKey);

  const activeFloor = useMemo(() => {
    return rawMap?.floors.find((f) => f.floorNumber === 1) || rawMap?.floors[0];
  }, [rawMap]);

  const geometryEditor = useMapGeometryEditor(
    mode === 'edit' && editTab === 'geometry' ? activeFloor : null,
  );

  const rooms = useMemo(() => {
    if (!activeFloor) return [];
    return [...activeFloor.rooms]
      .filter((r) => r.roomCode?.trim())
      .sort((a, b) => a.roomLabel.localeCompare(b.roomLabel, 'vi'));
  }, [activeFloor]);

  const roomsById = useMemo(() => {
    const map = new Map<string, ApiRoom>();
    activeFloor?.rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [activeFloor]);

  const inspectedRoom = inspectedRoomId
    ? roomsById.get(inspectedRoomId) ?? null
    : null;

  const inspectedAreaLabel = useMemo(() => {
    if (!inspectedRoom?.areaId || !activeFloor?.areas) return null;
    return (
      activeFloor.areas.find((a) => a.id === inspectedRoom.areaId)?.areaLabel ??
      null
    );
  }, [inspectedRoom, activeFloor]);

  const selectedNodeMeta = useMemo(() => {
    if (!selectedEditableNodeId || !activeFloor?.nodes) return null;
    return (
      activeFloor.nodes.find((n) => n.id === selectedEditableNodeId) ?? null
    );
  }, [selectedEditableNodeId, activeFloor]);

  const selectedDraftRoom = useMemo(() => {
    if (!geometrySelection) return null;
    if (geometrySelection.kind === 'room') {
      return (
        geometryEditor.rooms.find((r) => r.key === geometrySelection.key) ??
        null
      );
    }
    if (geometrySelection.kind === 'vertex') {
      return (
        geometryEditor.rooms.find(
          (r) => r.key === geometrySelection.roomKey,
        ) ?? null
      );
    }
    return null;
  }, [geometrySelection, geometryEditor.rooms]);

  const buildingName = rawMap?.building?.name || 'Tòa G2 – Khoa Khám Bệnh';
  const floorId = activeFloor?.id;
  const isDirty = pendingAdds.length > 0 || pendingRemoves.length > 0;
  const isEdgeDirty = pendingEdgeRemoves.length > 0;
  const geometryActive = false;

  const snapTargets = useMemo(() => {
    const vertices: LngLat[] = [];
    const edges: [LngLat, LngLat][] = [];
    for (const room of geometryEditor.rooms) {
      const pts = room.outline;
      for (let i = 0; i < pts.length - 1; i++) {
        vertices.push(pts[i]);
        edges.push([pts[i], pts[i + 1]]);
      }
    }
    for (const b of geometryEditor.boundaries) {
      vertices.push(b.line[0], b.line[1]);
      edges.push(b.line);
    }
    return { vertices, edges };
  }, [geometryEditor.rooms, geometryEditor.boundaries]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (searchParams.get('heatmap') === '1') setHeatmapEnabled(true);
  }, [searchParams]);

  // Overlay is read-only info — auto-disable while editing to avoid confusing the geometry/node editor.
  useEffect(() => {
    if (mode === 'edit') setHeatmapEnabled(false);
  }, [mode]);

  const heatmap = useQueueHeatmap(heatmapEnabled && mode === 'watch', accessToken);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen && !savingNodes && !savingGeometry && !generatingGraph)
      return;
    const onKey = (e: KeyboardEvent) => {
      if (savingNodes || savingGeometry || generatingGraph) {
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape' && isFullscreen) {
        if (previewPoints.length > 0 || hoverPreview) return;
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    isFullscreen,
    savingNodes,
    savingGeometry,
    generatingGraph,
    previewPoints.length,
    hoverPreview,
  ]);

  // Ctrl+Z / Ctrl+Shift+Z for geometry editor
  useEffect(() => {
    if (!geometryActive) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) geometryEditor.redo();
        else geometryEditor.undo();
      }
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        geometryEditor.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [geometryActive, geometryEditor]);

  const handleDeleteGeometrySelection = useCallback(() => {
    if (!geometrySelection) return;
    if (geometrySelection.kind === 'room') {
      geometryEditor.deleteRoom(geometrySelection.key);
    } else if (geometrySelection.kind === 'vertex') {
      geometryEditor.deleteVertex(
        geometrySelection.roomKey,
        geometrySelection.index,
      );
    } else {
      geometryEditor.deleteBoundary(geometrySelection.key);
    }
    setGeometrySelection(null);
  }, [geometrySelection, geometryEditor]);

  useEffect(() => {
    if (!geometryActive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') {
        if (previewPoints.length > 0 || hoverPreview) {
          e.preventDefault();
          setPreviewPoints([]);
          setHoverPreview(null);
        }
        return;
      }

      if (
        e.key === 'Enter' &&
        geometryTool === 'draw-room' &&
        previewPoints.length >= 3
      ) {
        e.preventDefault();
        geometryEditor.addRoom(previewPoints);
        setPreviewPoints([]);
        setHoverPreview(null);
        return;
      }

      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        geometrySelection
      ) {
        e.preventDefault();
        handleDeleteGeometrySelection();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    geometryActive,
    previewPoints,
    hoverPreview,
    geometryTool,
    geometrySelection,
    geometryEditor,
    handleDeleteGeometrySelection,
  ]);

  const clearRoute = useCallback(() => {
    setRouteResult(null);
    setRouteError(null);
  }, []);

  const resetNodeEditState = useCallback(() => {
    setPlacingNode(false);
    setPendingAdds([]);
    setPendingRemoves([]);
    setSelectedEditableNodeId(null);
    setSaveError(null);
  }, []);

  const resetEdgeEditState = useCallback(() => {
    setPendingEdgeRemoves([]);
    setSelectedEdge(null);
    setEdgeSaveError(null);
  }, []);

  const exitNodeEditMode = useCallback(() => {
    if (isDirty) {
      const ok = window.confirm(
        'Bạn có thay đổi chưa lưu. Thoát sẽ hủy các thay đổi?',
      );
      if (!ok) return false;
    }
    setNodeEditMode(false);
    resetNodeEditState();
    return true;
  }, [isDirty, resetNodeEditState]);

  const exitEdgeEditMode = useCallback(() => {
    if (isEdgeDirty) {
      const ok = window.confirm(
        'Bạn có thay đổi edge chưa lưu. Thoát sẽ hủy các thay đổi?',
      );
      if (!ok) return false;
    }
    setEdgeEditMode(false);
    resetEdgeEditState();
    return true;
  }, [isEdgeDirty, resetEdgeEditState]);

  const confirmLeaveGeometry = useCallback(() => {
    if (!geometryEditor.isDirty) return true;
    return window.confirm(
      'Bạn có thay đổi geometry chưa lưu. Tiếp tục sẽ hủy các thay đổi?',
    );
  }, [geometryEditor.isDirty]);

  const handleSelectRoom = useCallback(
    (roomId: string) => {
      if (nodeEditMode || edgeEditMode || geometryActive) return;
      setInspectedRoomId(roomId);

      if (mode !== 'watch' || heatmapEnabled) return;

      clearRoute();

      if (pickStep === 'start') {
        setStartRoomId(roomId);
        if (roomId === targetRoomId) setTargetRoomId('');
        setPickStep('target');
      } else {
        if (roomId === startRoomId) return;
        setTargetRoomId(roomId);
        setPickStep('start');
      }
    },
    [
      mode,
      pickStep,
      startRoomId,
      targetRoomId,
      clearRoute,
      nodeEditMode,
      edgeEditMode,
      geometryActive,
    ],
  );

  const handlePlaceNode = useCallback((coords: [number, number]) => {
    setPendingAdds((prev) => [
      ...prev,
      { tempId: `tmp-${Date.now()}-${prev.length}`, coords },
    ]);
    setSelectedEditableNodeId(null);
  }, []);

  const handleDeleteSelectedNode = useCallback(() => {
    if (!selectedEditableNodeId) return;
    if (selectedEditableNodeId.startsWith('tmp-')) {
      setPendingAdds((prev) =>
        prev.filter((p) => p.tempId !== selectedEditableNodeId),
      );
    } else {
      setPendingRemoves((prev) =>
        prev.includes(selectedEditableNodeId)
          ? prev
          : [...prev, selectedEditableNodeId],
      );
    }
    setSelectedEditableNodeId(null);
  }, [selectedEditableNodeId]);

  const handleDeleteSelectedEdge = useCallback(() => {
    if (!selectedEdge) return;
    setPendingEdgeRemoves((prev) => {
      const next = new Set(prev);
      selectedEdge.ids.forEach((id) => next.add(id));
      return [...next];
    });
    setSelectedEdge(null);
  }, [selectedEdge]);

  useEffect(() => {
    if (!edgeEditMode) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') {
        setSelectedEdge(null);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdge) {
        e.preventDefault();
        handleDeleteSelectedEdge();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [edgeEditMode, selectedEdge, handleDeleteSelectedEdge]);

  const handleSaveEdgeEdits = async () => {
    if (!floorId || !accessToken || !isEdgeDirty) return;

    setSavingEdges(true);
    setEdgeSaveError(null);

    try {
      await saveEdgeEdits(
        floorId,
        { remove: pendingEdgeRemoves },
        accessToken,
      );
      resetEdgeEditState();
      clearBuildingMapCache();
      setMapRefreshKey((k) => k + 1);
      setShowNodes(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setEdgeSaveError(err.message || 'Không thể lưu thay đổi edge.');
      } else {
        setEdgeSaveError(
          err instanceof Error ? err.message : 'Không thể lưu thay đổi edge.',
        );
      }
    } finally {
      setSavingEdges(false);
    }
  };

  const handleSaveCorridorEdits = async () => {
    if (!floorId || !accessToken || !isDirty) return;

    setSavingNodes(true);
    setSaveError(null);

    try {
      await saveCorridorEdits(
        floorId,
        {
          add: pendingAdds.map((p) => p.coords),
          remove: pendingRemoves,
        },
        accessToken,
      );
      resetNodeEditState();
      clearBuildingMapCache();
      setMapRefreshKey((k) => k + 1);
      setShowNodes(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message || 'Không thể lưu thay đổi node.');
      } else {
        setSaveError(
          err instanceof Error ? err.message : 'Không thể lưu thay đổi node.',
        );
      }
    } finally {
      setSavingNodes(false);
    }
  };

  const handleSaveGeometry = async () => {
    if (!floorId || !accessToken || !geometryEditor.isDirty) return;
    if (geometryEditor.clientErrors.length > 0) {
      setGeometrySaveError('Hãy sửa các lỗi validation trước khi lưu.');
      return;
    }

    setSavingGeometry(true);
    setGeometrySaveError(null);

    try {
      const payload = geometryEditor.buildPayload();
      await saveMapGeometry(floorId, payload, accessToken);
      clearBuildingMapCache();
      pendingDraftResetRef.current = true;
      setMapRefreshKey((k) => k + 1);
      setShowGenerateGraph(true);
      setGeometrySelection(null);
      setPreviewPoints([]);
      setGeometrySaveError(null);
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = err.detail ? `\n${err.detail}` : '';
        setGeometrySaveError(
          `${err.message || 'Không thể lưu bản đồ.'}${detail}`,
        );
      } else {
        setGeometrySaveError(
          err instanceof Error ? err.message : 'Không thể lưu bản đồ.',
        );
      }
    } finally {
      setSavingGeometry(false);
    }
  };

  // After successful geometry save + map reload, re-seed draft from server data
  const pendingDraftResetRef = useRef(false);
  const resetFromFloorRef = useRef(geometryEditor.resetFromFloor);
  resetFromFloorRef.current = geometryEditor.resetFromFloor;
  useEffect(() => {
    if (pendingDraftResetRef.current && activeFloor) {
      resetFromFloorRef.current(activeFloor);
      pendingDraftResetRef.current = false;
    }
  }, [activeFloor, mapRefreshKey]);

  const handleRebuildGraph = async () => {
    if (!floorId || !accessToken) return;
    if (isDirty) {
      const discard = window.confirm(
        'Bạn có thay đổi node chưa lưu. Tạo graph sẽ hủy chúng. Tiếp tục?',
      );
      if (!discard) return;
      setNodeEditMode(false);
      resetNodeEditState();
    }
    if (isEdgeDirty) {
      const discard = window.confirm(
        'Bạn có thay đổi edge chưa lưu. Tạo graph sẽ hủy chúng. Tiếp tục?',
      );
      if (!discard) return;
      setEdgeEditMode(false);
      resetEdgeEditState();
    }
    const ok = window.confirm(
      'Tạo graph sẽ xóa các cạnh hiện có của tầng rồi nối lại từ các node đang có (không xóa/tạo node). Tiếp tục?',
    );
    if (!ok) return;

    setGeneratingGraph(true);
    setGraphError(null);
    try {
      const result = await rebuildGraphEdges(floorId, accessToken);
      clearBuildingMapCache();
      setMapRefreshKey((k) => k + 1);
      setShowNodes(true);
      setShowGenerateGraph(false);
      setLastGraphResult({
        nodesCreated: result.nodesCreated,
        edgesCreated: result.edgesCreated,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || 'Không thể tạo graph từ node hiện có.'
          : err instanceof Error
            ? err.message
            : 'Không thể tạo graph từ node hiện có.';
      setGraphError(message);
    } finally {
      setGeneratingGraph(false);
    }
  };

  const handleAutoGenerateGraph = async () => {
    if (!floorId || !accessToken) return;
    if (isDirty) {
      const discard = window.confirm(
        'Bạn có thay đổi node chưa lưu. Auto tạo sẽ hủy chúng và sinh lại toàn bộ node/graph. Tiếp tục?',
      );
      if (!discard) return;
      setNodeEditMode(false);
      resetNodeEditState();
    }
    if (isEdgeDirty) {
      const discard = window.confirm(
        'Bạn có thay đổi edge chưa lưu. Auto tạo sẽ hủy chúng. Tiếp tục?',
      );
      if (!discard) return;
      setEdgeEditMode(false);
      resetEdgeEditState();
    }
    const ok = window.confirm(
      'Auto tạo node và graph sẽ XÓA toàn bộ node/edge hiện có của tầng (bao gồm corridor node chỉnh tay) rồi sinh lại từ geometry. Tiếp tục?',
    );
    if (!ok) return;

    setGeneratingGraph(true);
    setGraphError(null);
    try {
      const result = await generateGraph(floorId, accessToken);
      clearBuildingMapCache();
      setMapRefreshKey((k) => k + 1);
      setShowNodes(true);
      setShowGenerateGraph(false);
      setLastGraphResult({
        nodesCreated: result.nodesCreated,
        edgesCreated: result.edgesCreated,
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message || 'Không thể auto tạo node và graph.'
          : err instanceof Error
            ? err.message
            : 'Không thể auto tạo node và graph.';
      setGraphError(message);
      if (editTab === 'geometry') setGeometrySaveError(message);
    } finally {
      setGeneratingGraph(false);
    }
  };

  const handleFindRoute = async () => {
    if (!startRoomId || !targetRoomId) {
      setRouteError('Vui lòng chọn điểm xuất phát và điểm đến.');
      return;
    }
    if (startRoomId === targetRoomId) {
      setRouteError('Điểm xuất phát và điểm đến không được trùng nhau.');
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    try {
      const result = await fetchRoute({
        startType: 'ROOM',
        startId: startRoomId,
        targetType: 'ROOM',
        targetId: targetRoomId,
      });
      setRouteResult(result);
    } catch (err) {
      setRouteResult(null);
      if (err instanceof ApiError) {
        setRouteError(
          err.message ||
            'Không tìm thấy đường đi. Đồ thị có thể chưa được sinh.',
        );
      } else {
        setRouteError(
          err instanceof Error ? err.message : 'Không thể tính đường đi.',
        );
      }
    } finally {
      setRouteLoading(false);
    }
  };

  const ensureDebugSteps = useCallback(async (): Promise<boolean> => {
    if (debugSteps) return true;
    if (!floorId) {
      setDebugError('Không tìm thấy floorId.');
      return false;
    }

    setDebugLoading(true);
    setDebugError(null);
    try {
      const data = await fetchDebugSteps(floorId);
      setDebugSteps(data);
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        setDebugError(err.message || 'Không thể tải dữ liệu debug.');
      } else {
        setDebugError(
          err instanceof Error ? err.message : 'Không thể tải dữ liệu debug.',
        );
      }
      return false;
    } finally {
      setDebugLoading(false);
    }
  }, [debugSteps, floorId]);

  const toggleDebugStep = async (step: 1 | 2 | 3 | 4) => {
    const setters = {
      1: setShowDebugStep1,
      2: setShowDebugStep2,
      3: setShowDebugStep3,
      4: setShowDebugStep4,
    } as const;
    const getters = {
      1: showDebugStep1,
      2: showDebugStep2,
      3: showDebugStep3,
      4: showDebugStep4,
    } as const;

    const currentlyOn = getters[step];
    if (currentlyOn) {
      setters[step](false);
      return;
    }

    const ok = await ensureDebugSteps();
    if (!ok) return;
    setters[step](true);
  };

  const snapLngLat = useCallback(
    (raw: LngLat, shiftKey: boolean, previous?: LngLat | null) => {
      return snapPoint(raw, snapTargets, {
        disableSnap: shiftKey,
        previousPoint: previous,
        lockOrtho: geometryTool === 'draw-room' || geometryTool === 'draw-wall',
      }).point;
    },
    [snapTargets, geometryTool],
  );

  const handleEditorPointerDown = useCallback(
    (e: EditorPointerEvent) => {
      const { hit, lngLat, shiftKey } = e;

      if (geometryTool === 'draw-room') {
        const snapped = snapLngLat(
          lngLat,
          shiftKey,
          previewPoints[previewPoints.length - 1] ?? null,
        );
        // Double-click finish: if close to first point and >= 3 verts
        if (
          previewPoints.length >= 3 &&
          Math.abs(snapped[0] - previewPoints[0][0]) < 1e-6 &&
          Math.abs(snapped[1] - previewPoints[0][1]) < 1e-6
        ) {
          geometryEditor.addRoom(previewPoints);
          setPreviewPoints([]);
          setHoverPreview(null);
          return;
        }
        setPreviewPoints((prev) => [...prev, snapped]);
        return;
      }

      if (geometryTool === 'draw-wall') {
        const snapped = snapLngLat(
          lngLat,
          shiftKey,
          previewPoints[0] ?? null,
        );
        if (previewPoints.length === 0) {
          setPreviewPoints([snapped]);
        } else {
          geometryEditor.addWall(previewPoints[0], snapped);
          setPreviewPoints([]);
          setHoverPreview(null);
        }
        return;
      }

      if (geometryTool === 'place-door') {
        if (hit?.kind === 'wall' && hit.boundaryKey) {
          const key = geometryEditor.placeDoorOnWall(hit.boundaryKey, lngLat);
          if (key) setGeometrySelection({ kind: 'door', key });
        }
        return;
      }

      if (geometryTool === 'delete') {
        if (hit?.kind === 'vertex' && hit.roomKey != null && hit.vertexIndex != null) {
          geometryEditor.deleteVertex(hit.roomKey, hit.vertexIndex);
          return;
        }
        if (hit?.kind === 'door' && hit.boundaryKey) {
          geometryEditor.deleteBoundary(hit.boundaryKey);
          return;
        }
        if (hit?.kind === 'wall' && hit.boundaryKey) {
          geometryEditor.deleteBoundary(hit.boundaryKey);
          return;
        }
        if (hit?.kind === 'room' && hit.roomKey) {
          geometryEditor.deleteRoom(hit.roomKey);
          setGeometrySelection(null);
        }
        return;
      }

      // select tool
      if (hit?.kind === 'vertex' && hit.roomKey != null && hit.vertexIndex != null) {
        setGeometrySelection({
          kind: 'vertex',
          roomKey: hit.roomKey,
          index: hit.vertexIndex,
        });
        geometryEditor.checkpoint();
        dragRef.current = {
          kind: 'vertex',
          roomKey: hit.roomKey,
          vertexIndex: hit.vertexIndex,
        };
        return;
      }
      if (hit?.kind === 'edge' && hit.roomKey != null && hit.edgeIndex != null) {
        geometryEditor.insertVertex(hit.roomKey, hit.edgeIndex, lngLat);
        return;
      }
      if ((hit?.kind === 'wall' || hit?.kind === 'door') && hit.boundaryKey) {
        setGeometrySelection({
          kind: hit.kind,
          key: hit.boundaryKey,
        });
        if (hit.endpoint === 0 || hit.endpoint === 1) {
          geometryEditor.checkpoint();
          dragRef.current = {
            kind: 'wall-endpoint',
            boundaryKey: hit.boundaryKey,
            endpoint: hit.endpoint,
          };
        }
        return;
      }
      if (hit?.kind === 'room' && hit.roomKey) {
        setGeometrySelection({ kind: 'room', key: hit.roomKey });
        return;
      }
      setGeometrySelection(null);
    },
    [geometryTool, previewPoints, geometryEditor, snapLngLat],
  );

  const handleEditorPointerMove = useCallback(
    (e: EditorPointerEvent) => {
      if (geometryTool === 'draw-room' || geometryTool === 'draw-wall') {
        const snapped = snapLngLat(
          e.lngLat,
          e.shiftKey,
          previewPoints[previewPoints.length - 1] ?? null,
        );
        setHoverPreview(snapped);
        return;
      }
      const drag = dragRef.current;
      if (!drag) return;
      const snapped = snapLngLat(e.lngLat, e.shiftKey);
      if (
        drag.kind === 'vertex' &&
        drag.roomKey != null &&
        drag.vertexIndex != null
      ) {
        geometryEditor.moveVertex(
          drag.roomKey,
          drag.vertexIndex,
          snapped,
          false,
        );
      } else if (
        drag.kind === 'wall-endpoint' &&
        drag.boundaryKey != null &&
        drag.endpoint != null
      ) {
        geometryEditor.moveWallEndpoint(
          drag.boundaryKey,
          drag.endpoint,
          snapped,
          false,
        );
      }
    },
    [geometryTool, geometryEditor, snapLngLat, previewPoints],
  );

  const handleEditorPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const drawHint = useMemo(() => {
    if (geometryTool === 'draw-room') {
      if (previewPoints.length === 0)
        return 'Click để thêm đỉnh phòng. Enter hoặc click đỉnh đầu để đóng (≥3 đỉnh). Esc hủy.';
      return `${previewPoints.length} đỉnh · Enter hoặc click đỉnh đầu để hoàn thành · Esc hủy`;
    }
    if (geometryTool === 'draw-wall') {
      return previewPoints.length === 0
        ? 'Click điểm đầu tường · Esc hủy'
        : 'Click điểm cuối tường · Esc hủy';
    }
    if (geometryTool === 'place-door') return 'Click lên một tường để đặt cửa';
    if (geometryTool === 'delete') return 'Click đối tượng để xóa';
    return null;
  }, [geometryTool, previewPoints.length]);

  const livePreviewPoints = useMemo(() => {
    if (!hoverPreview) return previewPoints;
    if (geometryTool === 'draw-room' || geometryTool === 'draw-wall') {
      return [...previewPoints, hoverPreview];
    }
    return previewPoints;
  }, [previewPoints, hoverPreview, geometryTool]);

  const mapContent = (
    <FloorMap
      floorNumber={1}
      refreshKey={mapRefreshKey}
      startRoomId={mode === 'watch' && !heatmapEnabled ? startRoomId || null : null}
      targetRoomId={mode === 'watch' && !heatmapEnabled ? targetRoomId || null : null}
      routePath={mode === 'watch' && !heatmapEnabled ? routeResult?.path ?? null : null}
      highlightedRoomId={
        mode === 'watch' && heatmapEnabled ? inspectedRoomId : undefined
      }
      onSelectRoom={handleSelectRoom}
      onClearRoomSelect={
        mode === 'watch' && heatmapEnabled ?
          () => setInspectedRoomId(null)
        : undefined
      }
      showNodes={
        (mode === 'edit' && showNodes) || nodeEditMode || edgeEditMode
      }
      showWalkable={
        (mode === 'edit' && showWalkable) || (nodeEditMode && placingNode)
      }
      debugSteps={
        mode === 'edit' && !nodeEditMode && !edgeEditMode ? debugSteps : null
      }
      showDebugStep1={
        mode === 'edit' && !nodeEditMode && !edgeEditMode && showDebugStep1
      }
      showDebugStep2={
        mode === 'edit' && !nodeEditMode && !edgeEditMode && showDebugStep2
      }
      showDebugStep3={
        mode === 'edit' && !nodeEditMode && !edgeEditMode && showDebugStep3
      }
      showDebugStep4={
        mode === 'edit' && !nodeEditMode && !edgeEditMode && showDebugStep4
      }
      nodeEditMode={nodeEditMode}
      placingNode={placingNode}
      pendingAdds={pendingAdds}
      pendingRemoves={pendingRemoves}
      selectedEditableNodeId={selectedEditableNodeId}
      onSelectEditableNode={setSelectedEditableNodeId}
      onPlaceNode={handlePlaceNode}
      edgeEditMode={edgeEditMode}
      pendingEdgeRemoves={pendingEdgeRemoves}
      selectedEdgePairKey={selectedEdge?.pairKey ?? null}
      onSelectEdge={setSelectedEdge}
      topDown={geometryActive}
      geometryEditMode={geometryActive}
      geometryTool={geometryTool}
      editorRooms={geometryEditor.rooms}
      editorBoundaries={geometryEditor.boundaries}
      editorSelectedKey={
        geometrySelection &&
        (geometrySelection.kind === 'room' ||
          geometrySelection.kind === 'wall' ||
          geometrySelection.kind === 'door')
          ? geometrySelection.key
          : geometrySelection?.kind === 'vertex'
            ? geometrySelection.roomKey
            : null
      }
      editorSelectedVertex={
        geometrySelection?.kind === 'vertex'
          ? {
              roomKey: geometrySelection.roomKey,
              index: geometrySelection.index,
            }
          : null
      }
      editorPreviewPoints={livePreviewPoints}
      editorErrorKeys={geometryEditor.clientErrors.map((e) => e.key)}
      onEditorPointerDown={handleEditorPointerDown}
      onEditorPointerMove={handleEditorPointerMove}
      onEditorPointerUp={handleEditorPointerUp}
      heatmapEnabled={mode === 'watch' && heatmapEnabled}
      heatmapRooms={heatmap.rooms}
    />
  );

  const toolbar = (
    <div className="flex items-center gap-2 shrink-0">
      <div className="inline-flex rounded-lg border border-[#EBEBEB] bg-[#F8F8FB] p-0.5">
        <button
          type="button"
          onClick={() => {
            if (nodeEditMode && !exitNodeEditMode()) return;
            if (edgeEditMode && !exitEdgeEditMode()) return;
            setMode('watch');
          }}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer',
            mode === 'watch'
              ? 'bg-white text-[#2D2D2D] shadow-sm'
              : 'text-[#7B7B7B] hover:text-[#2D2D2D]',
          )}
        >
          <Eye className="w-3.5 h-3.5" />
          Xem
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('edit');
            setShowNodes(true);
          }}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold transition-colors cursor-pointer',
            mode === 'edit'
              ? 'bg-white text-[#2D2D2D] shadow-sm'
              : 'text-[#7B7B7B] hover:text-[#2D2D2D]',
          )}
        >
          <Pencil className="w-3.5 h-3.5" />
          Sửa
        </button>
      </div>

      {mode === 'watch' && (
        <>
        <button
          type="button"
          onClick={() => {
            setHeatmapEnabled((v) => {
              const next = !v;
              if (next) {
                clearRoute();
                setStartRoomId('');
                setTargetRoomId('');
              }
              return next;
            });
          }}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap',
            heatmapEnabled
              ? 'bg-red-500 border-red-500 text-white'
              : 'bg-white border-[#EBEBEB] text-[#2D2D2D] hover:bg-[#F8F8FB]',
          )}
        >
          <Flame className="w-3.5 h-3.5" />
          Heatmap
        </button>
        <AutoRebalanceToggle variant="toolbar" />
        </>
      )}

      <button
        type="button"
        onClick={() => setIsFullscreen((v) => !v)}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EBEBEB] bg-white text-[11px] font-bold text-[#2D2D2D] hover:bg-[#F8F8FB] transition-colors cursor-pointer whitespace-nowrap"
      >
        {isFullscreen ? (
          <>
            <Minimize2 className="w-3.5 h-3.5" />
            Thoát toàn màn hình
          </>
        ) : (
          <>
            <Maximize2 className="w-3.5 h-3.5" />
            Toàn màn hình
          </>
        )}
      </button>
    </div>
  );

  const editTabBar = null;

  const watchPanel = watchPanelCollapsed ? (
    <div className="w-[260px] flex items-center justify-between p-2 rounded-xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#155DFC] flex items-center justify-center shrink-0">
          <Route className="w-3 h-3" />
        </div>
        <p className="text-[11px] font-extrabold text-[#2D2D2D] truncate">
          Dẫn đường
        </p>
      </div>
      <button
        type="button"
        onClick={() => setWatchPanelCollapsed(false)}
        className="p-1 rounded-md text-[#7B7B7B] hover:text-[#2D2D2D] hover:bg-[#F8F8FB] cursor-pointer"
        title="Mở rộng dẫn đường"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  ) : (
    <div className="w-[260px] flex flex-col gap-2 p-3 rounded-xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#155DFC] flex items-center justify-center shrink-0">
            <Route className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold text-[#2D2D2D] truncate">
              Dẫn đường
            </p>
            <p className="text-[9px] font-semibold text-[#9C9C9C] truncate">
              Click phòng hoặc chọn
              {pickStep === 'start' ? ' · điểm đi' : ' · điểm đến'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWatchPanelCollapsed(true)}
          className="p-1 rounded-md text-[#7B7B7B] hover:text-[#2D2D2D] hover:bg-[#F8F8FB] cursor-pointer shrink-0"
          title="Thu gọn dẫn đường"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-600">
            Điểm đi
          </span>
          <select
            value={startRoomId}
            onChange={(e) => {
              clearRoute();
              setStartRoomId(e.target.value);
              setPickStep('target');
              if (e.target.value) setInspectedRoomId(e.target.value);
            }}
            className="h-8 w-full min-w-0 rounded-lg border border-[#EBEBEB] bg-white px-2 text-[11px] font-semibold text-[#2D2D2D] outline-none focus:border-[#8B7CF6]"
          >
            <option value="">Chọn phòng...</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roomLabel} ({r.roomCode})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-[#ef476f]">
            Điểm đến
          </span>
          <select
            value={targetRoomId}
            onChange={(e) => {
              clearRoute();
              setTargetRoomId(e.target.value);
              setPickStep('start');
              if (e.target.value) setInspectedRoomId(e.target.value);
            }}
            className="h-8 w-full min-w-0 rounded-lg border border-[#EBEBEB] bg-white px-2 text-[11px] font-semibold text-[#2D2D2D] outline-none focus:border-[#8B7CF6]"
          >
            <option value="">Chọn phòng...</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id} disabled={r.id === startRoomId}>
                {r.roomLabel} ({r.roomCode})
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={handleFindRoute}
          disabled={routeLoading || !startRoomId || !targetRoomId}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-colors cursor-pointer',
            routeLoading || !startRoomId || !targetRoomId
              ? 'bg-[#B8B0F0] cursor-not-allowed'
              : 'bg-[#8B7CF6] hover:bg-[#7A6BE8]',
          )}
        >
          {routeLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Navigation className="w-3 h-3" />
          )}
          Tìm đường
        </button>

        {(routeResult || startRoomId || targetRoomId) && (
          <button
            type="button"
            onClick={() => {
              setStartRoomId('');
              setTargetRoomId('');
              setPickStep('start');
              clearRoute();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EBEBEB] text-[11px] font-bold text-[#7B7B7B] hover:bg-[#F8F8FB] cursor-pointer"
          >
            <X className="w-3 h-3" />
            Xóa
          </button>
        )}
      </div>

      {routeResult && (
        <p className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">
          {routeResult.totalDistance.toFixed(1)} m · {routeResult.path.length}{' '}
          điểm
        </p>
      )}
      {routeError && (
        <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-lg px-2 py-1.5">
          {routeError}
        </p>
      )}
    </div>
  );

  const nodeEditPanel = (
    <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Waypoints className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold text-[#2D2D2D]">
              Edit node
            </p>
            <p className="text-[9px] font-semibold text-[#9C9C9C] truncate">
              CORRIDOR / JUNCTION
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={exitNodeEditMode}
          className="text-[10px] font-bold text-[#7B7B7B] hover:text-[#2D2D2D] cursor-pointer px-2 py-1 rounded-md hover:bg-[#F8F8FB]"
        >
          Thoát
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setPlacingNode((v) => !v);
          setSelectedEditableNodeId(null);
        }}
        className={cn(
          'flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer w-full',
          placingNode
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'bg-white border-[#EBEBEB] text-[#2D2D2D] hover:bg-[#F8F8FB]',
        )}
      >
        <Plus className="w-3.5 h-3.5" />
        {placingNode ? 'Đang thêm… (click vùng walkable)' : 'Thêm node'}
      </button>
      {placingNode && (
        <p className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 rounded-lg px-2 py-1.5">
          Click lên vùng đi được (walkable) để đặt corridor node.
        </p>
      )}

      {selectedEditableNodeId && (
        <div className="rounded-lg border border-[#EBEBEB] bg-[#F8F8FB] p-2 space-y-1.5">
          <p className="text-[10px] font-bold text-[#2D2D2D] truncate">
            {selectedNodeMeta
              ? `${selectedNodeMeta.type}`
              : selectedEditableNodeId.startsWith('tmp-')
                ? 'Node mới (chưa lưu)'
                : 'Node đã chọn'}
          </p>
          <button
            type="button"
            onClick={handleDeleteSelectedNode}
            className="flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-lg bg-rose-500 text-white text-[11px] font-bold cursor-pointer hover:bg-rose-600"
          >
            <Trash2 className="w-3 h-3" />
            Xóa node
          </button>
        </div>
      )}

      {isDirty && (
        <p className="text-[9px] font-semibold text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
          +{pendingAdds.length} · −{pendingRemoves.length} chưa lưu
        </p>
      )}
      {saveError && (
        <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-lg px-2 py-1.5">
          {saveError}
        </p>
      )}

      <button
        type="button"
        disabled={!isDirty || savingNodes || !accessToken}
        onClick={handleSaveCorridorEdits}
        className={cn(
          'flex items-center justify-center gap-1 w-full px-2.5 py-2 rounded-lg text-[11px] font-bold',
          !isDirty || savingNodes || !accessToken
            ? 'bg-[#C8C2F0] text-white cursor-not-allowed'
            : 'bg-[#8B7CF6] text-white hover:bg-[#7A6BE8] cursor-pointer',
        )}
      >
        {savingNodes ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        Lưu
      </button>
    </div>
  );

  const edgeEditPanel = (
    <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <Spline className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold text-[#2D2D2D]">
              Edit edge
            </p>
            <p className="text-[9px] font-semibold text-[#9C9C9C] truncate">
              Chọn cạnh rồi xóa (cả hai chiều)
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={exitEdgeEditMode}
          className="text-[10px] font-bold text-[#7B7B7B] hover:text-[#2D2D2D] cursor-pointer px-2 py-1 rounded-md hover:bg-[#F8F8FB]"
        >
          Thoát
        </button>
      </div>

      <p className="text-[9px] font-semibold text-indigo-700 bg-indigo-50 rounded-lg px-2 py-1.5">
        Click vào đường nối để chọn (màu hồng). Node không chọn được trong mode này.
      </p>

      {selectedEdge && (
        <div className="rounded-lg border border-[#EBEBEB] bg-[#F8F8FB] p-2 space-y-1.5">
          <p className="text-[10px] font-bold text-[#2D2D2D]">
            Đã chọn {selectedEdge.ids.length} chiều
          </p>
          <button
            type="button"
            onClick={handleDeleteSelectedEdge}
            className="flex items-center justify-center gap-1 w-full px-2.5 py-1.5 rounded-lg bg-rose-500 text-white text-[11px] font-bold cursor-pointer hover:bg-rose-600"
          >
            <Trash2 className="w-3 h-3" />
            Xóa edge
          </button>
        </div>
      )}

      {isEdgeDirty && (
        <p className="text-[9px] font-semibold text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5">
          −{pendingEdgeRemoves.length} cạnh chưa lưu
        </p>
      )}
      {edgeSaveError && (
        <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-lg px-2 py-1.5">
          {edgeSaveError}
        </p>
      )}

      <button
        type="button"
        disabled={!isEdgeDirty || savingEdges || !accessToken}
        onClick={handleSaveEdgeEdits}
        className={cn(
          'flex items-center justify-center gap-1 w-full px-2.5 py-2 rounded-lg text-[11px] font-bold',
          !isEdgeDirty || savingEdges || !accessToken
            ? 'bg-[#C8C2F0] text-white cursor-not-allowed'
            : 'bg-[#8B7CF6] text-white hover:bg-[#7A6BE8] cursor-pointer',
        )}
      >
        {savingEdges ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        Lưu
      </button>
    </div>
  );

  const nodesPanel = nodeEditMode ? (
    nodeEditPanel
  ) : edgeEditMode ? (
    edgeEditPanel
  ) : (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
        <button
          type="button"
          onClick={() => setShowNodes((v) => !v)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer',
            showNodes
              ? 'bg-indigo-500 border-indigo-500 text-white'
              : 'bg-white border-[#EBEBEB] text-[#2D2D2D] hover:bg-[#F8F8FB]',
          )}
        >
          <CircleDot className="w-3 h-3" />
          Nodes{showNodes ? ': Hiện' : ''}
        </button>

        <button
          type="button"
          onClick={() => setShowWalkable((v) => !v)}
          className={cn(
            'flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer',
            showWalkable
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-white border-[#EBEBEB] text-[#2D2D2D] hover:bg-[#F8F8FB]',
          )}
        >
          <Footprints className="w-3 h-3" />
          Walkable{showWalkable ? ': Bật' : ''}
        </button>

        <button
          type="button"
          onClick={() => {
            if (edgeEditMode && !exitEdgeEditMode()) return;
            setNodeEditMode(true);
            setShowNodes(true);
            setPlacingNode(false);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EBEBEB] bg-white text-[11px] font-bold text-[#2D2D2D] hover:bg-[#F8F8FB] cursor-pointer"
        >
          <Waypoints className="w-3 h-3" />
          Sửa node
        </button>

        <button
          type="button"
          onClick={() => {
            if (nodeEditMode && !exitNodeEditMode()) return;
            setEdgeEditMode(true);
            setShowNodes(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#EBEBEB] bg-white text-[11px] font-bold text-[#2D2D2D] hover:bg-[#F8F8FB] cursor-pointer"
        >
          <Spline className="w-3 h-3" />
          Sửa edge
        </button>

        <button
          type="button"
          disabled={generatingGraph || !floorId || !accessToken}
          onClick={handleRebuildGraph}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer disabled:opacity-50"
        >
          {generatingGraph ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Waypoints className="w-3 h-3" />
          )}
          Tạo graph
        </button>

        <button
          type="button"
          disabled={generatingGraph || !floorId || !accessToken}
          onClick={handleAutoGenerateGraph}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-200 bg-violet-50 text-[11px] font-bold text-violet-800 hover:bg-violet-100 cursor-pointer disabled:opacity-50"
        >
          {generatingGraph ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          Auto tạo node và graph
        </button>
      </div>

      {lastGraphResult && (
        <p className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5">
          {lastGraphResult.nodesCreated > 0
            ? `Đã tạo ${lastGraphResult.nodesCreated} node · ${lastGraphResult.edgesCreated} cạnh`
            : `Đã tạo ${lastGraphResult.edgesCreated} cạnh từ node hiện có`}
        </p>
      )}
      {graphError && (
        <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-lg px-2 py-1.5">
          {graphError}
        </p>
      )}

      <div className="flex flex-col gap-2 p-2.5 rounded-xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Bug className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold text-[#2D2D2D] truncate">
              Debug tạo node
            </p>
            <p className="text-[9px] font-semibold text-[#9C9C9C] truncate">
              MPRSS · bật từng bước
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {DEBUG_STEPS.map((step) => {
            const active =
              step.key === 1
                ? showDebugStep1
                : step.key === 2
                  ? showDebugStep2
                  : step.key === 3
                    ? showDebugStep3
                    : showDebugStep4;

            return (
              <button
                key={step.key}
                type="button"
                disabled={debugLoading}
                onClick={() => toggleDebugStep(step.key)}
                className={cn(
                  'flex items-center px-2.5 py-1.5 rounded-lg border text-[10px] font-bold text-left transition-colors cursor-pointer disabled:opacity-60 w-full',
                  active
                    ? step.activeClass
                    : 'bg-white border-[#EBEBEB] text-[#2D2D2D] hover:bg-[#F8F8FB]',
                )}
              >
                <span className="truncate">
                  {active ? `${step.label} (Hiện)` : step.label}
                </span>
              </button>
            );
          })}
        </div>

        {debugLoading && (
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-[#7B7B7B]">
            <Loader2 className="w-3 h-3 animate-spin" />
            Đang tải debug...
          </p>
        )}
        {debugError && (
          <p className="text-[10px] font-semibold text-rose-600 bg-rose-50 rounded-lg px-2 py-1.5">
            {debugError}
          </p>
        )}
      </div>
    </div>
  );

  const geometryPanel = (
    <GeometryEditorPanel
      tool={geometryTool}
      onToolChange={(t) => {
        setGeometryTool(t);
        setPreviewPoints([]);
        setHoverPreview(null);
        dragRef.current = null;
      }}
      selection={geometrySelection}
      selectedRoom={selectedDraftRoom}
      areas={activeFloor?.areas || []}
      changeCount={geometryEditor.changeCount}
      canUndo={geometryEditor.canUndo}
      canRedo={geometryEditor.canRedo}
      onUndo={geometryEditor.undo}
      onRedo={geometryEditor.redo}
      onUpdateRoomProps={geometryEditor.updateRoomProps}
      onDeleteSelection={handleDeleteGeometrySelection}
      clientErrors={geometryEditor.clientErrors}
      saveError={geometrySaveError}
      drawHint={drawHint}
      onSave={handleSaveGeometry}
      saving={savingGeometry}
      saveDisabled={
        !geometryEditor.isDirty || geometryEditor.clientErrors.length > 0
      }
    />
  );

  const sidePanel =
    mode === 'watch'
      ? heatmapEnabled
        ? null
        : watchPanel
      : editTab === 'geometry' && !nodeEditMode
        ? geometryPanel
        : nodesPanel;

  const inspectedHeatmapRoom = useMemo(() => {
    if (!inspectedRoom || !heatmap.rooms.length) return null;
    return (
      heatmap.roomsByPhysicalId.get(inspectedRoom.id) ||
      heatmap.roomsByPhysicalId.get(inspectedRoom.roomCode) ||
      heatmap.roomsByRoomId.get(inspectedRoom.id) ||
      heatmap.roomsByRoomId.get(inspectedRoom.roomCode) ||
      heatmap.rooms.find(
        (r) =>
          r.room_name.toLowerCase() === inspectedRoom.roomLabel.toLowerCase() ||
          r.room_name.toLowerCase() === inspectedRoom.roomCode.toLowerCase(),
      ) ||
      null
    );
  }, [inspectedRoom, heatmap.rooms, heatmap.roomsByPhysicalId, heatmap.roomsByRoomId]);

  const roomInfoPopup = inspectedRoom &&
    !nodeEditMode &&
    !edgeEditMode &&
    !geometryActive && (
    <div className="absolute top-4 right-4 z-20 pointer-events-auto w-[250px]">
      <div className="rounded-2xl border border-[#EBEBEB] bg-white/95 backdrop-blur-md shadow-lg p-3.5">
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5',
              heatmapEnabled
                ? 'bg-red-50 text-red-500'
                : 'bg-blue-50 text-[#155DFC]',
            )}
          >
            {heatmapEnabled ? (
              <Flame className="w-4 h-4" />
            ) : (
              <DoorOpen className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-extrabold text-[#2D2D2D] leading-snug break-words">
              {inspectedRoom.roomLabel}
            </p>
            <p className="text-[10.5px] font-bold text-[#7B7B7B] mt-0.5">
              Mã phòng: <span className="text-[#155DFC]">{inspectedRoom.roomCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInspectedRoomId(null)}
            className="shrink-0 p-1 rounded-md text-[#9C9C9C] hover:text-[#2D2D2D] hover:bg-[#F8F8FB] cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {heatmapEnabled ? (
          <div className="mt-3 pt-2.5 border-t border-[#F0F0F0] space-y-2">
            {inspectedHeatmapRoom ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[#7B7B7B] uppercase tracking-wider">
                    Mức độ tải
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-extrabold px-2 py-0.5 rounded-full border',
                      CONGESTION_STYLES[inspectedHeatmapRoom.congestion_level]?.badge ||
                        'bg-neutral-100 text-neutral-600',
                    )}
                  >
                    {CONGESTION_STYLES[inspectedHeatmapRoom.congestion_level]?.label ||
                      inspectedHeatmapRoom.congestion_level}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="bg-[#F8F8FB] rounded-xl p-2 text-center border border-neutral-100">
                    <p className="text-[9px] font-bold text-[#9C9C9C] uppercase">Đang chờ</p>
                    <p className="text-[14px] font-extrabold text-rose-600 mt-0.5">
                      {inspectedHeatmapRoom.waiting_count}{' '}
                      <span className="text-[10px] font-bold text-neutral-400">người</span>
                    </p>
                  </div>

                  <div className="bg-[#F8F8FB] rounded-xl p-2 text-center border border-neutral-100">
                    <p className="text-[9px] font-bold text-[#9C9C9C] uppercase">Chờ ước tính</p>
                    <p className="text-[14px] font-extrabold text-[#2D2D2D] mt-0.5">
                      {inspectedHeatmapRoom.eta_full_queue_minutes}{' '}
                      <span className="text-[10px] font-bold text-neutral-400">phút</span>
                    </p>
                  </div>
                </div>

                {typeof inspectedHeatmapRoom.serving_count === 'number' && (
                  <div className="flex justify-between items-center text-[10.5px] pt-1 px-1">
                    <span className="font-semibold text-[#7B7B7B]">Đang khám / xử lý:</span>
                    <span className="font-bold text-[#2D2D2D]">
                      {inspectedHeatmapRoom.serving_count} người
                    </span>
                  </div>
                )}
                {typeof inspectedHeatmapRoom.completed_today === 'number' && (
                  <div className="flex justify-between items-center text-[10.5px] px-1">
                    <span className="font-semibold text-[#7B7B7B]">Đã khám xong hôm nay:</span>
                    <span className="font-bold text-emerald-600">
                      {inspectedHeatmapRoom.completed_today} ca
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="py-2 text-center">
                <p className="text-[11px] text-[#9C9C9C] font-semibold">
                  Chưa có dữ liệu hàng chờ cho phòng này.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2.5 pt-2.5 border-t border-[#F0F0F0] space-y-1.5">
            {inspectedAreaLabel && (
              <div className="flex justify-between gap-2 text-[10.5px]">
                <span className="font-semibold text-[#9C9C9C]">Khu vực</span>
                <span className="font-bold text-[#2D2D2D] text-right truncate">
                  {inspectedAreaLabel}
                </span>
              </div>
            )}
            {typeof inspectedRoom.heightMeters === 'number' && (
              <div className="flex justify-between gap-2 text-[10.5px]">
                <span className="font-semibold text-[#9C9C9C]">Chiều cao</span>
                <span className="font-bold text-[#2D2D2D]">
                  {inspectedRoom.heightMeters} m
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2 text-[10.5px]">
              <span className="font-semibold text-[#9C9C9C]">POI</span>
              <span className="font-bold text-[#2D2D2D]">
                {inspectedRoom.pois?.length ?? 0}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const saveFab = nodeEditMode ? (
    <div className="absolute bottom-4 right-4 z-40 pointer-events-auto">
      <button
        type="button"
        disabled={!isDirty || savingNodes}
        onClick={handleSaveCorridorEdits}
        className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-bold shadow-lg transition-colors',
          !isDirty || savingNodes
            ? 'bg-[#C8C2F0] text-white cursor-not-allowed'
            : 'bg-[#8B7CF6] text-white hover:bg-[#7A6BE8] cursor-pointer',
        )}
      >
        {savingNodes ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Lưu
      </button>
    </div>
  ) : edgeEditMode ? (
    <div className="absolute bottom-4 right-4 z-40 pointer-events-auto">
      <button
        type="button"
        disabled={!isEdgeDirty || savingEdges}
        onClick={handleSaveEdgeEdits}
        className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-2xl text-[13px] font-bold shadow-lg transition-colors',
          !isEdgeDirty || savingEdges
            ? 'bg-[#C8C2F0] text-white cursor-not-allowed'
            : 'bg-[#8B7CF6] text-white hover:bg-[#7A6BE8] cursor-pointer',
        )}
      >
        {savingEdges ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Lưu
      </button>
    </div>
  ) : null;

  const busy = savingNodes || savingEdges || savingGeometry || generatingGraph;
  const progressModal =
    busy &&
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px]"
        role="alertdialog"
        aria-modal="true"
        aria-busy="true"
      >
        <div className="mx-4 w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-[#EBEBEB] p-6 text-center">
          <div className="mx-auto mb-4 relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-[#EEEDFC]" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#8B7CF6] animate-spin" />
            <Navigation className="absolute inset-0 m-auto w-5 h-5 text-[#8B7CF6]" />
          </div>
          <p className="text-[14px] font-bold text-[#2D2D2D] leading-relaxed">
            {generatingGraph
              ? 'Đang tạo navigation graph, xin đợi...'
              : savingGeometry
                ? 'Đang lưu bản đồ, xin đợi...'
                : savingEdges
                  ? 'Đang lưu thay đổi edge...'
                  : 'Đang lưu thay đổi node...'}
          </p>
          <p className="text-[12px] font-medium text-[#7B7B7B] mt-2 leading-relaxed">
            Bạn có thể đóng cửa sổ này và làm việc khác
          </p>
        </div>
      </div>,
      document.body,
    );

  const pageBody = (
    <div className="relative h-full min-h-0 overflow-hidden">
      <div className="absolute inset-0 z-0">{mapContent}</div>

      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="pointer-events-auto inline-flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#155DFC] flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[11px] font-extrabold text-slate-800 tracking-tight whitespace-nowrap">
                  Sơ đồ bệnh viện 3D
                </h2>
                <p className="text-[9px] font-semibold text-slate-500 whitespace-nowrap max-w-[160px] truncate">
                  {buildingName}
                </p>
              </div>
            </div>
            {toolbar}
            {editTabBar}
          </div>

          <div className="w-fit max-w-[calc(100vw-32px)] max-h-[55vh] overflow-y-auto overflow-x-hidden">
            {sidePanel}
          </div>
        </div>
      </div>

      {roomInfoPopup}
      {saveFab}
    </div>
  );

  const fullscreenOverlay =
    mounted &&
    isFullscreen &&
    createPortal(
      <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col">
        {pageBody}
      </div>,
      document.body,
    );

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="px-6 pt-6 pb-3 shrink-0">
          <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
            Cấu hình bản đồ
          </h1>
          <p className="text-[13px] text-[#7B7B7B] mt-1 font-medium">
            Xem sơ đồ 3D, dẫn đường, debug MPRSS, và chỉnh sửa node/edge.
          </p>
        </div>

        <div className="flex-1 min-h-0 px-6 pb-6">
          <div className="h-full rounded-2xl border border-[#EBEBEB] overflow-hidden relative">
            {!isFullscreen && pageBody}
            {isFullscreen && (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-[13px] font-semibold text-[#7B7B7B]">
                Đang xem toàn màn hình — nhấn Esc hoặc nút thoát để quay lại.
              </div>
            )}
          </div>
        </div>
      </div>

      {fullscreenOverlay}
      {progressModal}
    </>
  );
}
