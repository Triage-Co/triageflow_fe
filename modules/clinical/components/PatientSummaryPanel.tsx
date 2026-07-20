'use client';

import type { Patient } from '@/modules/clinical/types/clinical.types';
import { Heart, Activity, Thermometer, Gauge } from 'lucide-react';

interface PatientSummaryPanelProps {
    patient: Patient;
}

// ── Clinic Header Card ──────────────────────────────────────────────────────
function ClinicHeaderCard() {
    return (
        <div className="bg-white border border-[#ECECEC] rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 shrink-0">
            <p className="text-[13px] font-semibold text-[#2D2D2D] mb-3">PK. Nội tổng quát 1</p>
            <div className="flex gap-2">
                <button className="flex-1 h-8 rounded-[10px] text-[12px] font-medium bg-white border border-[#ECECEC] text-[#7B7B7B] hover:bg-[#F5F2FF] hover:text-[#8B7CF6] transition-all duration-200">
                    Quay lại
                </button>
                <button className="flex-1 h-8 rounded-[10px] text-[12px] font-medium bg-[#8B7CF6] text-white hover:bg-[#7A6AF0] transition-all duration-200 shadow-sm">
                    Theo dõi
                </button>
            </div>
        </div>
    );
}

// ── Patient Profile Card ────────────────────────────────────────────────────
function PatientProfileCard({ patient }: { patient: Patient }) {
    const initials = patient.name.split(' ').pop()?.charAt(0) || 'BN';

    return (
        <div className="bg-white border border-[#ECECEC] rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 shrink-0">
            {/* Top row: avatar + name + BHYT */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-[#F5F2FF] flex items-center justify-center text-[#8B7CF6] font-bold text-lg shrink-0 border-2 border-[#8B7CF6]/20">
                        {initials}
                    </div>
                    <div>
                        <h3 className="text-[13px] font-semibold text-[#2D2D2D] leading-tight">{patient.name}</h3>
                        <p className="text-[12px] text-[#7B7B7B] mt-0.5">Mã: {patient.code}</p>
                        <p className="text-[12px] text-[#7B7B7B]">{patient.age} tuổi | {patient.gender}</p>
                    </div>
                </div>
                {patient.insurance.hasInsurance && (
                    <span className="text-[11px] font-semibold bg-[#F5F2FF] text-[#8B7CF6] px-2.5 py-1 rounded-full border border-[#8B7CF6]/20 shrink-0">
                        BHYT
                    </span>
                )}
            </div>

            {/* Stats grid */}
            <div className="mt-3 pt-3 border-t border-[#ECECEC] grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                    <p className="text-[11px] text-[#7B7B7B]">Mã BN</p>
                    <p className="text-[12px] font-semibold text-[#2D2D2D]">{patient.code}</p>
                </div>
                <div>
                    <p className="text-[11px] text-[#7B7B7B]">Lịch hẹn</p>
                    <p className="text-[12px] font-semibold text-[#2D2D2D]">{patient.time}</p>
                </div>
                <div>
                    <p className="text-[11px] text-[#7B7B7B]">Loại khám</p>
                    <p className="text-[12px] font-semibold text-[#2D2D2D]">{patient.visitType}</p>
                </div>
                <div>
                    <p className="text-[11px] text-[#7B7B7B]">Bảo hiểm</p>
                    <p className="text-[12px] font-semibold text-[#2D2D2D]">
                        {patient.insurance.hasInsurance ? `Có (${patient.insurance.coverage})` : 'Không'}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ── Visit Reason Card ───────────────────────────────────────────────────────
function VisitReasonCard({ reason }: { reason: string }) {
    return (
        <div className="bg-white border border-[#ECECEC] rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 shrink-0">
            <h4 className="text-[11px] font-semibold text-[#7B7B7B] uppercase tracking-wider mb-2">Lý do đến khám</h4>
            <p className="text-[12px] text-[#2D2D2D] leading-relaxed">{reason}</p>
        </div>
    );
}

// ── Medical Alerts Card ─────────────────────────────────────────────────────
function MedicalAlertsCard({ allergies }: { allergies: string[] }) {
    if (allergies.length === 0) return null;
    return (
        <div className="bg-white border border-[#ECECEC] rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 shrink-0">
            <h4 className="text-[11px] font-semibold text-[#7B7B7B] uppercase tracking-wider mb-2.5">Cảnh báo dị ứng</h4>
            <div className="flex flex-wrap gap-1.5">
                {allergies.map((a, i) => (
                    <span
                        key={i}
                        className="text-[11px] font-medium bg-[#F5F2FF] text-[#8B7CF6] px-2.5 py-1 rounded-full border border-[#8B7CF6]/20"
                    >
                        {a}
                    </span>
                ))}
            </div>
        </div>
    );
}

// ── History Card ────────────────────────────────────────────────────────────
function HistoryCard({ history }: { history: string[] }) {
    return (
        <div className="bg-white border border-[#ECECEC] rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 shrink-0">
            <h4 className="text-[11px] font-semibold text-[#7B7B7B] uppercase tracking-wider mb-2.5">Tiểu sử</h4>
            <ul className="space-y-1.5">
                {history.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-[#2D2D2D]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] shrink-0 mt-1.5" />
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Vital Signs Card ────────────────────────────────────────────────────────
const VITAL_CONFIG = [
    { key: 'heartRate' as const, label: 'Nhịp tim', Icon: Heart, color: '#EF4444' },
    { key: 'bloodPressure' as const, label: 'Huyết áp', Icon: Activity, color: '#3B82F6' },
    { key: 'temperature' as const, label: 'Nhiệt độ', Icon: Thermometer, color: '#F59E0B' },
    { key: 'spO2' as const, label: 'SpO2', Icon: Gauge, color: '#22C55E' },
];

function VitalSignsCard({ vitals }: { vitals: Patient['vitals'] }) {
    return (
        <div className="bg-white border border-[#ECECEC] rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] p-4 shrink-0">
            <h4 className="text-[11px] font-semibold text-[#7B7B7B] uppercase tracking-wider mb-3">Sinh hiệu</h4>
            <div className="grid grid-cols-2 gap-4">
                {VITAL_CONFIG.map(({ key, label, Icon, color }) => (
                    <div key={key} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                            <span className="text-[11px] text-[#7B7B7B]">{label}</span>
                        </div>
                        <p className="text-[20px] font-bold text-[#2D2D2D] leading-none mt-1">
                            {vitals[key]}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Panel ─────────────────────────────────────────────────────────────
export function PatientSummaryPanel({ patient }: PatientSummaryPanelProps) {
    return (
        <div className="w-[320px] shrink-0 flex flex-col gap-4 overflow-y-auto overflow-x-hidden pb-4">
            <ClinicHeaderCard />
            <PatientProfileCard patient={patient} />
            <VisitReasonCard reason={patient.visitReason} />
            {patient.allergies.length > 0 && (
                <MedicalAlertsCard allergies={patient.allergies} />
            )}
            <HistoryCard history={patient.medicalHistory} />
            <VitalSignsCard vitals={patient.vitals} />
        </div>
    );
}
