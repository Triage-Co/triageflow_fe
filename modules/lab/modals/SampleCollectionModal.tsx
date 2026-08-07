'use client';

import React from 'react';
import {
    X,
    User,
    FlaskConical,
    Calendar,
    Check,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import { QueuePatientItem } from '../types/lab.types';
import { QUEUE_TYPE_MAP } from '@/modules/kiosk/utils/flowHelpers';

interface SampleCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPatient: QueuePatientItem | null;
    collectingStep: boolean;
    setCollectingStep: (val: boolean) => void;
    tubeType: string;
    setTubeType: (val: string) => void;
    volume: string;
    setVolume: (val: string) => void;
    labelConfirmed: boolean;
    setLabelConfirmed: (val: boolean) => void;
    handleConfirmCollection: () => void;
    isSubmitting: boolean;
}

export default function SampleCollectionModal({
    isOpen,
    onClose,
    selectedPatient,
    collectingStep,
    setCollectingStep,
    tubeType,
    setTubeType,
    volume,
    setVolume,
    labelConfirmed,
    setLabelConfirmed,
    handleConfirmCollection,
    isSubmitting
}: SampleCollectionModalProps) {
    if (!isOpen || !selectedPatient) return null;

    const patientStatus = selectedPatient.localStatus || 'WAITING';

    return (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[28px] border border-neutral-100/80 shadow-2xl max-w-125 w-full overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="px-6 py-4.5 border-b border-neutral-100 flex items-center justify-between">
                    <h3 className="font-bold text-neutral-800 text-[15px] tracking-tight">Chi tiết & Lấy mẫu</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                    
                    {!collectingStep ? (
                        <>
                            {/* 1. Patient Profile Card */}
                            <div className="bg-[#EBE9FC]/70 border border-[#DDD6FE]/40 rounded-[20px] p-5 flex items-center justify-between">
                                <div className="flex items-center gap-3.5">
                                    <div className="w-11 h-11 rounded-full bg-[#8B7CF6] flex items-center justify-center shrink-0 border border-white shadow-sm">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[15px] font-extrabold text-neutral-850 tracking-tight leading-tight">
                                            {selectedPatient.patient_name}
                                        </p>
                                        <p className="text-[11px] text-neutral-500 font-semibold mt-1">
                                            Mã hàng chờ: {selectedPatient.queue_id.substring(0, 8)}...
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <span className="text-[16px] font-bold text-neutral-800">
                                        Số: {selectedPatient.queue_number}
                                    </span>
                                    <span className="bg-indigo-50 text-[#8B7CF6] border border-indigo-100 text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        {QUEUE_TYPE_MAP[selectedPatient.queue_type] || selectedPatient.queue_type}
                                    </span>
                                </div>
                            </div>

                            {/* 2. Lab Test Request Information */}
                            <div className="space-y-2.5">
                                <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider">Thông tin xét nghiệm</h4>
                                <div className="bg-[#F8F9FC] border border-neutral-200/50 rounded-2xl p-4.5 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <FlaskConical className="w-4.5 h-4.5 text-[#8B7CF6] shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11.5px] text-neutral-400 font-bold leading-tight">Chỉ định xét nghiệm</p>
                                            <p className="text-[13px] font-extrabold text-neutral-800 mt-1 leading-snug">
                                                {QUEUE_TYPE_MAP[selectedPatient.queue_type] || selectedPatient.queue_type}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3 border-t border-neutral-200/40 pt-3.5">
                                        <Calendar className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[11.5px] text-neutral-400 font-bold leading-tight">Ngày vào hàng chờ</p>
                                            <p className="text-[13px] font-extrabold text-neutral-800 mt-0.5">
                                                {selectedPatient.enqueued_at ? (() => {
                                                    try {
                                                        const d = new Date(selectedPatient.enqueued_at);
                                                        return isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN');
                                                    } catch {
                                                        return '—';
                                                    }
                                                })() : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Completed Results in View Mode */}
                            {patientStatus === 'COMPLETED' && (
                                <div className="space-y-2.5 pt-2 border-t border-neutral-100">
                                    <h4 className="text-[11px] font-bold text-neutral-450 uppercase tracking-wider">Kết quả xét nghiệm</h4>
                                    <div className="p-4.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3.5">
                                        <div>
                                            <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">Trị số đo</p>
                                            <p className="text-lg font-black text-emerald-850 mt-1">{selectedPatient.resultValue}</p>
                                        </div>
                                        {selectedPatient.resultNotes && (
                                            <div className="border-t border-emerald-100/50 pt-2.5">
                                                <p className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider">Ghi chú / Kết luận</p>
                                                <p className="text-xs font-semibold text-emerald-800/90 mt-1 leading-relaxed">{selectedPatient.resultNotes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Collecting sample details sub-view step */
                        <div className="space-y-5">
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/70">
                                <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">Mẫu xét nghiệm</p>
                                <p className="text-sm font-extrabold text-indigo-900 mt-1 leading-snug">
                                    {QUEUE_TYPE_MAP[selectedPatient.queue_type] || selectedPatient.queue_type}
                                </p>
                                <p className="text-[11px] text-indigo-600 font-semibold mt-1">Bệnh nhân: {selectedPatient.patient_name} • Số: {selectedPatient.queue_number}</p>
                            </div>

                            {/* Tube Type Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-600">Chọn Loại Ống Nghiệm</label>
                                <div className="grid grid-cols-3 gap-2.5">
                                    {[
                                        { name: 'EDTA (Nắp Tím)', color: '#8B5CF6', bg: 'bg-purple-50' },
                                        { name: 'Serum (Nắp Đỏ)', color: '#EF4444', bg: 'bg-red-50' },
                                        { name: 'Heparin (Nắp Xanh Lá)', color: '#10B981', bg: 'bg-emerald-50' }
                                    ].map((t) => (
                                        <button
                                            key={t.name}
                                            onClick={() => setTubeType(t.name)}
                                            className={cn(
                                                "p-3 rounded-xl border-2 text-center text-xs font-extrabold flex flex-col items-center gap-2 transition-all cursor-pointer",
                                                tubeType === t.name 
                                                    ? `${t.bg} border-neutral-800` 
                                                    : 'bg-white border-neutral-100 hover:border-neutral-200'
                                            )}
                                        >
                                            <div 
                                                className="w-5 h-5 rounded-full border border-white shadow-3xs" 
                                                style={{ backgroundColor: t.color }}
                                            />
                                            <span className="text-[10.5px] leading-tight text-neutral-700">{t.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Volume Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-neutral-600">Thể Tích Mẫu Thu Thập</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['2 ml', '3 ml', '4 ml', '5 ml'].map((vol) => (
                                        <button
                                            key={vol}
                                            onClick={() => setVolume(vol)}
                                            className={cn(
                                                "py-2.5 rounded-xl border text-center text-xs font-bold transition cursor-pointer",
                                                volume === vol 
                                                    ? 'bg-[#8B7CF6] text-white border-transparent' 
                                                    : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                                            )}
                                        >
                                            {vol}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Validation Checkbox */}
                            <div 
                                onClick={() => setLabelConfirmed(!labelConfirmed)}
                                className={cn(
                                    "p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                                    labelConfirmed 
                                        ? 'bg-emerald-50/30 border-emerald-500/70 text-emerald-900' 
                                        : 'bg-white border-neutral-200 text-neutral-500 hover:border-neutral-350'
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition",
                                    labelConfirmed ? 'bg-emerald-500 border-transparent text-white' : 'border-neutral-300 bg-white'
                                )}>
                                    {labelConfirmed && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                                </div>
                                <p className="text-[12px] font-semibold leading-snug">
                                    Tôi đã đối chiếu khớp thông tin họ tên bệnh nhân trên tem ống nghiệm.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4.5 border-t border-neutral-100 bg-neutral-50/50 flex gap-3 justify-end">
                    {!collectingStep ? (
                        <>
                            <Button
                                onClick={onClose}
                                variant="outline"
                                className="rounded-xl font-bold bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-100"
                            >
                                Hủy bỏ
                            </Button>

                            {patientStatus !== 'COMPLETED' && (
                                <button
                                    onClick={() => setCollectingStep(true)}
                                    className="h-10 px-5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white"
                                >
                                    <FlaskConical className="w-4 h-4" />
                                    Lấy mẫu xét nghiệm
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setCollectingStep(false)}
                                className="px-4 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer bg-white"
                            >
                                Quay lại
                            </button>
                            <button
                                onClick={handleConfirmCollection}
                                disabled={isSubmitting || !labelConfirmed}
                                className={cn(
                                    "h-10 px-5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer",
                                    labelConfirmed
                                        ? "bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white"
                                        : "bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none"
                                    )}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4" />
                                )}
                                Xác nhận đã lấy mẫu
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
