// Use an empty base so all requests go through the Next.js rewrites proxy.
// In the browser this resolves to the same origin (no CORS).
// On the server the full URL is used via the rewrite destination.
import { resolveApiError } from '@/shared/utils/apiError';

const API_BASE_URL =
    typeof window === 'undefined'
        ? (process.env.NEXT_PUBLIC_API_URL || 'https://www.triageflow.me')
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
        this.name = 'ApiError';
    }
}

export interface RequestOptions extends RequestInit {
    suppressLogError?: boolean;
}

async function request<T>(
    path: string,
    options?: RequestOptions,
): Promise<ApiResponse<T>> {
    const { headers: extraHeaders, suppressLogError, ...restOptions } = options ?? {};
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...extraHeaders,
        },
        ...restOptions,
    });

    const text = await res.text().catch(() => '');
    let json: any = {};
    try {
        json = text ? JSON.parse(text) : {};
    } catch {
        json = text ? { message: text } : {};
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

    delete: <T>(path: string, init?: RequestInit) =>
        request<T>(path, { method: 'DELETE', ...init }),
};
