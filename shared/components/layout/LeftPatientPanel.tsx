'use client';

import { useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { Heart, Activity, Thermometer, Gauge, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidePanelTab = 'process' | 'info';

const PROCESS_STEPS = [
    'Tiếp nhận', 'Phân loại ưu tiên', 'Đo sinh hiệu',
    'Chờ khám', 'Đang khám', 'Thanh toán & Dược', 'Hoàn tất',
];

const VITALS = [
    { key: 'heartRate' as const, label: 'Nhịp tim', unit: 'bpm', Icon: Heart, color: '#EF4444' },
    { key: 'bloodPressure' as const, label: 'Huyết áp', unit: 'mmHg', Icon: Activity, color: '#3B82F6' },
    { key: 'temperature' as const, label: 'Nhiệt độ', unit: '°C', Icon: Thermometer, color: '#F59E0B' },
    { key: 'spO2' as const, label: 'SpO₂', unit: '%', Icon: Gauge, color: '#22C55E' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-bold text-[#9C9C9C] uppercase tracking-wider mb-2">
            {children}
        </p>
    );
}

interface LeftPanelProps {
    patient: Patient;
    isOpen: boolean;
}

export function LeftPatientPanel({ patient, isOpen }: LeftPanelProps) {
    const [tab, setTab] = useState<SidePanelTab>('info');

    return (
        <div
            className={cn(
                'relative flex flex-col bg-white border-r border-[#EBEBEB] shrink-0 transition-all duration-300 overflow-hidden',
                isOpen ? 'w-[252px]' : 'w-[44px]'
            )}
        >
            {/* ── COLLAPSED STATE — icon strip only ── */}
            {!isOpen && (
                <div className="flex flex-col items-center gap-4 pt-12 px-2">
                    {[Heart, Activity, Thermometer, Gauge].map((Icon, i) => (
                        <div
                            key={i}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#ADADAD] hover:text-[#8B7CF6] hover:bg-[#F5F2FF] transition-colors"
                        >
                            <Icon className="w-4 h-4" />
                        </div>
                    ))}
                </div>
            )}

            {/* ── OPEN STATE — full patient info ── */}
            {isOpen && (
                <div className="flex flex-col h-full overflow-hidden">
                    {/* Panel header */}
                    <div className="px-4 pt-4 pb-3 border-b border-[#F0EEF8] shrink-0">
                        <p className="text-[13px] font-bold text-[#2D2D2D] pr-8">PK. Nội tổng quát 1</p>

                        {/* Tabs */}
                        <div className="flex gap-1 mt-2.5">
                            {([
                                { id: 'process' as SidePanelTab, label: 'Quy trình' },
                                { id: 'info' as SidePanelTab, label: 'Thông tin chung' },
                            ]).map(({ id, label }) => (
                                <button
                                    key={id}
                                    onClick={() => setTab(id)}
                                    className={cn(
                                        'px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150',
                                        tab === id
                                            ? 'bg-[#8B7CF6] text-white'
                                            : 'text-[#7B7B7B] hover:bg-[#F5F2FF] hover:text-[#8B7CF6]'
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* ── Process tab ── */}
                        {tab === 'process' && (
                            <div className="p-4 space-y-1">
                                {PROCESS_STEPS.map((step, i) => {
                                    const done = patient.status === 'Đã khám'
                                        ? true
                                        : patient.status === 'Đang khám'
                                            ? i <= 4
                                            : i <= 2;
                                    return (
                                        <div key={i} className="flex items-center gap-3 py-1.5">
                                            <div className={cn(
                                                'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 border',
                                                done
                                                    ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                                                    : 'bg-white border-[#DCDCDC] text-[#ADADAD]'
                                            )}>
                                                {done ? '✓' : i + 1}
                                            </div>
                                            <span className={cn('text-[12px] font-medium', done ? 'text-[#2D2D2D]' : 'text-[#ADADAD]')}>
                                                {step}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Info tab ── */}
                        {tab === 'info' && (
                            <div className="p-4 space-y-4">
                                {/* Avatar + name */}
                                <div className="flex items-start gap-2.5">
                                    <div className="w-10 h-10 rounded-full bg-[#F5F2FF] border-2 border-[#8B7CF6]/20 flex items-center justify-center shrink-0 text-[#8B7CF6] font-bold text-sm">
                                        {patient.name.split(' ').pop()?.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-[#2D2D2D] leading-tight">{patient.name}</p>
                                        <p className="text-[11px] text-[#9C9C9C] mt-0.5">Mã BN: {patient.code}</p>
                                    </div>
                                </div>

                                {/* Info rows */}
                                <div className="space-y-0">
                                    {[
                                        { label: 'Giới tính / Tuổi', value: `${patient.gender} - ${patient.age} tuổi` },
                                        {
                                            label: 'Bảo hiểm y tế',
                                            value: patient.insurance.hasInsurance
                                                ? <span className="text-[#22C55E] font-semibold">BHYT {patient.insurance.coverage}</span>
                                                : <span className="text-[#9C9C9C]">Không có</span>
                                        },
                                        { label: 'Đối tượng', value: patient.visitType },
                                    ].map((row, i) => (
                                        <div key={i} className="flex items-center justify-between py-2 border-b border-[#F5F5F5] last:border-0">
                                            <span className="text-[11px] text-[#9C9C9C]">{row.label}</span>
                                            <span className="text-[11px] font-semibold text-[#2D2D2D] text-right">{row.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Lý do đến khám */}
                                <div>
                                    <SectionLabel>Lý do đến khám</SectionLabel>
                                    <p className="text-[12px] text-[#2D2D2D] leading-relaxed">{patient.visitReason}</p>
                                </div>

                                {/* Dị ứng */}
                                {patient.allergies.length > 0 && (
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <AlertTriangle className="w-3 h-3 text-[#F59E0B]" />
                                            <SectionLabel>Dị ứng &amp; chống chỉ định</SectionLabel>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {patient.allergies.map((a, i) => (
                                                <span key={i} className="text-[11px] font-medium bg-[#FFF7ED] text-[#D97706] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tiền sử */}
                                {patient.medicalHistory.length > 0 && (
                                    <div>
                                        <SectionLabel>Tiền sử</SectionLabel>
                                        <ul className="space-y-1.5">
                                            {patient.medicalHistory.map((h, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[12px] text-[#2D2D2D]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] shrink-0 mt-1.5" />
                                                    {h}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Sinh hiệu */}
                                <div>
                                    <SectionLabel>Sinh hiệu</SectionLabel>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                        {VITALS.map(({ key, label, unit, Icon, color }) => (
                                            <div key={key}>
                                                <div className="flex items-center gap-1 mb-0.5">
                                                    <Icon className="w-3 h-3 shrink-0" style={{ color }} />
                                                    <span className="text-[10px] text-[#9C9C9C]">{label}</span>
                                                </div>
                                                <div className="flex items-baseline gap-0.5">
                                                    <span className="text-[20px] font-bold text-[#2D2D2D] leading-none">
                                                        {patient.vitals[key]}
                                                    </span>
                                                    <span className="text-[10px] text-[#9C9C9C]">{unit}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
