'use client';

import { EMRWorkspaceLayout } from '@/shared/components/layout/EMRWorkspaceLayout';
import { Pill, Search, Clock, CheckCircle2 } from 'lucide-react';

export default function PharmacyPatientsPage() {
    const samplePatients = [
        { id: '1', stt: '01', name: 'Phạm Văn Mạnh', age: 30, gender: 'Nam', code: 'V-20240518-042', medCount: '3 loại thuốc (44 viên)', status: 'Chờ cấp phát' },
        { id: '2', stt: '02', name: 'Vũ Đức Tuấn', age: 31, gender: 'Nam', code: 'V-20240518-043', medCount: '2 loại thuốc (20 viên)', status: 'Đang soạn thuốc' },
        { id: '3', stt: '03', name: 'Đoàn Thị Kim Oanh', age: 29, gender: 'Nữ', code: 'V-20240518-044', medCount: '4 loại thuốc (60 viên)', status: 'Chờ cấp phát' },
    ];

    return (
        <EMRWorkspaceLayout activeTabId="pharmacy_patients" activeTabName="Danh Sách Dược Phẩm">
            <div className="flex-1 p-6 overflow-y-auto max-w-6xl mx-auto w-full">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[#2D2D2D]">Danh Sách Bệnh Nhân Cấp Phát Dược</h1>
                        <p className="text-sm text-neutral-500 mt-1">Quản lý và cấp phát đơn thuốc chỉ định</p>
                    </div>
                </div>

                <div className="bg-white rounded-[24px] border border-neutral-200/60 p-6 shadow-sm">
                    <div className="space-y-3">
                        {samplePatients.map((p) => (
                            <div key={p.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-[#8B7CF6] font-bold flex items-center justify-center">
                                        {p.stt}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-neutral-800 text-base">{p.name} <span className="text-xs font-normal text-neutral-500">({p.age}t • {p.gender})</span></h3>
                                        <p className="text-xs text-neutral-500 font-medium">Mã LK: {p.code} | {p.medCount}</p>
                                    </div>
                                </div>
                                <span className="px-3.5 py-1.5 rounded-xl bg-purple-50 text-[#8B7CF6] border border-purple-200 text-xs font-bold">
                                    {p.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </EMRWorkspaceLayout>
    );
}
