'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ApiFloor } from '@/modules/navigation/types/navigation.types';
import type { MapEditorBatchPayload } from '../services/mapEditorService';
import {
  ensureClosedRing,
  midpoint,
  openRing,
  polygonAreaM2,
  polygonCentroid,
  polygonSelfIntersects,
  projectPointToSegment,
  segmentLengthM,
  type LngLat,
} from '../utils/mapEditorGeometry';

export type DraftRoom = {
  key: string;
  id?: string;
  roomCode: string;
  roomLabel: string;
  heightMeters: number | null;
  areaId: string | null;
  outline: LngLat[];
  deleted?: boolean;
  dirty?: boolean;
};

export type DraftBoundary = {
  key: string;
  id?: string;
  roomKey?: string;
  boundaryType: 'WALL' | 'DOOR';
  hasWall: boolean;
  seqNo: number;
  line: [LngLat, LngLat];
  label?: string;
  deleted?: boolean;
  dirty?: boolean;
};

export type GeometrySelection =
  | { kind: 'room'; key: string }
  | { kind: 'vertex'; roomKey: string; index: number }
  | { kind: 'wall'; key: string }
  | { kind: 'door'; key: string }
  | null;

export type GeometryTool =
  | 'select'
  | 'draw-room'
  | 'draw-wall'
  | 'place-door'
  | 'delete';

export type ClientValidationError = {
  scope: 'room' | 'boundary';
  key: string;
  message: string;
};

type EditorState = {
  rooms: DraftRoom[];
  boundaries: DraftBoundary[];
  past: { rooms: DraftRoom[]; boundaries: DraftBoundary[] }[];
  future: { rooms: DraftRoom[]; boundaries: DraftBoundary[] }[];
  initialized: boolean;
};

type Action =
  | { type: 'INIT'; rooms: DraftRoom[]; boundaries: DraftBoundary[] }
  | { type: 'RESET'; rooms: DraftRoom[]; boundaries: DraftBoundary[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | {
      type: 'COMMIT';
      rooms: DraftRoom[];
      boundaries: DraftBoundary[];
    }
  | {
      type: 'SILENT';
      rooms: DraftRoom[];
      boundaries: DraftBoundary[];
    };

const MAX_HISTORY = 50;

function cloneRooms(rooms: DraftRoom[]): DraftRoom[] {
  return rooms.map((r) => ({
    ...r,
    outline: r.outline.map((p) => [...p] as LngLat),
  }));
}

function cloneBoundaries(boundaries: DraftBoundary[]): DraftBoundary[] {
  return boundaries.map((b) => ({
    ...b,
    line: [[...b.line[0]] as LngLat, [...b.line[1]] as LngLat],
  }));
}

function pushHistory(state: EditorState): EditorState {
  const snapshot = {
    rooms: cloneRooms(state.rooms),
    boundaries: cloneBoundaries(state.boundaries),
  };
  const past = [...state.past, snapshot].slice(-MAX_HISTORY);
  return { ...state, past, future: [] };
}

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'INIT':
    case 'RESET':
      return {
        rooms: cloneRooms(action.rooms),
        boundaries: cloneBoundaries(action.boundaries),
        past: [],
        future: [],
        initialized: true,
      };
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        rooms: cloneRooms(previous.rooms),
        boundaries: cloneBoundaries(previous.boundaries),
        past: state.past.slice(0, -1),
        future: [
          {
            rooms: cloneRooms(state.rooms),
            boundaries: cloneBoundaries(state.boundaries),
          },
          ...state.future,
        ].slice(0, MAX_HISTORY),
        initialized: true,
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        rooms: cloneRooms(next.rooms),
        boundaries: cloneBoundaries(next.boundaries),
        past: [
          ...state.past,
          {
            rooms: cloneRooms(state.rooms),
            boundaries: cloneBoundaries(state.boundaries),
          },
        ].slice(-MAX_HISTORY),
        future: state.future.slice(1),
        initialized: true,
      };
    }
    case 'COMMIT': {
      const withHistory = pushHistory(state);
      return {
        ...withHistory,
        rooms: cloneRooms(action.rooms),
        boundaries: cloneBoundaries(action.boundaries),
      };
    }
    case 'SILENT':
      return {
        ...state,
        rooms: cloneRooms(action.rooms),
        boundaries: cloneBoundaries(action.boundaries),
      };
    default:
      return state;
  }
}

