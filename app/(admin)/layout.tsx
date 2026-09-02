'use client';

import { AppShell } from '@/shared/components/layout/AppShell';
import { RoleRouteGuard } from '@/shared/components/layout/RoleRouteGuard';
import { useAuthStore } from '@/modules/auth/store/authStore';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((s) => s.user);

    const displayUser = user
        ? { name: user.fullName || user.email, role: 'ADMIN', avatar: user.avatar }
        : undefined;

    return (
        <AppShell user={displayUser}>
            <RoleRouteGuard requireAdmin>
                <div className="flex-1 flex flex-col overflow-hidden pt-6 pb-5 relative">
                    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[48px] rounded-bl-[48px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                        {children}
                    </div>
                </div>
            </RoleRouteGuard>
        </AppShell>
    );
}
