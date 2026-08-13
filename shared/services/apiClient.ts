// Use an empty base so all requests go through the Next.js rewrites proxy.
// In the browser this resolves to the same origin (no CORS).
// On the server the full URL is used via the rewrite destination.
import { resolveApiError } from "@/shared/utils/apiError";

const API_BASE_URL =
  typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || 'https://triageflow.me')
    : '';

export interface ApiResponse<T> {
  code: number;
  message: string;
  status: string;
  data: T;
}

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions extends RequestInit {
  suppressLogError?: boolean;
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const token = parsed?.state?.accessToken;
      if (token) return { Authorization: `Bearer ${token}` };
    }
    const legacyToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (legacyToken) return { Authorization: `Bearer ${legacyToken}` };
  } catch {
    // ignore
  }
  return {};
}

async function request<T>(
  path: string,
  options?: RequestOptions,
): Promise<ApiResponse<T>> {
  const { headers: extraHeaders, suppressLogError, ...restOptions } = options ?? {};
  const authHeaders = getAuthHeader();

  const headers: Record<string, string> = {
    ...authHeaders,
    ...(extraHeaders as Record<string, string>),
  };
  // Avoid Content-Type: application/json on body-less DELETE/GET — some Nest parsers reject it
  if (restOptions.body != null && headers['Content-Type'] == null && headers['content-type'] == null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    ...restOptions,
  });

  const text = await res.text().catch(() => '');
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = text ? { message: text } : {};
  }

  // 204 / empty success body
  if (res.ok && !text) {
    return { code: res.status, message: 'OK', status: 'success', data: null as T };
  }

  if (!res.ok) {
    if (!suppressLogError) {
      console.error(`[apiClient Error] ${options?.method || 'GET'} ${path} failed with status ${res.status}: ${JSON.stringify(json)}`);
    }
    const fallback = `Request failed with status ${res.status}`;
    const { message, detail } = resolveApiError(json, fallback);
    throw new ApiError(res.status, message, detail);
  }

  return json as ApiResponse<T>;
}

export const apiClient = {
  get: <T>(path: string, init?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...init }),

  post: <T>(path: string, body: unknown, init?: RequestOptions) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...init,
    }),

  patch: <T>(path: string, body: unknown, init?: RequestOptions) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...init,
    }),

  delete: <T>(path: string, init?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...init }),
};
