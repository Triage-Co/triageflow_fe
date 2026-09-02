import * as THREE from 'three';
import { lngLatToLocal } from '../../utils/buildingToThree';
import type {
  ApiFloor,
  ApiNode,
  ApiEdge,
  CorridorDebugSteps,
} from '../../types/navigation.types';

export const NODE_COLORS: Record<string, number> = {
  ROOM_ENTRANCE: 0xf59e0b,
  CORRIDOR: 0x6366f1,
  JUNCTION: 0x6366f1,
  ELEVATOR: 0x10b981,
  STAIRS: 0x14b8a6,
  ESCALATOR: 0x06b6d4,
  EXIT: 0xef4444,
  Default: 0xf59e0b,
};

function toLocal(
  lng: number,
  lat: number,
  centerShiftX: number,
  centerShiftZ: number
) {
  return lngLatToLocal(lng, lat, centerShiftX, centerShiftZ);
}

/** Build nodes + edges group (hidden by default). */
export function buildNodesGroup(
  nodes: ApiNode[] | undefined,
  edges: ApiEdge[] | undefined,
  centerShiftX: number,
  centerShiftZ: number
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'nodesGroup';
  group.visible = false;

  if (!nodes || nodes.length === 0) return group;

  const nodePosMap = new Map<string, { x: number; z: number }>();

  nodes.forEach((node) => {
    if (!node.coordsGeom?.coordinates) return;
    const [lng, lat] = node.coordsGeom.coordinates;
    const pt = toLocal(lng, lat, centerShiftX, centerShiftZ);
    nodePosMap.set(node.id, pt);

    const nodeColor = NODE_COLORS[node.type] || NODE_COLORS.Default;

    const dotGeo = new THREE.CircleGeometry(
      node.type === 'CORRIDOR' || node.type === 'JUNCTION' ? 0.55 : 0.4,
      16,
    );
    const dotMat = new THREE.MeshStandardMaterial({
      color: nodeColor,
      emissive: nodeColor,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });
    const dotMesh = new THREE.Mesh(dotGeo, dotMat);
    dotMesh.rotation.x = -Math.PI / 2;
    dotMesh.position.set(pt.x, 0.08, pt.z);

    const radius =
      node.type === 'CORRIDOR' || node.type === 'JUNCTION' ? 0.55 : 0.3;
    const nodeGeo = new THREE.SphereGeometry(radius, 16, 16);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: nodeColor,
      emissive: nodeColor,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.3,
    });
    const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
    nodeMesh.position.set(pt.x, 0.3, pt.z);

    const userData = {
      id: node.id,
      type: 'NODE',
      nodeType: node.type,
      editable: node.type === 'CORRIDOR' || node.type === 'JUNCTION',
      originalColor: nodeColor,
    };
    nodeMesh.userData = { ...userData, pickable: userData.editable };
    // Disk is the visible target in top-down; must be pickable so clicks match highlight.
    dotMesh.userData = { ...userData, pickable: userData.editable };

    group.add(dotMesh);
    group.add(nodeMesh);

    if (userData.editable) {
      const hitGeo = new THREE.SphereGeometry(1.6, 10, 10);
      const hitMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.position.set(pt.x, 0.3, pt.z);
      hitMesh.userData = { ...userData, pickable: true, hitHelper: true };
      group.add(hitMesh);
    }
  });

  if (edges && edges.length > 0) {
    const pairs = new Map<
      string,
      {
        ids: string[];
        p1: { x: number; z: number };
        p2: { x: number; z: number };
      }
    >();

    edges.forEach((edge) => {
      const p1 = nodePosMap.get(edge.fromNodeId);
      const p2 = nodePosMap.get(edge.toNodeId);
      if (!p1 || !p2) return;

      const pairKey = [edge.fromNodeId, edge.toNodeId].sort().join('||');
      const existing = pairs.get(pairKey);
      if (existing) {
        if (!existing.ids.includes(edge.id)) existing.ids.push(edge.id);
        return;
      }
      pairs.set(pairKey, { ids: [edge.id], p1, p2 });
    });

    pairs.forEach((pair, pairKey) => {
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x818cf8,
        transparent: true,
        opacity: 0.85,
        linewidth: 1,
      });
      const points = [
        new THREE.Vector3(pair.p1.x, 0.18, pair.p1.z),
        new THREE.Vector3(pair.p2.x, 0.18, pair.p2.z),
      ];
      const edgeGeo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(edgeGeo, edgeMaterial);
      line.userData = {
        type: 'EDGE',
        pairKey,
        ids: pair.ids,
        pickable: true,
        originalColor: 0x818cf8,
      };
      group.add(line);
    });
  }

  return group;
}

