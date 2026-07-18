'use client';

import { useRouter, usePathname } from 'next/navigation';
import { LayoutGrid, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';

export function DoctorHeader() {
    const router = useRouter();
    const pathname = usePathname();
    const { openTabs, closeTab } = usePatientTabsStore();

    const handleTabClick = (id: string) => {
        router.push(`/doctor/${id}`);
    };

    const handleCloseTab = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        closeTab(id);
        // If we're on this patient's page, navigate back to list
        if (pathname === `/doctor/${id}`) {
            // Find a different open tab to navigate to, or go to list
            const remaining = openTabs.filter((t) => t.id !== id);
            if (remaining.length > 0) {
                router.push(`/doctor/${remaining[remaining.length - 1].id}`);
            } else {
                router.push('/doctor');
            }
        }
    };

    return (
        <div className="bg-brand-500 px-4 py-2.5 flex items-center gap-2 shrink-0 shadow-sm min-h-[52px]">
            {/* List icon — navigates back to patient list */}
            <button
                onClick={() => router.push('/doctor')}
                className={cn(
                    'w-9 h-9 rounded-[20px] flex items-center justify-center shrink-0 transition-colors',
                    pathname === '/doctor'
                        ? 'bg-white/25 shadow-sm'
                        : 'bg-white/10 hover:bg-white/20'
                )}
                title="Danh sách bệnh nhân"
            >
                <LayoutGrid className="w-4.5 h-4.5 text-white/90" />
            </button>

            {/* Separator */}
            {openTabs.length > 0 && (
                <div className="w-px h-5 bg-white/25 shrink-0 mx-1" />
            )}

            {/* Patient tabs — Chrome-style */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-1">
                {openTabs.map((tab) => {
                    const isActive = pathname === `/doctor/${tab.id}`;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={cn(
                                'group flex items-center gap-2 px-3.5 py-1.5 rounded-[18px] text-sm font-medium whitespace-nowrap transition-all duration-150 max-w-[200px]',
                                isActive
                                    ? 'bg-white/25 text-white shadow-sm backdrop-blur-sm'
                                    : 'text-white/70 hover:text-white hover:bg-white/15'
                            )}
                        >
                            <span className="truncate">{tab.name}</span>
                            <span
                                role="button"
                                onClick={(e) => handleCloseTab(e, tab.id)}
                                className={cn(
                                    'w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors',
                                    isActive
                                        ? 'hover:bg-white/30 text-white/80 hover:text-white'
                                        : 'opacity-0 group-hover:opacity-100 hover:bg-white/25 text-white/70 hover:text-white'
                                )}
                                title="Đóng tab"
                            >
                                <X className="w-2.5 h-2.5" />
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