function newKey(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function wallsFromOutline(
  roomKey: string,
  outline: LngLat[],
  existingDoors: DraftBoundary[],
): DraftBoundary[] {
  const pts = openRing(outline);
  const walls: DraftBoundary[] = [];
  let seq = 1;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    walls.push({
      key: newKey('wall'),
      roomKey,
      boundaryType: 'WALL',
      hasWall: true,
      seqNo: seq++,
      line: [[...a] as LngLat, [...b] as LngLat],
      dirty: true,
    });
  }

  const doors: DraftBoundary[] = [];
  for (const door of existingDoors) {
    if (door.deleted || door.boundaryType !== 'DOOR') continue;
    const mid = midpoint(door.line[0], door.line[1]);
    let bestDist = 0.5;
    let host: [LngLat, LngLat] | null = null;
    for (const w of walls) {
      const r = projectPointToSegment(mid, w.line[0], w.line[1]);
      if (r.dist < bestDist) {
        bestDist = r.dist;
        host = w.line;
      }
    }
    if (!host) continue;
    // Project door endpoints onto the host wall
    const p0 = projectPointToSegment(door.line[0], host[0], host[1]).point;
    const p1 = projectPointToSegment(door.line[1], host[0], host[1]).point;
    doors.push({
      ...door,
      roomKey,
      line: [p0, p1],
      seqNo: seq++,
      dirty: true,
      deleted: false,
    });
  }

  return [...walls, ...doors];
}

export function floorToDraft(floor: ApiFloor): {
  rooms: DraftRoom[];
  boundaries: DraftBoundary[];
} {
  const rooms: DraftRoom[] = [];
  const boundaries: DraftBoundary[] = [];

  for (const room of floor.rooms) {
    const key = `room-${room.id}`;
    const outline = ensureClosedRing(
      (room.outlineGeom?.coordinates?.[0] || []).map(
        (c) => [c[0], c[1]] as LngLat,
      ),
    );
    rooms.push({
      key,
      id: room.id,
      roomCode: room.roomCode,
      roomLabel: room.roomLabel,
      heightMeters:
        typeof room.heightMeters === 'number' ? room.heightMeters : null,
      areaId: room.areaId ?? null,
      outline,
      dirty: false,
    });

    for (const b of room.boundaries || []) {
      if (b.boundaryType !== 'WALL' && b.boundaryType !== 'DOOR') continue;
      const coords = b.lineGeom?.coordinates;
      if (!coords || coords.length < 2) continue;
      boundaries.push({
        key: `boundary-${b.id}`,
        id: b.id,
        roomKey: key,
        boundaryType: b.boundaryType,
        hasWall: b.hasWall,
        seqNo: b.seqNo,
        line: [
          [coords[0][0], coords[0][1]],
          [coords[1][0], coords[1][1]],
        ],
        label: b.label ?? undefined,
        dirty: false,
      });
    }
  }

  for (const b of floor.standaloneBoundaries || []) {
    if (b.boundaryType !== 'WALL' && b.boundaryType !== 'DOOR') continue;
    const coords = b.lineGeom?.coordinates;
    if (!coords || coords.length < 2) continue;
    boundaries.push({
      key: `boundary-${b.id}`,
      id: b.id,
      boundaryType: b.boundaryType,
      hasWall: b.hasWall,
      seqNo: b.seqNo,
      line: [
        [coords[0][0], coords[0][1]],
        [coords[1][0], coords[1][1]],
      ],
      label: b.label ?? undefined,
      dirty: false,
    });
  }

  return { rooms, boundaries };
}

