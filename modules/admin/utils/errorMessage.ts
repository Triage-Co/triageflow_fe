import { ApiError } from '@/shared/services/apiClient';

/**
 * Resolve a caught error (typically from apiClient) into a single display string,
 * combining the `message` with `detail` (e.g. reference counts on a 409 Conflict)
 * so toasts/dialogs across the admin panel show consistent, useful copy.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
    if (err instanceof ApiError) {
        return err.detail ? `${err.message}\nChi tiết: ${err.detail}` : err.message || fallback;
    }
    if (err instanceof Error) return err.message || fallback;
    return fallback;
}

export function isConflictError(err: unknown): boolean {
    return err instanceof ApiError && err.statusCode === 409;
}
