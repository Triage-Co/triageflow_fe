'use client';

import { useState, useEffect } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { Heart, Activity, Thermometer, Gauge, AlertTriangle, User, Loader2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { processService } from '@/modules/admin/services/processService';
import type { Flow } from '@/modules/admin/types/process.types';

type SidePanelTab = 'process' | 'info';

const VITALS = [
    { key: 'heartRate' as const, label: 'Nhịp tim', unit: 'bpm', Icon: Heart, color: '#EF4444' },
    { key: 'bloodPressure' as const, label: 'Huyết áp', unit: 'mmHg', Icon: Activity, color: '#3B82F6' },
    { key: 'temperature' as const, label: 'Nhiệt độ', unit: '°C', Icon: Thermometer, color: '#F59E0B' },
    { key: 'spO2' as const, label: 'SpO₂', unit: '%', Icon: Gauge, color: '#22C55E' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-bold text-[#8B7CF6] uppercase tracking-wider mb-2">
            {children}
        </p>
    );
}

interface LeftPanelProps {
    patient: Patient;
    isOpen: boolean;
}

export function LeftPatientPanel({ patient, isOpen }: LeftPanelProps) {
    const [tab, setTab] = useState<SidePanelTab>('process'); // Default to 'process' as requested
    const { accessToken } = useAuthStore();

    const [flowData, setFlowData] = useState<Flow | null>(null);
    const [isLoadingFlow, setIsLoadingFlow] = useState(false);

    // Fetch patient flow dynamically if flowId or stepId exists
    useEffect(() => {
        if (!accessToken || tab !== 'process') return;
        if (!patient.flowId && !patient.stepId) return;

        const fetchPatientFlow = async () => {
            try {
                setIsLoadingFlow(true);
                let response = null;

                // 1. Try to fetch by flowId first
                if (patient.flowId) {
                    response = await processService.getFlowById(patient.flowId, accessToken);
                } 
                // 2. Fallback to fetch by stepId
                else if (patient.stepId) {
                    response = await processService.getFlowByStepId(patient.stepId, accessToken);
                }

                if (response && response.data) {
                    setFlowData(response.data);
                } else {
                    setFlowData(null);
                }
            } catch (err) {
                console.error('Failed to load patient flow:', err);
                setFlowData(null);
            } finally {
                setIsLoadingFlow(false);
            }
        };

        fetchPatientFlow();
    }, [patient.id, patient.flowId, patient.stepId, accessToken, tab]);

    return (
        <div
            className={cn(
                'relative flex flex-col shrink-0 transition-all duration-300 h-full overflow-hidden',
                isOpen ? 'w-77.5' : 'w-11'
            )}
        >
            {/* ── COLLAPSED STATE — icon strip only ── */}
            {!isOpen && (
                <div className="flex flex-col items-center gap-4 pt-12 px-2 bg-white rounded-[20px] border border-neutral-200/50 shadow-sm h-full">
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
                    <div className="px-5 pt-5 pb-4 shrink-0">
                        <h2 className="text-[18px] font-bold text-neutral-800 tracking-tight">PK. Nội tổng quát 1</h2>

                        {/* Tabs Switcher in a pill container */}
                        <div className="flex p-0.5 bg-[#E8E7F5]/80 rounded-full mt-3 border border-neutral-200/30 w-full">
                            {([
                                { id: 'process' as SidePanelTab, label: 'Quy trình' },
                                { id: 'info' as SidePanelTab, label: 'Thông tin chung' },
                            ]).map(({ id, label }) => (
                                <button
                                    key={id}
                                    onClick={() => setTab(id)}
                                    className={cn(
                                        'py-1.5 px-3 rounded-full text-[11px] font-bold transition-all duration-150 flex-1 text-center cursor-pointer',
                                        tab === id
                                            ? 'bg-[#C6B9FF] text-white shadow-sm'
                                            : 'text-[#7C7C8A] hover:text-[#8B7CF6]'
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable content container */}
                    <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
                        {/* ── Process tab ── */}
                        {tab === 'process' && (
                            <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4 space-y-1">
                                {isLoadingFlow ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-neutral-400 gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin text-[#8B7CF6]" />
                                        <span className="text-[11px] font-semibold">Đang tải quy trình...</span>
                                    </div>
                                ) : flowData && flowData.steps && flowData.steps.length > 0 ? (
                                    /* ── Render Dynamic Steps from API ── */
                                    flowData.steps.map((step, i) => {
                                        const statusUpper = step.step_status?.toUpperCase();
                                        const isFinished = statusUpper === 'FINISHED' || statusUpper === 'SUCCESS' || statusUpper === 'COMPLETED';
                                        const isRunning = statusUpper === 'RUNNING' || statusUpper === 'PROCESSING' || statusUpper === 'IN_PROGRESS';
                                        
                                        return (
                                            <div key={step.step_id} className="flex items-center gap-3 py-1.5">
                                                <div className={cn(
                                                    'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 border transition-all duration-200',
                                                    isFinished
                                                        ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                                                        : isRunning
                                                        ? 'bg-white border-[#8B7CF6] text-[#8B7CF6] ring-2 ring-[#8B7CF6]/20'
                                                        : 'bg-white border-[#DCDCDC] text-[#ADADAD]'
                                                )}>
                                                    {isFinished ? '✓' : i + 1}
                                                </div>
                                                <span className={cn(
                                                    'text-[12px] font-semibold transition-colors duration-200',
                                                    isFinished ? 'text-[#2D2D2D]' : isRunning ? 'text-[#8B7CF6] font-bold' : 'text-[#ADADAD]'
                                                )}>
                                                    {step.room_info?.room_name || step.room?.room_name || 'Khám bệnh'}
                                                </span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    /* ── Empty State (Only API data display) ── */
                                    <div className="flex flex-col items-center justify-center py-8 text-center text-neutral-400 gap-2">
                                        <ListTodo className="w-8 h-8 stroke-[1.5] text-neutral-300" />
                                        <p className="text-[11px] font-bold text-neutral-700">Không có quy trình khám</p>
                                        <p className="text-[10px] text-neutral-400 font-semibold leading-normal">
                                            Bệnh nhân này chưa được thiết lập quy trình khám bệnh.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Info tab ── */}
                        {tab === 'info' && (
                            <>
                                {/* 1. Avatar + Personal Info Card */}
                                <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#E8F1FF] text-[#1E78FF] flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5 text-[#1E78FF]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-bold text-neutral-800 leading-tight truncate">{patient.name}</p>
                                            <p className="text-[10px] text-neutral-400 font-semibold mt-1">Mã BN: {patient.code}</p>
                                        </div>
                                    </div>

                                    {/* Personal detail rows */}
                                    <div className="pt-3 border-t border-neutral-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-neutral-400 font-medium">Giới tính / Tuổi:</span>
                                            <span className="text-[11px] font-bold text-neutral-800">{patient.gender} - {patient.age} tuổi</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-neutral-400 font-medium">Bảo hiểm y tế:</span>
                                            {patient.insurance.hasInsurance ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#E8F9EE] text-[#10B981] px-2 py-0.5 rounded-full">
                                                    ✓ BHYT {patient.insurance.coverage}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-bold text-neutral-400">Không có</span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-neutral-400 font-medium">Đối tượng:</span>
                                            <span className="text-[11px] font-bold text-neutral-800">{patient.visitType}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Visit Reason Card */}
                                <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4">
                                    <SectionLabel>Lý do đến khám</SectionLabel>
                                    <p className="text-[12px] font-semibold text-neutral-800 leading-relaxed mt-1">{patient.visitReason}</p>
                                </div>

                                {/* 3. Allergies & Contraindications Card */}
                                {patient.allergies.length > 0 && (
                                    <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <AlertTriangle className="w-3.5 h-3.5 text-[#8B7CF6]" />
                                            <SectionLabel>Dị ứng &amp; chống chỉ định</SectionLabel>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {patient.allergies.map((a, i) => (
                                                <span key={i} className="text-[11px] font-semibold bg-[#EEEDFC] text-[#8B7CF6] border border-[#E0DCFB] px-3 py-1 rounded-full">
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 4. Medical History Card */}
                                {patient.medicalHistory.length > 0 && (
                                    <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4">
                                        <SectionLabel>Tiền sử</SectionLabel>
                                        <ul className="space-y-2 mt-2">
                                            {patient.medicalHistory.map((h, i) => (
                                                <li key={i} className="flex items-start gap-2 text-[12px] font-semibold text-neutral-800">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] shrink-0 mt-1.5" />
                                                    <span>{h}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* 5. Vitals Card */}
                                <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4">
                                    <SectionLabel>Sinh hiệu</SectionLabel>
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        {VITALS.map(({ key, label, unit, Icon, color }) => (
                                            <div
                                                key={key}
                                                className="bg-[#F8F9FA] rounded-[16px] p-3 border border-neutral-100/50 flex flex-col justify-between"
                                            >
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                                                    <span className="text-[10px] text-neutral-400 font-bold">{label}</span>
                                                </div>
                                                <div className="flex items-baseline gap-0.5 mt-auto">
                                                    <span className="text-[18px] font-extrabold text-neutral-800 leading-none">
                                                        {patient.vitals[key]}
                                                    </span>
                                                    <span className="text-[10px] text-neutral-400 font-semibold">{unit}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
