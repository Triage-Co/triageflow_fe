'use client';

import { useState } from 'react';
import { User, Shield, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { WorkflowDiagram } from './workflow/WorkflowDiagram';
import { DoctorHeader } from './DoctorHeader';
import { ClinicalProcessPanel } from './ClinicalProcessPanel';

type DetailTab = 'info' | 'process';

interface PatientDetailPageProps {
    patient: Patient;
    clinicName?: string;
}

function displayText(value?: string | null): string {
    const text = (value || '').trim();
    return text || '—';
}

export function PatientDetailPage({ patient, clinicName }: PatientDetailPageProps) {
    const [activeTab, setActiveTab] = useState<DetailTab>('process');
    const [flowRefreshKey, setFlowRefreshKey] = useState(0);
    const [flowSnapshot, setFlowSnapshot] = useState<Record<string, unknown> | null>(null);

    const handleFlowChanged = (flow: Record<string, unknown> | null) => {
        setFlowSnapshot(flow);
        setFlowRefreshKey((prev) => prev + 1);
    };

    const record = patient.medicalRecord;
    const heading = clinicName || patient.department || '';
    const medicalHistory = (record?.medicalHistory?.length ? record.medicalHistory : patient.medicalHistory) || [];
    const visitReason = record?.visitReason || patient.visitReason;
    const clinicalProgression = record?.clinicalProgression || '';
    const physicalExam = record?.physicalExam;
    const examRows = [
        { label: 'Họng', value: physicalExam?.throat },
        { label: 'Phổi', value: physicalExam?.lungs },
        { label: 'Tim', value: physicalExam?.heart },
        { label: 'Bụng', value: physicalExam?.abdomen },
    ].filter((row) => Boolean(row.value?.trim()));

    const tabToggle = (
        <div className="bg-white rounded-[24px] border border-neutral-100 p-1.5 flex gap-1">
            {[
                { key: 'process' as const, label: 'Quy trình' },
                { key: 'info' as const, label: 'Thông tin chung' },
            ].map(({ key, label }) => (
                <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={cn(
                        'flex-1 px-3 py-2 text-xs font-semibold rounded-[18px] transition-all duration-150',
                        activeTab === key
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'text-neutral-500 hover:text-neutral-700'
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <DoctorHeader />

            {heading ? (
                <div className="px-6 py-3.5 border-b border-neutral-100 bg-white shrink-0">
                    <h2 className="text-base font-bold text-neutral-800 tracking-tight">{heading}</h2>
                </div>
            ) : null}

            <div className="flex-1 overflow-hidden flex gap-6 px-6 py-6">
                <div className="w-80 shrink-0 overflow-y-auto space-y-5">
                    {activeTab === 'info' && (
                        <div className="bg-white rounded-[24px] border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-5 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-[20px] bg-brand-100 flex items-center justify-center shrink-0">
                                <User className="w-5 h-5 text-brand-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-neutral-900 text-base leading-snug">
                                    {patient.name} {patient.stt ? `(${patient.stt})` : ''}
                                </p>
                                <p className="text-xs text-neutral-400 font-medium mt-0.5">
                                    Mã BN: {displayText(patient.code)}
                                </p>
                                <div className="mt-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-neutral-400">Giới tính / Tuổi</span>
                                        <span className="font-semibold text-neutral-700">
                                            {[
                                                patient.gender,
                                                patient.age != null ? String(patient.age) : null,
                                            ].filter(Boolean).join(' • ') || '—'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-neutral-400">Bảo hiểm</span>
                                        {patient.insurance.hasInsurance ? (
                                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                                <Shield className="w-3 h-3" />
                                                {patient.insurance.coverage}
                                            </span>
                                        ) : (
                                            <span className="text-neutral-400 font-medium">Không</span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-neutral-400">Đối tượng</span>
                                        <span className="font-semibold text-neutral-700">
                                            {displayText(patient.visitType)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {tabToggle}

                    {activeTab === 'process' && (
                        <WorkflowDiagram
                            patientId={patient.patientId || patient.id}
                            patient={patient}
                            refreshKey={flowRefreshKey}
                            onFlowChanged={handleFlowChanged}
                        />
                    )}
                </div>

                <div className="flex-1 overflow-y-auto min-w-0">
                    {activeTab === 'info' && (
                        <div className="space-y-5">
                            <div className="bg-white rounded-[20px] border border-neutral-100 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                                    Lý do khám
                                </p>
                                <div className="bg-neutral-50 rounded-[12px] border border-neutral-100 p-3 text-sm text-neutral-700 leading-relaxed min-h-[60px]">
                                    {displayText(visitReason)}
                                </div>
                            </div>

                            <div className="bg-white rounded-[20px] border border-neutral-100 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                                    Quá trình bệnh lý và diễn biến lâm sàng
                                </p>
                                <div className="bg-neutral-50 rounded-[12px] border border-neutral-100 p-3 text-sm text-neutral-700 leading-relaxed min-h-[80px]">
                                    {displayText(clinicalProgression)}
                                </div>
                            </div>

                            <div className="bg-white rounded-[20px] border border-neutral-100 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                                    Tiền sử bệnh
                                </p>
                                {medicalHistory.length > 0 ? (
                                    <div className="space-y-2">
                                        {medicalHistory.map((item) => (
                                            <div
                                                key={item}
                                                className="flex items-start gap-2 text-sm text-neutral-700"
                                            >
                                                <Circle className="w-1.5 h-1.5 mt-1.5 shrink-0 fill-blue-400 text-blue-400" />
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-neutral-400">—</p>
                                )}
                            </div>

                            <div className="bg-white rounded-[20px] border border-neutral-100 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                                    Khám lâm sàng
                                </p>
                                {examRows.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {examRows.map(({ label, value }) => (
                                            <div
                                                key={label}
                                                className="bg-neutral-50 rounded-[12px] border border-neutral-100 p-3"
                                            >
                                                <p className="text-xs text-neutral-400 font-medium">{label}</p>
                                                <p className="text-sm font-semibold text-neutral-700 mt-2">
                                                    {value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-neutral-400">—</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'process' && (
                        <ClinicalProcessPanel
                            patient={patient}
                            labOrders={[]}
                            flowRefreshKey={flowRefreshKey}
                            flowSnapshot={flowSnapshot}
                            onFlowChanged={handleFlowChanged}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
