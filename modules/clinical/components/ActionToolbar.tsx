'use client';

import { cn } from '@/lib/utils';

export type ToolbarTab = 'kham-benh' | 'can-lam-sang' | 'chan-doan' | 'thu-thuoc' | 'don-thuoc';

interface ActionToolbarProps {
    activeTab: ToolbarTab;
    onTabChange: (tab: ToolbarTab) => void;
}

const TABS: { id: ToolbarTab; label: string }[] = [
    { id: 'kham-benh', label: 'Khám bệnh' },
    { id: 'can-lam-sang', label: 'Cận lâm sàng' },
    { id: 'chan-doan', label: 'Chẩn đoán điều trị' },
    { id: 'thu-thuoc', label: 'Thu thuốc' },
    { id: 'don-thuoc', label: 'Đơn thuốc' },
];

export function ActionToolbar({ activeTab, onTabChange }: ActionToolbarProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-nowrap">
            {TABS.map(({ id, label }) => {
                const isActive = activeTab === id;
                return (
                    <button
                        key={id}
                        onClick={() => onTabChange(id)}
                        className={cn(
                            'h-9 px-4 rounded-[10px] text-[13px] font-medium border transition-all duration-200',
                            isActive
                                ? 'bg-[#F5F2FF] text-[#8B7CF6] border-[#8B7CF6]/20'
                                : 'bg-white text-[#7B7B7B] border-[#ECECEC] hover:bg-[#F5F2FF] hover:text-[#8B7CF6]'
                        )}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}
