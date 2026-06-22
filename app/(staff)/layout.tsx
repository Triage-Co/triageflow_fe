'use client';

import { AppShell } from '@/shared/components/layout/AppShell';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    const mockUser = { name: 'Nguyễn Thị Hồng Hạnh', role: 'NURSE' };

    return (
        <AppShell user={mockUser}>
            {children}
        </AppShell>
    );
}

