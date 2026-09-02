'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  FloorData3D,
  RoomData,
  WallSegment,
  lngLatToLocal,
  localToLngLat,
} from '../../utils/buildingToThree';
import { createWallMaterial, createDoorMaterial } from './threeMaterials';
import { useNavigationStore } from '../../store/navigationStore';
import {
  DEFAULT_WALL_HEIGHT,
  addWallSegment,
  addAreaPartitions,
  addStandaloneDoors,
  addRoomFloor,
  buildFloorSlab,
  createBeaconGroup,
} from './threeBuilders';
import type {
  ApiFloor,
  CorridorDebugSteps,
  RoutePathNode,
} from '../../types/navigation.types';
import {
  buildNodesGroup,
  buildWalkableZoneMesh,
  createEmptyDebugGroups,
  populateDebugGroups,
  type DebugLayerGroups,
} from './mapDebugLayers';
import {
  hitTestEditorOverlay,
  rebuildEditorOverlay,
  type EditorHit,
} from './mapEditorLayers';
import type { PendingAddNode, EditorPointerEvent, SelectedGraphEdge } from '../FloorMap';
import type {
  DraftBoundary,
  DraftRoom,
  GeometryTool,
} from '@/modules/admin/hooks/useMapGeometryEditor';
import type { LngLat } from '@/modules/admin/utils/mapEditorGeometry';
import type { HeatmapRoom } from '@/modules/admin/hooks/useQueueHeatmap';


