'use client';

import { useState } from 'react';
import {
    User,
    Search,
    Settings,
    Stethoscope,
    Microscope,
    ClipboardList,
    Syringe,
    Pill,
} from 'lucide-react';
import type { Patient, ClinicalStage, LabOrder } from '@/modules/clinical/types/clinical.types';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';
import { cn } from '@/lib/utils';
import { ParaclinicalPanel } from './ParaclinicalPanel';

const STAGE_TABS: {
    key: ClinicalStage;
    label: string;
    Icon: typeof Stethoscope;
}[] = [
    { key: 'examination', label: 'Khám bệnh', Icon: Stethoscope },
    { key: 'paraclinical', label: 'Cận lâm sàng', Icon: Microscope },
    { key: 'diagnosis', label: 'Chẩn đoán & điều trị', Icon: ClipboardList },
    { key: 'procedure', label: 'Thủ thuật', Icon: Syringe },
    { key: 'prescription', label: 'Đơn thuốc', Icon: Pill },
];

interface ClinicalProcessPanelProps {
    patient: Patient;
    labOrders: LabOrder[];
    diagnosis?: { code: string; description: string };
}

function StagePlaceholder({ title }: { title: string }) {
    return (
        <div className="bg-white rounded-[20px] border border-neutral-100 border-dashed p-12 flex flex-col items-center justify-center text-center min-h-[280px]">
            <p className="text-sm font-semibold text-neutral-500">{title}</p>
            <p className="text-xs text-neutral-400 mt-1">Nội dung sẽ được bổ sung</p>
        </div>
    );
}

export function ClinicalProcessPanel({
    patient,
    labOrders,
    diagnosis = { code: 'J02.9', description: 'Đau hố chậu phải' },
}: ClinicalProcessPanelProps) {
    const [activeStage, setActiveStage] = useState<ClinicalStage>('paraclinical');

    return (
        <div className="flex flex-col h-full min-h-0">
            {/* Patient info bar */}
            <div className="bg-white rounded-[20px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] px-5 py-4 mb-5 shrink-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-[16px] bg-brand-100 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-brand-500" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-base font-bold text-neutral-900">
                                    {patient.name} {patient.stt ? `(${patient.stt})` : ''}
                                </h2>
                                {patient.insurance.hasInsurance && (
                                    <Badge variant="success" size="sm">
                                        BHYT {patient.insurance.coverage}
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">
                                {patient.gender} · {patient.age} tuổi · Mã BN: {patient.code} ·{' '}
                                {patient.visitType}
                            </p>
                            <div className="mt-2">
                                <Badge variant="info" size="sm" className="font-mono">
                                    {diagnosis.code} {diagnosis.description}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <div className="w-52 hidden sm:block">
                            <Input
                                variant="pill"
                                placeholder="Tìm trong hồ sơ..."
                                startIcon={<Search className="w-4 h-4" />}
                                className="h-10 text-xs"
                            />
                        </div>
                        <button
                            type="button"
                            className="w-10 h-10 rounded-[14px] border border-neutral-200 bg-white flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:border-neutral-300 transition-colors"
                            aria-label="Cài đặt"
                        >
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Stage tabs */}
            <div className="bg-white rounded-[20px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] px-2 py-2 mb-5 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1 min-w-max">
                    {STAGE_TABS.map(({ key, label, Icon }) => {
                        const isActive = activeStage === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveStage(key)}
                                className={cn(
                                    'flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-semibold whitespace-nowrap transition-all duration-150',
                                    isActive
                                        ? 'bg-brand-500 text-white shadow-sm'
                                        : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stage content */}
            <div className="flex-1 min-h-0">
                {activeStage === 'paraclinical' && <ParaclinicalPanel orders={labOrders} />}
                {activeStage === 'examination' && (
                    <StagePlaceholder title="Khám bệnh" />
                )}
                {activeStage === 'diagnosis' && (
                    <StagePlaceholder title="Chẩn đoán & điều trị" />
                )}
                {activeStage === 'procedure' && (
                    <StagePlaceholder title="Thủ thuật" />
                )}
                {activeStage === 'prescription' && (
                    <StagePlaceholder title="Đơn thuốc" />
                )}
            </div>
        </div>
    );
}
