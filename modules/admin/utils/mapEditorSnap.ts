import {
  distToSegmentM,
  lngLatToMeters,
  metersToLngLat,
  type LngLat,
} from './mapEditorGeometry';

const VERTEX_SNAP_M = 0.3;
const EDGE_SNAP_M = 0.3;

export interface SnapTarget {
  vertices: LngLat[];
  edges: [LngLat, LngLat][];
}

export interface SnapResult {
  point: LngLat;
  snapped: boolean;
  kind: 'vertex' | 'edge' | 'ortho' | 'none';
}

/**
 * Snap in local meters then convert back to lng/lat.
 * Hold Shift (disableSnap=true) to skip snapping.
 */
export function snapPoint(
  raw: LngLat,
  targets: SnapTarget,
  opts?: {
    disableSnap?: boolean;
    previousPoint?: LngLat | null;
    lockOrtho?: boolean;
  },
): SnapResult {
  if (opts?.disableSnap) {
    return { point: raw, snapped: false, kind: 'none' };
  }

  let point = raw;
  let kind: SnapResult['kind'] = 'none';

  // Ortho lock relative to previous point (0/90°)
  if (opts?.lockOrtho && opts.previousPoint) {
    const origin = opts.previousPoint;
    const prev = lngLatToMeters(origin[0], origin[1], origin[0], origin[1]);
    const cur = lngLatToMeters(raw[0], raw[1], origin[0], origin[1]);
    const dx = Math.abs(cur.x - prev.x);
    const dz = Math.abs(cur.z - prev.z);
    if (dx >= dz) {
      point = metersToLngLat(cur.x, prev.z, origin[0], origin[1]);
    } else {
      point = metersToLngLat(prev.x, cur.z, origin[0], origin[1]);
    }
    kind = 'ortho';
  }

  // Vertex snap
  let bestDist = VERTEX_SNAP_M;
  let bestVertex: LngLat | null = null;
  for (const v of targets.vertices) {
    const d = distToSegmentM(point, v, v).dist;
    if (d < bestDist) {
      bestDist = d;
      bestVertex = v;
    }
  }
  if (bestVertex) {
    return { point: [...bestVertex] as LngLat, snapped: true, kind: 'vertex' };
  }

  // Edge snap
  bestDist = EDGE_SNAP_M;
  let bestEdgePoint: LngLat | null = null;
  for (const [a, b] of targets.edges) {
    const r = distToSegmentM(point, a, b);
    if (r.dist < bestDist) {
      bestDist = r.dist;
      bestEdgePoint = r.closest;
    }
  }
  if (bestEdgePoint) {
    return { point: bestEdgePoint, snapped: true, kind: 'edge' };
  }

  return { point, snapped: kind !== 'none', kind };
}
