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
    Star,
    UserX
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import { QueuePatientItem } from '../types/lab.types';
import { QUEUE_TYPE_MAP } from '@/modules/kiosk/utils/flowHelpers';

interface PatientDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPatient: QueuePatientItem | null;
    onCompleteOrderDetail?: (queueId: string, detailId: string) => Promise<void>;
    isCompletingDetail?: Record<string, boolean>;
    onRefuseQueue?: (patient: { queue_id: string; patient_name: string; queue_number: string }) => void;
    onCompleteQueue?: (patient: QueuePatientItem) => void;
}

const STATUS_MAP = {
    WAITING: { label: 'Đang Chờ', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    CALLED: { label: 'Đang Gọi Vào Phòng', color: 'bg-amber-100 text-amber-900 border-amber-300' },
    SERVING: { label: 'Đang Phục Vụ', color: 'bg-indigo-50 text-[#8B7CF6] border-indigo-200' },
    MISSING: { label: 'Lỡ Lượt', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    COMPLETED: { label: 'Đã Hoàn Thành', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export default function PatientDetailsModal({
    isOpen,
    onClose,
    selectedPatient,
    onCompleteOrderDetail,
    isCompletingDetail,
    onRefuseQueue,
    onCompleteQueue,
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
                            {selectedPatient.patient?.citizen_id && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Số CCCD / CMT:</span>
                                    <span className="font-mono font-bold text-neutral-800">
                                        {selectedPatient.patient.citizen_id}
                                    </span>
                                </div>
                            )}
                            {selectedPatient.patient?.phone && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Số điện thoại:</span>
                                    <span className="font-bold text-neutral-800">
                                        {selectedPatient.patient.phone}
                                    </span>
                                </div>
                            )}
                            {selectedPatient.serving_started_at && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">
                                        Giờ bắt đầu phục vụ:
                                    </span>
                                    <span className="font-bold text-neutral-800">
                                        {(() => {
                                            try {
                                                const d = new Date(selectedPatient.serving_started_at);
                                                return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                            } catch {
                                                return '—';
                                            }
                                        })()}
                                    </span>
                                </div>
                            )}
                            {selectedPatient.finished_at && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">
                                        Giờ hoàn thành:
                                    </span>
                                    <span className="font-bold text-emerald-700">
                                        {(() => {
                                            try {
                                                const d = new Date(selectedPatient.finished_at);
                                                return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                            } catch {
                                                return '—';
                                            }
                                        })()}
                                    </span>
                                </div>
                            )}
                            {selectedPatient.duration_minutes !== undefined && selectedPatient.duration_minutes !== null && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Thời gian thực hiện:</span>
                                    <span className="font-bold text-emerald-700">
                                        {selectedPatient.duration_minutes > 0 ? `${selectedPatient.duration_minutes} phút` : '< 1 phút'}
                                    </span>
                                </div>
                            )}
                            {selectedPatient.enqueued_at && !selectedPatient.serving_started_at && (
                                <div className="flex justify-between items-center py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">
                                        Giờ vào:
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
                            {selectedPatient.refusal_reason && (
                                <div className="flex justify-between items-start py-1 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Lý do từ chối:</span>
                                    <span className="font-bold text-rose-700 max-w-[60%] text-right">{selectedPatient.refusal_reason}</span>
                                </div>
                            )}
                            {selectedPatient.waited_minutes !== undefined && selectedPatient.waited_minutes !== null && patientStatus === 'WAITING' && (
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
                                    <span className={cn(
                                        "font-bold px-2 py-0.5 rounded-full text-[10px] border",
                                        selectedPatient.step.step_status === 'COMPLETED'
                                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                            : selectedPatient.step.step_status === 'IN_PROGRESS'
                                            ? "bg-indigo-50 border-indigo-200 text-[#8B7CF6]"
                                            : "bg-neutral-100 border-neutral-200 text-neutral-600"
                                    )}>
                                        {selectedPatient.step.step_status === 'COMPLETED'
                                            ? 'Đã hoàn thành'
                                            : selectedPatient.step.step_status === 'IN_PROGRESS'
                                            ? 'Đang thực hiện'
                                            : selectedPatient.step.step_status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 3.5. Service Order Details */}
                    {selectedPatient.service_order && (
                        <div className="space-y-2.5">
                            <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-[#8B7CF6]" />
                                Đơn dịch vụ chỉ định ({selectedPatient.service_order.details?.length || 0} dịch vụ)
                            </h4>
                            <div className="bg-slate-50/60 border border-slate-100 rounded-2xl p-4 space-y-2.5 text-xs">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100/50">
                                    <span className="text-neutral-500 font-semibold">Mã đơn dịch vụ:</span>
                                    <span className="font-mono text-neutral-600 font-bold">{selectedPatient.service_order.service_order_id}</span>
                                </div>
                                <div className="space-y-2 pt-1.5">
                                    {selectedPatient.service_order.details?.map((detail: any, idx: number) => (
                                        <div
                                            key={detail.service_order_detail_id || idx}
                                            className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-neutral-100 shadow-3xs"
                                        >
                                            <div className="flex flex-col gap-0.5 max-w-[70%]">
                                                <span className="font-bold text-neutral-800 text-[12px] leading-tight">
                                                    {detail.service_name || detail.name}
                                                </span>
                                                <span className="font-mono text-[9.5px] text-neutral-450">
                                                    Mã: {detail.service_code}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {detail.quantity > 1 && (
                                                    <span className="text-[9.5px] bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded-md font-bold font-sans">
                                                        x{detail.quantity}
                                                    </span>
                                                )}
                                                
                                                {detail.status === 'COMPLETED' ? (
                                                    <span className="text-[9.5px] font-extrabold px-2.5 py-1 rounded-full border bg-emerald-50 border-emerald-150 text-emerald-600 uppercase tracking-wider shrink-0 flex items-center gap-1 font-sans">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                        Đã xong
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={cn(
                                                            "text-[9px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider shrink-0",
                                                            detail.status === 'PAID'
                                                                ? "bg-[#8B7CF6]/10 border-[#8B7CF6]/20 text-[#8B7CF6]"
                                                                : "bg-amber-50 border-amber-150 text-amber-600"
                                                        )}>
                                                            {detail.status === 'PAID' ? 'Đã thanh toán' : detail.status === 'PENDING' ? 'Chưa thanh toán' : detail.status}
                                                        </span>
                                                        {patientStatus === 'SERVING' && onCompleteOrderDetail && detail.service_order_detail_id && (
                                                            <Button
                                                                onClick={() => onCompleteOrderDetail(selectedPatient.queue_id, detail.service_order_detail_id!)}
                                                                disabled={isCompletingDetail?.[detail.service_order_detail_id]}
                                                                isLoading={isCompletingDetail?.[detail.service_order_detail_id]}
                                                                className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-bold shadow-xs shrink-0 cursor-pointer border-0"
                                                            >
                                                                Hoàn thành
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 4. Results Card (if completed) */}
                    {patientStatus === 'COMPLETED' && (
                        <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                            <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Kết quả xét nghiệm / Trạng thái hoàn thành
                            </h4>
                            <div className="p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-4 text-xs">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">Trạng thái thực hiện</p>
                                        <p className="text-base font-black text-emerald-900 mt-1 flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                            Đã hoàn tất xét nghiệm
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">Thời gian kết thúc</p>
                                        <p className="text-sm font-bold text-neutral-800 mt-1">
                                            {selectedPatient.finished_at ? (() => {
                                                try {
                                                    const d = new Date(selectedPatient.finished_at);
                                                    return isNaN(d.getTime()) ? 'Hôm nay' : `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${d.toLocaleDateString('vi-VN')}`;
                                                } catch {
                                                    return 'Hôm nay';
                                                }
                                            })() : 'Hôm nay'}
                                        </p>
                                    </div>
                                </div>
                                {selectedPatient.resultValue && (
                                    <div className="border-t border-emerald-100/50 pt-3">
                                        <p className="text-emerald-700 font-bold uppercase tracking-wider text-[10px]">Trị số đo</p>
                                        <p className="text-lg font-black text-emerald-900 mt-1">{selectedPatient.resultValue}</p>
                                    </div>
                                )}
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
                <div className="px-6 py-4.5 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {patientStatus === 'SERVING' && onRefuseQueue && (
                            <Button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onRefuseQueue({
                                        queue_id: selectedPatient.queue_id,
                                        patient_name: selectedPatient.patient_name,
                                        queue_number: selectedPatient.queue_number,
                                    });
                                }}
                                className="rounded-xl font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 text-xs shadow-3xs cursor-pointer"
                            >
                                Từ chối phục vụ
                            </Button>
                        )}
                        {patientStatus === 'SERVING' && onCompleteQueue && (
                            <Button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onCompleteQueue(selectedPatient);
                                }}
                                className="rounded-xl font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border-0 px-4 text-xs shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Hoàn thành lượt khám
                            </Button>
                        )}
                    </div>
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="rounded-xl font-bold bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-100 px-6 cursor-pointer"
                    >
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
}
