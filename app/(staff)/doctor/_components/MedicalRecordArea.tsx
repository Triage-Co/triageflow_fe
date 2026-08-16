'use client';

import { useState } from 'react';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { ActionToolbar, type ToolbarTab } from './ActionToolbar';
import { MedicalSection } from './MedicalSection';

interface MedicalRecordAreaProps {
    patient: Patient;
}

function ExamTab({ patient }: { patient: Patient }) {
    const record = patient.medicalRecord;
    if (!record) return null;

    return (
        <div className="space-y-4">
            {/* Lý do khám */}
            <MedicalSection title="Lý do khám" onEdit={() => {}}>
                <p className="text-[#7B7B7B]">{record.visitReason || patient.visitReason}</p>
            </MedicalSection>

            {/* Quá trình bệnh lý */}
            <MedicalSection title="Quá trình bệnh lý và diễn biến lâm sàng" minHeight="180px" onEdit={() => {}}>
                {record.clinicalProgression ? (
                    <p className="text-[#7B7B7B] whitespace-pre-line">{record.clinicalProgression}</p>
                ) : (
                    <p className="text-[#ADADAD] italic text-[12px]">Nhập quá trình bệnh lý...</p>
                )}
            </MedicalSection>

            {/* Bottom two-column grid */}
            <div className="grid grid-cols-2 gap-4">
                {/* Tiểu sử bệnh */}
                <MedicalSection title="Tiểu sử bệnh" onEdit={() => {}}>
                    <ul className="space-y-1.5">
                        {record.medicalHistory.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-[#7B7B7B]">
                                <span className="w-1 h-1 rounded-full bg-[#8B7CF6] shrink-0 mt-2" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </MedicalSection>

                {/* Khám lâm sàng */}
                <MedicalSection title="Khám lâm sàng" onEdit={() => {}}>
                    <div className="space-y-2">
                        <div>
                            <span className="text-[12px] font-medium text-[#2D2D2D]">Phổi: </span>
                            <span className="text-[#7B7B7B]">{record.physicalExam.lungs}</span>
                        </div>
                        <div>
                            <span className="text-[12px] font-medium text-[#2D2D2D]">Tim: </span>
                            <span className="text-[#7B7B7B]">{record.physicalExam.heart}</span>
                        </div>
                        <div>
                            <span className="text-[12px] font-medium text-[#2D2D2D]">Tiêu hóa: </span>
                            <span className="text-[#7B7B7B]">{record.physicalExam.abdomen}</span>
                        </div>
                    </div>
                </MedicalSection>
            </div>
        </div>
    );
}

function PlaceholderTab({ label }: { label: string }) {
    return (
        <div className="flex items-center justify-center h-64 bg-white border border-[#ECECEC] rounded-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="text-center">
                <p className="text-[14px] font-medium text-[#7B7B7B]">{label}</p>
                <p className="text-[12px] text-[#ADADAD] mt-1">Chưa có dữ liệu</p>
            </div>
        </div>
    );
}

export function MedicalRecordArea({ patient }: MedicalRecordAreaProps) {
    const [activeTab, setActiveTab] = useState<ToolbarTab>('kham-benh');

    return (
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pb-4 min-w-0">
            {/* Patient Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h1 className="text-[22px] font-bold text-[#2D2D2D] leading-tight">{patient.name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[12px] font-semibold bg-[#E8F8EC] text-[#22C55E] px-2.5 py-0.5 rounded-full">
                            {patient.department?.toUpperCase() || 'NỘI KHOA'}
                        </span>
                        <span className="text-[12px] text-[#7B7B7B]">
                            {patient.age} tuổi • {patient.gender} • Mã: {patient.code}
                        </span>
                    </div>
                </div>

                {/* Quick Search placeholder */}
                <div className="flex items-center gap-2 bg-white border border-[#ECECEC] rounded-xl px-3 py-2 text-[12px] text-[#ADADAD] w-48">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Tìm thông tin...
                </div>
            </div>

            {/* Action Toolbar */}
            <ActionToolbar activeTab={activeTab} onTabChange={setActiveTab} />

            {/* Tab Content */}
            {activeTab === 'kham-benh' && <ExamTab patient={patient} />}
            {activeTab === 'can-lam-sang' && <PlaceholderTab label="Cận lâm sàng" />}
            {activeTab === 'chan-doan' && <PlaceholderTab label="Chẩn đoán điều trị" />}
            {activeTab === 'thu-thuoc' && <PlaceholderTab label="Thu thuốc" />}
            {activeTab === 'don-thuoc' && <PlaceholderTab label="Đơn thuốc" />}
        </div>
    );
}
