import * as THREE from 'three';
import {
  lngLatToLocal,
} from '../../utils/buildingToThree';
import type { DraftBoundary, DraftRoom } from '@/modules/admin/hooks/useMapGeometryEditor';
import { openRing, type LngLat } from '@/modules/admin/utils/mapEditorGeometry';

export type EditorHitKind =
  | 'vertex'
  | 'edge'
  | 'room'
  | 'wall'
  | 'door'
  | 'empty';

export interface EditorHit {
  kind: EditorHitKind;
  roomKey?: string;
  boundaryKey?: string;
  vertexIndex?: number;
  edgeIndex?: number;
  endpoint?: 0 | 1;
}

export interface EditorDraftOverlay {
  rooms: DraftRoom[];
  boundaries: DraftBoundary[];
  selectedKey?: string | null;
  selectedVertex?: { roomKey: string; index: number } | null;
  previewPoints?: LngLat[];
  errorKeys?: Set<string>;
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat.dispose();
    }
  });
}

export function clearEditorOverlay(group: THREE.Group | null) {
  if (!group) return;
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    disposeObject(child);
  }
}

export function rebuildEditorOverlay(
  group: THREE.Group,
  draft: EditorDraftOverlay,
  centerShiftX: number,
  centerShiftZ: number,
) {
  clearEditorOverlay(group);

  const toLocal = (p: LngLat) =>
    lngLatToLocal(p[0], p[1], centerShiftX, centerShiftZ);

  const selectedKey = draft.selectedKey;
  const errorKeys = draft.errorKeys;

  // Room outlines + vertex handles
  for (const room of draft.rooms) {
    const pts = openRing(room.outline);
    if (pts.length < 2) continue;
    const isSelected = selectedKey === room.key;
    const hasError = errorKeys?.has(room.key);

    const positions: number[] = [];
    for (const p of pts) {
      const { x, z } = toLocal(p);
      positions.push(x, 0.08, z);
    }
    // close loop
    const first = toLocal(pts[0]);
    positions.push(first.x, 0.08, first.z);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const mat = new THREE.LineBasicMaterial({
      color: hasError ? 0xef4444 : isSelected ? 0x8b7cf6 : 0x334155,
      linewidth: 2,
    });
    const line = new THREE.Line(geo, mat);
    line.userData = { editorKind: 'room', roomKey: room.key };
    group.add(line);

    // Fill (semi-transparent)
    if (pts.length >= 3) {
      const shape = new THREE.Shape();
      pts.forEach((p, i) => {
        const { x, z } = toLocal(p);
        if (i === 0) shape.moveTo(x, z);
        else shape.lineTo(x, z);
      });
      shape.closePath();
      const shapeGeo = new THREE.ShapeGeometry(shape);
      const shapeMat = new THREE.MeshBasicMaterial({
        color: hasError ? 0xef4444 : isSelected ? 0x8b7cf6 : 0x94a3b8,
        transparent: true,
        opacity: isSelected ? 0.28 : 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(shapeGeo, shapeMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.05;
      mesh.userData = { editorKind: 'room', roomKey: room.key };
      group.add(mesh);
    }

    // Vertex handles
    pts.forEach((p, index) => {
      const { x, z } = toLocal(p);
      const isVertSelected =
        draft.selectedVertex?.roomKey === room.key &&
        draft.selectedVertex?.index === index;
      const handleGeo = new THREE.SphereGeometry(
        isVertSelected ? 0.28 : 0.2,
        10,
        10,
      );
      const handleMat = new THREE.MeshStandardMaterial({
        color: isVertSelected ? 0xec4899 : 0xf8fafc,
        emissive: isVertSelected ? 0xdb2777 : 0x64748b,
        emissiveIntensity: 0.5,
      });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(x, 0.15, z);
      handle.userData = {
        editorKind: 'vertex',
        roomKey: room.key,
        vertexIndex: index,
      };
      group.add(handle);

      // Edge midpoint (for insert)
      const next = pts[(index + 1) % pts.length];
      const mid: LngLat = [
        (p[0] + next[0]) / 2,
        (p[1] + next[1]) / 2,
      ];
      const midLocal = toLocal(mid);
      const edgeGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const edgeMat = new THREE.MeshBasicMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.7,
      });
      const edgeHandle = new THREE.Mesh(edgeGeo, edgeMat);
      edgeHandle.position.set(midLocal.x, 0.12, midLocal.z);
      edgeHandle.userData = {
        editorKind: 'edge',
        roomKey: room.key,
        edgeIndex: index,
      };
      group.add(edgeHandle);
    });
  }

  // Standalone / all boundaries (walls & doors)
  for (const b of draft.boundaries) {
    const a = toLocal(b.line[0]);
    const c = toLocal(b.line[1]);
    const isSelected = selectedKey === b.key;
    const hasError = errorKeys?.has(b.key);
    const isDoor = b.boundaryType === 'DOOR';

    const positions = [a.x, 0.1, a.z, c.x, 0.1, c.z];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const mat = new THREE.LineBasicMaterial({
      color: hasError
        ? 0xef4444
        : isSelected
          ? 0x8b7cf6
          : isDoor
            ? 0xf59e0b
            : 0x1e293b,
    });
    const line = new THREE.Line(geo, mat);
    line.userData = {
      editorKind: isDoor ? 'door' : 'wall',
      boundaryKey: b.key,
    };
    group.add(line);

    // Endpoint handles for walls/doors
    for (let i = 0; i < 2; i++) {
      const pt = i === 0 ? a : c;
      const hGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const hMat = new THREE.MeshStandardMaterial({
        color: isDoor ? 0xfbbf24 : 0xe2e8f0,
        emissive: isDoor ? 0xd97706 : 0x475569,
        emissiveIntensity: 0.4,
      });
      const h = new THREE.Mesh(hGeo, hMat);
      h.position.set(pt.x, 0.14, pt.z);
      h.userData = {
        editorKind: isDoor ? 'door' : 'wall',
        boundaryKey: b.key,
        endpoint: i,
      };
      group.add(h);
    }
  }

  // Drawing preview
  if (draft.previewPoints && draft.previewPoints.length > 0) {
    const positions: number[] = [];
    for (const p of draft.previewPoints) {
      const { x, z } = toLocal(p);
      positions.push(x, 0.2, z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    const mat = new THREE.LineDashedMaterial({
      color: 0x22c55e,
      dashSize: 0.4,
      gapSize: 0.2,
    });
    const line = new THREE.Line(geo, mat);
    line.computeLineDistances();
    group.add(line);

    for (const p of draft.previewPoints) {
      const { x, z } = toLocal(p);
      const g = new THREE.SphereGeometry(0.18, 8, 8);
      const m = new THREE.MeshBasicMaterial({ color: 0x22c55e });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, 0.2, z);
      group.add(mesh);
    }
  }
}

export function hitTestEditorOverlay(
  raycaster: THREE.Raycaster,
  group: THREE.Group | null,
): EditorHit | null {
  if (!group) return null;
  const hits = raycaster.intersectObjects(group.children, false);
  for (const hit of hits) {
    const ud = hit.object.userData;
    if (!ud?.editorKind) continue;
    if (ud.editorKind === 'vertex') {
      return {
        kind: 'vertex',
        roomKey: ud.roomKey,
        vertexIndex: ud.vertexIndex,
      };
    }
    if (ud.editorKind === 'edge') {
      return {
        kind: 'edge',
        roomKey: ud.roomKey,
        edgeIndex: ud.edgeIndex,
      };
    }
    if (ud.editorKind === 'door') {
      return {
        kind: 'door',
        boundaryKey: ud.boundaryKey,
        endpoint:
          ud.endpoint === 0 || ud.endpoint === 1 ? ud.endpoint : undefined,
      };
    }
    if (ud.editorKind === 'wall') {
      return {
        kind: 'wall',
        boundaryKey: ud.boundaryKey,
        endpoint:
          ud.endpoint === 0 || ud.endpoint === 1 ? ud.endpoint : undefined,
      };
    }
    if (ud.editorKind === 'room') {
      return { kind: 'room', roomKey: ud.roomKey };
    }
  }
  return null;
}
