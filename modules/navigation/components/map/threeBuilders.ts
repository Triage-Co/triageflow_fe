import * as THREE from 'three';
import {
  FloorData3D,
  RoomData,
  WallSegment,
  ClinicPartitionSegment,
  StandaloneDoorData,
} from '../../utils/buildingToThree';
import { createWallMaterial, createFloorMaterial, createSlabMaterial } from './threeMaterials';

export const WALL_THICKNESS = 0.18;
export const DEFAULT_WALL_HEIGHT = 2.5;

// ─── 3D Door Frame Builder ───────────────────────────────────────────────────

export function addDoorFrame(
  scene: THREE.Scene,
  centerX: number,
  centerZ: number,
  width: number,
  angle: number,
  doorMat: THREE.MeshStandardMaterial,
  wallHeight: number = DEFAULT_WALL_HEIGHT
) {
  const doorFrameHeight = 0.35;
  const lintelGeo = new THREE.BoxGeometry(width + 0.1, doorFrameHeight, WALL_THICKNESS + 0.06);
  const lintel = new THREE.Mesh(lintelGeo, doorMat);
  lintel.position.set(centerX, wallHeight - doorFrameHeight / 2, centerZ);
  lintel.rotation.y = -angle;
  lintel.castShadow = true;
  lintel.receiveShadow = true;
  scene.add(lintel);

  const postGeo = new THREE.BoxGeometry(0.12, wallHeight, WALL_THICKNESS + 0.06);
  const halfW = width / 2;

  const leftX = centerX - Math.cos(angle) * halfW;
  const leftZ = centerZ - Math.sin(angle) * halfW;
  const leftPost = new THREE.Mesh(postGeo, doorMat);
  leftPost.position.set(leftX, wallHeight / 2, leftZ);
  leftPost.rotation.y = -angle;
  scene.add(leftPost);

  const rightX = centerX + Math.cos(angle) * halfW;
  const rightZ = centerZ + Math.sin(angle) * halfW;
  const rightPost = new THREE.Mesh(postGeo, doorMat);
  rightPost.position.set(rightX, wallHeight / 2, rightZ);
  rightPost.rotation.y = -angle;
  scene.add(rightPost);
}

// ─── Wall Segment Builder ─────────────────────────────────────────────────────

export function addWallSegment(
  scene: THREE.Scene,
  seg: WallSegment,
  wallHeight: number,
  wallMat: THREE.MeshStandardMaterial,
  doorMat: THREE.MeshStandardMaterial
) {
  if (seg.boundaryType === 'DOOR') {
    addDoorFrame(scene, seg.centerX, seg.centerZ, seg.length, seg.angle, doorMat, wallHeight);
    return;
  }

  const wallGeo = new THREE.BoxGeometry(seg.length, wallHeight, WALL_THICKNESS);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.set(seg.centerX, wallHeight / 2, seg.centerZ);
  wall.rotation.y = -seg.angle;
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
}

// ─── Clinic Partitions Builder ────────────────────────────────────────────────

export function addClinicPartitions(
  scene: THREE.Scene,
  partitions: ClinicPartitionSegment[],
  wallHeight: number
) {
  partitions.forEach((cp) => {
    const wallGeo = new THREE.BoxGeometry(cp.length, wallHeight, WALL_THICKNESS);
    const wallMat = createWallMaterial(false);
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.position.set(cp.centerX, wallHeight / 2, cp.centerZ);
    wallMesh.rotation.y = -cp.angle;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);
  });
}

// ─── Standalone Doors Builder ─────────────────────────────────────────────────

export function addStandaloneDoors(
  scene: THREE.Scene,
  doors: StandaloneDoorData[],
  doorMat: THREE.MeshStandardMaterial
) {
  doors.forEach((door) => {
    addDoorFrame(scene, door.centerX, door.centerZ, door.width, door.angle, doorMat);
  });
}

// ─── Room Floor Builder ───────────────────────────────────────────────────────

export function addRoomFloor(
  room: RoomData,
  roomMeshesGroup: THREE.Group,
  roomFloorMeshesMap: Map<string, THREE.Mesh>
) {
  if (room.points.length < 3) return;

  const shape = new THREE.Shape();
  room.points.forEach((p, idx) => {
    if (idx === 0) shape.moveTo(p.x, -p.z);
    else shape.lineTo(p.x, -p.z);
  });

  const floorGeo = new THREE.ShapeGeometry(shape);
  floorGeo.rotateX(-Math.PI / 2);

  const floorMat = createFloorMaterial(room.color);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.position.y = 0.02;
  floorMesh.receiveShadow = true;

  floorMesh.userData = {
    id: room.id,
    code: room.roomCode,
    label: room.roomLabel,
    centerX: room.centerX,
    centerZ: room.centerZ,
    originalColor: room.color,
  };

  roomMeshesGroup.add(floorMesh);
  roomFloorMeshesMap.set(room.id, floorMesh);
}

// ─── Base Floor Slab Builder ──────────────────────────────────────────────────

export function buildFloorSlab(scene: THREE.Scene, floorData: FloorData3D) {
  if (floorData.floorOutlinePoints && floorData.floorOutlinePoints.length >= 3) {
    const slabShape = new THREE.Shape();
    floorData.floorOutlinePoints.forEach((p, idx) => {
      if (idx === 0) slabShape.moveTo(p.x, -p.z);
      else slabShape.lineTo(p.x, -p.z);
    });

    const extrudeSettings = { depth: 0.5, bevelEnabled: false };
    const slabGeo = new THREE.ExtrudeGeometry(slabShape, extrudeSettings);
    slabGeo.rotateX(Math.PI / 2);
    slabGeo.scale(1, 1, -1);

    const slabMat = createSlabMaterial();
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.y = -0.5;
    slabMesh.receiveShadow = true;
    scene.add(slabMesh);
  } else {
    const slabW = Math.max(floorData.floorWidth + 16, 60);
    const slabD = Math.max(floorData.floorHeight + 16, 40);

    const slabGeo = new THREE.BoxGeometry(slabW, 0.3, slabD);
    const slabMat = new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      roughness: 0.8,
      metalness: 0.05,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, -0.15, 0);
    slab.receiveShadow = true;
    scene.add(slab);
  }
}

// ─── Beacon Group Builder ─────────────────────────────────────────────────────

export function createBeaconGroup(scene: THREE.Scene): THREE.Group {
  const beaconGroup = new THREE.Group();
  beaconGroup.visible = false;
  scene.add(beaconGroup);

  const ringGeo = new THREE.RingGeometry(1.0, 1.5, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: '#155DFC',
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.05;
  ring.rotation.x = -Math.PI / 2;
  beaconGroup.add(ring);

  const beaconGeo = new THREE.CylinderGeometry(0.3, 0.5, 6, 16);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: '#155DFC',
    transparent: true,
    opacity: 0.25,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = 3;
  beaconGroup.add(beacon);

  return beaconGroup;
}
