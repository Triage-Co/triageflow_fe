'use client';

import { Sidebar } from '@/shared/components/layout/Sidebar';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-neutral-50">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}

