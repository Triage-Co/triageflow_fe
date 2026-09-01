'use client';

import { useEffect } from 'react';
import { notFound, usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import {
    canAccessRoute,
    isAdminRole,
    isPatientRole,
} from '@/shared/utils/routeAccess';

type RoleRouteGuardProps = {
    children: React.ReactNode;
    /** Chỉ role ADMIN */
    requireAdmin?: boolean;
    /** Chỉ role USER (bệnh nhân) */
    requirePatient?: boolean;
};

export function RoleRouteGuard({
    children,
    requireAdmin = false,
    requirePatient = false,
}: RoleRouteGuardProps) {
    const pathname = usePathname();
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/login');
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
        return null;
    }

    const role = user?.role;
    let allowed = false;

    if (requireAdmin) {
        allowed = isAdminRole(role);
    } else if (requirePatient) {
        allowed = isPatientRole(role);
    } else {
        allowed = canAccessRoute(role, pathname);
    }

    if (!allowed) {
        notFound();
    }

    return children;
}