interface BuildingMapCanvasProps {
  floorData: FloorData3D;
  apiFloor?: ApiFloor | null;
  highlightedRoomId?: string | null;
  highlightRoomCode?: string | null;
  highlightAreaId?: string | null;
  startRoomId?: string | null;
  targetRoomId?: string | null;
  routePath?: RoutePathNode[] | null;
  onSelectRoom?: (roomId: string) => void;
  onClearRoomSelect?: () => void;
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
  edgeEditMode?: boolean;
  pendingEdgeRemoves?: string[];
  selectedEdgePairKey?: string | null;
  onSelectEdge?: (edge: SelectedGraphEdge | null) => void;
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

interface ProjectedMarker {
  id: string;
  label: string;
  roomCode: string;
  icon: string;
  screenX: number;
  screenY: number;
  isHighlighted: boolean;
  isVisible: boolean;
  kind: 'default' | 'start' | 'target' | 'heatmap';
  heatmapData?: HeatmapRoom;
}

/** Mobile-like route: solid cyan path + white tip arrow */
const ROUTE_LINE_COLOR = 0x5ec8ff;
const ROUTE_LINE_RADIUS = 0.38;
const ROUTE_ARROW_COLOR = 0xffffff;
/** World units per second — shorter routes finish faster, longer ones stay readable */
const ROUTE_ARROW_SPEED = 8;

function disposeObject3D(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

function createRouteArrowMesh(): THREE.Mesh {
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(ROUTE_LINE_RADIUS * 2.4, ROUTE_LINE_RADIUS * 5.2, 16),
    new THREE.MeshBasicMaterial({
      color: ROUTE_ARROW_COLOR,
      depthWrite: false,
      transparent: true,
      opacity: 0.98,
    })
  );
  cone.renderOrder = 101;
  return cone;
}

const _arrowUp = new THREE.Vector3(0, 1, 0);
const _arrowTangent = new THREE.Vector3();
const _arrowQuat = new THREE.Quaternion();

function placeArrowOnCurve(
  arrow: THREE.Mesh,
  curve: THREE.CatmullRomCurve3,
  t: number
) {
  const clamped = Math.min(Math.max(t, 0), 1);
  curve.getPointAt(clamped, arrow.position);
  curve.getTangentAt(clamped, _arrowTangent);
  if (_arrowTangent.lengthSq() < 1e-8) return;
  _arrowTangent.normalize();
  _arrowQuat.setFromUnitVectors(_arrowUp, _arrowTangent);
  arrow.quaternion.copy(_arrowQuat);
}

function findHeatmapRoom(
  room: RoomData,
  heatmapRooms?: HeatmapRoom[]
): HeatmapRoom | undefined {
  if (!heatmapRooms || heatmapRooms.length === 0) return undefined;
  return heatmapRooms.find((hr) => {
    if (hr.physical_room_id && (hr.physical_room_id === room.id || hr.physical_room_id === room.roomCode)) {
      return true;
    }
    if (hr.room_id && (hr.room_id === room.id || hr.room_id === room.roomCode)) {
      return true;
    }
    if (hr.room_name && (hr.room_name.toLowerCase() === room.roomLabel.toLowerCase() || hr.room_name.toLowerCase() === room.roomCode.toLowerCase())) {
      return true;
    }
    return false;
  });
}

export const BuildingMapCanvas: React.FC<BuildingMapCanvasProps> = ({
  floorData,
  apiFloor = null,
  highlightedRoomId,
  highlightRoomCode,
  highlightAreaId,
  startRoomId = null,
  targetRoomId = null,
  routePath = null,
  onSelectRoom,
  onClearRoomSelect,
  showNodes = false,
  showWalkable = false,
  debugSteps = null,
  showDebugStep1 = false,
  showDebugStep2 = false,
  showDebugStep3 = false,
  showDebugStep4 = false,
  nodeEditMode = false,
  placingNode = false,
  pendingAdds = [],
  pendingRemoves = [],
  selectedEditableNodeId = null,
  onSelectEditableNode,
  onPlaceNode,
  edgeEditMode = false,
  pendingEdgeRemoves = [],
  selectedEdgePairKey = null,
  onSelectEdge,
  topDown = false,
  geometryEditMode = false,
  geometryTool = 'select',
  editorRooms = [],
  editorBoundaries = [],
  editorSelectedKey = null,
  editorSelectedVertex = null,
  editorPreviewPoints = [],
  editorErrorKeys = [],
  onEditorPointerDown,
  onEditorPointerMove,
  onEditorPointerUp,
  onHoverRoom,
  heatmapEnabled = false,
  heatmapRooms = [],
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [markers, setMarkers] = useState<ProjectedMarker[]>([]);
  const activeFloor = useNavigationStore((s) => s.activeFloor);

  const roomFloorMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const beaconGroupRef = useRef<THREE.Group | null>(null);
  const activeHighlightIdRef = useRef<string | null>(null);
  const startRoomIdRef = useRef<string | null>(startRoomId);
  const targetRoomIdRef = useRef<string | null>(targetRoomId);
  const onSelectRoomRef = useRef(onSelectRoom);
  const onClearRoomSelectRef = useRef(onClearRoomSelect);
  const onHoverRoomRef = useRef(onHoverRoom);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pathMeshRef = useRef<THREE.Group | null>(null);
  const routeArrowRef = useRef<THREE.Mesh | null>(null);
  const routeCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const routeArrowProgressRef = useRef(0);
  const routeArrowLastTsRef = useRef<number | null>(null);
  const routePathRef = useRef(routePath);
  const nodesGroupRef = useRef<THREE.Group | null>(null);
  const walkableMeshRef = useRef<THREE.Mesh | null>(null);
  const debugGroupsRef = useRef<DebugLayerGroups | null>(null);
  const debugPopulatedRef = useRef(false);
  const pendingPreviewRef = useRef<THREE.Group | null>(null);
  const placementPlaneRef = useRef<THREE.Mesh | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const roomMeshesGroupRef = useRef<THREE.Group | null>(null);
  const editorOverlayRef = useRef<THREE.Group | null>(null);
  const topDownRef = useRef(topDown);
  const geometryEditModeRef = useRef(geometryEditMode);
  const onEditorPointerDownRef = useRef(onEditorPointerDown);
  const onEditorPointerMoveRef = useRef(onEditorPointerMove);
  const onEditorPointerUpRef = useRef(onEditorPointerUp);
  const draggingEditorRef = useRef(false);
  const heatmapEnabledRef = useRef(heatmapEnabled);
  const heatmapRoomsRef = useRef(heatmapRooms);

  const nodeEditModeRef = useRef(nodeEditMode);
  const placingNodeRef = useRef(placingNode);
  const pendingRemovesRef = useRef(pendingRemoves);
  const onSelectEditableNodeRef = useRef(onSelectEditableNode);
  const onPlaceNodeRef = useRef(onPlaceNode);
  const selectedEditableNodeIdRef = useRef(selectedEditableNodeId);
  const apiFloorRef = useRef(apiFloor);
  const pendingAddsRef = useRef(pendingAdds);
  const edgeEditModeRef = useRef(edgeEditMode);
  const pendingEdgeRemovesRef = useRef(pendingEdgeRemoves);
  const selectedEdgePairKeyRef = useRef(selectedEdgePairKey);
  const onSelectEdgeRef = useRef(onSelectEdge);

  const debugStepsRef = useRef(debugSteps);
  const showNodesRef = useRef(showNodes);
  const showWalkableRef = useRef(showWalkable);
  const showDebugRefs = useRef({
    s1: showDebugStep1,
    s2: showDebugStep2,
    s3: showDebugStep3,
    s4: showDebugStep4,
  });

  startRoomIdRef.current = startRoomId;
  targetRoomIdRef.current = targetRoomId;
  onSelectRoomRef.current = onSelectRoom;
  onClearRoomSelectRef.current = onClearRoomSelect;
  onHoverRoomRef.current = onHoverRoom;
  routePathRef.current = routePath;
  debugStepsRef.current = debugSteps;
  showNodesRef.current = showNodes;
  showWalkableRef.current = showWalkable;
  showDebugRefs.current = {
    s1: showDebugStep1,
    s2: showDebugStep2,
    s3: showDebugStep3,
    s4: showDebugStep4,
  };
  nodeEditModeRef.current = nodeEditMode;
  placingNodeRef.current = placingNode;
  pendingRemovesRef.current = pendingRemoves;
  onSelectEditableNodeRef.current = onSelectEditableNode;
  onPlaceNodeRef.current = onPlaceNode;
  selectedEditableNodeIdRef.current = selectedEditableNodeId;
  apiFloorRef.current = apiFloor;
  pendingAddsRef.current = pendingAdds;
  edgeEditModeRef.current = edgeEditMode;
  pendingEdgeRemovesRef.current = pendingEdgeRemoves;
  selectedEdgePairKeyRef.current = selectedEdgePairKey;
  onSelectEdgeRef.current = onSelectEdge;
  topDownRef.current = topDown;
  geometryEditModeRef.current = geometryEditMode;
  onEditorPointerDownRef.current = onEditorPointerDown;
  onEditorPointerMoveRef.current = onEditorPointerMove;
  onEditorPointerUpRef.current = onEditorPointerUp;
  heatmapEnabledRef.current = heatmapEnabled;
  heatmapRoomsRef.current = heatmapRooms;

  const activeHighlightId = targetRoomId || selectedRoomId || highlightedRoomId || null;
  activeHighlightIdRef.current = activeHighlightId;

  const clearPathMesh = () => {
    const scene = sceneRef.current;
    const group = pathMeshRef.current;
    if (scene && group) {
      scene.remove(group);
      disposeObject3D(group);
      pathMeshRef.current = null;
    }
    routeArrowRef.current = null;
    routeCurveRef.current = null;
    routeArrowProgressRef.current = 0;
    routeArrowLastTsRef.current = null;
  };

  const applyFloorColors = (focusId: string | null) => {
    const startId = startRoomIdRef.current;
    const targetId = targetRoomIdRef.current;
    const isHeatmap = heatmapEnabledRef.current;
    const hRooms = heatmapRoomsRef.current;

    const focusRoom = floorData.rooms.find(
      (r) =>
        (focusId && r.id === focusId) ||
        (highlightRoomCode &&
          r.roomCode.toLowerCase() === highlightRoomCode.toLowerCase()) ||
        (highlightAreaId && r.areaId === highlightAreaId)
    );

    if (focusRoom && beaconGroupRef.current && !startId && !targetId) {
      beaconGroupRef.current.position.set(focusRoom.centerX, 0, focusRoom.centerZ);
      beaconGroupRef.current.visible = true;
    } else if (targetId) {
      const targetRoom = floorData.rooms.find((r) => r.id === targetId);
      if (targetRoom && beaconGroupRef.current) {
        beaconGroupRef.current.position.set(
          targetRoom.centerX,
          0,
          targetRoom.centerZ
        );
        beaconGroupRef.current.visible = true;
      }
    } else if (beaconGroupRef.current) {
      beaconGroupRef.current.visible = false;
    }

    roomFloorMeshesRef.current.forEach((mesh, rId) => {
      const originalColor = mesh.userData.originalColor || '#f1f5f9';
      const mat = mesh.material as THREE.MeshStandardMaterial;

      if (startId && rId === startId) {
        mat.color.set('#10b981');
        mat.emissive.set('#047857');
        mat.emissiveIntensity = 0.3;
      } else if (targetId && rId === targetId) {
        mat.color.set('#ef476f');
        mat.emissive.set('#be123c');
        mat.emissiveIntensity = 0.3;
      } else if (focusRoom && focusRoom.id === rId) {
        mat.color.set('#dbeafe');
        mat.emissive.set('#3b82f6');
        mat.emissiveIntensity = 0.2;
      } else if (isHeatmap) {
        const roomObj = floorData.rooms.find((r) => r.id === rId);
        const hr = roomObj ? findHeatmapRoom(roomObj, hRooms) : undefined;
        if (hr) {
          if (hr.congestion_level === 'HIGH') {
            mat.color.set('#ef4444');
            mat.emissive.set('#b91c1c');
            mat.emissiveIntensity = 0.35;
          } else if (hr.congestion_level === 'MEDIUM') {
            mat.color.set('#f59e0b');
            mat.emissive.set('#b45309');
            mat.emissiveIntensity = 0.25;
          } else {
            mat.color.set('#10b981');
            mat.emissive.set('#047857');
            mat.emissiveIntensity = 0.2;
          }
        } else {
          mat.color.set(originalColor);
          mat.emissive.set('#000000');
          mat.emissiveIntensity = 0;
        }
      } else {
        mat.color.set(originalColor);
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
      }
    });
  };

  useEffect(() => {
    applyFloorColors(activeHighlightId);
  }, [
    selectedRoomId,
    highlightedRoomId,
    highlightRoomCode,
    highlightAreaId,
    startRoomId,
    targetRoomId,
    heatmapEnabled,
    heatmapRooms,
  ]);

  const drawRoutePath = (path: RoutePathNode[] | null | undefined) => {
    const scene = sceneRef.current;
    if (!scene) return;

    clearPathMesh();

    if (!path || path.length < 2) return;

    const centerShiftX = floorData.centerShiftX ?? 0;
    const centerShiftZ = floorData.centerShiftZ ?? 0;

    // Filter only points on the CURRENT ACTIVE FLOOR
    let currentFloorNodes = path.filter((node: any) => {
      if (node.floorId && floorData.floorId) {
        return node.floorId === floorData.floorId;
      }
      if (node.floorNumber !== undefined && floorData.floorNumber !== undefined) {
        return Number(node.floorNumber) === Number(floorData.floorNumber);
      }
      return true;
    });

    // Fallback: if filtered nodes are fewer than 2, draw the whole path
    if (currentFloorNodes.length < 2) {
      currentFloorNodes = path;
    }

    if (currentFloorNodes.length < 2) return;

    const points = currentFloorNodes.map((node) => {
      const [lng, lat] = node.coords;
      const x = lng * 111320 - centerShiftX;
      const z = -(lat * 110540) - centerShiftZ;
      return new THREE.Vector3(x, 0.4, z); // Elevated above the floor to float clearly
    });

    // Filter out duplicate consecutive points to prevent geometry issues
    const uniquePoints: THREE.Vector3[] = [];
    points.forEach((p) => {
      if (uniquePoints.length === 0) {
        uniquePoints.push(p);
      } else {
        const prev = uniquePoints[uniquePoints.length - 1];
        if (p.distanceTo(prev) > 0.01) {
          uniquePoints.push(p);
        }
      }
    });

    if (uniquePoints.length < 2) return;

    try {
      const curve = new THREE.CatmullRomCurve3(uniquePoints);
      const segments = Math.max(48, uniquePoints.length * 12);
      const geometry = new THREE.TubeGeometry(
        curve,
        segments,
        ROUTE_LINE_RADIUS,
        12,
        false
      );

      // Soft under-glow + solid cyan body (mobile-style continuous route)
      const glow = new THREE.Mesh(
        new THREE.TubeGeometry(curve, segments, ROUTE_LINE_RADIUS * 1.55, 12, false),
        new THREE.MeshBasicMaterial({
          color: ROUTE_LINE_COLOR,
          transparent: true,
          opacity: 0.28,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      glow.renderOrder = 99;

      const tube = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color: ROUTE_LINE_COLOR,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      );
      tube.renderOrder = 100;

      const group = new THREE.Group();
      group.add(glow);
      group.add(tube);

      const arrow = createRouteArrowMesh();
      placeArrowOnCurve(arrow, curve, 0);
      group.add(arrow);

      scene.add(group);
      pathMeshRef.current = group;
      routeArrowRef.current = arrow;
      routeCurveRef.current = curve;
      routeArrowProgressRef.current = 0;
      routeArrowLastTsRef.current = null;
    } catch (error) {
      console.error('Failed to build curve or tube geometry:', error);
    }
  };

  // Draw / clear route path without rebuilding the scene
  useEffect(() => {
    drawRoutePath(routePath);
    return () => {
      clearPathMesh();
    };
  }, [routePath, floorData.centerShiftX, floorData.centerShiftZ]);

  // Toggle overlay visibility without rebuilding scene
  useEffect(() => {
    if (nodesGroupRef.current) {
      nodesGroupRef.current.visible =
        showNodes || nodeEditMode || edgeEditMode;
      const removeNodeSet = new Set(pendingRemoves);
      const removeEdgeSet = new Set(pendingEdgeRemoves);
      nodesGroupRef.current.children.forEach((child) => {
        if (child.userData?.type === 'EDGE') {
          const ids = (child.userData.ids as string[]) || [];
          child.visible = !ids.some((edgeId) => removeEdgeSet.has(edgeId));
          if (child instanceof THREE.Line) {
            const mat = child.material as THREE.LineBasicMaterial;
            const original = child.userData.originalColor ?? 0x818cf8;
            const selected =
              !!selectedEdgePairKey &&
              child.userData.pairKey === selectedEdgePairKey;
            mat.color.set(selected ? '#ec4899' : original);
            mat.opacity = selected ? 1 : 0.85;
          }
          return;
        }

        const id = child.userData?.id as string | undefined;
        if (!id) return;
        child.visible = !removeNodeSet.has(id);

        if (
          child instanceof THREE.Mesh &&
          child.userData?.type === 'NODE' &&
          !child.userData?.hitHelper
        ) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (!mat?.color || !('emissive' in mat)) return;
          const original = child.userData.originalColor ?? 0x6366f1;
          if (selectedEditableNodeId && id === selectedEditableNodeId) {
            mat.color.set('#ec4899');
            mat.emissive.set('#db2777');
            mat.emissiveIntensity = 0.9;
          } else {
            mat.color.setHex(original);
            mat.emissive.setHex(original);
            mat.emissiveIntensity = 0.6;
          }
        }
      });
    }
  }, [
    showNodes,
    nodeEditMode,
    edgeEditMode,
    pendingRemoves,
    pendingEdgeRemoves,
    selectedEditableNodeId,
    selectedEdgePairKey,
  ]);

  useEffect(() => {
    if (walkableMeshRef.current) {
      walkableMeshRef.current.visible =
        showWalkable || (nodeEditMode && placingNode);
    }
  }, [showWalkable, nodeEditMode, placingNode]);

  // Switch between perspective / orthographic top-down
  useEffect(() => {
    const persp = cameraRef.current;
    const ortho = orthoCameraRef.current;
    const controls = controlsRef.current;
    const canvas = canvasRef.current;
    if (!persp || !ortho || !controls || !canvas) return;

    const target = controls.target.clone();

    if (topDown) {
      const spanX =
        (floorData.bounds.maxX - floorData.bounds.minX) / 2 + 8;
      const spanZ =
        (floorData.bounds.maxZ - floorData.bounds.minZ) / 2 + 8;
      const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
      const halfW = Math.max(spanX, spanZ * aspect);
      const halfH = halfW / aspect;
      ortho.left = -halfW;
      ortho.right = halfW;
      ortho.top = halfH;
      ortho.bottom = -halfH;
      ortho.position.set(target.x, 100, target.z);
      ortho.up.set(0, 0, -1);
      ortho.lookAt(target.x, 0, target.z);
      ortho.updateProjectionMatrix();
      activeCameraRef.current = ortho;

      controls.object = ortho;
      controls.enableRotate = false;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = 0;
      controls.enablePan = true;
      controls.minZoom = 0.3;
      controls.maxZoom = 8;
      controls.target.copy(target);
      controls.update();
    } else {
      activeCameraRef.current = persp;
      controls.object = persp;
      controls.enableRotate = true;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI / 2.15;
      controls.minDistance = 8;
      controls.maxDistance = 120;
      controls.target.copy(target);
      if (persp.position.y < 10) {
        persp.position.set(target.x + 5, 45, target.z + 45);
      }
      controls.update();
    }
  }, [topDown, floorData.bounds]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (topDown || geometryEditMode) {
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      return;
    }
    if (nodeEditMode || edgeEditMode) {
      // Left-drag pans; left-click selects. Right-drag still orbits.
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      controls.enableRotate = true;
      controls.enablePan = true;
      return;
    }
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.enableRotate = true;
  }, [nodeEditMode, edgeEditMode, geometryEditMode, topDown]);

  // Rebuild geometry editor overlay
  useEffect(() => {
    const group = editorOverlayRef.current;
    if (!group) return;
    group.visible = geometryEditMode;
    if (!geometryEditMode) return;

    rebuildEditorOverlay(
      group,
      {
        rooms: editorRooms,
        boundaries: editorBoundaries,
        selectedKey: editorSelectedKey,
        selectedVertex: editorSelectedVertex,
        previewPoints: editorPreviewPoints,
        errorKeys: new Set(editorErrorKeys),
      },
      floorData.centerShiftX ?? 0,
      floorData.centerShiftZ ?? 0,
    );
  }, [
    geometryEditMode,
    editorRooms,
    editorBoundaries,
    editorSelectedKey,
    editorSelectedVertex,
    editorPreviewPoints,
    editorErrorKeys,
    floorData.centerShiftX,
    floorData.centerShiftZ,
  ]);

  // Hide base room meshes slightly when editing geometry for clarity
  useEffect(() => {
    if (roomMeshesGroupRef.current) {
      roomMeshesGroupRef.current.visible = !geometryEditMode;
    }
  }, [geometryEditMode]);

  // Pending add preview spheres
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (pendingPreviewRef.current) {
      scene.remove(pendingPreviewRef.current);
      pendingPreviewRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      pendingPreviewRef.current = null;
    }

    if (!pendingAdds.length) return;

    const group = new THREE.Group();
    group.name = 'pendingAdds';
    const geo = new THREE.SphereGeometry(0.4, 14, 14);

    pendingAdds.forEach((p) => {
      const selected = p.tempId === selectedEditableNodeId;
      const mat = new THREE.MeshStandardMaterial({
        color: selected ? 0xec4899 : 0x22c55e,
        emissive: selected ? 0xdb2777 : 0x16a34a,
        emissiveIntensity: selected ? 0.9 : 0.7,
      });
      const { x, z } = lngLatToLocal(
        p.coords[0],
        p.coords[1],
        floorData.centerShiftX ?? 0,
        floorData.centerShiftZ ?? 0
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.35, z);
      mesh.userData = {
        tempId: p.tempId,
        type: 'PENDING_NODE',
        pickable: true,
        editable: true,
      };
      group.add(mesh);
    });

    scene.add(group);
    pendingPreviewRef.current = group;
  }, [
    pendingAdds,
    selectedEditableNodeId,
    floorData.centerShiftX,
    floorData.centerShiftZ,
  ]);

