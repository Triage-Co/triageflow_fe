import { apiClient } from '@/shared/services/apiClient';
import { useAuthStore } from '../store/authStore';

const getKioskAuthHeaders = (explicitToken?: string): Record<string, string> => {
  const token = explicitToken || useAuthStore.getState().authToken;
  if (!token) return {};
  let cleanToken = token.trim();
  if (
    (cleanToken.startsWith('"') && cleanToken.endsWith('"')) ||
    (cleanToken.startsWith("'") && cleanToken.endsWith("'"))
  ) {
    cleanToken = cleanToken.slice(1, -1).trim();
  }
  if (cleanToken.toLowerCase().startsWith('bearer ')) {
    cleanToken = cleanToken.substring(7).trim();
  }
  return { Authorization: `Bearer ${cleanToken}` };
};

export const kioskApiClient = {
  get: <T>(path: string, init?: RequestInit & { token?: string }) => {
    const { token, ...restInit } = init || {};
    const authHeaders = getKioskAuthHeaders(token);
    return apiClient.get<T>(path, {
      ...restInit,
      headers: { ...authHeaders, ...restInit?.headers },
    });
  },

  post: <T>(path: string, body: unknown, init?: RequestInit & { token?: string }) => {
    const { token, ...restInit } = init || {};
    const authHeaders = getKioskAuthHeaders(token);
    return apiClient.post<T>(path, body, {
      ...restInit,
      headers: { ...authHeaders, ...restInit?.headers },
    });
  },

  patch: <T>(path: string, body: unknown, init?: RequestInit & { token?: string }) => {
    const { token, ...restInit } = init || {};
    const authHeaders = getKioskAuthHeaders(token);
    return apiClient.patch<T>(path, body, {
      ...restInit,
      headers: { ...authHeaders, ...restInit?.headers },
    });
  },

  delete: <T>(path: string, init?: RequestInit & { token?: string }) => {
    const { token, ...restInit } = init || {};
    const authHeaders = getKioskAuthHeaders(token);
    return apiClient.delete<T>(path, {
      ...restInit,
      headers: { ...authHeaders, ...restInit?.headers },
    });
  },
};