/** Floor outline minus rooms and enclosed non-door areas (hidden by default). */
export function buildWalkableZoneMesh(
  floor: ApiFloor,
  centerShiftX: number,
  centerShiftZ: number
): THREE.Mesh | null {
  if (!floor.outlineGeom?.coordinates?.[0]) return null;

  try {
    const polyCoords = floor.outlineGeom.coordinates[0];
    const shape = new THREE.Shape();
    polyCoords.forEach((coord, index) => {
      const pt = toLocal(coord[0], coord[1], centerShiftX, centerShiftZ);
      if (index === 0) shape.moveTo(pt.x, pt.z);
      else shape.lineTo(pt.x, pt.z);
    });

    floor.rooms?.forEach((room) => {
      const rCoords = room.outlineGeom?.coordinates?.[0];
      if (!rCoords || rCoords.length < 3) return;
      const holePath = new THREE.Path();
      rCoords.forEach((coord, idx) => {
        const pt = toLocal(coord[0], coord[1], centerShiftX, centerShiftZ);
        if (idx === 0) holePath.moveTo(pt.x, pt.z);
        else holePath.lineTo(pt.x, pt.z);
      });
      shape.holes.push(holePath);
    });

    floor.areas?.forEach((area) => {
      const hasDoors = area.boundaries?.some((b) => b.boundaryType === 'DOOR');
      const aCoords = area.outlineGeom?.coordinates?.[0];
      if (hasDoors || !aCoords || aCoords.length < 3) return;
      const holePath = new THREE.Path();
      aCoords.forEach((coord, idx) => {
        const pt = toLocal(coord[0], coord[1], centerShiftX, centerShiftZ);
        if (idx === 0) holePath.moveTo(pt.x, pt.z);
        else holePath.lineTo(pt.x, pt.z);
      });
      shape.holes.push(holePath);
    });

    const walkableGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.05,
      bevelEnabled: false,
    });
    const walkableMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.65,
      roughness: 0.3,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(walkableGeo, walkableMat);
    mesh.rotation.x = Math.PI / 2;
    mesh.scale.set(1, 1, -1);
    mesh.position.y = 0.04;
    mesh.receiveShadow = true;
    mesh.visible = false;
    mesh.name = 'walkableZone';

    return mesh;
  } catch {
    return null;
  }
}

export interface DebugLayerGroups {
  pb: THREE.Group;
  tin: THREE.Group;
  zigzag: THREE.Group;
  pmid: THREE.Group;
}

export function createEmptyDebugGroups(): DebugLayerGroups {
  const make = (name: string) => {
    const g = new THREE.Group();
    g.name = name;
    g.visible = false;
    return g;
  };
  return {
    pb: make('debugPb'),
    tin: make('debugTin'),
    zigzag: make('debugZigzag'),
    pmid: make('debugPmid'),
  };
}

/** Populate debug groups from API data (clears existing children first). */
export function populateDebugGroups(
  groups: DebugLayerGroups,
  data: CorridorDebugSteps,
  centerShiftX: number,
  centerShiftZ: number
) {
  const clearGroup = (g: THREE.Group) => {
    while (g.children.length > 0) {
      const child = g.children[0];
      g.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry.dispose();
        const mat = child.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
    }
  };

  clearGroup(groups.pb);
  clearGroup(groups.tin);
  clearGroup(groups.zigzag);
  clearGroup(groups.pmid);

  if (data.pbPoints?.length) {
    const dotGeo = new THREE.SphereGeometry(0.25, 12, 12);
    const dotMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.5,
    });
    data.pbPoints.forEach((coord) => {
      const pt = toLocal(coord[0], coord[1], centerShiftX, centerShiftZ);
      const mesh = new THREE.Mesh(dotGeo, dotMat);
      mesh.position.set(pt.x, 0.15, pt.z);
      groups.pb.add(mesh);
    });
  }

  if (data.tinEdges?.length) {
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x64748b,
      transparent: true,
      opacity: 0.5,
    });
    data.tinEdges.forEach(([p1, p2]) => {
      const pt1 = toLocal(p1[0], p1[1], centerShiftX, centerShiftZ);
      const pt2 = toLocal(p2[0], p2[1], centerShiftX, centerShiftZ);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pt1.x, 0.12, pt1.z),
        new THREE.Vector3(pt2.x, 0.12, pt2.z),
      ]);
      groups.tin.add(new THREE.Line(geometry, lineMat));
    });
  }

  if (data.zigzagEdges?.length) {
    const lineMat = new THREE.LineBasicMaterial({ color: 0x06b6d4 });
    data.zigzagEdges.forEach(([p1, p2]) => {
      const pt1 = toLocal(p1[0], p1[1], centerShiftX, centerShiftZ);
      const pt2 = toLocal(p2[0], p2[1], centerShiftX, centerShiftZ);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pt1.x, 0.2, pt1.z),
        new THREE.Vector3(pt2.x, 0.2, pt2.z),
      ]);
      groups.zigzag.add(new THREE.Line(geometry, lineMat));
    });
  }

  if (data.pmidPoints?.length) {
    const dotGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const dotMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.6,
    });
    data.pmidPoints.forEach((coord) => {
      const pt = toLocal(coord[0], coord[1], centerShiftX, centerShiftZ);
      const mesh = new THREE.Mesh(dotGeo, dotMat);
      mesh.position.set(pt.x, 0.25, pt.z);
      groups.pmid.add(mesh);
    });
  }
}
