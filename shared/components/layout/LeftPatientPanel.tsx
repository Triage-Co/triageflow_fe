'use client';

import { useEffect, useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { Heart, Activity, Thermometer, Gauge, AlertTriangle, User, Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkflowDiagram } from '@/modules/clinical/components/WorkflowDiagram';
import { clinicalService } from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/store/authStore';

type SidePanelTab = 'process' | 'info';
type EditingField = 'visitReason' | 'medicalHistory' | 'vitals' | null;

interface VisitSessionData {
    visit_session_id?: string;
    patient_id?: string;
    visit_date?: string;
    chief_complaint?: string;
    heart_rate?: number;
    blood_pressure_sys?: number;
    blood_pressure_dia?: number;
    temperature?: number;
    spo2?: number;
    diagnosis?: string;
    final_diagnosis?: string;
    hpi?: string;
    pmh?: string;
    pe?: {
        heart?: string;
        lungs?: string;
        throat?: string;
    };
}

const VITALS_CONFIG = [
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
    const [tab, setTab] = useState<SidePanelTab>('info');
    const accessToken = useAuthStore((s) => s.accessToken);
    const [sessionData, setSessionData] = useState<VisitSessionData | null>(null);
    const [editingField, setEditingField] = useState<EditingField>(null);
    const [isSaving, setIsSaving] = useState(false);

    const initialPatientId = patient.patientId || (patient as unknown as Record<string, unknown>).patient_id as string | undefined;
    const patientQueueId = patient.id;

    // Edit state for each editable field
    const [editVisitReason, setEditVisitReason] = useState('');
    const [editMedicalHistory, setEditMedicalHistory] = useState('');
    const [editVitals, setEditVitals] = useState({
        heart_rate: '',
        blood_pressure_sys: '',
        blood_pressure_dia: '',
        temperature: '',
        spo2: '',
    });

    useEffect(() => {
        if (!accessToken) return;

        let isMounted = true;

        const fetchVisitSession = async () => {
            try {
                let resolvedPatientId = initialPatientId;

                if (!resolvedPatientId && patientQueueId) {
                    try {
                        const queueRes = await clinicalService.getPatientByQueueId(patientQueueId, accessToken) as unknown as Record<string, unknown>;
                        const queueData = (queueRes?.data || queueRes) as Record<string, unknown>;
                        const booking = queueData?.booking as Record<string, unknown> | undefined;
                        const patientObj = booking?.patient as Record<string, unknown> | undefined;
                        if (patientObj?.patient_id) {
                            resolvedPatientId = patientObj.patient_id as string;
                        }
                    } catch {
                        // ignore queue lookup error
                    }
                }

                const searchId = resolvedPatientId || patientQueueId;
                if (!searchId) return;

                const res = await clinicalService.getVisitSessionByPatientId(searchId, accessToken);
                const raw = res as unknown;

                let list: VisitSessionData[] = [];
                if (Array.isArray(raw)) {
                    list = raw as VisitSessionData[];
                } else if (raw && typeof raw === 'object') {
                    const rawObj = raw as Record<string, unknown>;
                    if (Array.isArray(rawObj.data)) {
                        list = rawObj.data as VisitSessionData[];
                    } else if (rawObj.data && typeof rawObj.data === 'object' && Array.isArray((rawObj.data as Record<string, unknown>).data)) {
                        list = (rawObj.data as Record<string, unknown>).data as VisitSessionData[];
                    }
                }

                if (isMounted && list.length > 0) {
                    const session = list[0];
                    setSessionData(session);
                    setEditVisitReason(session.chief_complaint || '');
                    setEditMedicalHistory(session.pmh || '');
                    setEditVitals({
                        heart_rate: session.heart_rate !== undefined ? String(session.heart_rate) : '',
                        blood_pressure_sys: session.blood_pressure_sys !== undefined ? String(session.blood_pressure_sys) : '',
                        blood_pressure_dia: session.blood_pressure_dia !== undefined ? String(session.blood_pressure_dia) : '',
                        temperature: session.temperature !== undefined ? String(session.temperature) : '',
                        spo2: session.spo2 !== undefined ? String(session.spo2) : '',
                    });
                }
            } catch (err) {
                console.error('Failed to fetch visit session for left panel:', err);
            }
        };

        fetchVisitSession();
        return () => {
            isMounted = false;
        };
    }, [initialPatientId, patientQueueId, accessToken]);

    const displayVisitReason = sessionData?.chief_complaint
        || (patient.visitReason && patient.visitReason !== 'Chưa có lý do khám từ hệ thống' ? patient.visitReason : '')
        || 'Chưa có lý do khám';

    const displayVitals = {
        heartRate: sessionData?.heart_rate !== undefined && sessionData?.heart_rate !== null ? sessionData.heart_rate : '—',
        bloodPressure: (sessionData?.blood_pressure_sys !== undefined && sessionData?.blood_pressure_dia !== undefined)
            ? `${sessionData.blood_pressure_sys}/${sessionData.blood_pressure_dia}`
            : '—',
        temperature: sessionData?.temperature !== undefined && sessionData?.temperature !== null ? sessionData.temperature : '—',
        spO2: sessionData?.spo2 !== undefined && sessionData?.spo2 !== null ? sessionData.spo2 : '—',
    };

    const displayHistory = sessionData?.pmh
        ? [sessionData.pmh]
        : (patient.medicalHistory && patient.medicalHistory.length > 0 ? patient.medicalHistory : []);

    const realAllergies = (patient.allergies || []).filter(
        (a) => a && !a.toLowerCase().includes('penicillin')
    );

    const handleSave = async (field: EditingField) => {
        if (!sessionData?.visit_session_id || !accessToken || !field) return;
        setIsSaving(true);
        try {
            let patchBody: Record<string, unknown> = {};

            if (field === 'visitReason') {
                patchBody = { chief_complaint: editVisitReason };
            } else if (field === 'medicalHistory') {
                patchBody = { pmh: editMedicalHistory.trim() };
            } else if (field === 'vitals') {
                patchBody = {
                    heart_rate: editVitals.heart_rate ? Number(editVitals.heart_rate) : undefined,
                    blood_pressure_sys: editVitals.blood_pressure_sys ? Number(editVitals.blood_pressure_sys) : undefined,
                    blood_pressure_dia: editVitals.blood_pressure_dia ? Number(editVitals.blood_pressure_dia) : undefined,
                    temperature: editVitals.temperature ? Number(editVitals.temperature) : undefined,
                    spo2: editVitals.spo2 ? Number(editVitals.spo2) : undefined,
                };
                Object.keys(patchBody).forEach((k) => patchBody[k] === undefined && delete patchBody[k]);
            }

            await clinicalService.updateVisitSession(sessionData.visit_session_id, patchBody, accessToken);

            setSessionData((prev) => {
                if (!prev) return prev;
                if (field === 'visitReason') return { ...prev, chief_complaint: editVisitReason };
                if (field === 'medicalHistory') return { ...prev, pmh: editMedicalHistory.trim() };
                if (field === 'vitals') return {
                    ...prev,
                    heart_rate: editVitals.heart_rate ? Number(editVitals.heart_rate) : prev.heart_rate,
                    blood_pressure_sys: editVitals.blood_pressure_sys ? Number(editVitals.blood_pressure_sys) : prev.blood_pressure_sys,
                    blood_pressure_dia: editVitals.blood_pressure_dia ? Number(editVitals.blood_pressure_dia) : prev.blood_pressure_dia,
                    temperature: editVitals.temperature ? Number(editVitals.temperature) : prev.temperature,
                    spo2: editVitals.spo2 ? Number(editVitals.spo2) : prev.spo2,
                };
                return prev;
            });
        } catch (err) {
            console.error('Failed to patch visit session from left panel:', err);
        } finally {
            setIsSaving(false);
            setEditingField(null);
        }
    };

    const handleCancel = (field: EditingField) => {
        if (field === 'visitReason') setEditVisitReason(sessionData?.chief_complaint || '');
        if (field === 'medicalHistory') setEditMedicalHistory(sessionData?.pmh || '');
        if (field === 'vitals') {
            setEditVitals({
                heart_rate: sessionData?.heart_rate !== undefined ? String(sessionData.heart_rate) : '',
                blood_pressure_sys: sessionData?.blood_pressure_sys !== undefined ? String(sessionData.blood_pressure_sys) : '',
                blood_pressure_dia: sessionData?.blood_pressure_dia !== undefined ? String(sessionData.blood_pressure_dia) : '',
                temperature: sessionData?.temperature !== undefined ? String(sessionData.temperature) : '',
                spo2: sessionData?.spo2 !== undefined ? String(sessionData.spo2) : '',
            });
        }
        setEditingField(null);
    };

    const EditActions = ({ field }: { field: EditingField }) => (
        <div className="flex gap-1">
            <button
                onClick={() => handleSave(field)}
                disabled={isSaving}
                className="w-6 h-6 rounded-md flex items-center justify-center bg-[#8B7CF6] text-white hover:bg-[#7a6ae5] transition-colors cursor-pointer disabled:opacity-50"
            >
                <Check className="w-3 h-3" />
            </button>
            <button
                onClick={() => handleCancel(field)}
                disabled={isSaving}
                className="w-6 h-6 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer disabled:opacity-50"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );

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

                        {/* Tabs Switcher */}
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

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
                        {/* ── Process tab ── */}
                        {tab === 'process' && (
                            <WorkflowDiagram patientId={patient.patientId || patient.id} />
                        )}

                        {/* ── Info tab ── */}
                        {tab === 'info' && (
                            <>
                                {/* 1. Avatar + Personal Info Card */}
                                <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-[#E8F1FF] flex items-center justify-center shrink-0">
                                            <User className="w-5 h-5 text-[#1E78FF]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[14px] font-bold text-neutral-800 leading-tight truncate">{patient.name}</p>
                                            <p className="text-[10px] text-neutral-400 font-semibold mt-1">Mã BN: {patient.patientId || '—'}</p>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-neutral-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-neutral-400 font-medium">Giới tính / Tuổi:</span>
                                            <span className="text-[11px] font-bold text-neutral-800">{patient.gender} - {patient.age} tuổi</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-neutral-400 font-medium">CCCD:</span>
                                            <span className="text-[11px] font-bold text-neutral-800">{patient.code || '—'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] text-neutral-400 font-medium">Bảo hiểm y tế:</span>
                                            {patient.insurance.hasInsurance ? (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#E8F9EE] text-[#10B981] px-2 py-0.5 rounded-full">
                                                    {patient.insurance.coverage}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-bold text-neutral-400">Không có</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Visit Reason Card */}
                                <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <SectionLabel>Lý do đến khám</SectionLabel>
                                        {sessionData?.visit_session_id && editingField !== 'visitReason' && (
                                            <button
                                                onClick={() => { setEditVisitReason(sessionData?.chief_complaint || displayVisitReason); setEditingField('visitReason'); }}
                                                className="w-5 h-5 flex items-center justify-center text-neutral-300 hover:text-[#8B7CF6] transition-colors cursor-pointer"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                        {editingField === 'visitReason' && <EditActions field="visitReason" />}
                                    </div>
                                    {editingField === 'visitReason' ? (
                                        <textarea
                                            value={editVisitReason}
                                            onChange={(e) => setEditVisitReason(e.target.value)}
                                            className="w-full text-[12px] text-neutral-800 border border-neutral-200 rounded-lg p-2 focus:border-[#8B7CF6] outline-none min-h-16 resize-none"
                                        />
                                    ) : (
                                        <p className="text-[12px] font-semibold text-neutral-800 leading-relaxed">{displayVisitReason}</p>
                                    )}
                                </div>

                                {/* 3. Allergies Card */}
                                {realAllergies.length > 0 && (
                                    <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <AlertTriangle className="w-3.5 h-3.5 text-[#8B7CF6]" />
                                            <SectionLabel>Dị ứng &amp; chống chỉ định</SectionLabel>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {realAllergies.map((a, i) => (
                                                <span key={i} className="text-[11px] font-semibold bg-[#EEEDFC] text-[#8B7CF6] border border-[#E0DCFB] px-3 py-1 rounded-full">
                                                    {a}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 5. Vitals Card */}

                                <div className="bg-neutral-50/70 border border-neutral-100 rounded-[16px] p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <SectionLabel>Sinh hiệu</SectionLabel>
                                        {sessionData?.visit_session_id && editingField !== 'vitals' && (
                                            <button
                                                onClick={() => setEditingField('vitals')}
                                                className="w-5 h-5 flex items-center justify-center text-neutral-300 hover:text-[#8B7CF6] transition-colors cursor-pointer"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                        )}
                                        {editingField === 'vitals' && <EditActions field="vitals" />}
                                    </div>

                                    {editingField === 'vitals' ? (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {[
                                                { key: 'heart_rate', label: 'Nhịp tim', placeholder: 'bpm', Icon: Heart, color: '#EF4444' },
                                                { key: 'temperature', label: 'Nhiệt độ', placeholder: '°C', Icon: Thermometer, color: '#F59E0B' },
                                                { key: 'blood_pressure_sys', label: 'HA tâm thu', placeholder: 'mmHg', Icon: Activity, color: '#3B82F6' },
                                                { key: 'blood_pressure_dia', label: 'HA tâm trương', placeholder: 'mmHg', Icon: Activity, color: '#3B82F6' },
                                                { key: 'spo2', label: 'SpO₂', placeholder: '%', Icon: Gauge, color: '#22C55E' },
                                            ].map(({ key, label, placeholder, Icon, color }) => (
                                                <div key={key} className="space-y-1">
                                                    <div className="flex items-center gap-1">
                                                        <Icon className="w-3 h-3" style={{ color }} />
                                                        <label className="text-[10px] text-neutral-400 font-bold">{label}</label>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={editVitals[key as keyof typeof editVitals]}
                                                        onChange={(e) => setEditVitals((prev) => ({ ...prev, [key]: e.target.value }))}
                                                        placeholder={placeholder}
                                                        className="w-full text-[12px] text-neutral-800 border border-neutral-200 rounded-lg px-2 py-1.5 focus:border-[#8B7CF6] outline-none"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3 mt-2">
                                            {VITALS_CONFIG.map(({ key, label, unit, Icon, color }) => (
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
                                                            {displayVitals[key]}
                                                        </span>
                                                        <span className="text-[10px] text-neutral-400 font-semibold">{unit}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
