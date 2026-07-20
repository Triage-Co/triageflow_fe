'use client';

import { AppShell } from '@/shared/components/layout/AppShell';
import { useAuthStore } from '@/modules/auth/store/authStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((s) => s.user);

    const displayUser = user
        ? { name: user.fullName || user.email, role: 'ADMIN', avatar: user.avatar }
        : undefined;

    return (
        <AppShell user={displayUser}>
            {children}
        </AppShell>
    );
}
