'use client';

import { useState } from 'react';
import { Clock, ListOrdered, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriorityRulesPanel } from './PriorityRulesPanel';
import { RoomStatsPanel } from './RoomStatsPanel';
import { AutoRebalanceToggle } from './AutoRebalanceToggle';

type QueueConfigTab = 'rules' | 'room-stats';

const TABS: { id: QueueConfigTab; label: string; icon: React.ElementType }[] = [
    { id: 'rules', label: 'Quy tắc ưu tiên', icon: ListOrdered },
    { id: 'room-stats', label: 'Thời gian phục vụ', icon: Clock },
];

export function AdminQueueConfigPage() {
    const [activeTab, setActiveTab] = useState<QueueConfigTab>('rules');
    const [createRuleTrigger, setCreateRuleTrigger] = useState(0);

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6 pb-5">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] rounded-bl-[48px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 min-h-0 overflow-y-auto p-6">
                        <div className="space-y-5">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                <div>
                                    <h1 className="text-xl font-bold text-neutral-900">
                                        Cấu hình hàng chờ
                                    </h1>
                                    <p className="text-[13px] text-[#7B7B7B] font-medium mt-1">
                                        Quy tắc ưu tiên phân luồng bệnh nhân và thời gian phục vụ mặc định theo phòng.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <AutoRebalanceToggle variant="panel" />
                                    {activeTab === 'rules' && (
                                        <button
                                            type="button"
                                            onClick={() => setCreateRuleTrigger((prev) => prev + 1)}
                                            className="flex items-center gap-2 px-4 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white text-[13px] font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Thêm quy tắc
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
                                {TABS.map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={cn(
                                                'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-colors cursor-pointer',
                                                isActive
                                                    ? 'bg-white text-brand-500 shadow-sm'
                                                    : 'text-neutral-500 hover:text-neutral-700'
                                            )}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {activeTab === 'rules' ? (
                                <PriorityRulesPanel createTrigger={createRuleTrigger} />
                            ) : (
                                <RoomStatsPanel />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
