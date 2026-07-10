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

function LabTestsTab() {
    const labOrders = [
        {
            name: 'Tổng phân tích tế bào máu ngoại vi (24 chỉ số)',
            dept: 'Khoa Xét nghiệm - Phòng 102',
            status: 'completed',
            time: '08:07 08/07/2026',
            results: [
                { name: 'RBC (Hồng cầu)', value: '4.78', unit: 'T/L', range: '3.8 - 5.8', status: 'normal' },
                { name: 'WBC (Bạch cầu)', value: '8.4', unit: 'G/L', range: '4.0 - 10.0', status: 'normal' },
                { name: 'HGB (Huyết sắc tố)', value: '142', unit: 'g/L', range: '120 - 165', status: 'normal' },
                { name: 'PLT (Tiểu cầu)', value: '145', unit: 'G/L', range: '150 - 450', status: 'low' },
            ]
        },
        {
            name: 'Siêu âm ổ bụng tổng quát',
            dept: 'Khoa Chẩn đoán hình ảnh - Phòng Siêu âm 3',
            status: 'completed',
            time: '08:45 08/07/2026',
            summary: 'Gan nhiễm mỡ độ 1. Các cơ quan khác trong ổ bụng chưa thấy bất thường trên siêu âm.'
        },
        {
            name: 'Nội soi dạ dày tá tràng test HP',
            dept: 'Khoa Nội soi - Phòng Nội soi 2',
            status: 'pending',
            time: 'Yêu cầu lúc 09:15',
            summary: 'Bệnh nhân đang chuẩn bị làm nội soi dạ dày...'
        }
    ];

    return (
        <div className="space-y-4">
            {labOrders.map((order, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-[#EBEBEB] p-5 hover:shadow-[0_4px_20px_rgba(0,0,0,0.01)] transition-shadow">
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                        <div>
                            <h4 className="text-[13px] font-bold text-[#2D2D2D]">{order.name}</h4>
                            <p className="text-[11px] text-[#9C9C9C] mt-0.5">{order.dept} · {order.time}</p>
                        </div>
                        <span className={cn(
                            "text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider",
                            order.status === 'completed'
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                        )}>
                            {order.status === 'completed' ? 'Đã có kết quả' : 'Đang thực hiện'}
                        </span>
                    </div>

                    {order.status === 'completed' && order.results && (
                        <div className="mt-4 border border-[#EBEBEB] rounded-xl overflow-hidden">
                            <table className="w-full text-[12px] text-left border-collapse">
                                <thead>
                                    <tr className="bg-neutral-50/80 border-b border-[#EBEBEB] text-[#7B7B7B] font-bold">
                                        <th className="px-4 py-2">Tên xét nghiệm</th>
                                        <th className="px-4 py-2 text-right">Kết quả</th>
                                        <th className="px-4 py-2">Đơn vị</th>
                                        <th className="px-4 py-2 text-right">Trị số bình thường</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.results.map((res, rIdx) => (
                                        <tr key={rIdx} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
                                            <td className="px-4 py-2 text-[#2D2D2D] font-semibold">{res.name}</td>
                                            <td className={cn(
                                                "px-4 py-2 text-right font-bold",
                                                res.status === 'low' ? "text-amber-600 animate-pulse" : "text-[#2D2D2D]"
                                            )}>
                                                {res.value} {res.status === 'low' && '↓'}
                                            </td>
                                            <td className="px-4 py-2 text-[#7B7B7B]">{res.unit}</td>
                                            <td className="px-4 py-2 text-right text-[#9C9C9C]">{res.range}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {order.status === 'completed' && order.summary && (
                        <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Kết luận</span>
                            <p className="text-[12px] text-neutral-700 font-medium mt-1">{order.summary}</p>
                        </div>
                    )}

                    {order.status === 'pending' && (
                        <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50/40 rounded-xl border border-amber-100/30 text-[12px] text-amber-700 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-ping" />
                            {order.summary}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function DiagnosisTreatmentTab() {
    return (
        <div className="space-y-4">
            {/* Chẩn đoán xác định */}
            <SectionCard title="Chẩn đoán xác định">
                <div className="space-y-3.5">
                    <div className="flex items-start gap-3 p-4 bg-[#F5F2FF] border border-[#8B7CF6]/10 rounded-2xl">
                        <div className="text-[11px] font-bold bg-[#8B7CF6] text-white px-2 py-0.5 rounded-md uppercase shrink-0 mt-0.5">
                            ICD-10
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-[#2D2D2D]">K29.7 - Viêm dạ dày, không đặc hiệu</p>
                            <p className="text-[11.5px] text-[#7B7B7B] mt-1 leading-relaxed">
                                Mô tả lâm sàng: Đau tức vùng thượng vị, trào ngược nhẹ sau khi ăn no, hơi có cảm giác chướng bụng.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4.5 text-[12px] pl-2 border-l-2 border-neutral-200">
                        <span className="text-[#9C9C9C] font-semibold w-28 shrink-0">Chẩn đoán phân biệt:</span>
                        <span className="text-[#555] font-semibold">Trào ngược dạ dày thực quản (GERD)</span>
                    </div>
                </div>
            </SectionCard>

            {/* Hướng điều trị & Lời dặn */}
            <SectionCard title="Kế hoạch điều trị & Lời dặn của bác sĩ">
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-[#8B7CF6] uppercase tracking-wider block">Hướng điều trị</span>
                        <p className="text-[13px] text-[#2D2D2D] font-semibold leading-relaxed">
                            Điều trị nội khoa ngoại trú bằng thuốc 14 ngày. Kết hợp chế độ ăn uống khoa học và tái khám đúng hẹn.
                        </p>
                    </div>

                    <div className="h-px bg-neutral-100" />

                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Lời dặn chi tiết</span>
                        <ul className="space-y-2">
                            {[
                                'Uống thuốc Nexium trước ăn sáng 30 phút, Gaviscon sau ăn 1 giờ.',
                                'Tránh ăn đồ chua cay, thức ăn chiên rán nhiều dầu mỡ, nước có ga.',
                                'Không ăn quá no hoặc nằm ngay sau khi ăn (chờ ít nhất 2 tiếng).',
                                'Hạn chế lo âu, stress và làm việc quá khuya.',
                                'Tái khám sau 2 tuần hoặc đi khám ngay nếu có dấu hiệu đau bụng dữ dội, nôn ra máu.'
                            ].map((advice, i) => (
                                <li key={i} className="flex items-start gap-2 text-[12.5px] text-[#555] leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                                    <span>{advice}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </SectionCard>
        </div>
    );
}

function ProceduresTab() {
    const procedures = [
        {
            name: 'Nội soi dạ dày tá tràng không gây mê (có làm test HP)',
            time: '09:30 08/07/2026',
            doctor: 'BS. Nguyễn Văn Trung',
            dept: 'Khoa Nội soi - Phòng 204',
            result: 'Âm tính với HP (HP-)',
            notes: 'Hành tá tràng trơn láng, niêm mạc phình vị xung huyết nhẹ, không có vết loét lớn sâu.'
        }
    ];

    return (
        <div className="space-y-4">
            {procedures.map((proc, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-[#EBEBEB] p-5">
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                        <div>
                            <h4 className="text-[13px] font-bold text-[#2D2D2D]">{proc.name}</h4>
                            <p className="text-[11px] text-[#9C9C9C] mt-0.5">{proc.dept} · {proc.time}</p>
                        </div>
                        <span className="text-[10px] font-bold bg-[#F5F2FF] text-[#8B7CF6] border border-[#8B7CF6]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Đã thực hiện
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-neutral-50/50 p-4 rounded-xl border border-neutral-100">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Người thực hiện</span>
                            <span className="text-[12px] text-[#2D2D2D] font-bold">{proc.doctor}</span>
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Kết quả test nhanh</span>
                            <span className="text-[12px] text-emerald-600 font-bold">{proc.result}</span>
                        </div>
                        <div className="sm:col-span-2 space-y-1 mt-1">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Mô tả chi tiết</span>
                            <p className="text-[12px] text-neutral-700 font-semibold leading-relaxed">{proc.notes}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PrescriptionTab() {
    const meds = [
        {
            name: 'Nexium Mups 40mg (Esomeprazol)',
            qty: 14,
            unit: 'Viên',
            usage: 'Sáng uống 1 viên trước ăn 30 phút. Uống nguyên viên, không nhai.'
        },
        {
            name: 'Gaviscon Dual Action (10ml)',
            qty: 20,
            unit: 'Gói',
            usage: 'Trưa uống 1 gói sau ăn 1 tiếng, tối uống 1 gói trước khi đi ngủ.'
        },
        {
            name: 'Phosphalugel (Huyền dịch uống)',
            qty: 10,
            unit: 'Gói',
            usage: 'Uống 1 gói khi xuất hiện cơn đau rát thượng vị. Tối đa 3 gói/ngày.'
        }
    ];

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#EBEBEB] overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 bg-neutral-50/50 border-b border-[#EBEBEB] flex justify-between items-center">
                    <div>
                        <h4 className="text-[13px] font-bold text-[#2D2D2D]">Đơn thuốc điều trị ngoại trú</h4>
                        <p className="text-[11px] text-[#9C9C9C] mt-0.5">Ngày kê: 08/07/2026 · Hạn uống: 14 ngày</p>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md uppercase">
                        BHYT
                    </span>
                </div>

                {/* Med list */}
                <div className="divide-y divide-[#F5F5F8]">
                    {meds.map((med, idx) => (
                        <div key={idx} className="p-5 flex items-start gap-4">
                            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 font-bold text-xs mt-0.5">
                                {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                    <h5 className="text-[13px] font-bold text-[#2D2D2D]">{med.name}</h5>
                                    <span className="text-[12px] font-bold text-[#2D2D2D] shrink-0">
                                        SL: {med.qty} {med.unit}
                                    </span>
                                </div>
                                <p className="text-[11.5px] text-[#555] mt-1.5 leading-relaxed font-semibold bg-[#F8F8FA] p-2.5 rounded-xl border border-neutral-100">
                                    {med.usage}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tái khám */}
            <div className="p-4 bg-amber-50/40 border border-amber-200/50 rounded-2xl flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                <div className="text-[12px] text-amber-800">
                    <p className="font-bold">Lịch hẹn tái khám:</p>
                    <p className="font-semibold mt-0.5">Ngày 22/07/2026 (Sáng 8:00 - 11:30) tại Phòng khám Nội tổng quát 1.</p>
                </div>
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
        <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-[24px] border border-neutral-200/50 shadow-[0_4px_24px_-4px_rgba(139,124,246,0.02)]">
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
                {activeTab === 'can-lam-sang' && (
                    <LabTestsTab />
                )}
                {activeTab === 'chan-doan' && (
                    <DiagnosisTreatmentTab />
                )}
                {activeTab === 'thu-thuat' && (
                    <ProceduresTab />
                )}
                {activeTab === 'don-thuoc' && (
                    <PrescriptionTab />
                )}
            </div>
        </div>
    );
}
