'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  FloorData3D,
  RoomData,
  WallSegment,
  lngLatToLocal,
} from '../../utils/buildingToThree';
import { createWallMaterial, createDoorMaterial } from './threeMaterials';
import {
  DEFAULT_WALL_HEIGHT,
  addWallSegment,
  addAreaPartitions,
  addStandaloneDoors,
  addRoomFloor,
  buildFloorSlab,
  createBeaconGroup,
} from './threeBuilders';
import type { RoutePathNode } from '../../types/navigation.types';

interface BuildingMapCanvasProps {
  floorData: FloorData3D;
  highlightedRoomId?: string | null;
  highlightRoomCode?: string | null;
  highlightAreaId?: string | null;
  startRoomId?: string | null;
  targetRoomId?: string | null;
  routePath?: RoutePathNode[] | null;
  onSelectRoom?: (roomId: string) => void;
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

export const BuildingMapCanvas: React.FC<BuildingMapCanvasProps> = ({
  floorData,
  highlightedRoomId,
  highlightRoomCode,
  highlightAreaId,
  startRoomId = null,
  targetRoomId = null,
  routePath = null,
  onSelectRoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [markers, setMarkers] = useState<ProjectedMarker[]>([]);

  const roomFloorMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const beaconGroupRef = useRef<THREE.Group | null>(null);
  const activeHighlightIdRef = useRef<string | null>(null);
  const startRoomIdRef = useRef<string | null>(startRoomId);
  const targetRoomIdRef = useRef<string | null>(targetRoomId);
  const onSelectRoomRef = useRef(onSelectRoom);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const pathMeshRef = useRef<THREE.Mesh | null>(null);
  const routePathRef = useRef(routePath);

  startRoomIdRef.current = startRoomId;
  targetRoomIdRef.current = targetRoomId;
  onSelectRoomRef.current = onSelectRoom;
  routePathRef.current = routePath;

  const activeHighlightId = selectedRoomId || highlightedRoomId || null;
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

  // Main Three.js Scene Setup — Runs ONLY ONCE when floorData mounts
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !floorData || floorData.rooms.length === 0) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    roomFloorMeshesRef.current.clear();
    clearPathMesh();

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    sceneRef.current = scene;

    const roomMeshesGroup = new THREE.Group();
    scene.add(roomMeshesGroup);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
    camera.position.set(0, 50, 50);

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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.minDistance = 8;
    controls.maxDistance = 120;

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
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
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

    canvas.addEventListener('click', handleCanvasClick);

    // 8. Animation & Marker Projection Loop
    let animationFrameId: number;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();

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
          tempVec.project(camera);

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
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
      clearPathMesh();
      sceneRef.current = null;
      controls.dispose();
      renderer.dispose();
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
          m.isHighlighted && (
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
