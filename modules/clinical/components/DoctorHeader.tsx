'use client';

import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/Button';

interface DoctorHeaderProps {
    tabs: string[];
    activeTab?: number;
    onTabChange?: (index: number) => void;
}

export function DoctorHeader({ tabs, activeTab: controlledTab, onTabChange }: DoctorHeaderProps) {
    const [internalTab, setInternalTab] = useState(0);
    const activeTab = controlledTab ?? internalTab;

    const handleTabChange = (i: number) => {
        setInternalTab(i);
        onTabChange?.(i);
    };

    return (
        <div className="bg-gradient-to-r from-brand-500 via-brand-400 to-brand-300 px-5 py-2.5 flex items-center gap-3 shrink-0 shadow-sm">
            {/* Grid icon */}
            <div className="w-9 h-9 rounded-[24px] bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <LayoutGrid className="w-4.5 h-4.5 text-white/90" />
            </div>

            {/* Doctor name tabs — using Button component */}
            <div className="flex items-center gap-0 ml-1">
                {tabs.map((tab, i) => (
                    <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTabChange(i)}
                        className={cn(
                            'px-5 py-2 text-sm font-medium rounded-[24px] whitespace-nowrap',
                            activeTab === i
                                ? 'bg-white/20 text-white backdrop-blur-sm shadow-sm hover:bg-white/25'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                        )}
                    >
                        {tab}
                    </Button>
                ))}
            </div>
        </div>
    );
}
