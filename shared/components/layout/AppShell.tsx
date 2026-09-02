'use client';

import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/lib/utils';

interface AppShellProps {
    children: React.ReactNode;
    user?: { name: string; role: string; avatar?: string };
    bare?: boolean;
}

export function AppShell({ children, user }: AppShellProps) {
    const { sidebarOpen, toggleSidebar } = useUIStore();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const displayUser = user
        ? { name: user.name, role: user.role, avatar: user.avatar }
        : undefined;

    useEffect(() => {
        if (!mobileNavOpen) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [mobileNavOpen]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMobileNavOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 1024) setMobileNavOpen(false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] font-sans text-[#2D2D2D]">
            {/* Desktop sidebar */}
            <div className="hidden lg:flex h-full shrink-0">
                <Sidebar
                    user={displayUser}
                    collapsed={!sidebarOpen}
                    onToggle={toggleSidebar}
                />
            </div>

            {/* Mobile sidebar drawer */}
            <div
                className={cn(
                    'lg:hidden fixed inset-0 z-50 transition-opacity duration-300',
                    mobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
                )}
                aria-hidden={!mobileNavOpen}
            >
                <button
                    type="button"
                    className="absolute inset-0 bg-black/40"
                    aria-label="Đóng menu"
                    onClick={() => setMobileNavOpen(false)}
                />
                <div
                    className={cn(
                        'absolute left-0 top-0 h-full w-[min(280px,85vw)] bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] shadow-2xl transition-transform duration-300 ease-out',
                        mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
                    )}
                >
                    <div className="flex items-center justify-end px-3 pt-3">
                        <button
                            type="button"
                            onClick={() => setMobileNavOpen(false)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#4B5563] hover:bg-white/70 transition-colors"
                            aria-label="Đóng menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="h-[calc(100%-3rem)]">
                        <Sidebar
                            user={displayUser}
                            collapsed={false}
                            showCollapseToggle={false}
                            onNavItemClick={() => setMobileNavOpen(false)}
                        />
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex min-w-0 flex-1 flex-col h-full overflow-hidden">
                <div className="lg:hidden shrink-0 flex items-center gap-3 border-b border-[#8B7CF6]/10 bg-white/80 px-4 py-3 backdrop-blur-sm">
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen(true)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#EDE9FE] bg-white text-[#8B7CF6] shadow-sm transition-colors hover:bg-[#F5F3FF]"
                        aria-label="Mở menu điều hướng"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1F2937]">TriageFlow</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8B7CF6]">
                            OPD System
                        </p>
                    </div>
                </div>

                {children}
            </div>
        </div>
    );
}
