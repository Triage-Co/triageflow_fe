'use client';

import { useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { 
    Search, 
    Settings, 
    Pencil,
    Stethoscope,
    Microscope,
    ClipboardList,
    Syringe,
    Pill
} from 'lucide-react';
import { cn } from '@/lib/utils';

type MedTab = 'kham-benh' | 'can-lam-sang' | 'chan-doan' | 'thu-thuat' | 'don-thuoc';
type EditingSection = 'visitReason' | 'clinicalProgression' | 'medicalHistory' | 'physicalExam' | null;

const MED_TABS: { id: MedTab; label: string; icon: React.ElementType }[] = [
    { id: 'kham-benh', label: 'Khám bệnh', icon: Stethoscope },
    { id: 'can-lam-sang', label: 'Cận lâm sàng', icon: Microscope },
    { id: 'chan-doan', label: 'Chẩn đoán & điều trị', icon: ClipboardList },
    { id: 'thu-thuat', label: 'Thu thuật', icon: Syringe },
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

    const [editingSection, setEditingSection] = useState<EditingSection>(null);

    // Edit fields states
    const [editVisitReason, setEditVisitReason] = useState(record?.visitReason || '');
    const [editClinicalProgression, setEditClinicalProgression] = useState(record?.clinicalProgression || '');
    const [editMedicalHistory, setEditMedicalHistory] = useState(record?.medicalHistory.join('\n') || '');
    const [editPhysicalExam, setEditPhysicalExam] = useState({
        throat: record?.physicalExam.throat || '',
        lungs: record?.physicalExam.lungs || '',
        heart: record?.physicalExam.heart || '',
        abdomen: record?.physicalExam.abdomen || '',
    });

    if (!record) return null;

    const handleSave = (section: EditingSection) => {
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
            updatedRecord.physicalExam = {
                throat: editPhysicalExam.throat,
                lungs: editPhysicalExam.lungs,
                heart: editPhysicalExam.heart,
                abdomen: editPhysicalExam.abdomen,
            };
        }

        // Trigger updates in parent state
        onUpdatePatient({
            ...patient,
            visitReason: section === 'visitReason' ? editVisitReason : patient.visitReason,
            medicalHistory: section === 'medicalHistory' ? updatedRecord.medicalHistory : patient.medicalHistory,
            medicalRecord: updatedRecord,
        });

        setEditingSection(null);
    };

    const handleCancel = (section: EditingSection) => {
        if (section === 'visitReason') setEditVisitReason(record.visitReason);
        else if (section === 'clinicalProgression') setEditClinicalProgression(record.clinicalProgression || '');
        else if (section === 'medicalHistory') setEditMedicalHistory(record.medicalHistory.join('\n'));
        else if (section === 'physicalExam') {
            setEditPhysicalExam({
                throat: record.physicalExam.throat || '',
                lungs: record.physicalExam.lungs || '',
                heart: record.physicalExam.heart || '',
                abdomen: record.physicalExam.abdomen || '',
            });
        }
        setEditingSection(null);
    };

    return (
        <div className="space-y-4">
            {/* Lý do khám */}
            <SectionCard 
                title="Lý do khám" 
                subtitle="Mô tả ngắn gọn triệu chứng chính" 
                onEdit={() => setEditingSection('visitReason')}
            >
                {editingSection === 'visitReason' ? (
                    <div className="space-y-3">
                        <textarea
                            value={editVisitReason}
                            onChange={(e) => setEditVisitReason(e.target.value)}
                            className="w-full text-[13px] text-[#2D2D2D] border border-neutral-200 rounded-xl p-3 focus:border-[#8B7CF6] outline-none min-h-[80px]"
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
                    <p className="text-[13px] text-[#555] leading-relaxed">{record.visitReason}</p>
                )}
            </SectionCard>

            {/* Quá trình bệnh lý */}
            <SectionCard 
                title="Quá trình bệnh lý và diễn biến lâm sàng" 
                subtitle="Mô tả chi tiết diễn biến bệnh" 
                minH="110px"
                onEdit={() => setEditingSection('clinicalProgression')}
            >
                {editingSection === 'clinicalProgression' ? (
                    <div className="space-y-3">
                        <textarea
                            value={editClinicalProgression}
                            onChange={(e) => setEditClinicalProgression(e.target.value)}
                            placeholder="Nhập quá trình bệnh lý..."
                            className="w-full text-[13px] text-[#2D2D2D] border border-neutral-200 rounded-xl p-3 focus:border-[#8B7CF6] outline-none min-h-[80px]"
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
                ) : record.clinicalProgression ? (
                    <p className="text-[13px] text-[#555] leading-relaxed">{record.clinicalProgression}</p>
                ) : (
                    <p className="text-[13px] text-[#ADADAD] italic">Nhập quá trình bệnh lý...</p>
                )}
            </SectionCard>

            {/* Two-column: Tiểu sử & Khám lâm sàng */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SectionCard title="Tiểu sử bệnh" onEdit={() => setEditingSection('medicalHistory')}>
                    {editingSection === 'medicalHistory' ? (
                        <div className="space-y-3">
                            <textarea
                                value={editMedicalHistory}
                                onChange={(e) => setEditMedicalHistory(e.target.value)}
                                placeholder="Nhập mỗi tiền sử trên một dòng..."
                                className="w-full text-[13px] text-[#2D2D2D] border border-neutral-200 rounded-xl p-3 focus:border-[#8B7CF6] outline-none min-h-[80px]"
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
                    ) : record.medicalHistory.length > 0 ? (
                        <ul className="space-y-1.5">
                            {record.medicalHistory.map((h, i) => (
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

                <SectionCard title="Khám lâm sàng" onEdit={() => setEditingSection('physicalExam')}>
                    {editingSection === 'physicalExam' ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { key: 'throat', label: 'Họng' },
                                    { key: 'lungs', label: 'Phổi' },
                                    { key: 'heart', label: 'Tim' },
                                    { key: 'abdomen', label: 'Bụng' },
                                ].map(({ key, label }) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-[11px] text-[#9C9C9C] font-semibold">{label}</label>
                                        <input
                                            type="text"
                                            value={editPhysicalExam[key as keyof typeof editPhysicalExam]}
                                            onChange={(e) =>
                                                setEditPhysicalExam((prev) => ({
                                                    ...prev,
                                                    [key]: e.target.value,
                                                }))
                                            }
                                            className="w-full text-xs text-[#2D2D2D] border border-neutral-200 rounded-lg px-2.5 py-1.5 focus:border-[#8B7CF6] outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2 justify-end">
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
                    ) : (
                        <div className="space-y-2">
                            {record.physicalExam.throat && (
                                <div className="flex gap-2 text-[13px]">
                                    <span className="text-[#9C9C9C] w-14 shrink-0">Họng:</span>
                                    <span className="text-[#2D2D2D] font-medium">{record.physicalExam.throat}</span>
                                </div>
                            )}
                            <div className="flex gap-2 text-[13px]">
                                <span className="text-[#9C9C9C] w-14 shrink-0">Phổi:</span>
                                <span className="text-[#2D2D2D] font-medium">{record.physicalExam.lungs}</span>
                            </div>
                            <div className="flex gap-2 text-[13px]">
                                <span className="text-[#9C9C9C] w-14 shrink-0">Tim:</span>
                                <span className="text-[#2D2D2D] font-medium">{record.physicalExam.heart}</span>
                            </div>
                            <div className="flex gap-2 text-[13px]">
                                <span className="text-[#9C9C9C] w-14 shrink-0">Bụng:</span>
                                <span className="text-[#2D2D2D] font-medium">{record.physicalExam.abdomen}</span>
                            </div>
                        </div>
                    )}
                </SectionCard>
            </div>
        </div>
    );
}

interface RightMedicalAreaProps {
    patient: Patient;
    onUpdatePatient: (updated: Patient) => void;
}

export function RightMedicalArea({ patient, onUpdatePatient }: RightMedicalAreaProps) {
    const [activeTab, setActiveTab] = useState<MedTab>('kham-benh');

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F8F8FB]">
            {/* ── Patient mini-header ── */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-[#EBEBEB] shrink-0">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#F5F2FF] border-2 border-[#8B7CF6]/20 flex items-center justify-center shrink-0 text-[#8B7CF6] font-bold text-sm">
                    {patient.name.split(' ').pop()?.charAt(0)}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-[#2D2D2D]">{patient.name}</span>
                        {patient.insurance.hasInsurance && (
                            <span className="text-[10px] font-bold text-[#22C55E] bg-[#F0FDF4] border border-[#BBF7D0] px-2 py-0.5 rounded-full">
                                BHYT {patient.insurance.coverage}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-[#9C9C9C] mt-0.5 truncate">
                        {patient.gender} · {patient.age} tuổi · Mã BN: {patient.code} · {patient.visitType}
                        {patient.shortDiagnosis && (
                            <span className="text-[#555] ml-2">· {patient.shortDiagnosis}</span>
                        )}
                    </p>
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 bg-[#F5F5F8] rounded-xl px-3 py-1.5 text-[12px] text-[#ADADAD] w-44 shrink-0">
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    Tìm trong hồ sơ...
                </div>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#ADADAD] hover:text-[#8B7CF6] hover:bg-[#F5F2FF] transition-colors shrink-0 cursor-pointer">
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            {/* ── Toolbar tabs ── */}
            <div className="flex items-center gap-2 px-5 pt-3 pb-1 shrink-0 overflow-x-auto">
                {MED_TABS.map(({ id, label, icon: Icon }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 text-[12px] font-semibold transition-all duration-150 rounded-full border cursor-pointer whitespace-nowrap',
                                isActive
                                    ? 'bg-white text-[#2D2D2D] border-[#EBEBEB] shadow-sm'
                                    : 'bg-transparent text-[#9C9C9C] border-transparent hover:text-[#8B7CF6] hover:bg-white/60'
                            )}
                        >
                            <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-[#8B7CF6]" : "text-[#9C9C9C]")} />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
                {activeTab === 'kham-benh' && (
                    <MedicalRecordContent key={patient.id} patient={patient} onUpdatePatient={onUpdatePatient} />
                )}
                {activeTab !== 'kham-benh' && (
                    <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-[#EBEBEB]">
                        <div className="text-center">
                            <p className="text-[13px] font-medium text-[#7B7B7B]">
                                {MED_TABS.find(t => t.id === activeTab)?.label}
                            </p>
                            <p className="text-[11px] text-[#ADADAD] mt-1">Chưa có dữ liệu</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
