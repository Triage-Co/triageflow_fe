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
import type { PendingAddNode, EditorPointerEvent } from '../FloorMap';
import type {
  DraftBoundary,
  DraftRoom,
  GeometryTool,
} from '@/modules/admin/hooks/useMapGeometryEditor';
import type { LngLat } from '@/modules/admin/utils/mapEditorGeometry';

const EDITABLE_NODE_TYPES = new Set(['CORRIDOR', 'JUNCTION']);

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
  kind: 'default' | 'start' | 'target';
}

function createArrowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  // Transparent background
  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, 128, 32);

  // Draw ">>>" white text on it
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('>>>', 64, 16);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  // Repeat along the length of the tube
  texture.repeat.set(35, 1);
  return texture;
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
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pathMeshRef = useRef<THREE.Mesh | null>(null);
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

  const nodeEditModeRef = useRef(nodeEditMode);
  const placingNodeRef = useRef(placingNode);
  const pendingRemovesRef = useRef(pendingRemoves);
  const onSelectEditableNodeRef = useRef(onSelectEditableNode);
  const onPlaceNodeRef = useRef(onPlaceNode);
  const selectedEditableNodeIdRef = useRef(selectedEditableNodeId);

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
  topDownRef.current = topDown;
  geometryEditModeRef.current = geometryEditMode;
  onEditorPointerDownRef.current = onEditorPointerDown;
  onEditorPointerMoveRef.current = onEditorPointerMove;
  onEditorPointerUpRef.current = onEditorPointerUp;

  const activeHighlightId = targetRoomId || selectedRoomId || highlightedRoomId || null;
  activeHighlightIdRef.current = activeHighlightId;

  const clearPathMesh = () => {
    const scene = sceneRef.current;
    const mesh = pathMeshRef.current;
    if (scene && mesh) {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m: THREE.Material) => m.dispose());
      } else {
        mesh.material.dispose();
      }
      pathMeshRef.current = null;
    }
  };

  const applyFloorColors = (focusId: string | null) => {
    const startId = startRoomIdRef.current;
    const targetId = targetRoomIdRef.current;

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
      } else if (targetId && rId === targetId) {
        mat.color.set('#ef476f');
      } else if (focusRoom && focusRoom.id === rId) {
        mat.color.set('#dbeafe');
      } else {
        mat.color.set(originalColor);
      }
    });
  };

  const drawRouteLine = (scene: THREE.Scene) => {
    // Clean up previous route line
    if (routeLineRef.current) {
      scene.remove(routeLineRef.current);
      routeLineRef.current.geometry.dispose();
      if (Array.isArray(routeLineRef.current.material)) {
        routeLineRef.current.material.forEach((m) => m.dispose());
      } else {
        routeLineRef.current.material.dispose();
      }
      routeLineRef.current = null;
    }

    if (routeTextureRef.current) {
      routeTextureRef.current.dispose();
      routeTextureRef.current = null;
    }

    const currentPath = routePathRef.current;

    // If we have a path, draw it
    if (currentPath && currentPath.length >= 2 && floorData) {
      const centerShiftX = floorData.centerShiftX ?? 0;
      const centerShiftZ = floorData.centerShiftZ ?? 0;

      // Filter only points on the CURRENT ACTIVE FLOOR
      let currentFloorNodes = currentPath.filter((node: any) => {
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
        currentFloorNodes = currentPath;
      }

      if (currentFloorNodes.length >= 2) {
        const points = currentFloorNodes.map((node: any) => {
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

        if (uniquePoints.length >= 2) {
          try {
            const curve = new THREE.CatmullRomCurve3(uniquePoints);
            // Create a nice glowing thicker 3D Tube for the path
            const geometry = new THREE.TubeGeometry(curve, 100, 0.3, 8, false);

            const arrowTexture = createArrowTexture();
            routeTextureRef.current = arrowTexture;

            const material = new THREE.MeshStandardMaterial({
              color: 0x111111, // Sleek glossy black tube
              map: arrowTexture,
              emissive: 0x000000, // Black color has no emission
              roughness: 0.1, // Shiny surface
              metalness: 0.9, // Glossy look
              transparent: true,
              depthWrite: false, // Prevents Z-sorting issues with slab/rooms
              side: THREE.DoubleSide, // Always visible from all camera angles
            });
            const tube = new THREE.Mesh(geometry, material);
            tube.renderOrder = 100; // Guaranteed to render after transparent floor slab
            scene.add(tube);
            routeLineRef.current = tube;
          } catch (error) {
            console.error('Failed to build curve or tube geometry:', error);
          }
        }
      }
    }
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
  ]);

  const drawRoutePath = (path: RoutePathNode[] | null | undefined) => {
    const scene = sceneRef.current;
    if (!scene) return;

    clearPathMesh();

    if (!path || path.length < 2) return;

    const points = path.map((node) => {
      const { x, z } = lngLatToLocal(
        node.coords[0],
        node.coords[1],
        floorData.centerShiftX,
        floorData.centerShiftZ
      );
      return new THREE.Vector3(x, 0.4, z);
    });

    try {
      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeo = new THREE.TubeGeometry(curve, points.length * 4, 0.18, 8, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x0891b2,
        emissiveIntensity: 0.6,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85,
      });
      const mesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(mesh);
      pathMeshRef.current = mesh;
    } catch {
      // Invalid path geometry — leave map without path overlay
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
      nodesGroupRef.current.visible = showNodes || nodeEditMode;
      const removeSet = new Set(pendingRemoves);
      nodesGroupRef.current.children.forEach((child) => {
        const id = child.userData?.id as string | undefined;
        if (!id) return;
        child.visible = !removeSet.has(id);

        if (
          child instanceof THREE.Mesh &&
          EDITABLE_NODE_TYPES.has(child.userData?.nodeType || '')
        ) {
          const mat = child.material as THREE.MeshStandardMaterial;
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
  }, [showNodes, nodeEditMode, pendingRemoves, selectedEditableNodeId]);

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
      let halfW = Math.max(spanX, spanZ * aspect);
      let halfH = halfW / aspect;
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
      floorData.centerShiftX,
      floorData.centerShiftZ,
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
    const geo = new THREE.SphereGeometry(0.32, 14, 14);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x16a34a,
      emissiveIntensity: 0.7,
    });

    pendingAdds.forEach((p) => {
      const { x, z } = lngLatToLocal(
        p.coords[0],
        p.coords[1],
        floorData.centerShiftX,
        floorData.centerShiftZ
      );
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.35, z);
      mesh.userData = { tempId: p.tempId, type: 'PENDING_NODE' };
      group.add(mesh);
    });

    scene.add(group);
    pendingPreviewRef.current = group;
  }, [pendingAdds, floorData.centerShiftX, floorData.centerShiftZ]);

  useEffect(() => {
    const groups = debugGroupsRef.current;
    if (!groups) return;

    if (debugSteps && !debugPopulatedRef.current) {
      populateDebugGroups(
        groups,
        debugSteps,
        floorData.centerShiftX,
        floorData.centerShiftZ
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
      floorData.centerShiftX,
      floorData.centerShiftZ
    );
    nodesGroup.visible = showNodesRef.current || nodeEditModeRef.current;
    scene.add(nodesGroup);
    nodesGroupRef.current = nodesGroup;

    const walkable = buildWalkableZoneMesh(
      apiFloor,
      floorData.centerShiftX,
      floorData.centerShiftZ
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
    let halfW = Math.max(spanX, spanZ * (width / Math.max(height, 1)));
    let halfH = halfW / (width / Math.max(height, 1));
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
        floorData.centerShiftX,
        floorData.centerShiftZ
      );
      nodesGroup.visible = showNodesRef.current || nodeEditModeRef.current;
      scene.add(nodesGroup);
      nodesGroupRef.current = nodesGroup;

      const walkable = buildWalkableZoneMesh(
        apiFloor,
        floorData.centerShiftX,
        floorData.centerShiftZ
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
        floorData.centerShiftX,
        floorData.centerShiftZ
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
    const mouse = new THREE.Vector2();

    const handleCanvasClick = (event: MouseEvent) => {
      if (geometryEditModeRef.current) return;

      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      const cam = activeCameraRef.current || camera;
      raycaster.setFromCamera(mouse, cam);

      // Node edit: place new corridor node on floor plane / walkable
      if (nodeEditModeRef.current && placingNodeRef.current) {
        const targets: THREE.Object3D[] = [];
        if (placementPlaneRef.current) targets.push(placementPlaneRef.current);
        if (walkableMeshRef.current) targets.push(walkableMeshRef.current);
        const hits = raycaster.intersectObjects(targets, true);
        if (hits.length > 0) {
          const pt = hits[0].point;
          const { lng, lat } = localToLngLat(
            pt.x,
            pt.z,
            floorData.centerShiftX,
            floorData.centerShiftZ
          );
          onPlaceNodeRef.current?.([lng, lat]);
        }
        return;
      }

      // Node edit: select pending preview or CORRIDOR / JUNCTION
      if (nodeEditModeRef.current) {
        if (pendingPreviewRef.current) {
          const pendingHits = raycaster.intersectObjects(
            pendingPreviewRef.current.children,
            false
          );
          if (pendingHits.length > 0) {
            const tempId = pendingHits[0].object.userData?.tempId as
              | string
              | undefined;
            if (tempId) {
              onSelectEditableNodeRef.current?.(tempId);
              return;
            }
          }
        }

        if (nodesGroupRef.current) {
          const nodeHits = raycaster.intersectObjects(
            nodesGroupRef.current.children,
            false
          );
          for (const hit of nodeHits) {
            const ud = hit.object.userData;
            if (
              ud?.type === 'NODE' &&
              ud.editable &&
              !pendingRemovesRef.current.includes(ud.id)
            ) {
              onSelectEditableNodeRef.current?.(ud.id as string);
              return;
            }
          }
        }
        onSelectEditableNodeRef.current?.(null);
        return;
      }

      // Watch / default: select room
      const intersects = raycaster.intersectObjects(roomMeshesGroup.children);

      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        if (hitObj.userData && hitObj.userData.id) {
          const roomId = hitObj.userData.id as string;
          setSelectedRoomId(roomId);
          applyFloorColors(roomId);
          onSelectRoomRef.current?.(roomId);
        }
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
          floorData.centerShiftX,
          floorData.centerShiftZ,
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
      if (!geometryEditModeRef.current) return;
      const payload = resolveEditorPointer(event);
      if (!payload) return;
      draggingEditorRef.current = true;
      if (controlsRef.current) controlsRef.current.enabled = false;
      onEditorPointerDownRef.current?.(payload);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!geometryEditModeRef.current) return;
      if (!draggingEditorRef.current && !onEditorPointerMoveRef.current) return;
      const payload = resolveEditorPointer(event);
      if (!payload) return;
      onEditorPointerMoveRef.current?.(payload);
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (!geometryEditModeRef.current) return;
      const wasDragging = draggingEditorRef.current;
      draggingEditorRef.current = false;
      if (controlsRef.current) controlsRef.current.enabled = true;
      if (!wasDragging && !onEditorPointerUpRef.current) return;
      const payload = resolveEditorPointer(event);
      if (!payload) return;
      onEditorPointerUpRef.current?.(payload);
    };

    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 8. Animation & Marker Projection Loop
    let animationFrameId: number;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

      if (routeTextureRef.current) {
        routeTextureRef.current.offset.x -= 0.015;
      }

      const currentHlId = activeHighlightIdRef.current;
      const startId = startRoomIdRef.current;
      const targetId = targetRoomIdRef.current;

      const newMarkers: ProjectedMarker[] = floorData.rooms
        .filter((r) => r.roomCode && r.roomCode.trim() !== '')
        .map((r) => {
          const isStart = !!startId && r.id === startId;
          const isEnd = !!targetId && r.id === targetId;
          const isHl =
            isStart ||
            isEnd ||
            (currentHlId && r.id === currentHlId) ||
            (highlightRoomCode &&
              r.roomCode.toLowerCase() === highlightRoomCode.toLowerCase()) ||
            (highlightAreaId && r.areaId === highlightAreaId);

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

    drawRouteLine(scene);
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

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
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
        className="w-full h-full block cursor-grab active:cursor-grabbing"
      />

      {markers.map(
        (m) =>
          m.isVisible &&
          m.isHighlighted &&
          !geometryEditMode && (
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
          )
      )}
    </div>
  );
};