function syncWallsToOutline(
  roomKey: string,
  outline: LngLat[],
  boundaries: DraftBoundary[],
): DraftBoundary[] {
  const pts = openRing(outline);
  const result = cloneBoundaries(boundaries);
  const roomWalls = result.filter(
    (b) =>
      b.roomKey === roomKey &&
      b.boundaryType === 'WALL' &&
      !b.deleted,
  );

  // Update existing walls in edge order; create/delete if count mismatch
  if (roomWalls.length === pts.length) {
    for (let i = 0; i < pts.length; i++) {
      const wall = roomWalls[i];
      wall.line = [
        [...pts[i]] as LngLat,
        [...pts[(i + 1) % pts.length]] as LngLat,
      ];
      wall.dirty = true;
      wall.seqNo = i + 1;
    }
  } else {
    // Fall back to full rebuild
    return rebuildRoomWalls(
      [{ key: roomKey, outline, roomCode: '', roomLabel: '', heightMeters: null, areaId: null }],
      boundaries,
      roomKey,
    );
  }

  // Re-project doors onto nearest wall
  for (const door of result) {
    if (
      door.deleted ||
      door.roomKey !== roomKey ||
      door.boundaryType !== 'DOOR'
    ) {
      continue;
    }
    const mid = midpoint(door.line[0], door.line[1]);
    let bestDist = 0.5;
    let host: [LngLat, LngLat] | null = null;
    for (const w of roomWalls) {
      const r = projectPointToSegment(mid, w.line[0], w.line[1]);
      if (r.dist < bestDist) {
        bestDist = r.dist;
        host = w.line;
      }
    }
    if (!host) {
      if (door.id) {
        door.deleted = true;
        door.dirty = true;
      }
      continue;
    }
    const halfLen =
      segmentLengthM(door.line[0], door.line[1]) / 2;
    const wallLen = segmentLengthM(host[0], host[1]);
    const proj = projectPointToSegment(mid, host[0], host[1]);
    const halfT = Math.min(0.45, halfLen / Math.max(wallLen, 0.01));
    const t0 = Math.max(0, proj.t - halfT);
    const t1 = Math.min(1, proj.t + halfT);
    const lerp = (t: number): LngLat => [
      host![0][0] + (host![1][0] - host![0][0]) * t,
      host![0][1] + (host![1][1] - host![0][1]) * t,
    ];
    door.line = [lerp(t0), lerp(t1)];
    door.dirty = true;
  }

  return result;
}

function rebuildRoomWalls(
  rooms: DraftRoom[],
  boundaries: DraftBoundary[],
  roomKey: string,
): DraftBoundary[] {
  const room = rooms.find((r) => r.key === roomKey && !r.deleted);
  if (!room) return boundaries;

  const existingDoors = boundaries.filter(
    (b) =>
      b.roomKey === roomKey &&
      b.boundaryType === 'DOOR' &&
      !b.deleted,
  );
  const others = boundaries.filter(
    (b) => !(b.roomKey === roomKey && !b.deleted),
  );
  // Mark old room walls/doors as deleted if they had ids; drop temps
  const tombstones = boundaries
    .filter((b) => b.roomKey === roomKey && b.id && !b.deleted)
    .map((b) => ({ ...b, deleted: true, dirty: true }));

  const fresh = wallsFromOutline(roomKey, room.outline, existingDoors);
  // Prefer keeping door ids when possible by matching midpoints
  const remappedFresh = fresh.map((nb) => {
    if (nb.boundaryType !== 'DOOR') return nb;
    const mid = midpoint(nb.line[0], nb.line[1]);
    const match = existingDoors.find((d) => {
      const dm = midpoint(d.line[0], d.line[1]);
      return (
        Math.abs(dm[0] - mid[0]) < 1e-8 && Math.abs(dm[1] - mid[1]) < 1e-8
      );
    });
    if (match?.id) {
      return {
        ...nb,
        key: match.key,
        id: match.id,
        label: match.label,
        dirty: true,
      };
    }
    return nb;
  });

  // Avoid double-deleting doors we remapped
  const keptDoorKeys = new Set(
    remappedFresh.filter((b) => b.id).map((b) => b.key),
  );
  const filteredTombs = tombstones.filter((t) => !keptDoorKeys.has(t.key));

  return [...others.filter((b) => b.deleted || b.roomKey !== roomKey), ...filteredTombs, ...remappedFresh];
}

