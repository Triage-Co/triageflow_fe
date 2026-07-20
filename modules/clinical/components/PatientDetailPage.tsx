'use client';

import { useState } from 'react';
import {
    User,
    Shield,
    Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/modules/clinical/types/clinical.types';
import { DoctorHeader } from './DoctorHeader';
import { WorkflowDiagram } from './WorkflowDiagram';
import { ClinicalProcessPanel } from './ClinicalProcessPanel';

const MOCK_LAB_ORDERS = [
    { id: 'lab-1', name: 'Tổng phân tích tế bào máu', group: 'Huyết học', status: 'Chờ thực hiện' as const },
    { id: 'lab-2', name: 'X-quang ngực thẳng', group: 'Chẩn đoán hình ảnh', status: 'Chờ thực hiện' as const },
    { id: 'lab-3', name: 'Siêu âm bụng', group: 'Siêu âm', status: 'Chờ thực hiện' as const },
];

const MOCK_DIAGNOSIS = {
    code: 'J02.9',
    description: 'Đau hố chậu phải',
};

type DetailTab = 'info' | 'process';

interface PatientDetailPageProps {
    patient: Patient;
    clinicName?: string;
}

export function PatientDetailPage({
    patient,
    clinicName = 'PK. Nội tổng quát 1',
}: PatientDetailPageProps) {
    const [activeTab, setActiveTab] = useState<DetailTab>('process');

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

            <div className="px-6 py-3.5 border-b border-neutral-100 bg-white shrink-0">
                <h2 className="text-base font-bold text-neutral-800 tracking-tight">
                    {clinicName}
                </h2>
            </div>

            <div className="flex-1 overflow-hidden flex gap-6 px-6 py-6">
                {/* ── LEFT SIDEBAR ─── */}
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
                                <p className="text-xs text-neutral-400 font-medium mt-0.5">Mã BN: {patient.code}</p>
                                <div className="mt-3 space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-neutral-400">Giới tính / Tuổi</span>
                                        <span className="font-semibold text-neutral-700">{patient.gender} • {patient.age}</span>
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
                                        <span className="font-semibold text-neutral-700">{patient.visitType}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {tabToggle}

                    {activeTab === 'process' && <WorkflowDiagram />}
                </div>

                {/* ── RIGHT CONTENT ─── */}
                <div className="flex-1 overflow-y-auto min-w-0">
                    {activeTab === 'info' && (
                        <div className="space-y-5">
                            <div className="bg-white rounded-[20px] border border-neutral-100 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                                    Lý do khám
                                </p>
                                <p className="text-xs text-neutral-500 mb-2">Mô tả ngắn gọn trích chương chính</p>
                                <div className="bg-neutral-50 rounded-[12px] border border-neutral-100 p-3 text-sm text-neutral-700 leading-relaxed min-h-[60px]">
                                    {patient.visitReason}
                                </div>
                            </div>

                            <div className="bg-white rounded-[20px] border border-neutral-100 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                                    Quá trình bệnh lý và diễn biến làm sáng
                                </p>
                                <p className="text-xs text-neutral-500 mb-2">Mô tả tổi chi tiết diễn biến bệnh lý</p>
                                <div className="bg-neutral-50 rounded-[12px] border border-neutral-100 p-3 text-sm text-neutral-700 leading-relaxed min-h-[80px]">
                                    Nhập quá trình bệnh lý...
                                </div>
                            </div>

                            <div className="bg-white rounded-[20px] border border-neutral-100 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                                    Tiền sử bệnh
                                </p>
                                <div className="space-y-2">
                                    {patient.medicalHistory.map((item) => (
                                        <div key={item} className="flex items-start gap-2 text-sm text-neutral-700">
                                            <Circle className="w-1.5 h-1.5 mt-1.5 shrink-0 fill-blue-400 text-blue-400" />
                                            {item}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white rounded-[20px] border border-neutral-100 p-5">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                                    Khám lâm sàng
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Họng', value: 'Đỏ, có mủ' },
                                        { label: 'Phổi', value: 'Rõ, không ran' },
                                        { label: 'Tim', value: 'Đều, T1 T2 rõ' },
                                        { label: 'Bụng', value: 'Mềm, không đau' },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="bg-neutral-50 rounded-[12px] border border-neutral-100 p-3">
                                            <p className="text-xs text-neutral-400 font-medium">{label}</p>
                                            <p className="text-sm font-semibold text-neutral-700 mt-2">{value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'process' && (
                        <ClinicalProcessPanel
                            patient={patient}
                            labOrders={MOCK_LAB_ORDERS}
                            diagnosis={MOCK_DIAGNOSIS}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
