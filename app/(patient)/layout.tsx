'use client';

import { RoleRouteGuard } from '@/shared/components/layout/RoleRouteGuard';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
    return <RoleRouteGuard requirePatient>{children}</RoleRouteGuard>;
}