export function useMapGeometryEditor(floor: ApiFloor | null | undefined) {
  const [state, dispatch] = useReducer(reducer, {
    rooms: [],
    boundaries: [],
    past: [],
    future: [],
    initialized: false,
  });

  const floorIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!floor) return;
    if (floorIdRef.current === floor.id && state.initialized) return;
    floorIdRef.current = floor.id;
    const draft = floorToDraft(floor);
    dispatch({ type: 'INIT', ...draft });
  }, [floor, state.initialized]);

  const visibleRooms = useMemo(
    () => state.rooms.filter((r) => !r.deleted),
    [state.rooms],
  );
  const visibleBoundaries = useMemo(
    () => state.boundaries.filter((b) => !b.deleted),
    [state.boundaries],
  );

  const isDirty = useMemo(() => {
    return (
      state.rooms.some((r) => r.dirty || r.deleted || !r.id) ||
      state.boundaries.some((b) => b.dirty || b.deleted || !b.id)
    );
  }, [state.rooms, state.boundaries]);

  const changeCount = useMemo(() => {
    let n = 0;
    for (const r of state.rooms) {
      if (r.deleted && r.id) n += 1;
      else if (!r.id && !r.deleted) n += 1;
      else if (r.dirty) n += 1;
    }
    for (const b of state.boundaries) {
      if (b.deleted && b.id) n += 1;
      else if (!b.id && !b.deleted) n += 1;
      else if (b.dirty) n += 1;
    }
    return n;
  }, [state.rooms, state.boundaries]);

  const commit = useCallback(
    (rooms: DraftRoom[], boundaries: DraftBoundary[], recordHistory = true) => {
      dispatch({
        type: recordHistory ? 'COMMIT' : 'SILENT',
        rooms,
        boundaries,
      });
    },
    [],
  );

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const checkpoint = useCallback(() => {
    dispatch({
      type: 'COMMIT',
      rooms: state.rooms,
      boundaries: state.boundaries,
    });
  }, [state.rooms, state.boundaries]);

  const resetFromFloor = useCallback(
    (f: ApiFloor) => {
      const draft = floorToDraft(f);
      dispatch({ type: 'RESET', ...draft });
    },
    [],
  );

  const addRoom = useCallback(
    (outline: LngLat[], props?: Partial<DraftRoom>) => {
      const key = newKey('room');
      const closed = ensureClosedRing(outline);
      const room: DraftRoom = {
        key,
        roomCode: props?.roomCode || `ROOM_${Date.now().toString().slice(-4)}`,
        roomLabel: props?.roomLabel || 'Phòng mới',
        heightMeters: props?.heightMeters ?? 3,
        areaId: props?.areaId ?? null,
        outline: closed,
        dirty: true,
      };
      const rooms = [...state.rooms, room];
      let boundaries = [...state.boundaries];
      boundaries = [
        ...boundaries,
        ...wallsFromOutline(key, closed, []),
      ];
      commit(rooms, boundaries);
      return key;
    },
    [state.rooms, state.boundaries, commit],
  );

  const moveVertex = useCallback(
    (roomKey: string, index: number, point: LngLat, recordHistory = true) => {
      const rooms = cloneRooms(state.rooms);
      const room = rooms.find((r) => r.key === roomKey && !r.deleted);
      if (!room) return;
      const pts = openRing(room.outline);
      if (index < 0 || index >= pts.length) return;
      pts[index] = [...point] as LngLat;
      room.outline = ensureClosedRing(pts);
      room.dirty = true;
      const boundaries = syncWallsToOutline(
        roomKey,
        room.outline,
        state.boundaries,
      );
      commit(rooms, boundaries, recordHistory);
    },
    [state.rooms, state.boundaries, commit],
  );

  const insertVertex = useCallback(
    (roomKey: string, afterIndex: number, point: LngLat) => {
      const rooms = cloneRooms(state.rooms);
      const room = rooms.find((r) => r.key === roomKey && !r.deleted);
      if (!room) return;
      const pts = openRing(room.outline);
      pts.splice(afterIndex + 1, 0, [...point] as LngLat);
      room.outline = ensureClosedRing(pts);
      room.dirty = true;
      const boundaries = rebuildRoomWalls(rooms, state.boundaries, roomKey);
      commit(rooms, boundaries);
    },
    [state.rooms, state.boundaries, commit],
  );

  const deleteVertex = useCallback(
    (roomKey: string, index: number) => {
      const rooms = cloneRooms(state.rooms);
      const room = rooms.find((r) => r.key === roomKey && !r.deleted);
      if (!room) return;
      const pts = openRing(room.outline);
      if (pts.length <= 3) return;
      pts.splice(index, 1);
      room.outline = ensureClosedRing(pts);
      room.dirty = true;
      const boundaries = rebuildRoomWalls(rooms, state.boundaries, roomKey);
      commit(rooms, boundaries);
    },
    [state.rooms, state.boundaries, commit],
  );

  const updateRoomProps = useCallback(
    (
      roomKey: string,
      props: Partial<
        Pick<DraftRoom, 'roomCode' | 'roomLabel' | 'heightMeters' | 'areaId'>
      >,
    ) => {
      const rooms = cloneRooms(state.rooms);
      const room = rooms.find((r) => r.key === roomKey && !r.deleted);
      if (!room) return;
      Object.assign(room, props);
      room.dirty = true;
      commit(rooms, cloneBoundaries(state.boundaries));
    },
    [state.rooms, state.boundaries, commit],
  );

  const deleteRoom = useCallback(
    (roomKey: string) => {
      const rooms = cloneRooms(state.rooms);
      const room = rooms.find((r) => r.key === roomKey);
      if (!room) return;
      if (room.id) {
        room.deleted = true;
        room.dirty = true;
      } else {
        const idx = rooms.findIndex((r) => r.key === roomKey);
        if (idx >= 0) rooms.splice(idx, 1);
      }

      let boundaries = cloneBoundaries(state.boundaries);
      boundaries = boundaries
        .map((b) => {
          if (b.roomKey !== roomKey) return b;
          if (b.id) return { ...b, deleted: true, dirty: true };
          return null;
        })
        .filter(Boolean) as DraftBoundary[];

      commit(rooms, boundaries);
    },
    [state.rooms, state.boundaries, commit],
  );

  const addWall = useCallback(
    (a: LngLat, b: LngLat) => {
      const boundary: DraftBoundary = {
        key: newKey('wall'),
        boundaryType: 'WALL',
        hasWall: true,
        seqNo:
          Math.max(0, ...state.boundaries.map((x) => x.seqNo), 0) + 1,
        line: [[...a] as LngLat, [...b] as LngLat],
        dirty: true,
      };
      commit(cloneRooms(state.rooms), [
        ...cloneBoundaries(state.boundaries),
        boundary,
      ]);
      return boundary.key;
    },
    [state.rooms, state.boundaries, commit],
  );

  const moveWallEndpoint = useCallback(
    (key: string, endpoint: 0 | 1, point: LngLat, recordHistory = true) => {
      const boundaries = cloneBoundaries(state.boundaries);
      const b = boundaries.find((x) => x.key === key && !x.deleted);
      if (!b) return;
      b.line[endpoint] = [...point] as LngLat;
      b.dirty = true;
      commit(cloneRooms(state.rooms), boundaries, recordHistory);
    },
    [state.rooms, state.boundaries, commit],
  );

  const deleteBoundary = useCallback(
    (key: string) => {
      const boundaries = cloneBoundaries(state.boundaries);
      const b = boundaries.find((x) => x.key === key);
      if (!b) return;
      if (b.id) {
        b.deleted = true;
        b.dirty = true;
      } else {
        const idx = boundaries.findIndex((x) => x.key === key);
        if (idx >= 0) boundaries.splice(idx, 1);
      }
      commit(cloneRooms(state.rooms), boundaries);
    },
    [state.rooms, state.boundaries, commit],
  );

  const placeDoorOnWall = useCallback(
    (wallKey: string, clickPoint: LngLat, halfWidthM = 0.6) => {
      const walls = state.boundaries.filter(
        (b) => !b.deleted && b.boundaryType === 'WALL',
      );
      const wall = walls.find((w) => w.key === wallKey);
      if (!wall) return null;

      const proj = projectPointToSegment(
        clickPoint,
        wall.line[0],
        wall.line[1],
      );
      const wallLen = segmentLengthM(wall.line[0], wall.line[1]);
      const halfT = Math.min(0.45, halfWidthM / Math.max(wallLen, 0.01));
      const t0 = Math.max(0, proj.t - halfT);
      const t1 = Math.min(1, proj.t + halfT);
      const lerp = (t: number): LngLat => [
        wall.line[0][0] + (wall.line[1][0] - wall.line[0][0]) * t,
        wall.line[0][1] + (wall.line[1][1] - wall.line[0][1]) * t,
      ];

      const door: DraftBoundary = {
        key: newKey('door'),
        roomKey: wall.roomKey,
        boundaryType: 'DOOR',
        hasWall: false,
        seqNo:
          Math.max(0, ...state.boundaries.map((x) => x.seqNo), 0) + 1,
        line: [lerp(t0), lerp(t1)],
        dirty: true,
      };
      commit(cloneRooms(state.rooms), [
        ...cloneBoundaries(state.boundaries),
        door,
      ]);
      return door.key;
    },
    [state.rooms, state.boundaries, commit],
  );

  const clientErrors = useMemo((): ClientValidationError[] => {
    const errors: ClientValidationError[] = [];
    const codes = new Map<string, string>();

    for (const room of visibleRooms) {
      const pts = openRing(room.outline);
      if (pts.length < 3) {
        errors.push({
          scope: 'room',
          key: room.key,
          message: 'Phòng cần ít nhất 3 đỉnh',
        });
      }
      if (polygonSelfIntersects(room.outline)) {
        errors.push({
          scope: 'room',
          key: room.key,
          message: 'Polygon phòng bị tự cắt',
        });
      }
      const area = polygonAreaM2(room.outline);
      if (area < 1) {
        errors.push({
          scope: 'room',
          key: room.key,
          message: `Diện tích quá nhỏ (${area.toFixed(2)} m²)`,
        });
      }
      if (!room.roomCode.trim()) {
        errors.push({
          scope: 'room',
          key: room.key,
          message: 'roomCode bắt buộc',
        });
      } else {
        const k = room.roomCode.toLowerCase();
        if (codes.has(k)) {
          errors.push({
            scope: 'room',
            key: room.key,
            message: `roomCode "${room.roomCode}" bị trùng`,
          });
        }
        codes.set(k, room.key);
      }
    }

    for (const b of visibleBoundaries) {
      const len = segmentLengthM(b.line[0], b.line[1]);
      if (len < 0.1) {
        errors.push({
          scope: 'boundary',
          key: b.key,
          message: `Đoạn biên quá ngắn (${len.toFixed(3)} m)`,
        });
      }
      if (b.boundaryType === 'DOOR') {
        const mid = midpoint(b.line[0], b.line[1]);
        const walls = visibleBoundaries.filter(
          (w) => w.boundaryType === 'WALL',
        );
        let ok = false;
        for (const w of walls) {
          if (projectPointToSegment(mid, w.line[0], w.line[1]).dist < 0.5) {
            ok = true;
            break;
          }
        }
        if (!ok) {
          errors.push({
            scope: 'boundary',
            key: b.key,
            message: 'Cửa phải nằm trên một tường',
          });
        }
      }
    }

    return errors;
  }, [visibleRooms, visibleBoundaries]);

  const buildPayload = useCallback((): MapEditorBatchPayload => {
    const roomsCreate: MapEditorBatchPayload['rooms']['create'] = [];
    const roomsUpdate: MapEditorBatchPayload['rooms']['update'] = [];
    const roomsDelete: string[] = [];

    for (const room of state.rooms) {
      if (room.deleted && room.id) {
        roomsDelete.push(room.id);
        continue;
      }
      if (room.deleted) continue;

      const outline = ensureClosedRing(room.outline);
      const center = polygonCentroid(outline);
      const outlineGeom = {
        type: 'Polygon' as const,
        coordinates: [outline],
      };
      const centerGeom = {
        type: 'Point' as const,
        coordinates: center,
      };

      if (!room.id) {
        roomsCreate.push({
          tempKey: room.key,
          roomCode: room.roomCode,
          roomLabel: room.roomLabel,
          heightMeters: room.heightMeters ?? undefined,
          areaId: room.areaId ?? undefined,
          outlineGeom,
          centerGeom,
        });
      } else if (room.dirty) {
        roomsUpdate.push({
          id: room.id,
          roomCode: room.roomCode,
          roomLabel: room.roomLabel,
          heightMeters: room.heightMeters ?? undefined,
          areaId: room.areaId,
          outlineGeom,
          centerGeom,
        });
      }
    }

    const boundariesCreate: MapEditorBatchPayload['boundaries']['create'] =
      [];
    const boundariesUpdate: MapEditorBatchPayload['boundaries']['update'] =
      [];
    const boundariesDelete: string[] = [];

    for (const b of state.boundaries) {
      if (b.deleted && b.id) {
        boundariesDelete.push(b.id);
        continue;
      }
      if (b.deleted) continue;

      const lineGeom = {
        type: 'LineString' as const,
        coordinates: b.line,
      };

      if (!b.id) {
        const room = b.roomKey
          ? state.rooms.find((r) => r.key === b.roomKey)
          : undefined;
        boundariesCreate.push({
          tempKey: b.key,
          roomId: room?.id,
          roomTempKey: room && !room.id ? room.key : undefined,
          seqNo: b.seqNo,
          boundaryType: b.boundaryType,
          hasWall: b.hasWall,
          label: b.label,
          lineGeom,
        });
      } else if (b.dirty) {
        boundariesUpdate.push({
          id: b.id,
          seqNo: b.seqNo,
          boundaryType: b.boundaryType,
          hasWall: b.hasWall,
          label: b.label,
          lineGeom,
        });
      }
    }

    return {
      rooms: {
        create: roomsCreate,
        update: roomsUpdate,
        delete: roomsDelete,
      },
      boundaries: {
        create: boundariesCreate,
        update: boundariesUpdate,
        delete: boundariesDelete,
      },
    };
  }, [state.rooms, state.boundaries]);

  return {
    rooms: visibleRooms,
    boundaries: visibleBoundaries,
    allRooms: state.rooms,
    allBoundaries: state.boundaries,
    isDirty,
    changeCount,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    clientErrors,
    initialized: state.initialized,
    undo,
    redo,
    checkpoint,
    resetFromFloor,
    addRoom,
    moveVertex,
    insertVertex,
    deleteVertex,
    updateRoomProps,
    deleteRoom,
    addWall,
    moveWallEndpoint,
    deleteBoundary,
    placeDoorOnWall,
    buildPayload,
  };
}
