'use client';

import React from 'react';
import {
    X,
    User,
    FlaskConical,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    Activity,
    Star
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import { QueuePatientItem } from '../types/lab.types';
import { QUEUE_TYPE_MAP } from '@/modules/kiosk/utils/flowHelpers';

interface PatientDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPatient: QueuePatientItem | null;
}

const STATUS_MAP = {
    WAITING: { label: 'Đang Chờ', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    SERVING: { label: 'Đang Phục Vụ', color: 'bg-indigo-50 text-[#8B7CF6] border-indigo-200' },
    MISSING: { label: 'Lỡ Lượt', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    COMPLETED: { label: 'Đã Hoàn Thành', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function PatientDetailsModal({
    isOpen,
    onClose,
    selectedPatient
}: PatientDetailsModalProps) {
    if (!isOpen || !selectedPatient) return null;

    const patientStatus = selectedPatient.localStatus || 'WAITING';
    const statusInfo = STATUS_MAP[patientStatus] || { label: patientStatus, color: 'bg-slate-50 text-slate-700 border-slate-200' };

    return (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[28px] border border-neutral-100 shadow-2xl max-w-xl w-full overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="px-6 py-4.5 border-b border-neutral-100 flex items-center justify-between">
                    <h3 className="font-extrabold text-neutral-800 text-[15px] tracking-tight">Chi tiết thông tin bệnh nhân</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                    
                    {/* 1. Patient Profile Card */}
                    <div className="bg-[#F4F3FF]/70 border border-[#8B7CF6]/10 rounded-[22px] p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-[#8B7CF6]/10 flex items-center justify-center shrink-0 border border-white shadow-3xs">
                                <User className="w-5.5 h-5.5 text-[#8B7CF6]" />
                            </div>
                            <div>
                                <p className="text-[16px] font-extrabold text-neutral-850 tracking-tight leading-tight">
                                    {selectedPatient.patient_name}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-[18px] font-black text-neutral-800">
                                Số: {selectedPatient.queue_number}
                            </span>
                            <span className={cn(
                                "text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider",
                                !selectedPatient.queue_type
                                    ? "bg-rose-50 border-rose-150 text-rose-600"
                                    : selectedPatient.queue_type === 'APPOINTMENT'
                                        ? "bg-indigo-50 border-indigo-150 text-[#8B7CF6]"
                                        : "bg-amber-50 border-amber-150 text-amber-600"
                            )}>
                                {!selectedPatient.queue_type
                                    ? "Lỡ Lượt"
                                    : QUEUE_TYPE_MAP[selectedPatient.queue_type] || selectedPatient.queue_type}
                            </span>
                        </div>
                    </div>

                    {/* 2. Information Info */}
                    <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-3.5">
                        <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-neutral-400" />
                            Hàng chờ & Trạng thái
                        </h4>
                        
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                <span className="text-neutral-500 font-semibold">Trạng thái:</span>
                                <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", statusInfo.color)}>
                                    {statusInfo.label}
                                </span>
                            </div>
                            {selectedPatient.patient?.dob && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Ngày sinh:</span>
                                    <span className="font-bold text-neutral-800">
                                        {(() => {
                                            try {
                                                const d = new Date(selectedPatient.patient.dob);
                                                return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN');
                                            } catch {
                                                return '—';
                                            }
                                        })()}
                                    </span>
                                </div>
                            )}
                            {selectedPatient.patient?.gender && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Giới tính:</span>
                                    <span className="font-bold text-neutral-800">
                                        {selectedPatient.patient.gender === 'MALE' ? 'Nam' : selectedPatient.patient.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                                    </span>
                                </div>
                            )}
                            {selectedPatient.enqueued_at && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">
                                        {selectedPatient.localStatus === 'SERVING' ? 'Giờ phục vụ:' : 'Giờ vào:'}
                                    </span>
                                    <span className="font-bold text-neutral-800">
                                        {(() => {
                                            try {
                                                const d = new Date(selectedPatient.enqueued_at);
                                                return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                            } catch {
                                                return '—';
                                            }
                                        })()}
                                    </span>
                                </div>
                            )}
                            {selectedPatient.missed_at && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Giờ lỡ lượt:</span>
                                    <span className="font-bold text-rose-600">
                                        {(() => {
                                            try {
                                                const d = new Date(selectedPatient.missed_at);
                                                return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                            } catch {
                                                return '—';
                                            }
                                        })()}
                                    </span>
                                </div>
                            )}
                            {selectedPatient.waited_minutes !== undefined && selectedPatient.waited_minutes !== null && (
                                <div className="flex justify-between items-center py-1">
                                    <span className="text-neutral-500 font-semibold">Đã chờ:</span>
                                    <span className="font-bold text-[#8B7CF6]">{selectedPatient.waited_minutes} phút</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Step / In-progress lab test details */}
                    {selectedPatient.step && (
                        <div className="space-y-2.5">
                            <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5">
                                <FlaskConical className="w-3.5 h-3.5 text-[#8B7CF6]" />
                                Chi tiết chỉ định xét nghiệm
                            </h4>
                            <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-3 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-500 font-semibold">Tên dịch vụ:</span>
                                    <span className="font-extrabold text-neutral-800">{selectedPatient.step.step_name}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Mã bước khám:</span>
                                    <span className="font-mono text-neutral-600">{selectedPatient.step.step_id}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Trạng thái tiến trình:</span>
                                    <span className="font-bold text-[#8B7CF6]">
                                        {selectedPatient.step.step_status === 'IN_PROGRESS' ? 'Đang thực hiện' : selectedPatient.step.step_status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Results Card (if completed) */}
                    {patientStatus === 'COMPLETED' && (
                        <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                            <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Kết quả xét nghiệm
                            </h4>
                            <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-4 text-xs">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">Trị số đo</p>
                                        <p className="text-xl font-black text-emerald-900 mt-1">{selectedPatient.resultValue || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">Ngày trả kết quả</p>
                                        <p className="text-sm font-bold text-neutral-800 mt-1">Hôm nay</p>
                                    </div>
                                </div>
                                {selectedPatient.resultNotes && (
                                    <div className="border-t border-emerald-100/50 pt-3">
                                        <p className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">Ghi chú / Kết luận chuyên môn</p>
                                        <p className="text-xs font-semibold text-emerald-800/90 mt-1.5 leading-relaxed">{selectedPatient.resultNotes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4.5 border-t border-neutral-100 bg-neutral-50/50 flex justify-end">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="rounded-xl font-bold bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-100 px-6"
                    >
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
}
