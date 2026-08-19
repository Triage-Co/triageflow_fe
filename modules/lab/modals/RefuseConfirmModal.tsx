'use client';

import React, { useState } from 'react';
import { X, UserX, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';

export interface RefuseConfirmData {
    queueId: string;
    patientName: string;
    queueNumber: string;
}

interface RefuseConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: RefuseConfirmData | null;
    onConfirm: (reason: string) => Promise<void>;
    isLoading: boolean;
}

const PREDEFINED_REASONS = [
    'Bệnh nhân từ chối thực hiện dịch vụ',
    'Bệnh nhân không đủ điều kiện y khoa (chưa nhịn ăn, có thai, v.v.)',
    'Bệnh nhân có chống chỉ định y khoa',
    'Bệnh nhân xin hủy / đổi lịch hẹn',
    'Bệnh nhân tự ý bỏ về không thực hiện',
];

export default function RefuseConfirmModal({
    isOpen,
    onClose,
    data,
    onConfirm,
    isLoading
}: RefuseConfirmModalProps) {
    const [selectedQuickReason, setSelectedQuickReason] = useState<string>(PREDEFINED_REASONS[0]);
    const [customReason, setCustomReason] = useState('');

    if (!isOpen || !data) return null;

    const handleSelectQuickReason = (r: string) => {
        setSelectedQuickReason(r);
        setCustomReason(r);
    };

    const handleConfirm = () => {
        const finalReason = customReason.trim() || selectedQuickReason || 'Bệnh nhân từ chối thực hiện dịch vụ';
        onConfirm(finalReason).then(() => {
            setCustomReason('');
            setSelectedQuickReason(PREDEFINED_REASONS[0]);
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" onClick={onClose} />

            {/* Modal Box */}
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-neutral-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-100 shadow-xs">
                            <UserX className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-neutral-850">
                                Từ chối lượt phục vụ
                            </h3>
                        </div>
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
                    <div className="bg-rose-50/40 border border-rose-100/80 rounded-2xl p-4 space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 font-semibold">Bệnh nhân:</span>
                            <span className="font-extrabold text-neutral-900 text-sm">{data.patientName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-neutral-500 font-semibold">Số thứ tự:</span>
                            <span className="font-extrabold text-rose-700 font-mono bg-rose-100/70 px-2 py-0.5 rounded-md">
                                Số {data.queueNumber}
                            </span>
                        </div>
                    </div>

                    {/* Quick Reason Chips */}
                    <div className="space-y-2">
                        <label className="block text-neutral-600 font-bold">
                            Chọn nhanh lý do từ chối:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {PREDEFINED_REASONS.map((r, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectQuickReason(r)}
                                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl border transition-all text-left cursor-pointer ${(customReason === r || (!customReason && selectedQuickReason === r))
                                            ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold shadow-xs'
                                            : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/80 text-neutral-600'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Reason Textarea */}
                    <div className="space-y-1.5 pt-1">
                        <label htmlFor="refuse-reason" className="block text-neutral-600 font-bold flex items-center justify-between">
                            <span>Lý do chi tiết:</span>
                            <span className="text-[10px] text-neutral-400 font-normal">Ghi chú lưu vào hồ sơ</span>
                        </label>
                        <textarea
                            id="refuse-reason"
                            rows={3}
                            placeholder="Nhập lý do từ chối cụ thể..."
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 font-medium text-neutral-700 placeholder:text-neutral-400 resize-none text-xs"
                        />
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
                        className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs cursor-pointer shadow-sm shadow-rose-500/20 border-0"
                    >
                        Xác nhận từ chối
                    </Button>
                </div>
            </div>
        </div>
    );
}
