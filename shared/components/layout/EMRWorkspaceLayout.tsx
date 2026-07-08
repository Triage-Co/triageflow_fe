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
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                {/* ── Top header next to sidebar ── */}
                {showHeader && <EMRHeader activeTabId={activeTabId} activeTabName={activeTabName} />}

                {/* ── Body content ── */}
                {children}
            </div>
        </div>
    );
}
