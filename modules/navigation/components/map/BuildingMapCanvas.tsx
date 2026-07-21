'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FloorData3D, RoomData, WallSegment } from '../../utils/buildingToThree';
import { createWallMaterial, createDoorMaterial } from './threeMaterials';
import {
  DEFAULT_WALL_HEIGHT,
  addWallSegment,
  addClinicPartitions,
  addStandaloneDoors,
  addRoomFloor,
  buildFloorSlab,
  createBeaconGroup,
} from './threeBuilders';

interface BuildingMapCanvasProps {
  floorData: FloorData3D;
  highlightedRoomId?: string | null;
  highlightRoomCode?: string | null;
  highlightClinicId?: string | null;
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
}

export const BuildingMapCanvas: React.FC<BuildingMapCanvasProps> = ({
  floorData,
  highlightedRoomId,
  highlightRoomCode,
  highlightClinicId,
  onSelectRoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [markers, setMarkers] = useState<ProjectedMarker[]>([]);

  const roomFloorMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const beaconGroupRef = useRef<THREE.Group | null>(null);
  const activeHighlightIdRef = useRef<string | null>(null);

  const activeHighlightId = selectedRoomId || highlightedRoomId || null;
  activeHighlightIdRef.current = activeHighlightId;

  // Dynamically update room highlights and beacon position without recreating WebGL scene
  const updateHighlightState = (targetId: string | null) => {
    const targetRoom = floorData.rooms.find(
      (r) =>
        (targetId && r.id === targetId) ||
        (highlightRoomCode && r.roomCode.toLowerCase() === highlightRoomCode.toLowerCase()) ||
        (highlightClinicId && r.clinicId === highlightClinicId)
    );

    if (targetRoom && beaconGroupRef.current) {
      beaconGroupRef.current.position.set(targetRoom.centerX, 0, targetRoom.centerZ);
      beaconGroupRef.current.visible = true;
    } else if (beaconGroupRef.current) {
      beaconGroupRef.current.visible = false;
    }

    roomFloorMeshesRef.current.forEach((mesh, rId) => {
      const isHl = targetRoom && targetRoom.id === rId;
      const originalColor = mesh.userData.originalColor || '#f1f5f9';
      (mesh.material as THREE.MeshStandardMaterial).color.set(isHl ? '#dbeafe' : originalColor);
    });
  };

  useEffect(() => {
    updateHighlightState(activeHighlightId);
  }, [selectedRoomId, highlightedRoomId, highlightRoomCode, highlightClinicId]);

  // Main Three.js Scene Setup — Runs ONLY ONCE when floorData mounts
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !floorData || floorData.rooms.length === 0) return;

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;

    roomFloorMeshesRef.current.clear();

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f8fafc');
    scene.fog = new THREE.Fog('#f8fafc', 80, 160);

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
    if (floorData.clinicPartitions && floorData.clinicPartitions.length > 0) {
      addClinicPartitions(scene, floorData.clinicPartitions, DEFAULT_WALL_HEIGHT);
    }
    if (floorData.standaloneDoors && floorData.standaloneDoors.length > 0) {
      addStandaloneDoors(scene, floorData.standaloneDoors, doorMat);
    }

    // 5. Beacon Group
    beaconGroupRef.current = createBeaconGroup(scene);

    // 6. Rooms Rendering
    let initialCameraFocus: THREE.Vector3 | null = null;
    const wallMat = createWallMaterial();

    floorData.rooms.forEach((room: RoomData) => {
      const isTarget =
        (highlightedRoomId && room.id === highlightedRoomId) ||
        (highlightRoomCode && room.roomCode.toLowerCase() === highlightRoomCode.toLowerCase()) ||
        (highlightClinicId && room.clinicId === highlightClinicId);

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

    updateHighlightState(activeHighlightIdRef.current);

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
          const roomId = hitObj.userData.id;
          setSelectedRoomId(roomId);
          updateHighlightState(roomId);
          if (onSelectRoom) onSelectRoom(roomId);
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

      const newMarkers: ProjectedMarker[] = floorData.rooms
        .filter((r) => r.roomCode && r.roomCode.trim() !== '')
        .map((r) => {
          const isHl =
            (currentHlId && r.id === currentHlId) ||
            (highlightRoomCode && r.roomCode.toLowerCase() === highlightRoomCode.toLowerCase()) ||
            (highlightClinicId && r.clinicId === highlightClinicId);

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
      controls.dispose();
      renderer.dispose();
    };
  }, [floorData]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-slate-50 select-none">
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* HTML Projected Room Badges - Only show room label for highlighted room */}
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
              className="absolute pointer-events-none transition-all duration-75 flex items-center px-3 py-1.5 rounded-xl shadow-md text-xs font-bold whitespace-nowrap bg-[#155DFC] text-white ring-4 ring-blue-400/50 scale-110 z-30 animate-bounce"
            >
              <span>{m.label}</span>
            </div>
          )
      )}
    </div>
  );
};
