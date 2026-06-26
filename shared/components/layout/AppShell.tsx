'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { PageHeader } from './PageHeader';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  user?: { name: string; role: string; avatar?: string };
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  /** When true, renders children directly without the padded white card wrapper */
  bare?: boolean;
}

export function AppShell({ children, user, title, description, actions, bare }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 font-sans text-neutral-900">
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar user={user} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* TopBar (desktop/mobile) - hidden in bare mode */}
        {!bare && <TopBar user={user} />}

        {/* Scrollable Content Container */}
        {bare ? (
          <div className="flex-1 overflow-hidden px-4 md:px-6 pb-4 md:pb-6 pt-2">
            <div className="h-full bg-white rounded-[48px] border border-neutral-200/60 shadow-[0_2px_16px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
              {children}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-24 md:pb-8 pt-2">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* PageHeader (rendered optionally if title is provided) */}
              {title && (
                <PageHeader title={title} description={description} actions={actions} />
              )}

              {/* Outer container using 48px border radius */}
              <div className="bg-white rounded-[48px] border border-neutral-200/60 p-6 md:p-8 shadow-[0_2px_16px_rgba(0,0,0,0.02)] min-h-[calc(100vh-180px)]">
                {children}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
