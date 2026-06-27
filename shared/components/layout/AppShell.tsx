'use client';

import React from 'react';
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
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {children}
            </div>

            {/* Mobile Bottom Nav */}
            <div className="md:hidden">
                <BottomNav />
            </div>
        </div>
    );
}
