'use client';

import { ReactNode } from 'react';
import { EMRHeader } from './EMRHeader';

interface EMRWorkspaceLayoutProps {
    activeTabId: string;
    activeTabName?: string;
    children: ReactNode;
}

export function EMRWorkspaceLayout({ activeTabId, activeTabName, children }: EMRWorkspaceLayoutProps) {
    const showHeader = activeTabId !== 'notification' && activeTabId !== 'setting' && activeTabId !== 'settings';

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6 pb-5 relative">
            {/* Background decoration purple circle at bottom-left */}
            <div className="absolute bottom-5 left-5 w-12 h-12 rounded-full bg-[#8B7CF6]/60" />

            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] rounded-bl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)] relative z-10">
                {/* ── Top header next to sidebar ── */}
                {showHeader && <EMRHeader activeTabId={activeTabId} activeTabName={activeTabName} />}

                {/* ── Body content ── */}
                {children}
            </div>
        </div>
    );
}
