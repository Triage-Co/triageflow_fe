'use client';

import { useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { Dialog, DialogContent } from '@/shared/components/ui/Dialog';
import { Heart, Activity, Thermometer, Gauge, ChevronLeft, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PatientDrawerProps {
    patient: Patient | null;
    onClose: () => void;
}

type DrawerTab = 'process' | 'info';

// ── Inline info row ────────────────────────────────────────────────────────
function InfoRow({ label, value, valueClass = '' }: { label: string; value: React.ReactNode; valueClass?: string }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-[#F0EEF8] last:border-0">
            <span className="text-[12px] text-[#7B7B7B] font-medium">{label}</span>
            <span className={cn('text-[12px] font-semibold text-right', valueClass || 'text-[#2D2D2D]')}>
                {value}
            </span>
        </div>
    );
}

// ── Section heading ────────────────────────────────────────────────────────
function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <p className="text-[10px] font-bold text-[#7B7B7B] uppercase tracking-wider mb-2">
            {children}
        </p>
    );
}

// ── Vitals 2x2 grid ────────────────────────────────────────────────────────
const VITALS = [
    { key: 'heartRate' as const, label: 'Nhịp tim', unit: 'bpm', Icon: Heart, color: '#EF4444' },
    { key: 'bloodPressure' as const, label: 'Huyết áp', unit: 'mmHg', Icon: Activity, color: '#3B82F6' },
    { key: 'temperature' as const, label: 'Nhiệt độ', unit: '°C', Icon: Thermometer, color: '#F59E0B' },
    { key: 'spO2' as const, label: 'SpO₂', unit: '%', Icon: Gauge, color: '#22C55E' },
];

