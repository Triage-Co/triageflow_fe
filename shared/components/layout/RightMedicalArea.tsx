'use client';

import { useEffect, useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import {
    Pencil,
    Stethoscope,
    Microscope,
    ClipboardList,
    Syringe,
    Pill,
    CheckCircle2,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    clinicalService,
    completeExamStepIfInProgress,
} from '@/modules/clinical/services/clinicalService';
import { useAuthStore } from '@/store/authStore';
import { ParaclinicalOrdersTab } from '@/modules/clinical/components/ParaclinicalOrdersTab';
import { EmrPrescriptionTab } from '@/modules/clinical/components/EmrPrescriptionTab';
import { physicalExamEntries } from '@/modules/clinical/utils/physicalExam';
import { isClinicalEmrReadOnly } from '@/modules/clinical/utils/appointmentDate';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/components/ui/Dialog';

type MedTab = 'kham-benh' | 'can-lam-sang' | 'chan-doan' | 'thu-thuat' | 'don-thuoc';
type EditingSection = 'visitReason' | 'clinicalProgression' | 'medicalHistory' | 'physicalExam' | null;

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
    pe?: Record<string, string>;
}

const MED_TABS: { id: MedTab; label: string; icon: React.ElementType }[] = [
    { id: 'kham-benh', label: 'Khám bệnh', icon: Stethoscope },
    { id: 'can-lam-sang', label: 'Cận lâm sàng', icon: Microscope },
    { id: 'chan-doan', label: 'Chẩn đoán & điều trị', icon: ClipboardList },
    { id: 'thu-thuat', label: 'Thủ thuật', icon: Syringe },
    { id: 'don-thuoc', label: 'Đơn thuốc', icon: Pill },
];

interface SectionCardProps {
    title: string;
    subtitle?: string;
    onEdit?: () => void;
    children: React.ReactNode;
    minH?: string;
}

function SectionCard({
    title,
    subtitle,
    onEdit,
    children,
    minH,
}: SectionCardProps) {
    return (
        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="text-[13px] font-bold text-[#2D2D2D]">{title}</h3>
                    {subtitle && <p className="text-[11px] text-[#9C9C9C] mt-0.5">{subtitle}</p>}
                </div>
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#ADADAD] hover:text-[#8B7CF6] hover:bg-[#F5F2FF] transition-colors cursor-pointer"
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            <div style={minH ? { minHeight: minH } : {}}>{children}</div>
        </div>
    );
}

interface MedicalRecordContentProps {
    patient: Patient;
    onUpdatePatient: (updated: Patient) => void;
}

