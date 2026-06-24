import type { AuthUser } from '@/shared/types/auth.types';

/**
 * Decode a JWT token payload without verifying signature.
 * Works in the browser using built-in atob().
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        // Base64url → Base64
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

/**
 * Extract an AuthUser from a JWT access token.
 * Adapts to common JWT claim names used by Spring Boot backends.
 */
export function getUserFromToken(token: string): AuthUser | null {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;

    // Common claim names for user id
    const id = String(
        payload.sub ?? payload.userId ?? payload.user_id ?? payload.id ?? ''
    );

    // Common claim names for email
    const email = String(
        payload.email ?? payload.sub ?? ''
    );

    // Common claim names for name
    const fullName = String(
        payload.fullName ?? payload.full_name ?? payload.name ?? payload.userName ?? ''
    );

    // Common claim names for role
    const role = extractRole(payload);

    if (!id) return null;

    return { id, email, fullName: fullName || undefined, role };
}

/**
 * Extract role string from JWT payload.
 * Supports: role (string), roles (array), authorities (Spring Security array).
 */
function extractRole(payload: Record<string, unknown>): string {
    // Direct role string
    if (typeof payload.role === 'string') return payload.role;

    // Spring Security "authorities" / "roles" array
    const arr = payload.authorities ?? payload.roles;
    if (Array.isArray(arr) && arr.length > 0) {
        const first = arr[0];
        // Could be { authority: "ROLE_DOCTOR" } or plain "DOCTOR"
        const raw = typeof first === 'object' && first !== null && 'authority' in first
            ? String((first as Record<string, unknown>).authority)
            : String(first);
        return raw.replace(/^ROLE_/, '');
    }

    return '';
}
