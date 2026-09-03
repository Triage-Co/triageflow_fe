'use client';

import React from 'react';
import { X, CheckCircle2, FlaskConical } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

export interface CompleteConfirmData {
    queueId: string;
    patientName: string;
    queueNumber: string;
    stepName?: string;
    services?: string[];
}

interface CompleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: CompleteConfirmData | null;
    onConfirm: () => Promise<void>;
    isLoading: boolean;
}

export default function CompleteConfirmModal({
    isOpen,
    onClose,
    data,
    onConfirm,
    isLoading
}: CompleteConfirmModalProps) {
    if (!isOpen || !data) return null;

    const handleConfirm = () => {
        onConfirm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" onClick={onClose} />

            {/* Modal Box */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100">
                    <div>
                        <h3 className="text-sm font-black text-neutral-850">
                            Xác nhận hoàn thành lượt phục vụ
                        </h3>
                        <p className="text-[11px] text-neutral-450 font-medium">
                            Kết thúc lượt xét nghiệm của bệnh nhân
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 text-xs">
                    {/* Patient Info Card */}
                    <div className="bg-emerald-50/40 border border-emerald-100/80 rounded-2xl p-4 space-y-2.5">
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 font-semibold">Bệnh nhân:</span>
                            <span className="font-extrabold text-neutral-900 text-sm">{data.patientName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 font-semibold">Số thứ tự:</span>
                            <span className="font-extrabold text-emerald-700 font-mono bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                Số {data.queueNumber}
                            </span>
                        </div>
                        {data.stepName && (
                            <div className="flex justify-between items-start pt-2 border-t border-emerald-100/60">
                                <span className="text-neutral-500 font-semibold flex items-center gap-1">
                                    <FlaskConical className="w-3.5 h-3.5 text-emerald-600" />
                                    Dịch vụ:
                                </span>
                                <span className="font-bold text-neutral-800 text-right max-w-[65%]">{data.stepName}</span>
                            </div>
                        )}
                        {data.services && data.services.length > 0 && (
                            <div className="pt-2 border-t border-emerald-100/60 flex flex-wrap gap-1.5">
                                {data.services.map((s, idx) => (
                                    <span
                                        key={idx}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-emerald-200 text-emerald-800"
                                    >
                                        {s}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-neutral-600 font-medium leading-relaxed">
                        Lượt phục vụ này sẽ được đóng lại và chuyển sang danh sách <strong className="text-emerald-700 font-bold">Đã Hoàn Thành</strong>. Bệnh nhân sẽ tiếp tục quy trình khám tiếp theo.
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-end gap-2.5">
                    <Button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="h-9 px-4 rounded-xl bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100 font-bold text-xs cursor-pointer shadow-3xs"
                    >
                        Hủy bỏ
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        isLoading={isLoading}
                        className="h-9 px-4.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer shadow-sm shadow-emerald-500/20 border-0"
                    >
                        Xác nhận hoàn thành
                    </Button>
                </div>
            </div>
        </div>
    );
}
