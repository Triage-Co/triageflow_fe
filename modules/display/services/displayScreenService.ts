import { apiClient, type ApiResponse } from '@/shared/services/apiClient';
import type {
  CreateDisplayScreenDto,
  DisplayScreen,
  DisplayScreenKind,
  DisplayScreenStatus,
  UpdateDisplayScreenDto,
  VerifyDisplayPinResult,
} from '../types/display-screen.types';

function unwrap<T>(res: unknown): T {
  if (res && typeof res === 'object' && 'data' in res) {
    const wrapped = res as ApiResponse<T>;
    if (wrapped.data !== undefined && wrapped.data !== null) {
      return wrapped.data;
    }
  }
  return res as T;
}

function withPinHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem('triageflow_display_pin');
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string; expiresAt?: number } };
    const token = parsed.state?.accessToken;
    const expiresAt = parsed.state?.expiresAt;
    if (!token) return {};
    if (expiresAt && expiresAt <= Date.now()) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export const displayScreenService = {
  async list(params?: {
    kind?: DisplayScreenKind;
    status?: DisplayScreenStatus;
  }): Promise<DisplayScreen[]> {
    const query = new URLSearchParams();
    if (params?.kind) query.set('kind', params.kind);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    const res = await apiClient.get<DisplayScreen[] | DisplayScreen>(
      `/api/display-screen${qs ? `?${qs}` : ''}`,
      { suppressLogError: true },
    );
    const data = unwrap<DisplayScreen[] | DisplayScreen>(res);
    return Array.isArray(data) ? data : [];
  },

  async getById(id: string): Promise<DisplayScreen> {
    const res = await apiClient.get<DisplayScreen>(`/api/display-screen/${id}`, {
      suppressLogError: true,
    });
    return unwrap<DisplayScreen>(res);
  },

  async verifyPin(pin: string): Promise<VerifyDisplayPinResult> {
    const res = await apiClient.post<VerifyDisplayPinResult>(
      '/api/display-screen/verify-pin',
      { pin },
    );
    return unwrap<VerifyDisplayPinResult>(res);
  },

  async changePin(current_pin: string, new_pin: string): Promise<{ ok: boolean }> {
    const res = await apiClient.patch<{ ok: boolean }>('/api/display-screen/pin', {
      current_pin,
      new_pin,
    });
    return unwrap<{ ok: boolean }>(res);
  },

  async create(dto: CreateDisplayScreenDto): Promise<DisplayScreen> {
    const res = await apiClient.post<DisplayScreen>('/api/display-screen', dto, {
      headers: withPinHeaders(),
    });
    return unwrap<DisplayScreen>(res);
  },

  async update(id: string, dto: UpdateDisplayScreenDto): Promise<DisplayScreen> {
    const res = await apiClient.patch<DisplayScreen>(`/api/display-screen/${id}`, dto, {
      headers: withPinHeaders(),
    });
    return unwrap<DisplayScreen>(res);
  },

  async disable(id: string): Promise<DisplayScreen> {
    const res = await apiClient.delete<DisplayScreen>(`/api/display-screen/${id}`, {
      headers: withPinHeaders(),
    });
    return unwrap<DisplayScreen>(res);
  },

  async findOrCreateClinic(room_id: string): Promise<DisplayScreen> {
    const res = await apiClient.post<DisplayScreen>(
      '/api/display-screen/find-or-create/clinic',
      { room_id },
    );
    return unwrap<DisplayScreen>(res);
  },

  async findOrCreatePayment(room_id?: string): Promise<DisplayScreen> {
    const res = await apiClient.post<DisplayScreen>(
      '/api/display-screen/find-or-create/payment',
      room_id ? { room_id } : {},
    );
    return unwrap<DisplayScreen>(res);
  },
};
