'use client';

import { useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { Search, Settings, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

type MedTab = 'kham-benh' | 'can-lam-sang' | 'chan-doan' | 'thu-thuat' | 'don-thuoc';

const MED_TABS: { id: MedTab; label: string }[] = [
    { id: 'kham-benh', label: 'Khám bệnh' },
    { id: 'can-lam-sang', label: 'Cận lâm sàng' },
    { id: 'chan-doan', label: 'Chẩn đoán & điều trị' },
    { id: 'thu-thuat', label: 'Thu thuật' },
    { id: 'don-thuoc', label: 'Đơn thuốc' },
];

function SectionCard({
    title,
    subtitle,
    onEdit,
    children,
    minH,
}: {
    title: string;
    subtitle?: string;
    onEdit?: () => void;
    children: React.ReactNode;
    minH?: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-[#EBEBEB] p-5">
            <div className="flex items-start justify-between mb-3">
                <div>
                    <h3 className="text-[13px] font-bold text-[#2D2D2D]">{title}</h3>
                    {subtitle && <p className="text-[11px] text-[#9C9C9C] mt-0.5">{subtitle}</p>}
                </div>
                {onEdit && (
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center text-[#ADADAD] hover:text-[#8B7CF6] hover:bg-[#F5F2FF] transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
            <div style={minH ? { minHeight: minH } : {}}>{children}</div>
        </div>
    );
}

function MedicalRecordContent({ patient }: { patient: Patient }) {
    const record = patient.medicalRecord;
    if (!record) return null;

    return (
        <div className="space-y-4">
            {/* Lý do khám */}
            <SectionCard title="Lý do khám" subtitle="Mô tả ngắn gọn triệu chứng chính">
                <p className="text-[13px] text-[#555] leading-relaxed">{record.visitReason}</p>
            </SectionCard>

            {/* Quá trình bệnh lý */}
            <SectionCard title="Quá trình bệnh lý và diễn biến lâm sàng" subtitle="Mô tả chi tiết diễn biến bệnh" minH="110px">
                {record.clinicalProgression ? (
                    <p className="text-[13px] text-[#555] leading-relaxed">{record.clinicalProgression}</p>
                ) : (
                    <p className="text-[13px] text-[#ADADAD] italic">Nhập quá trình bệnh lý...</p>
                )}
            </SectionCard>

            {/* Two-column: Tiểu sử & Khám lâm sàng */}
            <div className="grid grid-cols-2 gap-4">
                <SectionCard title="Tiểu sử bệnh" onEdit={() => {}}>
                    <ul className="space-y-1.5">
                        {record.medicalHistory.map((h, i) => (
                            <li key={i} className="flex items-start gap-2 text-[13px] text-[#555]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#8B7CF6] shrink-0 mt-1.5" />
                                {h}
                            </li>
                        ))}
                    </ul>
                </SectionCard>

                <SectionCard title="Khám lâm sàng" onEdit={() => {}}>
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
                </SectionCard>
            </div>
        </div>
    );
}

export function RightMedicalArea({ patient }: { patient: Patient }) {
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
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#ADADAD] hover:text-[#8B7CF6] hover:bg-[#F5F2FF] transition-colors shrink-0">
                    <Settings className="w-4 h-4" />
                </button>
            </div>

            {/* ── Toolbar tabs ── */}
            <div className="flex items-center gap-1 px-5 pt-3 pb-0 shrink-0">
                {MED_TABS.map(({ id, label }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg text-[12px] font-semibold transition-all duration-150 border border-transparent',
                                isActive
                                    ? 'bg-white text-[#8B7CF6] border-[#EBEBEB] border-b-white shadow-sm'
                                    : 'text-[#9C9C9C] hover:text-[#8B7CF6] hover:bg-white/60'
                            )}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
                {activeTab === 'kham-benh' && <MedicalRecordContent patient={patient} />}
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
