'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePatientTabsStore } from '@/modules/clinical/store/clinicalStore';
import { useAuthStore } from '@/store/authStore';

interface EMRHeaderProps {
    activeTabId: string; // 'dashboard' or patient.id
    activeTabName?: string;
}

export function EMRHeader({ activeTabId, activeTabName }: EMRHeaderProps) {
    const router = useRouter();
    const { openTabs, openTab, closeTab } = usePatientTabsStore();
    const [mounted, setMounted] = useState(false);
    const user = useAuthStore((s) => s.user);
    const basePath = user?.role === 'NURSE' ? '/nurse' : '/doctor';

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true);
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!mounted) return;

        // If currently viewing a patient detail page, ensure this tab is open
        if (activeTabId && activeTabId !== 'dashboard') {
            const isUuid = (str: string) => /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(str);
            let patientName = activeTabName;
            if (!patientName || isUuid(patientName) || patientName === `Bệnh nhân ${activeTabId}` || patientName.includes(activeTabId)) {
                patientName = 'Bệnh nhân';
            }
            const timer = setTimeout(() => {
                openTab({ id: activeTabId, name: patientName });
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [activeTabId, activeTabName, openTab, mounted]);

    const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
        e.stopPropagation();

        closeTab(tabId);

        if (tabId === activeTabId) {
            router.push(basePath);
        }
    };

    const tabsToRender = mounted ? openTabs : [];
    const isDashboardActive = activeTabId === 'dashboard';

    return (
        <header className="flex items-end h-10 bg-[#8B7CF6] shrink-0 select-none overflow-hidden">
            {/* Merged tabs container without gaps */}
            <div className="flex items-end h-full">
                <Link
                    href={basePath}
                    className={cn(
                        'relative h-10 w-12 flex items-center justify-center rounded-t-[16px] transition-all duration-200',
                        isDashboardActive
                            ? 'bg-white text-[#8B7CF6] after:content-[\'\'] after:absolute after:bottom-0 after:left-full after:w-4 after:h-4 after:bg-transparent after:rounded-bl-[16px] after:shadow-[-4px_4px_0_4px_#ffffff] z-10'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                    )}
                >
                    <List className="w-5 h-5" />
                </Link>

                {/* Patient tabs */}
                {tabsToRender.map((tab, i) => {
                    const isActive = tab.id === activeTabId;
                    const showSeparatorAfter = !isActive && (i === tabsToRender.length - 1 || tabsToRender[i + 1].id !== activeTabId);

                    const isUuid = (str: string) => /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(str);
                    const baseName = !tab.name || isUuid(tab.name) || tab.name === `Bệnh nhân ${tab.id}` || tab.name.includes(tab.id) ? 'Bệnh nhân' : tab.name;
                    const displayName = baseName + (tab.stt ? ` (${tab.stt})` : '');

                    return (
                        <div key={tab.id} className="flex items-end h-full">
                            <div
                                className={cn(
                                    'relative h-10 flex items-center text-[13px] font-bold transition-all duration-200 group rounded-t-[16px]',
                                    isActive
                                        ? 'bg-white text-[#2D2D2D] shadow-sm before:content-[\'\'] before:absolute before:bottom-0 before:right-full before:w-4 before:h-4 before:bg-transparent before:rounded-br-[16px] before:shadow-[4px_4px_0_4px_#ffffff] after:content-[\'\'] after:absolute after:bottom-0 after:left-full after:w-4 after:h-4 after:bg-transparent after:rounded-bl-[16px] after:shadow-[-4px_4px_0_4px_#ffffff] z-10'
                                        : 'text-white/80 hover:text-white hover:bg-white/10'
                                )}
                            >
                                <Link
                                    href={`${basePath}/${tab.id}`}
                                    className="h-full pl-5 pr-2 flex items-center"
                                >
                                    <span>{displayName}</span>
                                </Link>
                                <button
                                    onClick={(e) => handleCloseTab(e, tab.id)}
                                    className={cn(
                                        'mr-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer shrink-0',
                                        isActive
                                            ? 'text-neutral-500 hover:text-[#2D2D2D] hover:bg-neutral-100 active:bg-neutral-200'
                                            : 'text-white/60 hover:text-white hover:bg-white/20 active:bg-white/30'
                                    )}
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Render separator after inactive tab */}
                            {showSeparatorAfter && (
                                <div className="h-6 flex items-center px-1">
                                    <span className="text-white/40 text-[13px] select-none font-light">|</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </header>
    );
}
