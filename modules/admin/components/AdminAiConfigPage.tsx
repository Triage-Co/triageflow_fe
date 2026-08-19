'use client';

import { useState, type ElementType } from 'react';
import { Building2, Link2, MessagesSquare, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiQuestionLimitPanel } from './AiQuestionLimitPanel';
import { HospitalSpecialtiesPanel } from './HospitalSpecialtiesPanel';
import { AiSpecialtyMappingPanel } from './AiSpecialtyMappingPanel';

type MainTab = 'questions' | 'specialties';
type SpecialtySubTab = 'hospital' | 'mapping';

const MAIN_TABS: { id: MainTab; label: string; icon: ElementType }[] = [
    { id: 'questions', label: 'Số câu hỏi AI', icon: MessagesSquare },
    { id: 'specialties', label: 'Khoa & mapping AI', icon: Building2 },
];

const SUB_TABS: { id: SpecialtySubTab; label: string; icon: ElementType }[] = [
    { id: 'hospital', label: 'Khoa bệnh viện', icon: Stethoscope },
    { id: 'mapping', label: 'Mapping AI', icon: Link2 },
];

export function AdminAiConfigPage() {
    const [activeTab, setActiveTab] = useState<MainTab>('questions');
    const [subTab, setSubTab] = useState<SpecialtySubTab>('hospital');

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6 pb-5">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] rounded-bl-[48px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 min-h-0 overflow-y-auto p-6">
                        <div className="max-w-6xl mx-auto space-y-5">
                            <div>
                                <h1 className="text-xl font-bold text-neutral-900">Cấu hình AI</h1>
                            </div>

                            <div className="inline-flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
                                {MAIN_TABS.map((tab) => {
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

                            {activeTab === 'questions' ? (
                                <AiQuestionLimitPanel />
                            ) : (
                                <div className="space-y-4">
                                    <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5">
                                        {SUB_TABS.map((tab) => {
                                            const Icon = tab.icon;
                                            const isActive = subTab === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    type="button"
                                                    onClick={() => setSubTab(tab.id)}
                                                    className={cn(
                                                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-bold transition-colors cursor-pointer',
                                                        isActive
                                                            ? 'bg-brand-50 text-brand-500'
                                                            : 'text-neutral-500 hover:text-neutral-700'
                                                    )}
                                                >
                                                    <Icon className="w-3.5 h-3.5" />
                                                    {tab.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {subTab === 'hospital' ? (
                                        <HospitalSpecialtiesPanel />
                                    ) : (
                                        <AiSpecialtyMappingPanel />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
