/** Pure geometry helpers for map editor (no external deps). Coords are [lng, lat]. */

const DEG_TO_METER_X = 111320;
const DEG_TO_METER_Z = 110540;

export type LngLat = [number, number];

export function lngLatToMeters(
  lng: number,
  lat: number,
  originLng = 0,
  originLat = 0,
): { x: number; z: number } {
  return {
    x: (lng - originLng) * DEG_TO_METER_X,
    z: (lat - originLat) * DEG_TO_METER_Z,
  };
}

export function metersToLngLat(
  x: number,
  z: number,
  originLng = 0,
  originLat = 0,
): LngLat {
  return [originLng + x / DEG_TO_METER_X, originLat + z / DEG_TO_METER_Z];
}

/** Absolute area in m² via shoelace in local meters. */
export function polygonAreaM2(ring: LngLat[]): number {
  if (ring.length < 3) return 0;
  const origin = ring[0];
  let sum = 0;
  const n = isClosedRing(ring) ? ring.length - 1 : ring.length;
  for (let i = 0; i < n; i++) {
    const a = lngLatToMeters(ring[i][0], ring[i][1], origin[0], origin[1]);
    const b = lngLatToMeters(
      ring[(i + 1) % n][0],
      ring[(i + 1) % n][1],
      origin[0],
      origin[1],
    );
    sum += a.x * b.z - b.x * a.z;
  }
  return Math.abs(sum) / 2;
}

/** Centroid of polygon in lng/lat (shoelace). */
export function polygonCentroid(ring: LngLat[]): LngLat {
  if (ring.length === 0) return [0, 0];
  const origin = ring[0];
  const n = isClosedRing(ring) ? ring.length - 1 : ring.length;
  if (n < 3) {
    let sx = 0;
    let sz = 0;
    for (let i = 0; i < n; i++) {
      const p = lngLatToMeters(ring[i][0], ring[i][1], origin[0], origin[1]);
      sx += p.x;
      sz += p.z;
    }
    return metersToLngLat(sx / Math.max(n, 1), sz / Math.max(n, 1), origin[0], origin[1]);
  }

  let area2 = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    const a = lngLatToMeters(ring[i][0], ring[i][1], origin[0], origin[1]);
    const b = lngLatToMeters(
      ring[(i + 1) % n][0],
      ring[(i + 1) % n][1],
      origin[0],
      origin[1],
    );
    const cross = a.x * b.z - b.x * a.z;
    area2 += cross;
    cx += (a.x + b.x) * cross;
    cz += (a.z + b.z) * cross;
  }
  if (Math.abs(area2) < 1e-12) {
    let sx = 0;
    let sz = 0;
    for (let i = 0; i < n; i++) {
      const p = lngLatToMeters(ring[i][0], ring[i][1], origin[0], origin[1]);
      sx += p.x;
      sz += p.z;
    }
    return metersToLngLat(sx / n, sz / n, origin[0], origin[1]);
  }
  cx /= 3 * area2;
  cz /= 3 * area2;
  return metersToLngLat(cx, cz, origin[0], origin[1]);
}

export function isClosedRing(ring: LngLat[]): boolean {
  if (ring.length < 2) return false;
  const a = ring[0];
  const b = ring[ring.length - 1];
  return a[0] === b[0] && a[1] === b[1];
}

export function ensureClosedRing(ring: LngLat[]): LngLat[] {
  if (ring.length === 0) return ring;
  if (isClosedRing(ring)) return ring.map((p) => [...p] as LngLat);
  return [...ring.map((p) => [...p] as LngLat), [...ring[0]] as LngLat];
}

export function openRing(ring: LngLat[]): LngLat[] {
  if (isClosedRing(ring) && ring.length > 1) {
    return ring.slice(0, -1).map((p) => [...p] as LngLat);
  }
  return ring.map((p) => [...p] as LngLat);
}

