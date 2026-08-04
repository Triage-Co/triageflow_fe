import { apiClient } from '@/shared/services/apiClient';
import type { CorridorDebugSteps } from '../types/navigation.types';

/**
 * Fetches MPRSS corridor debug geometry layers for a floor.
 * Note: backend currently re-runs corridor generation as a side effect.
 */
export async function fetchDebugSteps(
  floorId: string
): Promise<CorridorDebugSteps> {
  const response = await apiClient.get<CorridorDebugSteps>(
    `/api/graph/${floorId}/debug-steps`
  );

  if (!response.data) {
    throw new Error('Invalid debug-steps API response');
  }

  return response.data;
}

export interface CorridorEditsPayload {
  add: [number, number][];
  remove: string[];
}

export interface CorridorEditsResult {
  added: number;
  removed: number;
  edgesCreated: number;
  nodesUsed: number;
  durationMs: number;
}

/**
 * Apply batched corridor/junction edits then rebuild edges (Admin).
 */
export async function saveCorridorEdits(
  floorId: string,
  payload: CorridorEditsPayload,
  token: string
): Promise<CorridorEditsResult> {
  const response = await apiClient.post<CorridorEditsResult>(
    `/api/graph/${floorId}/corridor-edits`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.data) {
    throw new Error('Invalid corridor-edits API response');
  }

  return response.data;
}
