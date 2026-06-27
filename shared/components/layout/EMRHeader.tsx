'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EMR_PATIENT_TABS, MOCK_EMR_PATIENTS } from '@/modules/clinical/data/emr-mock-data';

interface EMRHeaderProps {
    activeTabId: string; // 'dashboard' or patient.id
}

export function EMRHeader({ activeTabId }: EMRHeaderProps) {
    const router = useRouter();
    const [tabs, setTabs] = useState<{ id: string; name: string }[]>([]);
    const isDashboardActive = activeTabId === 'dashboard';

    useEffect(() => {
        // Load tabs from localStorage or fallback to defaults
        const stored = localStorage.getItem('emr_patient_tabs');
        let currentTabs = EMR_PATIENT_TABS;
        if (stored) {
            try {
                currentTabs = JSON.parse(stored);
            } catch (e) {
                // ignore
            }
        }

        // If currently viewing a patient detail page, ensure this tab is open
        if (activeTabId && activeTabId !== 'dashboard') {
            const hasTab = currentTabs.some((t) => t.id === activeTabId);
            if (!hasTab) {
                const mockPatient = MOCK_EMR_PATIENTS[activeTabId];
                const patientName = mockPatient ? mockPatient.name : `Bệnh nhân ${activeTabId}`;
                const updatedTabs = [...currentTabs, { id: activeTabId, name: patientName }];
                currentTabs = updatedTabs;
                localStorage.setItem('emr_patient_tabs', JSON.stringify(updatedTabs));
            }
        }

        setTabs(currentTabs);
    }, [activeTabId]);

    const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
        e.stopPropagation();

        const newTabs = tabs.filter((t) => t.id !== tabId);
        setTabs(newTabs);
        localStorage.setItem('emr_patient_tabs', JSON.stringify(newTabs));

        if (tabId === activeTabId) {
            router.push('/reception');
        }
    };

    return (
        <header className="flex items-end h-10 bg-[#8B7CF6] shrink-0 select-none">
            {/* Patient list dashboard tab on the left */}
            <div className="flex items-end h-full">
                <Link
                    href="/reception"
                    className={cn(
                        'relative h-10 w-12 flex items-center justify-center rounded-t-[12px] transition-all duration-200 mr-1',
                        'bg-white text-[#8B7CF6] after:content-[\'\'] after:absolute after:bottom-0 after:left-full after:w-4 after:h-4 after:bg-transparent after:rounded-bl-[16px] after:shadow-[-4px_4px_0_4px_#ffffff]'
                        // Always white to merge with LeftPatientPanel/PatientList container below
                    )}
                >
                    <List className="w-5 h-5" />
                </Link>
            </div>

            {/* Patient tabs with separators */}
            <div className="flex items-end h-full">
                {tabs.map((tab, i) => {
                    const isActive = tab.id === activeTabId;
                    const showSeparatorAfter = !isActive && (i === tabs.length - 1 || tabs[i + 1].id !== activeTabId);

                    return (
                        <div key={tab.id} className="flex items-end h-full">
                            <div
                                className={cn(
                                    'relative h-10 flex items-center text-[13px] font-bold transition-all duration-200 group mr-1',
                                    isActive
                                        ? 'bg-white text-[#2D2D2D] shadow-sm rounded-t-[12px] before:content-[\'\'] before:absolute before:bottom-0 before:right-full before:w-4 before:h-4 before:bg-transparent before:rounded-br-[16px] before:shadow-[4px_4px_0_4px_#ffffff] after:content-[\'\'] after:absolute after:bottom-0 after:left-full after:w-4 after:h-4 after:bg-transparent after:rounded-bl-[16px] after:shadow-[-4px_4px_0_4px_#ffffff]'
                                        : 'text-white/80 hover:text-white hover:bg-white/10 rounded-t-[12px]'
                                )}
                            >
                                <Link
                                    href={`/doctor/${tab.id}`}
                                    className="h-full pl-5 pr-2 flex items-center"
                                >
                                    <span>{tab.name}</span>
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