  useEffect(() => {
    const groups = debugGroupsRef.current;
    if (!groups) return;

    if (debugSteps && !debugPopulatedRef.current) {
      populateDebugGroups(
        groups,
        debugSteps,
        floorData.centerShiftX ?? 0,
        floorData.centerShiftZ ?? 0
      );
      debugPopulatedRef.current = true;
    }

    groups.pb.visible = Boolean(debugSteps && showDebugStep1);
    groups.tin.visible = Boolean(debugSteps && showDebugStep2);
    groups.zigzag.visible = Boolean(debugSteps && showDebugStep3);
    groups.pmid.visible = Boolean(debugSteps && showDebugStep4);
  }, [
    debugSteps,
    showDebugStep1,
    showDebugStep2,
    showDebugStep3,
    showDebugStep4,
    floorData.centerShiftX,
    floorData.centerShiftZ,
  ]);

  // When apiFloor arrives after scene mount (or changes), rebuild nodes/walkable overlays
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !apiFloor) return;

    if (nodesGroupRef.current) {
      scene.remove(nodesGroupRef.current);
      nodesGroupRef.current = null;
    }
    if (walkableMeshRef.current) {
      scene.remove(walkableMeshRef.current);
      walkableMeshRef.current = null;
    }

    const nodesGroup = buildNodesGroup(
      apiFloor.nodes,
      apiFloor.edges,
      floorData.centerShiftX ?? 0,
      floorData.centerShiftZ ?? 0
    );
    nodesGroup.visible =
      showNodesRef.current ||
      nodeEditModeRef.current ||
      edgeEditModeRef.current;
    scene.add(nodesGroup);
    nodesGroupRef.current = nodesGroup;

    const selectedId = selectedEditableNodeIdRef.current;
    if (selectedId) {
      nodesGroup.children.forEach((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.userData?.type === 'NODE' &&
          child.userData?.id === selectedId &&
          !child.userData?.hitHelper
        ) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (!mat?.color || !('emissive' in mat)) return;
          mat.color.set('#ec4899');
          mat.emissive.set('#db2777');
          mat.emissiveIntensity = 0.9;
        }
      });
    }

    const selectedPair = selectedEdgePairKeyRef.current;
    if (selectedPair) {
      nodesGroup.children.forEach((child) => {
        if (
          child instanceof THREE.Line &&
          child.userData?.type === 'EDGE' &&
          child.userData?.pairKey === selectedPair
        ) {
          const mat = child.material as THREE.LineBasicMaterial;
          mat.color.set('#ec4899');
          mat.opacity = 1;
        }
      });
    }

    const removeNodes = new Set(pendingRemovesRef.current);
    const removeEdges = new Set(pendingEdgeRemovesRef.current);
    nodesGroup.children.forEach((child) => {
      if (child.userData?.type === 'EDGE') {
        const ids = (child.userData.ids as string[]) || [];
        child.visible = !ids.some((id) => removeEdges.has(id));
        return;
      }
      const id = child.userData?.id as string | undefined;
      if (id && removeNodes.has(id)) child.visible = false;
    });

    const walkable = buildWalkableZoneMesh(
      apiFloor,
      floorData.centerShiftX ?? 0,
      floorData.centerShiftZ ?? 0
    );
    if (walkable) {
      walkable.visible =
        showWalkableRef.current ||
        (nodeEditModeRef.current && placingNodeRef.current);
      scene.add(walkable);
      walkableMeshRef.current = walkable;
    }
  }, [apiFloor, floorData.centerShiftX, floorData.centerShiftZ]);

  // Main Three.js Scene Setup — Runs ONLY ONCE when floorData mounts
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !floorData || floorData.rooms.length === 0) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    roomFloorMeshesRef.current.clear();
    clearPathMesh();
    nodesGroupRef.current = null;
    walkableMeshRef.current = null;
    debugPopulatedRef.current = false;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#f8fafc');
    sceneRef.current = scene;

    const roomMeshesGroup = new THREE.Group();
    scene.add(roomMeshesGroup);
    roomMeshesGroupRef.current = roomMeshesGroup;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(0, 50, 50);
    cameraRef.current = camera;

    const spanX = (floorData.bounds.maxX - floorData.bounds.minX) / 2 + 8;
    const spanZ = (floorData.bounds.maxZ - floorData.bounds.minZ) / 2 + 8;
    const halfW = Math.max(spanX, spanZ * (width / Math.max(height, 1)));
    const halfH = halfW / (width / Math.max(height, 1));
    const ortho = new THREE.OrthographicCamera(
      -halfW,
      halfW,
      halfH,
      -halfH,
      0.1,
      500,
    );
    ortho.position.set(0, 100, 0);
    ortho.up.set(0, 0, -1);
    ortho.lookAt(0, 0, 0);
    orthoCameraRef.current = ortho;
    activeCameraRef.current = topDownRef.current ? ortho : camera;

    // 2. Renderer & OrbitControls
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    rendererRef.current = renderer;

    const controls = new OrbitControls(
      activeCameraRef.current,
      renderer.domElement,
    );
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 8;
    controls.maxDistance = 120;
    if (topDownRef.current) {
      controls.enableRotate = false;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = 0;
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    } else if (nodeEditModeRef.current || edgeEditModeRef.current) {
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
    }
    controlsRef.current = controls;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(30, 50, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 200;
    const shadowExtent = 60;
    dirLight.shadow.camera.left = -shadowExtent;
    dirLight.shadow.camera.right = shadowExtent;
    dirLight.shadow.camera.top = shadowExtent;
    dirLight.shadow.camera.bottom = -shadowExtent;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-20, 30, -15);
    scene.add(fillLight);

    // 4. Base Floor Slab & Partitions
    buildFloorSlab(scene, floorData);

    const doorMat = createDoorMaterial();
    const wallMat = createWallMaterial();
    if (floorData.areaPartitions && floorData.areaPartitions.length > 0) {
      addAreaPartitions(scene, floorData.areaPartitions, DEFAULT_WALL_HEIGHT);
    }
    if (floorData.standaloneDoors && floorData.standaloneDoors.length > 0) {
      addStandaloneDoors(scene, floorData.standaloneDoors, doorMat);
    }
    if (floorData.standaloneWalls && floorData.standaloneWalls.length > 0) {
      floorData.standaloneWalls.forEach((seg: WallSegment) => {
        addWallSegment(scene, seg, DEFAULT_WALL_HEIGHT, wallMat, doorMat);
      });
    }

    // 5. Beacon Group
    beaconGroupRef.current = createBeaconGroup(scene);

    // 6. Rooms Rendering
    let initialCameraFocus: THREE.Vector3 | null = null;

    floorData.rooms.forEach((room: RoomData) => {
      const isTarget =
        (highlightedRoomId && room.id === highlightedRoomId) ||
        (highlightRoomCode &&
          room.roomCode.toLowerCase() === highlightRoomCode.toLowerCase()) ||
        (highlightAreaId && room.areaId === highlightAreaId);

      if (isTarget && !initialCameraFocus) {
        initialCameraFocus = new THREE.Vector3(room.centerX, 0, room.centerZ);
      }

      addRoomFloor(room, roomMeshesGroup, roomFloorMeshesRef.current);

      const isReception =
        room.roomCode.toLowerCase().includes('reception') ||
        room.roomLabel.toLowerCase().includes('tiếp nhận');
      const wallH = isReception ? 1.5 : DEFAULT_WALL_HEIGHT;

      room.walls.forEach((seg: WallSegment) => {
        addWallSegment(scene, seg, wallH, wallMat, doorMat);
      });
    });

    // 6b. Edit overlays: nodes, walkable, debug groups
    if (apiFloor) {
      const nodesGroup = buildNodesGroup(
        apiFloor.nodes,
        apiFloor.edges,
        floorData.centerShiftX ?? 0,
        floorData.centerShiftZ ?? 0
      );
      nodesGroup.visible =
      showNodesRef.current ||
      nodeEditModeRef.current ||
      edgeEditModeRef.current;
      scene.add(nodesGroup);
      nodesGroupRef.current = nodesGroup;

      const walkable = buildWalkableZoneMesh(
        apiFloor,
        floorData.centerShiftX ?? 0,
        floorData.centerShiftZ ?? 0
      );
      if (walkable) {
        walkable.visible =
          showWalkableRef.current ||
          (nodeEditModeRef.current && placingNodeRef.current);
        scene.add(walkable);
        walkableMeshRef.current = walkable;
      }
    }

    const debugGroups = createEmptyDebugGroups();
    scene.add(debugGroups.pb);
    scene.add(debugGroups.tin);
    scene.add(debugGroups.zigzag);
    scene.add(debugGroups.pmid);
    debugGroupsRef.current = debugGroups;

    // Invisible placement plane for node-edit "add node" clicks
    const planeGeo = new THREE.PlaneGeometry(400, 400);
    const planeMat = new THREE.MeshBasicMaterial({
      visible: false,
      side: THREE.DoubleSide,
    });
    const placementPlane = new THREE.Mesh(planeGeo, planeMat);
    placementPlane.rotation.x = -Math.PI / 2;
    placementPlane.position.y = 0.02;
    placementPlane.name = 'placementPlane';
    scene.add(placementPlane);
    placementPlaneRef.current = placementPlane;

    const editorOverlay = new THREE.Group();
    editorOverlay.name = 'editorOverlay';
    editorOverlay.visible = geometryEditModeRef.current;
    scene.add(editorOverlay);
    editorOverlayRef.current = editorOverlay;

    if (debugStepsRef.current) {
      populateDebugGroups(
        debugGroups,
        debugStepsRef.current,
        floorData.centerShiftX ?? 0,
        floorData.centerShiftZ ?? 0
      );
      debugPopulatedRef.current = true;
      const flags = showDebugRefs.current;
      debugGroups.pb.visible = flags.s1;
      debugGroups.tin.visible = flags.s2;
      debugGroups.zigzag.visible = flags.s3;
      debugGroups.pmid.visible = flags.s4;
    }

    // Initial camera focus (once on mount)
    if (initialCameraFocus) {
      const focus = initialCameraFocus as THREE.Vector3;
      controls.target.set(focus.x, 0, focus.z);
      camera.position.set(focus.x + 5, 45, focus.z + 45);
    } else {
      controls.target.set(0, 0, 0);
    }
    controls.update();

    applyFloorColors(activeHighlightIdRef.current);
    drawRoutePath(routePathRef.current);

    // 7. Raycaster Click Interaction
    const raycaster = new THREE.Raycaster();
    raycaster.params.Line = { threshold: 0.02 };
    const mouse = new THREE.Vector2();
    const pointerGesture = { x: 0, y: 0, dragged: false, fromCanvas: false };
    const ndc = new THREE.Vector3();
    const SCREEN_PICK_PX = 36;

    const setRayFromEvent = (event: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(rect.width, 1);
      const h = Math.max(rect.height, 1);
      mouse.x = ((event.clientX - rect.left) / w) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / h) * 2 + 1;
      const cam = activeCameraRef.current || camera;
      cam.updateMatrixWorld();
      raycaster.setFromCamera(mouse, cam);
    };

    const pickNearestOnScreen = (clientX: number, clientY: number): string | null => {
      const cam = activeCameraRef.current || camera;
      cam.updateMatrixWorld();
      const rect = canvas.getBoundingClientRect();
      const shiftX = floorData.centerShiftX ?? 0;
      const shiftZ = floorData.centerShiftZ ?? 0;
      let bestId: string | null = null;
      let bestDist = SCREEN_PICK_PX * SCREEN_PICK_PX;
      const removed = new Set(pendingRemovesRef.current);

      const consider = (id: string, worldX: number, worldZ: number) => {
        ndc.set(worldX, 0.35, worldZ).project(cam);
        if (ndc.z > 1) return;
        const sx = rect.left + (ndc.x * 0.5 + 0.5) * rect.width;
        const sy = rect.top + (-ndc.y * 0.5 + 0.5) * rect.height;
        const dx = sx - clientX;
        const dy = sy - clientY;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestId = id;
        }
      };

      const floor = apiFloorRef.current;
      floor?.nodes?.forEach((node) => {
        if (node.type !== 'CORRIDOR' && node.type !== 'JUNCTION') return;
        if (removed.has(node.id) || !node.coordsGeom?.coordinates) return;
        const [lng, lat] = node.coordsGeom.coordinates;
        const pt = lngLatToLocal(lng, lat, shiftX, shiftZ);
        consider(node.id, pt.x, pt.z);
      });

      pendingAddsRef.current.forEach((p) => {
        const pt = lngLatToLocal(p.coords[0], p.coords[1], shiftX, shiftZ);
        consider(p.tempId, pt.x, pt.z);
      });

      return bestId;
    };

    const pickEditableNodeId = (event: PointerEvent): string | null => {
      setRayFromEvent(event);

      const targets: THREE.Object3D[] = [];
      if (pendingPreviewRef.current) targets.push(pendingPreviewRef.current);
      if (nodesGroupRef.current) targets.push(nodesGroupRef.current);
      if (targets.length > 0) {
        const hits = raycaster.intersectObjects(targets, true);
        for (const hit of hits) {
          if (hit.object instanceof THREE.Line) continue;
          const ud = hit.object.userData;
          const id = (ud?.tempId as string) || (ud?.id as string);
          if (!id) continue;
          if (ud?.id && pendingRemovesRef.current.includes(ud.id)) continue;
          if (
            ud?.type === 'PENDING_NODE' ||
            ud?.tempId ||
            ud?.editable ||
            ud?.nodeType === 'CORRIDOR' ||
            ud?.nodeType === 'JUNCTION'
          ) {
            return id;
          }
        }
      }

      return pickNearestOnScreen(event.clientX, event.clientY);
    };

    const pickEditableEdge = (
      event: PointerEvent,
    ): SelectedGraphEdge | null => {
      setRayFromEvent(event);
      raycaster.params.Line = { threshold: 0.5 };
      const group = nodesGroupRef.current;
      if (!group) return null;
      const removed = new Set(pendingEdgeRemovesRef.current);
      const hits = raycaster.intersectObjects(group.children, false);
      for (const hit of hits) {
        const ud = hit.object.userData;
        if (ud?.type !== 'EDGE') continue;
        const ids = (ud.ids as string[]) || [];
        if (ids.some((edgeId) => removed.has(edgeId))) continue;
        if (!ud.pairKey || ids.length === 0) continue;
        return { pairKey: ud.pairKey as string, ids };
      }

      const cam = activeCameraRef.current || camera;
      cam.updateMatrixWorld();
      const rect = canvas.getBoundingClientRect();
      let best: SelectedGraphEdge | null = null;
      let bestDist = 40 * 40;
      const mid = new THREE.Vector3();
      group.children.forEach((child) => {
        const ud = child.userData;
        if (ud?.type !== 'EDGE' || !(child instanceof THREE.Line)) return;
        const ids = (ud.ids as string[]) || [];
        if (ids.some((edgeId) => removed.has(edgeId))) return;
        const pos = child.geometry.getAttribute('position');
        if (!pos || pos.count < 2) return;
        mid.set(
          (pos.getX(0) + pos.getX(1)) / 2,
          (pos.getY(0) + pos.getY(1)) / 2,
          (pos.getZ(0) + pos.getZ(1)) / 2,
        ).project(cam);
        if (mid.z > 1) return;
        const sx = rect.left + (mid.x * 0.5 + 0.5) * rect.width;
        const sy = rect.top + (-mid.y * 0.5 + 0.5) * rect.height;
        const dx = sx - event.clientX;
        const dy = sy - event.clientY;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = { pairKey: ud.pairKey as string, ids };
        }
      });
      return best;
    };

    const handleCanvasClick = (event: MouseEvent) => {
      if (
        geometryEditModeRef.current ||
        nodeEditModeRef.current ||
        edgeEditModeRef.current
      )
        return;

      setRayFromEvent(event);

      const intersects = raycaster.intersectObjects(roomMeshesGroup.children);
      const isHeatmap = heatmapEnabledRef.current;

      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        if (hitObj.userData && hitObj.userData.id) {
          const roomId = hitObj.userData.id as string;
          if (!isHeatmap) {
            setSelectedRoomId(roomId);
            applyFloorColors(roomId);
          }
          onSelectRoomRef.current?.(roomId);
        }
      } else if (isHeatmap) {
        onClearRoomSelectRef.current?.();
      }
    };

    const resolveEditorPointer = (
      event: PointerEvent,
    ): EditorPointerEvent | null => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const cam = activeCameraRef.current || camera;
      raycaster.setFromCamera(mouse, cam);

      let lngLat: [number, number] | null = null;
      const targets: THREE.Object3D[] = [];
      if (placementPlaneRef.current) targets.push(placementPlaneRef.current);
      const planeHits = raycaster.intersectObjects(targets, true);
      if (planeHits.length > 0) {
        const pt = planeHits[0].point;
        const { lng, lat } = localToLngLat(
          pt.x,
          pt.z,
          floorData.centerShiftX ?? 0,
          floorData.centerShiftZ ?? 0,
        );
        lngLat = [lng, lat];
      }
      if (!lngLat) return null;

      const hit: EditorHit | null = hitTestEditorOverlay(
        raycaster,
        editorOverlayRef.current,
      );

      return {
        lngLat,
        hit,
        shiftKey: event.shiftKey,
      };
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerGesture.x = event.clientX;
      pointerGesture.y = event.clientY;
      pointerGesture.dragged = false;
      pointerGesture.fromCanvas = true;

      if (!geometryEditModeRef.current) return;
      const payload = resolveEditorPointer(event);
      if (!payload) return;
      draggingEditorRef.current = true;
      if (controlsRef.current) controlsRef.current.enabled = false;
      onEditorPointerDownRef.current?.(payload);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX - pointerGesture.x;
      const dy = event.clientY - pointerGesture.y;
      if (dx * dx + dy * dy > 144) pointerGesture.dragged = true;

      if (!geometryEditModeRef.current) return;
      if (!draggingEditorRef.current && !onEditorPointerMoveRef.current) return;
      const payload = resolveEditorPointer(event);
      if (!payload) return;
      onEditorPointerMoveRef.current?.(payload);
    };

    const handlePointerUp = (event: PointerEvent) => {
      const startedOnCanvas = pointerGesture.fromCanvas;
      pointerGesture.fromCanvas = false;

      if (geometryEditModeRef.current) {
        const wasDragging = draggingEditorRef.current;
        draggingEditorRef.current = false;
        if (controlsRef.current) controlsRef.current.enabled = true;
        if (!wasDragging && !onEditorPointerUpRef.current) return;
        const payload = resolveEditorPointer(event);
        if (!payload) return;
        onEditorPointerUpRef.current?.(payload);
        return;
      }

      // Overlay buttons (Xóa / Lưu / Thêm) also fire window pointerup.
      // Ignore those so they cannot deselect the node before the click handler runs.
      if (!startedOnCanvas) return;
      if (pointerGesture.dragged) return;

      if (edgeEditModeRef.current) {
        onSelectEdgeRef.current?.(pickEditableEdge(event));
        return;
      }

      if (!nodeEditModeRef.current) return;

      setRayFromEvent(event);

      if (placingNodeRef.current) {
        const targets: THREE.Object3D[] = [];
        if (placementPlaneRef.current) targets.push(placementPlaneRef.current);
        if (walkableMeshRef.current) targets.push(walkableMeshRef.current);
        const hits = raycaster.intersectObjects(targets, true);
        if (hits.length > 0) {
          const pt = hits[0].point;
          const { lng, lat } = localToLngLat(
            pt.x,
            pt.z,
            floorData.centerShiftX ?? 0,
            floorData.centerShiftZ ?? 0
          );
          onPlaceNodeRef.current?.([lng, lat]);
        }
        return;
      }

      onSelectEditableNodeRef.current?.(pickEditableNodeId(event));
    };

    const handleCanvasMouseMove = (event: MouseEvent) => {
      if (
        geometryEditModeRef.current ||
        nodeEditModeRef.current ||
        edgeEditModeRef.current
      )
        return;
      // Heatmap: room info opens on click only, not hover.
      if (heatmapEnabledRef.current || !onHoverRoomRef.current) return;

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const cam = activeCameraRef.current || camera;
      raycaster.setFromCamera(mouse, cam);

      const intersects = raycaster.intersectObjects(roomMeshesGroup.children);
      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        if (hitObj.userData && hitObj.userData.id) {
          const roomId = hitObj.userData.id as string;
          onHoverRoomRef.current?.(roomId);
          return;
        }
      }
      onHoverRoomRef.current?.(null);
    };

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 8. Animation & Marker Projection Loop
    let animationFrameId: number;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      const arrow = routeArrowRef.current;
      const curve = routeCurveRef.current;
      if (arrow && curve) {
        const now = performance.now();
        const last = routeArrowLastTsRef.current;
        routeArrowLastTsRef.current = now;
        const dt = last == null ? 0 : Math.min((now - last) / 1000, 0.05);
        const length = Math.max(curve.getLength(), 0.001);
        const duration = Math.max(length / ROUTE_ARROW_SPEED, 2.8);
        routeArrowProgressRef.current =
          (routeArrowProgressRef.current + dt / duration) % 1;
        placeArrowOnCurve(arrow, curve, routeArrowProgressRef.current);
      }

      const currentHlId = activeHighlightIdRef.current;
      const startId = startRoomIdRef.current;
      const targetId = targetRoomIdRef.current;
      const isHeatmap = heatmapEnabledRef.current;

      const newMarkers: ProjectedMarker[] = floorData.rooms
        .filter((r) => r.roomCode && r.roomCode.trim() !== '')
        .map((r) => {
          const isStart = !!startId && r.id === startId;
          const isEnd = !!targetId && r.id === targetId;
          const isHl =
            isStart ||
            isEnd ||
            (!isHeatmap && currentHlId && r.id === currentHlId) ||
            (!isHeatmap &&
              highlightRoomCode &&
              r.roomCode.toLowerCase() === highlightRoomCode.toLowerCase()) ||
            (!isHeatmap && highlightAreaId && r.areaId === highlightAreaId);

          tempVec.set(r.centerX, r.height + 0.5, r.centerZ);
          tempVec.project(activeCameraRef.current || camera);

          return {
            id: r.id,
            label: r.roomLabel,
            roomCode: r.roomCode,
            icon: r.pinIcon,
            screenX: ((tempVec.x + 1) * width) / 2,
            screenY: ((-tempVec.y + 1) * height) / 2,
            isHighlighted: !!isHl,
            isVisible: tempVec.z < 1.0,
            kind: isStart ? 'start' : isEnd ? 'target' : 'default',
          };
        });

      setMarkers(newMarkers);
      renderer.render(scene, activeCameraRef.current || camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      const orthoCam = orthoCameraRef.current;
      if (orthoCam) {
        const spanX =
          (floorData.bounds.maxX - floorData.bounds.minX) / 2 + 8;
        const spanZ =
          (floorData.bounds.maxZ - floorData.bounds.minZ) / 2 + 8;
        const aspect = width / Math.max(height, 1);
        let halfW = Math.max(spanX, spanZ * aspect);
        let halfH = halfW / aspect;
        // preserve zoom level
        const curHalfW = (orthoCam.right - orthoCam.left) / 2;
        const zoom = spanX > 0 ? curHalfW / Math.max(spanX, spanZ * aspect) : 1;
        halfW *= Math.max(zoom, 0.1);
        halfH = halfW / aspect;
        orthoCam.left = -halfW;
        orthoCam.right = halfW;
        orthoCam.top = halfH;
        orthoCam.bottom = -halfH;
        orthoCam.updateProjectionMatrix();
      }

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => handleResize())
        : null;
    if (resizeObserver && container) resizeObserver.observe(container);
    requestAnimationFrame(() => handleResize());

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      canvas.removeEventListener('click', handleCanvasClick);
      canvas.removeEventListener('mousemove', handleCanvasMouseMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      clearPathMesh();
      nodesGroupRef.current = null;
      walkableMeshRef.current = null;
      debugGroupsRef.current = null;
      debugPopulatedRef.current = false;
      pendingPreviewRef.current = null;
      placementPlaneRef.current = null;
      cameraRef.current = null;
      orthoCameraRef.current = null;
      activeCameraRef.current = null;
      controlsRef.current = null;
      rendererRef.current = null;
      editorOverlayRef.current = null;
      roomMeshesGroupRef.current = null;
      sceneRef.current = null;
      controls.dispose();
      renderer.dispose();
      sceneRef.current = null;
    };
  }, [floorData]);

  const markerClass = (kind: ProjectedMarker['kind']) => {
    if (kind === 'start') {
      return 'bg-emerald-500 text-white ring-4 ring-emerald-400/50';
    }
    if (kind === 'target') {
      return 'bg-[#ef476f] text-white ring-4 ring-rose-400/50';
    }
    return 'bg-[#155DFC] text-white ring-4 ring-blue-400/50';
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-slate-50 select-none"
    >
      <canvas
        ref={canvasRef}
        className={
          nodeEditMode && placingNode
            ? 'w-full h-full block cursor-crosshair'
            : nodeEditMode || edgeEditMode
              ? 'w-full h-full block cursor-pointer'
              : 'w-full h-full block cursor-grab active:cursor-grabbing'
        }
      />

      {markers.map((m) => {
        if (!m.isVisible || !m.isHighlighted || geometryEditMode) return null;

        return (
          <div
            key={m.id}
            style={{
              left: `${m.screenX}px`,
              top: `${m.screenY}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className={`absolute pointer-events-none transition-all duration-75 flex items-center px-3 py-1.5 rounded-xl shadow-md text-xs font-bold whitespace-nowrap scale-110 z-30 animate-bounce ${markerClass(m.kind)}`}
          >
            <span>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
};
