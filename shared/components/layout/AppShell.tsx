'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { useUIStore } from '@/store/uiStore';

interface AppShellProps {
    children: React.ReactNode;
    user?: { name: string; role: string; avatar?: string };
    bare?: boolean;
}

export function AppShell({ children, user, bare }: AppShellProps) {
    const { sidebarOpen, toggleSidebar } = useUIStore();
    const pathname = usePathname();
    const showBottomNav = !pathname.startsWith('/reception');

    // Map user properties safely
    const displayUser = user
        ? { name: user.name, role: user.role, avatar: user.avatar }
        : undefined;

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#F8F8FB] font-sans text-[#2D2D2D]">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full shrink-0">
                <Sidebar
                    user={displayUser}
                    collapsed={!sidebarOpen}
                    onToggle={toggleSidebar}
                />
            </div>

            {/* Main Content Area - fills remaining space */}
            <div
                className={`flex-1 flex flex-col h-full overflow-hidden ${showBottomNav ? 'pb-20 md:pb-0' : ''}`}
            >
                {children}
            </div>

            {/* Mobile Bottom Nav (hidden on bare layouts or reception flow) */}
            {!bare && showBottomNav && (
                <div className="md:hidden">
                    <BottomNav />
                </div>
            )}
        </div>
    );
}
