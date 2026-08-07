'use client';

import React, { useState } from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

export interface OverrideConfirmData {
    queueId: string;
    patientName: string;
    queueNumber: string;
    oldIndex: number;
    newIndex: number;
    backendPosition: number;
}

interface OverrideConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: OverrideConfirmData | null;
    onConfirm: (reason: string) => Promise<void>;
    isLoading: boolean;
}

export default function OverrideConfirmModal({
    isOpen,
    onClose,
    data,
    onConfirm,
    isLoading
}: OverrideConfirmModalProps) {
    const [reason, setReason] = useState('');

    if (!isOpen || !data) return null;

    const handleConfirm = () => {
        const finalReason = reason.trim() || 'Can thiệp thứ tự hàng đợi phòng Lab';
        onConfirm(finalReason).then(() => {
            setReason('');
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" onClick={onClose} />

            {/* Modal Box */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center border border-amber-100">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                        </div>
                        <h3 className="text-sm font-black text-neutral-800">
                            Can thiệp thứ tự hàng đợi
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition cursor-pointer"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 text-xs">
                    <p className="text-neutral-600 font-semibold leading-relaxed">
                        Bạn đang thay đổi vị trí hàng đợi của bệnh nhân sau:
                    </p>

                    <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 space-y-2.5">
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 font-semibold">Họ tên:</span>
                            <span className="font-extrabold text-neutral-850">{data.patientName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 font-semibold">Số thứ tự:</span>
                            <span className="font-extrabold text-neutral-800">Số {data.queueNumber}</span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-neutral-200/50">
                            <span className="text-neutral-500 font-semibold">Thay đổi vị trí:</span>
                            <span className="flex items-center gap-2 font-bold text-neutral-700">
                                {data.oldIndex + 1}
                                <ArrowRight className="w-3.5 h-3.5 text-neutral-450" />
                                <span className="text-[#8B7CF6] font-black">{data.newIndex + 1}</span>
                            </span>
                        </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                        <label htmlFor="override-reason" className="block text-neutral-500 font-bold">
                            Lý do can thiệp <span className="text-neutral-400 font-medium">(mặc định: Can thiệp thứ tự hàng đợi phòng Lab)</span>
                        </label>
                        <textarea
                            id="override-reason"
                            rows={3}
                            placeholder="Nhập lý do (ví dụ: Ưu tiên người cao tuổi, trẻ em, ca cấp cứu...)"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-3 bg-white border border-neutral-200 hover:border-neutral-350 focus:border-[#8B7CF6] focus:ring-1 focus:ring-[#8B7CF6] rounded-xl outline-none transition text-xs font-semibold text-neutral-800 placeholder-neutral-400 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 flex justify-end gap-2">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        disabled={isLoading}
                        className="rounded-xl font-bold bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-100 px-5 cursor-pointer h-9 text-xs border-0"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        isLoading={isLoading}
                        className="rounded-xl font-black bg-[#8B7CF6] hover:bg-[#7C6CF5] text-white px-5 cursor-pointer h-9 text-xs border-0"
                    >
                        Xác nhận
                    </Button>
                </div>

            </div>
        </div>
    );
}