function VitalsGrid({ vitals }: { vitals: Patient['vitals'] }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {VITALS.map(({ key, label, unit, Icon, color }) => (
                <div key={key} className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                        <span className="text-[11px] text-[#7B7B7B] font-medium">{label}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-[22px] font-bold text-[#2D2D2D] leading-none">
                            {vitals[key]}
                        </span>
                        <span className="text-[10px] text-[#7B7B7B]">{unit}</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Process steps tab ──────────────────────────────────────────────────────
const PROCESS_STEPS = [
    { label: 'Tiếp nhận', key: 'done' },
    { label: 'Phân loại ưu tiên', key: 'done' },
    { label: 'Đo sinh hiệu', key: 'done' },
    { label: 'Chờ khám', key: 'waiting' },
    { label: 'Đang khám', key: 'pending' },
    { label: 'Thanh toán & Dược', key: 'pending' },
    { label: 'Hoàn tất', key: 'pending' },
];

function ProcessTab({ patient }: { patient: Patient }) {
    const steps = PROCESS_STEPS.map((s, i) => {
        let done = false;
        if (i <= 2) done = true;
        if (i === 3) done = patient.status !== 'Đang chờ';
        if (i === 4) done = patient.status === 'Đã khám';
        if (i >= 5) done = patient.status === 'Đã khám';
        return { ...s, done };
    });

    return (
        <div className="space-y-1">
            {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                    {/* Step indicator */}
                    <div
                        className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border-2',
                            step.done
                                ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                                : 'bg-white border-[#ECECEC] text-[#ADADAD]'
                        )}
                    >
                        {step.done ? '✓' : i + 1}
                    </div>
                    {/* Connector line */}
                    <div className="flex-1">
                        <span
                            className={cn(
                                'text-[13px] font-medium',
                                step.done ? 'text-[#2D2D2D]' : 'text-[#ADADAD]'
                            )}
                        >
                            {step.label}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Main Drawer ────────────────────────────────────────────────────────────
export function PatientDrawer({ patient, onClose }: PatientDrawerProps) {
    const [tab, setTab] = useState<DrawerTab>('info');

    return (
        <Dialog
            open={patient !== null}
            onOpenChange={(open) => { if (!open) onClose(); }}
        >
            <DialogContent
                position="right"
                className="w-full max-w-[380px] p-0 bg-white flex flex-col h-full overflow-hidden border-l border-[#ECECEC] shadow-2xl rounded-none"
            >
                {patient && (
                    <>
                        {/* ── Header ───────────────────────── */}
                        <div className="bg-white px-5 pt-5 pb-4 border-b border-[#F0EEF8] shrink-0">
                            <div className="flex items-center gap-2 mb-1">
                                <button
                                    onClick={onClose}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#7B7B7B] hover:bg-[#F5F2FF] hover:text-[#8B7CF6] transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <h2 className="text-[15px] font-bold text-[#2D2D2D]">
                                    PK. Nội tổng quát 1
                                </h2>
                            </div>

                            {/* Tab switcher */}
                            <div className="flex gap-1 mt-3">
                                {([
                                    { id: 'process' as DrawerTab, label: 'Quy trình' },
                                    { id: 'info' as DrawerTab, label: 'Thông tin chung' },
                                ] as const).map(({ id, label }) => (
                                    <button
                                        key={id}
                                        onClick={() => setTab(id)}
                                        className={cn(
                                            'px-4 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-150',
                                            tab === id
                                                ? 'bg-[#8B7CF6] text-white shadow-sm'
                                                : 'text-[#7B7B7B] hover:bg-[#F5F2FF] hover:text-[#8B7CF6]'
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Scrollable body ───────────────── */}
                        <div className="flex-1 overflow-y-auto">
                            {tab === 'process' && (
                                <div className="p-5">
                                    <ProcessTab patient={patient} />
                                </div>
                            )}

                            {tab === 'info' && (
                                <div className="p-5 space-y-5">
                                    {/* ── Patient profile ──────── */}
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-[#F5F2FF] flex items-center justify-center shrink-0 border-2 border-[#8B7CF6]/20">
                                            <span className="text-[#8B7CF6] font-bold text-base">
                                                {patient.name.split(' ').pop()?.charAt(0)}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-[14px] font-bold text-[#2D2D2D] leading-tight">{patient.name}</h3>
                                            <p className="text-[11px] text-[#7B7B7B] mt-0.5">Mã BN: {patient.code}</p>
                                        </div>
                                    </div>

                                    {/* ── Info rows ────────────── */}
                                    <div className="bg-[#FAFAFE] rounded-xl p-3 border border-[#F0EEF8]">
                                        <InfoRow
                                            label="Giới tính / Tuổi"
                                            value={`${patient.gender} - ${patient.age} tuổi`}
                                        />
                                        <InfoRow
                                            label="Bảo hiểm y tế"
                                            value={
                                                patient.insurance.hasInsurance ? (
                                                    <span className="text-[#22C55E] font-semibold">
                                                        BHYT {patient.insurance.coverage}
                                                    </span>
                                                ) : (
                                                    <span className="text-[#7B7B7B]">Không có</span>
                                                )
                                            }
                                        />
                                        <InfoRow
                                            label="Đối tượng"
                                            value={patient.visitType}
                                        />
                                    </div>

                                    {/* ── Lý do đến khám ───────── */}
                                    <div>
                                        <SectionHeading>Lý do đến khám</SectionHeading>
                                        <p className="text-[13px] text-[#2D2D2D] leading-relaxed">
                                            {patient.visitReason}
                                        </p>
                                    </div>

                                    {/* ── Dị ứng & chống chỉ định */}
                                    {patient.allergies.length > 0 && (
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-2">
                                                <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                                                <SectionHeading>Dị ứng &amp; chống chỉ định</SectionHeading>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {patient.allergies.map((a, i) => (
                                                    <span
                                                        key={i}
                                                        className="text-[11px] font-medium bg-[#FFF7ED] text-[#F59E0B] border border-[#FDE68A] px-2.5 py-0.5 rounded-full"
                                                    >
                                                        {a}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── Tiền sử ──────────────── */}
                                    {patient.medicalHistory.length > 0 && (
                                        <div>
                                            <SectionHeading>Tiền sử</SectionHeading>
                                            <ul className="space-y-1.5">
                                                {patient.medicalHistory.map((h, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-[13px] text-[#2D2D2D]">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] mt-1.5 shrink-0" />
                                                        {h}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* ── Sinh hiệu ────────────── */}
                                    <div>
                                        <SectionHeading>Sinh hiệu</SectionHeading>
                                        <VitalsGrid vitals={patient.vitals} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
