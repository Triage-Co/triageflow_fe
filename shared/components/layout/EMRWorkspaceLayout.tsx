'use client';

import { ReactNode } from 'react';
import { EMRHeader } from './EMRHeader';

interface EMRWorkspaceLayoutProps {
    activeTabId: string;
    activeTabName?: string;
    children: ReactNode;
}

export function EMRWorkspaceLayout({ activeTabId, activeTabName, children }: EMRWorkspaceLayoutProps) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F2FF] pt-6">
            <div className="flex-1 flex flex-col overflow-hidden bg-white shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                {/* ── Top header next to sidebar ── */}
                <EMRHeader activeTabId={activeTabId} activeTabName={activeTabName} />

                {/* ── Body content ── */}
                {children}
            </div>
        </div>
    );
}
