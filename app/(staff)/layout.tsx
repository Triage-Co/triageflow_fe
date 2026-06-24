'use client';

import { useEffect } from 'react';
import { AppShell } from '@/shared/components/layout/AppShell';
import { useAuthStore } from '@/store/authStore';
import { getUserFromToken } from '@/shared/utils/jwt';

interface UserProfile {
    name: string;
    role: string;
}

function extractUserProfile(user: unknown): UserProfile | null {
    if (user && typeof user === 'object' && 'name' in user && 'role' in user) {
        const u = user as Record<string, unknown>;
        if (typeof u.name === 'string' && typeof u.role === 'string') {
            return { name: u.name, role: u.role };
        }
    }
    // Also handle AuthUser shape (fullName instead of name)
    if (user && typeof user === 'object' && 'role' in user) {
        const u = user as Record<string, unknown>;
        const name = (u.fullName ?? u.name ?? u.email ?? '') as string;
        const role = u.role as string;
        if (typeof role === 'string' && role) {
            return { name: String(name), role };
        }
    }
    return null;
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const { user, setUser } = useAuthStore();

    // Re-hydrate user from token if store is empty (e.g. page refresh)
    useEffect(() => {
        const token =
            localStorage.getItem('accessToken') ??
            sessionStorage.getItem('accessToken');
        if (token) {
            // DEBUG: Log full JWT payload to see role structure
            try {
                const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                const payload = JSON.parse(decodeURIComponent(
                    atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
                ));
                console.log('🔑 JWT Full Payload:', JSON.stringify(payload, null, 2));
            } catch (e) { console.error('JWT decode error', e); }

            if (!user) {
                const parsed = getUserFromToken(token);
                console.log('👤 Parsed user from token:', parsed);
                if (parsed) setUser(parsed);
            }
        }
    }, [user, setUser]);

    const displayUser = extractUserProfile(user);

    return (
        <AppShell user={displayUser || undefined} bare>
            {children}
        </AppShell>
    );
}