function orient(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
): number {
  return (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
}

function onSegment(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
): boolean {
  return (
    Math.min(ax, bx) <= cx + 1e-9 &&
    cx <= Math.max(ax, bx) + 1e-9 &&
    Math.min(az, bz) <= cz + 1e-9 &&
    cz <= Math.max(az, bz) + 1e-9
  );
}

function segmentsIntersectMeters(
  a1x: number,
  a1z: number,
  a2x: number,
  a2z: number,
  b1x: number,
  b1z: number,
  b2x: number,
  b2z: number,
): boolean {
  const o1 = orient(a1x, a1z, a2x, a2z, b1x, b1z);
  const o2 = orient(a1x, a1z, a2x, a2z, b2x, b2z);
  const o3 = orient(b1x, b1z, b2x, b2z, a1x, a1z);
  const o4 = orient(b1x, b1z, b2x, b2z, a2x, a2z);

  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (Math.abs(o1) < 1e-9 && onSegment(a1x, a1z, a2x, a2z, b1x, b1z)) return true;
  if (Math.abs(o2) < 1e-9 && onSegment(a1x, a1z, a2x, a2z, b2x, b2z)) return true;
  if (Math.abs(o3) < 1e-9 && onSegment(b1x, b1z, b2x, b2z, a1x, a1z)) return true;
  if (Math.abs(o4) < 1e-9 && onSegment(b1x, b1z, b2x, b2z, a2x, a2z)) return true;
  return false;
}

/** True if polygon self-intersects (ignoring shared vertices of adjacent edges). */
export function polygonSelfIntersects(ring: LngLat[]): boolean {
  const pts = openRing(ring);
  if (pts.length < 4) return false;
  const origin = pts[0];
  const meters = pts.map((p) =>
    lngLatToMeters(p[0], p[1], origin[0], origin[1]),
  );
  const n = meters.length;

  for (let i = 0; i < n; i++) {
    const a1 = meters[i];
    const a2 = meters[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      // skip adjacent edges
      if (Math.abs(i - j) <= 1) continue;
      if (i === 0 && j === n - 1) continue;
      const b1 = meters[j];
      const b2 = meters[(j + 1) % n];
      // skip if they share a vertex
      if (
        (a1.x === b1.x && a1.z === b1.z) ||
        (a1.x === b2.x && a1.z === b2.z) ||
        (a2.x === b1.x && a2.z === b1.z) ||
        (a2.x === b2.x && a2.z === b2.z)
      ) {
        continue;
      }
      if (
        segmentsIntersectMeters(
          a1.x,
          a1.z,
          a2.x,
          a2.z,
          b1.x,
          b1.z,
          b2.x,
          b2.z,
        )
      ) {
        return true;
      }
    }
  }
  return false;
}

export function segmentLengthM(a: LngLat, b: LngLat): number {
  const origin = a;
  const pa = lngLatToMeters(a[0], a[1], origin[0], origin[1]);
  const pb = lngLatToMeters(b[0], b[1], origin[0], origin[1]);
  return Math.hypot(pb.x - pa.x, pb.z - pa.z);
}

export function distToSegmentM(
  p: LngLat,
  a: LngLat,
  b: LngLat,
): { dist: number; t: number; closest: LngLat } {
  const origin = a;
  const pp = lngLatToMeters(p[0], p[1], origin[0], origin[1]);
  const pa = lngLatToMeters(a[0], a[1], origin[0], origin[1]);
  const pb = lngLatToMeters(b[0], b[1], origin[0], origin[1]);
  const dx = pb.x - pa.x;
  const dz = pb.z - pa.z;
  const lenSq = dx * dx + dz * dz;
  let t = 0;
  if (lenSq > 0) {
    t = ((pp.x - pa.x) * dx + (pp.z - pa.z) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));
  }
  const cx = pa.x + t * dx;
  const cz = pa.z + t * dz;
  return {
    dist: Math.hypot(pp.x - cx, pp.z - cz),
    t,
    closest: metersToLngLat(cx, cz, origin[0], origin[1]),
  };
}

export function projectPointToSegment(
  p: LngLat,
  a: LngLat,
  b: LngLat,
): { point: LngLat; t: number; dist: number } {
  const r = distToSegmentM(p, a, b);
  return { point: r.closest, t: r.t, dist: r.dist };
}

export function midpoint(a: LngLat, b: LngLat): LngLat {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

export function uniqueVertices(ring: LngLat[]): LngLat[] {
  return openRing(ring);
}