function MedicalRecordContent({ patient, onUpdatePatient }: MedicalRecordContentProps) {
    const record = patient.medicalRecord;
    const user = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);
    const isReadOnly = isClinicalEmrReadOnly(user?.role, patient.appointmentDate);
    const [sessionData, setSessionData] = useState<VisitSessionData | null>(null);

    const initialPatientId = patient.patientId || (patient as unknown as Record<string, unknown>).patient_id as string | undefined;
    const patientQueueId = patient.id;

    const [editingSection, setEditingSection] = useState<EditingSection>(null);

    // Edit fields states
    const [editVisitReason, setEditVisitReason] = useState(record?.visitReason || '');
    const [editClinicalProgression, setEditClinicalProgression] = useState(record?.clinicalProgression || '');
    const [editMedicalHistory, setEditMedicalHistory] = useState(record?.medicalHistory.join('\n') || '');
    // Dynamic physical exam rows: [{id, label, value}]
    const [editPhysicalExamRows, setEditPhysicalExamRows] = useState<{ id: string; label: string; value: string }[]>([]);

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
                        // queue lookup failed — handled below
                    }
                }

                if (!resolvedPatientId) return;

                const res = await clinicalService.getVisitSessionByPatientId(resolvedPatientId, accessToken);
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
                    if (session.chief_complaint) setEditVisitReason(session.chief_complaint);
                    if (session.hpi) setEditClinicalProgression(session.hpi);
                    if (session.pmh) setEditMedicalHistory(session.pmh);
                    if (session.pe) {
                        setEditPhysicalExamRows(
                            physicalExamEntries(session.pe).map((r, idx) => ({
                                id: `pe-${idx}`,
                                label: r.label,
                                value: r.value,
                            }))
                        );
                    }
                }
            } catch (err) {
                console.error('Failed to fetch visit session for right area:', err);
            }
        };

        fetchVisitSession();
        return () => {
            isMounted = false;
        };
    }, [initialPatientId, patientQueueId, accessToken, record]);

    if (!record) return null;

    const displayVisitReason = sessionData?.chief_complaint || record.visitReason;
    const displayClinicalProgression = sessionData?.hpi || record.clinicalProgression;
    const displayMedicalHistory = sessionData?.pmh
        ? [sessionData.pmh]
        : (record.medicalHistory && record.medicalHistory.length > 0 ? record.medicalHistory : []);

    const displayPhysicalExamRows = sessionData?.pe
        ? physicalExamEntries(sessionData.pe)
        : physicalExamEntries(record.physicalExam);

    const handleSave = async (section: EditingSection) => {
        if (!patient.medicalRecord) return;
        const updatedRecord = { ...patient.medicalRecord };

        if (section === 'visitReason') {
            updatedRecord.visitReason = editVisitReason;
        } else if (section === 'clinicalProgression') {
            updatedRecord.clinicalProgression = editClinicalProgression;
        } else if (section === 'medicalHistory') {
            updatedRecord.medicalHistory = editMedicalHistory
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => line.length > 0);
        } else if (section === 'physicalExam') {
            const peObj = editPhysicalExamRows.reduce<Record<string, string>>((acc, row) => {
                if (row.label.trim()) acc[row.label.trim()] = row.value;
                return acc;
            }, {});
            updatedRecord.physicalExam = peObj;
        }

        // Trigger updates in parent state
        onUpdatePatient({
            ...patient,
            visitReason: section === 'visitReason' ? editVisitReason : patient.visitReason,
            medicalHistory: section === 'medicalHistory' ? updatedRecord.medicalHistory : patient.medicalHistory,
            medicalRecord: updatedRecord,
        });

        // Call PATCH API to persist the changes
        if (sessionData?.visit_session_id && accessToken) {
            try {
                let patchBody: Record<string, unknown> = {};

                if (section === 'visitReason') {
                    patchBody = { chief_complaint: editVisitReason };
                } else if (section === 'clinicalProgression') {
                    patchBody = { hpi: editClinicalProgression };
                } else if (section === 'medicalHistory') {
                    patchBody = { pmh: editMedicalHistory.trim() };
                } else if (section === 'physicalExam') {
                    const peObj = editPhysicalExamRows.reduce<Record<string, string>>((acc, row) => {
                        if (row.label.trim()) acc[row.label.trim()] = row.value;
                        return acc;
                    }, {});
                    patchBody = { pe: peObj };
                }

                await clinicalService.updateVisitSession(
                    sessionData.visit_session_id,
                    patchBody,
                    accessToken,
                );

                // Update local session data after successful patch
                setSessionData((prev) => {
                    if (!prev) return prev;
                    if (section === 'visitReason') return { ...prev, chief_complaint: editVisitReason };
                    if (section === 'clinicalProgression') return { ...prev, hpi: editClinicalProgression };
                    if (section === 'medicalHistory') return { ...prev, pmh: editMedicalHistory.trim() };
                    if (section === 'physicalExam') {
                        const peObj = editPhysicalExamRows.reduce<Record<string, string>>((acc, row) => {
                            if (row.label.trim()) acc[row.label.trim()] = row.value;
                            return acc;
                        }, {});
                        return { ...prev, pe: peObj };
                    }
                    return prev;
                });
            } catch (err) {
                console.error('Failed to update visit session:', err);
            }
        }

        setEditingSection(null);
    };

    const handleCancel = (section: EditingSection) => {
        if (section === 'visitReason') setEditVisitReason(displayVisitReason);
        else if (section === 'clinicalProgression') setEditClinicalProgression(displayClinicalProgression || '');
        else if (section === 'medicalHistory') setEditMedicalHistory(displayMedicalHistory.join('\n'));
        else if (section === 'physicalExam') {
            setEditPhysicalExamRows(
                displayPhysicalExamRows.map((r, idx) => ({ id: `pe-${idx}`, label: r.label, value: r.value }))
            );
        }
        setEditingSection(null);
    };

    return (
        <div className="space-y-4">
            {/* Lý do khám */}
            <SectionCard
                title="Lý do đến khám"
                onEdit={!isReadOnly ? () => setEditingSection('visitReason') : undefined}
            >
                {editingSection === 'visitReason' ? (
                    <div className="space-y-3">
                        <textarea
                            value={editVisitReason}
                            onChange={(e) => setEditVisitReason(e.target.value)}
                            className="w-full text-[13px] text-[#2D2D2D] border border-neutral-200 rounded-xl p-3 focus:border-[#8B7CF6] outline-none min-h-20"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => handleCancel('visitReason')}
                                className="px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleSave('visitReason')}
                                className="px-3 py-1.5 text-xs font-semibold bg-[#8B7CF6] text-white hover:bg-[#7a6ae5] rounded-lg shadow-sm transition-colors cursor-pointer"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-[13px] text-[#555] leading-relaxed">{displayVisitReason}</p>
                )}
            </SectionCard>

            {/* Quá trình bệnh lý */}
            <SectionCard
                title="Quá trình bệnh lý và diễn biến lâm sàng"
                subtitle="Mô tả chi tiết diễn biến bệnh"
                minH="110px"
                onEdit={!isReadOnly ? () => setEditingSection('clinicalProgression') : undefined}
            >
                {editingSection === 'clinicalProgression' ? (
                    <div className="space-y-3">
                        <textarea
                            value={editClinicalProgression}
                            onChange={(e) => setEditClinicalProgression(e.target.value)}
                            placeholder="Nhập quá trình bệnh lý..."
                            className="w-full text-[13px] text-[#2D2D2D] border border-neutral-200 rounded-xl p-3 focus:border-[#8B7CF6] outline-none min-h-20"
                        />
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => handleCancel('clinicalProgression')}
                                className="px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => handleSave('clinicalProgression')}
                                className="px-3 py-1.5 text-xs font-semibold bg-[#8B7CF6] text-white hover:bg-[#7a6ae5] rounded-lg shadow-sm transition-colors cursor-pointer"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                ) : displayClinicalProgression ? (
                    <p className="text-[13px] text-[#555] leading-relaxed">{displayClinicalProgression}</p>
                ) : (
                    <p className="text-[13px] text-[#ADADAD] italic">Nhập quá trình bệnh lý...</p>
                )}
            </SectionCard>

            {/* Two-column: Tiểu sử & Khám lâm sàng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCard title="Tiểu sử bệnh" onEdit={!isReadOnly ? () => setEditingSection('medicalHistory') : undefined}>
                    {editingSection === 'medicalHistory' ? (
                        <div className="space-y-3">
                            <textarea
                                value={editMedicalHistory}
                                onChange={(e) => setEditMedicalHistory(e.target.value)}
                                placeholder="Nhập mỗi tiền sử trên một dòng..."
                                className="w-full text-[13px] text-[#2D2D2D] border border-neutral-200 rounded-xl p-3 focus:border-[#8B7CF6] outline-none min-h-20"
                            />
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => handleCancel('medicalHistory')}
                                    className="px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => handleSave('medicalHistory')}
                                    className="px-3 py-1.5 text-xs font-semibold bg-[#8B7CF6] text-white hover:bg-[#7a6ae5] rounded-lg shadow-sm transition-colors cursor-pointer"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    ) : displayMedicalHistory.length > 0 ? (
                        <ul className="space-y-1.5">
                            {displayMedicalHistory.map((h, i) => (
                                <li key={i} className="flex items-start gap-2 text-[13px] text-[#555]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] shrink-0 mt-1.5" />
                                    {h}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-[13px] text-[#ADADAD] italic">Chưa có tiền sử bệnh</p>
                    )}
                </SectionCard>

                <SectionCard
                    title="Khám lâm sàng"
                    onEdit={!isReadOnly ? () => {
                        setEditPhysicalExamRows(
                            displayPhysicalExamRows.length > 0
                                ? displayPhysicalExamRows.map((r, idx) => ({ id: `pe-${idx}`, label: r.label, value: r.value }))
                                : [{ id: 'pe-0', label: '', value: '' }]
                        );
                        setEditingSection('physicalExam');
                    } : undefined}
                >
                    {editingSection === 'physicalExam' ? (
                        <div className="space-y-3">
                            {/* Dynamic rows */}
                            <div className="space-y-2">
                                {editPhysicalExamRows.map((row, idx) => (
                                    <div key={row.id} className="flex gap-2 items-start">
                                        <input
                                            type="text"
                                            data-pe-label={row.id}
                                            value={row.label}
                                            onChange={(e) =>
                                                setEditPhysicalExamRows((prev) =>
                                                    prev.map((r) => r.id === row.id ? { ...r, label: e.target.value } : r)
                                                )
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    (document.querySelector(`[data-pe-value="${row.id}"]`) as HTMLInputElement)?.focus();
                                                }
                                            }}
                                            placeholder="Vị trí khám (VD: Họng, Phổi...)"
                                            className="w-28 shrink-0 text-xs text-[#2D2D2D] border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:border-[#8B7CF6] outline-none"
                                        />
                                        <input
                                            type="text"
                                            data-pe-value={row.id}
                                            value={row.value}
                                            onChange={(e) =>
                                                setEditPhysicalExamRows((prev) =>
                                                    prev.map((r) => r.id === row.id ? { ...r, value: e.target.value } : r)
                                                )
                                            }
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (idx < editPhysicalExamRows.length - 1) {
                                                        const nextRow = editPhysicalExamRows[idx + 1];
                                                        const target = nextRow.label
                                                            ? document.querySelector(`[data-pe-value="${nextRow.id}"]`)
                                                            : document.querySelector(`[data-pe-label="${nextRow.id}"]`);
                                                        (target as HTMLInputElement)?.focus();
                                                    } else {
                                                        const newId = `pe-${Date.now()}`;
                                                        setEditPhysicalExamRows((prev) => [
                                                            ...prev,
                                                            { id: newId, label: '', value: '' },
                                                        ]);
                                                        setTimeout(() => {
                                                            (document.querySelector(`[data-pe-label="${newId}"]`) as HTMLInputElement)?.focus();
                                                        }, 50);
                                                    }
                                                }
                                            }}
                                            placeholder="Kết quả khám..."
                                            className="flex-1 text-xs text-[#2D2D2D] border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:border-[#8B7CF6] outline-none"
                                        />
                                        <button
                                            onClick={() =>
                                                setEditPhysicalExamRows((prev) => prev.filter((r) => r.id !== row.id))
                                            }
                                            className="w-7 h-7 mt-0.5 shrink-0 flex items-center justify-center text-neutral-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                            title="Xóa dòng"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add row button */}
                            <button
                                onClick={() =>
                                    setEditPhysicalExamRows((prev) => [
                                        ...prev,
                                        { id: `pe-${Date.now()}`, label: '', value: '' },
                                    ])
                                }
                                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#8B7CF6] hover:text-[#7a6ae5] transition-colors cursor-pointer"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                Thêm vị trí khám
                            </button>

                            <div className="flex gap-2 justify-end pt-1">
                                <button
                                    onClick={() => handleCancel('physicalExam')}
                                    className="px-3 py-1.5 text-xs font-semibold text-neutral-500 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => handleSave('physicalExam')}
                                    className="px-3 py-1.5 text-xs font-semibold bg-[#8B7CF6] text-white hover:bg-[#7a6ae5] rounded-lg shadow-sm transition-colors cursor-pointer"
                                >
                                    Lưu
                                </button>
                            </div>
                        </div>
                    ) : displayPhysicalExamRows.length > 0 ? (
                        <div className="space-y-2">
                            {displayPhysicalExamRows.map((row, i) => (
                                <div key={i} className="flex gap-2 text-[13px]">
                                    <span className="text-[#9C9C9C] shrink-0 min-w-[72px]">{row.label}:</span>
                                    <span className="text-[#2D2D2D] font-medium">{row.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[13px] text-[#ADADAD] italic">Chưa có dữ liệu khám lâm sàng</p>
                    )}
                </SectionCard>
            </div>
        </div>
    );
}

function LabTestsTab({
    patient,
    onFlowChanged,
    refreshKey = 0,
}: {
    patient: Patient;
    onFlowChanged?: () => void;
    refreshKey?: number;
}) {
    return (
        <ParaclinicalOrdersTab
            patient={patient}
            serviceTypes={['DIAGNOSTIC_TEST']}
            refreshKey={refreshKey}
            onFlowChanged={onFlowChanged}
        />
    );
}

function DiagnosisTreatmentTab({ patient }: { patient: Patient }) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);
    const isReadOnly = isClinicalEmrReadOnly(user?.role, patient.appointmentDate);

    const initialPatientId =
        patient.patientId ||
        ((patient as unknown as Record<string, unknown>).patient_id as string | undefined);
    const patientQueueId = patient.id;

    const [sessionData, setSessionData] = useState<VisitSessionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editFinalDiagnosis, setEditFinalDiagnosis] = useState('');

    useEffect(() => {
        if (!accessToken) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;
        const fetchVisitSession = async () => {
            setIsLoading(true);
            setError(null);
            try {
                let resolvedPatientId = initialPatientId;

                if (!resolvedPatientId && patientQueueId) {
                    try {
                        const queueRes = (await clinicalService.getPatientByQueueId(
                            patientQueueId,
                            accessToken
                        )) as unknown as Record<string, unknown>;
                        const queueData = (queueRes?.data || queueRes) as Record<string, unknown>;
                        const booking = queueData?.booking as Record<string, unknown> | undefined;
                        const patientObj = booking?.patient as Record<string, unknown> | undefined;
                        if (patientObj?.patient_id) {
                            resolvedPatientId = patientObj.patient_id as string;
                        }
                    } catch {
                        // queue lookup failed — handled below
                    }
                }

                if (!resolvedPatientId) {
                    if (isMounted) {
                        setSessionData(null);
                        setError(
                            'Không xác định được mã bệnh nhân để tải chẩn đoán. Vui lòng mở lại hồ sơ từ hàng đợi.'
                        );
                        setIsLoading(false);
                    }
                    return;
                }

                const res = await clinicalService.getVisitSessionByPatientId(
                    resolvedPatientId,
                    accessToken
                );
                const raw = res as unknown;

                let list: VisitSessionData[] = [];
                if (Array.isArray(raw)) {
                    list = raw as VisitSessionData[];
                } else if (raw && typeof raw === 'object') {
                    const rawObj = raw as Record<string, unknown>;
                    if (Array.isArray(rawObj.data)) {
                        list = rawObj.data as VisitSessionData[];
                    } else if (
                        rawObj.data &&
                        typeof rawObj.data === 'object' &&
                        Array.isArray((rawObj.data as Record<string, unknown>).data)
                    ) {
                        list = (rawObj.data as Record<string, unknown>).data as VisitSessionData[];
                    }
                }

                if (isMounted && list.length > 0) {
                    const session = list[0];
                    setSessionData(session);
                    setEditFinalDiagnosis(session.final_diagnosis || '');
                }
            } catch (err) {
                console.error('Failed to fetch visit session for diagnosis tab:', err);
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Không thể tải phiên khám.');
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        void fetchVisitSession();
        return () => {
            isMounted = false;
        };
    }, [accessToken, initialPatientId, patientQueueId]);

    const finalDiagnosis = (sessionData?.final_diagnosis || '').trim();
    const canEdit = Boolean(sessionData?.visit_session_id) && !isReadOnly;

    const openEdit = () => {
        setEditFinalDiagnosis(finalDiagnosis);
        setError(null);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setEditFinalDiagnosis(finalDiagnosis);
        setError(null);
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!sessionData?.visit_session_id || !accessToken) {
            setError('Chưa có visit session để lưu chẩn đoán.');
            return;
        }
        const nextValue = editFinalDiagnosis.trim();
        setIsSaving(true);
        setError(null);
        try {
            await clinicalService.updateVisitSession(
                sessionData.visit_session_id,
                { final_diagnosis: nextValue || null },
                accessToken
            );
            setSessionData((prev) =>
                prev ? { ...prev, final_diagnosis: nextValue || undefined } : prev
            );
            setEditFinalDiagnosis(nextValue);
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to update final_diagnosis:', err);
            setError(err instanceof Error ? err.message : 'Không thể lưu chẩn đoán.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClear = async () => {
        if (!sessionData?.visit_session_id || !accessToken) return;
        setIsSaving(true);
        setError(null);
        try {
            await clinicalService.updateVisitSession(
                sessionData.visit_session_id,
                { final_diagnosis: null },
                accessToken
            );
            setSessionData((prev) =>
                prev ? { ...prev, final_diagnosis: undefined } : prev
            );
            setEditFinalDiagnosis('');
            setIsEditing(false);
        } catch (err) {
            console.error('Failed to clear final_diagnosis:', err);
            setError(err instanceof Error ? err.message : 'Không thể xóa chẩn đoán.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <SectionCard
                title="Chẩn đoán xác định"
                onEdit={canEdit && !isEditing && !isLoading ? openEdit : undefined}
            >
                {isLoading ? (
                    <p className="text-[12px] text-neutral-400 font-medium">Đang tải chẩn đoán…</p>
                ) : isEditing ? (
                    <div className="space-y-3">
                        <textarea
                            value={editFinalDiagnosis}
                            onChange={(e) => setEditFinalDiagnosis(e.target.value)}
                            rows={5}
                            placeholder="Nhập chẩn đoán xác định…"
                            className="w-full text-[13px] font-semibold text-[#2D2D2D] border border-neutral-200 rounded-xl px-3.5 py-3 focus:border-[#8B7CF6] outline-none resize-y min-h-[120px] bg-white"
                            disabled={isSaving}
                        />
                        {error ? (
                            <p className="text-[11px] text-red-600 font-semibold">{error}</p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={isSaving}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#8B7CF6] hover:bg-[#7a6ae5] disabled:opacity-50 transition-colors cursor-pointer"
                            >
                                {isSaving ? 'Đang lưu…' : 'Lưu'}
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={isSaving}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-neutral-600 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                                Hủy
                            </button>
                            {finalDiagnosis ? (
                                <button
                                    type="button"
                                    onClick={() => void handleClear()}
                                    disabled={isSaving}
                                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors cursor-pointer ml-auto"
                                >
                                    Xóa chẩn đoán
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : finalDiagnosis ? (
                    <div className="p-4 bg-[#F5F2FF] border border-[#8B7CF6]/10 rounded-2xl">
                        <p className="text-[13px] font-bold text-[#2D2D2D] whitespace-pre-wrap leading-relaxed">
                            {finalDiagnosis}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-[12px] text-neutral-400 font-medium">
                            {sessionData?.visit_session_id
                                ? 'Chưa có chẩn đoán xác định.'
                                : 'Chưa tìm thấy phiên khám để ghi chẩn đoán.'}
                        </p>
                        {error ? (
                            <p className="text-[11px] text-red-600 font-semibold">{error}</p>
                        ) : null}
                        {canEdit ? (
                            <button
                                type="button"
                                onClick={openEdit}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#8B7CF6] bg-[#F5F2FF] hover:bg-[#EDE8FF] border border-[#DED7FF] transition-colors cursor-pointer"
                            >
                                Thêm chẩn đoán
                            </button>
                        ) : null}
                    </div>
                )}
            </SectionCard>
        </div>
    );
}

function ProceduresTab({
    patient,
    onFlowChanged,
    refreshKey = 0,
}: {
    patient: Patient;
    onFlowChanged?: () => void;
    refreshKey?: number;
}) {
    return (
        <ParaclinicalOrdersTab
            patient={patient}
            serviceTypes={['PROCEDURE']}
            refreshKey={refreshKey}
            onFlowChanged={onFlowChanged}
        />
    );
}

function PrescriptionTab({
    patient,
    onFlowChanged,
    refreshKey = 0,
}: {
    patient: Patient;
    onFlowChanged?: () => void;
    refreshKey?: number;
}) {
    return (
        <EmrPrescriptionTab
            patient={patient}
            refreshKey={refreshKey}
            onFlowChanged={onFlowChanged}
        />
    );
}

interface RightMedicalAreaProps {
    patient: Patient;
    onUpdatePatient: (updated: Patient) => void;
    onFlowChanged?: () => void;
    flowRefreshKey?: number;
}

export function RightMedicalArea({
    patient,
    onUpdatePatient,
    onFlowChanged,
    flowRefreshKey = 0,
}: RightMedicalAreaProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const user = useAuthStore((s) => s.user);
    const isReadOnly = isClinicalEmrReadOnly(user?.role, patient.appointmentDate);
    const [activeTab, setActiveTab] = useState<MedTab>('kham-benh');
    const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
    const [isCompletingExam, setIsCompletingExam] = useState(false);
    const [completeExamError, setCompleteExamError] = useState<string | null>(null);

    const openCompleteExamDialog = () => {
        if (isReadOnly || !accessToken || isCompletingExam) return;
        setCompleteExamError(null);
        setIsCompleteDialogOpen(true);
    };

    const handleConfirmCompleteExam = async () => {
        if (isReadOnly || !accessToken || isCompletingExam) return;

        setIsCompletingExam(true);
        setCompleteExamError(null);
        try {
            const result = await completeExamStepIfInProgress(accessToken, {
                patientId: patient.patientId,
                flowId: patient.flowId,
                bookingId: patient.bookingId,
                queueId: patient.id,
            });
            if (result === 'not_found') {
                setCompleteExamError('Không tìm thấy bước Khám bệnh trên quy trình.');
                return;
            }
            if (result === 'need_call_next') {
                setCompleteExamError(
                    'Cần gọi bệnh nhân vào phòng (call-next) trước khi hoàn tất khám.',
                );
                return;
            }
            if (result === 'not_ready') {
                setCompleteExamError('Bước Khám bệnh không thể hoàn tất ở trạng thái hiện tại.');
                return;
            }
            onFlowChanged?.();
            setIsCompleteDialogOpen(false);
        } catch (err) {
            setCompleteExamError(
                err instanceof Error ? err.message : 'Không thể hoàn tất khám.'
            );
        } finally {
            setIsCompletingExam(false);
        }
    };

    const closeCompleteDialog = () => {
        if (isCompletingExam) return;
        setIsCompleteDialogOpen(false);
        setCompleteExamError(null);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {isReadOnly && user?.role === 'DOCTOR' ? (
                <div className="px-5 py-2 bg-[#F5F2FF] border-b border-[#E8E4FF] text-[11px] font-semibold text-[#6B5FD6] shrink-0">
                    Ca khám ngày tương lai — chỉ xem, không chỉnh sửa hồ sơ
                </div>
            ) : null}
            {/* ── Patient mini-header ── */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-[#EBEBEB] shrink-0">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#F5F2FF] border-2 border-[#8B7CF6]/20 flex items-center justify-center shrink-0 text-[#8B7CF6] font-bold text-sm">
                    {patient.name?.split(' ').pop()?.charAt(0) ?? '?'}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-[#2D2D2D]">{patient.name ?? 'Bệnh nhân'}</span>
                        {patient.insurance?.hasInsurance && (
                            <span className="text-[10px] font-bold text-[#22C55E] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                                {patient.insurance.coverage}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-[#9C9C9C] mt-0.5 truncate">
                        {[
                            patient.gender,
                            patient.age != null ? `${patient.age} tuổi` : null,
                            patient.code ? `CCCD: ${patient.code}` : null,
                            patient.visitType,
                            patient.shortDiagnosis,
                        ].filter(Boolean).join(' · ') || '—'}
                    </p>
                </div>
            </div>

            {/* ── Toolbar tabs + Hoàn tất khám ── */}
            <div className="px-5 pt-3 pb-1 shrink-0 overflow-x-auto">
                <div className="flex items-center gap-2 min-w-min">
                    <div className="inline-flex p-0.5 bg-[#E8E7F5]/60 rounded-full border border-neutral-200/30 gap-0.5">
                        {MED_TABS.map(({ id, label, icon: Icon }) => {
                            const isActive = activeTab === id;
                            return (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id)}
                                    className={cn(
                                        'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all duration-150 cursor-pointer whitespace-nowrap',
                                        isActive
                                            ? 'bg-white text-[#2D2D2D] shadow-sm'
                                            : 'text-[#7C7C8A] hover:text-[#8B7CF6]'
                                    )}
                                >
                                    <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-[#8B7CF6]" : "text-[#7C7C8A]")} />
                                    <span>{label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {!isReadOnly ? (
                        <button
                            type="button"
                            onClick={openCompleteExamDialog}
                            disabled={isCompletingExam || !accessToken}
                            className={cn(
                                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all duration-150 shrink-0',
                                'bg-[#22C55E] text-white hover:bg-[#16A34A] shadow-sm',
                                'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
                            )}
                        >
                            {isCompletingExam ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                            ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            )}
                            Hoàn tất khám
                        </button>
                    ) : null}
                </div>
            </div>

            <Dialog
                open={isCompleteDialogOpen}
                onOpenChange={(open) => {
                    if (!open) closeCompleteDialog();
                }}
            >
                <DialogContent className="sm:max-w-md" showCloseButton={!isCompletingExam}>
                    <DialogHeader>
                        <DialogTitle>Xác nhận hoàn tất khám</DialogTitle>
                        <DialogDescription>
                            Xác nhận hoàn tất khám cho bệnh nhân{' '}
                            <span className="font-semibold text-neutral-800">
                                {patient.name}
                            </span>
                            ?
                        </DialogDescription>
                    </DialogHeader>

                    {completeExamError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                            {completeExamError}
                        </div>
                    )}

                    <DialogFooter className="mt-6 gap-2 sm:gap-2">
                        <button
                            type="button"
                            onClick={closeCompleteDialog}
                            disabled={isCompletingExam}
                            className="px-4 py-2 rounded-xl bg-neutral-100 text-neutral-700 text-sm font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleConfirmCompleteExam()}
                            disabled={isCompletingExam || !accessToken}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#22C55E] text-white text-sm font-bold hover:bg-[#16A34A] transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {isCompletingExam && (
                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            )}
                            Xác nhận
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
                {activeTab === 'kham-benh' && (
                    <MedicalRecordContent key={patient.id} patient={patient} onUpdatePatient={onUpdatePatient} />
                )}
                {activeTab === 'can-lam-sang' && (
                    <LabTestsTab
                        patient={patient}
                        refreshKey={flowRefreshKey}
                        onFlowChanged={onFlowChanged}
                    />
                )}
                {activeTab === 'chan-doan' && (
                    <DiagnosisTreatmentTab key={patient.id} patient={patient} />
                )}
                {activeTab === 'thu-thuat' && (
                    <ProceduresTab
                        patient={patient}
                        refreshKey={flowRefreshKey}
                        onFlowChanged={onFlowChanged}
                    />
                )}
                {activeTab === 'don-thuoc' && (
                    <PrescriptionTab
                        patient={patient}
                        refreshKey={flowRefreshKey}
                        onFlowChanged={onFlowChanged}
                    />
                )}
            </div>
        </div>
    );
}
