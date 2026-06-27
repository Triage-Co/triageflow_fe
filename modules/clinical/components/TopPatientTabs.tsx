'use client';

import { useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopPatientTabsProps {
    tabs: string[];
    activeTab?: number;
    onTabChange?: (index: number) => void;
}

export function TopPatientTabs({ tabs, activeTab: controlled, onTabChange }: TopPatientTabsProps) {
    const [internal, setInternal] = useState(0);
    const active = controlled ?? internal;

    const handleChange = (i: number) => {
        setInternal(i);
        onTabChange?.(i);
    };

    return (
        <div className="bg-[#8B7CF6] flex items-center h-12 shrink-0 px-3 gap-1">
            {/* Grid icon */}
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center shrink-0 mr-1">
                <LayoutGrid className="w-4 h-4 text-white/90" />
            </div>

            {/* Tabs */}
            {tabs.map((tab, i) => (
                <button
                    key={i}
                    onClick={() => handleChange(i)}
                    className={cn(
                        'h-8 px-4 text-sm font-medium text-white rounded-xl transition-all duration-150 whitespace-nowrap',
                        active === i
                            ? 'bg-white/20'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                    )}
                >
                    {tab}
                </button>
            ))}

            {/* Dividers between tabs */}
            {/* (tabs are separated visually by spacing & active state) */}
        </div>
    );
}
