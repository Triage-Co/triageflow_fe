'use client';

import React from 'react';
import { X, FileText } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { QueuePatientItem } from '../types/lab.types';

interface ResultEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    selectedPatient: QueuePatientItem | null;
    inputResultValue: string;
    setInputResultValue: (val: string) => void;
    inputResultNotes: string;
    setInputResultNotes: (val: string) => void;
    handleSaveResult: () => void;
    isSubmitting: boolean;
}

export default function ResultEntryModal({
    isOpen,
    onClose,
    selectedPatient,
    inputResultValue,
    setInputResultValue,
    inputResultNotes,
    setInputResultNotes,
    handleSaveResult,
    isSubmitting
}: ResultEntryModalProps) {
    if (!isOpen || !selectedPatient) return null;

    return (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[28px] border border-neutral-100 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200">
                
                {/* Modal Header */}
                <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="w-5.5 h-5.5 text-indigo-600" />
                        <h3 className="font-bold text-neutral-800 text-base">Nhập kết quả xét nghiệm</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
                        <p className="text-xs font-bold text-indigo-900">
                            {selectedPatient.patient_name} • Số: {selectedPatient.queue_number}
                        </p>
                        <p className="text-sm font-extrabold text-indigo-950 mt-1">
                            {selectedPatient.queue_type === 'APPOINTMENT' ? 'Xét nghiệm theo hẹn' : 'Xét nghiệm thường quy'}
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-650">Nhập trị số kết quả</label>
                        <Input
                            value={inputResultValue}
                            onChange={(e) => setInputResultValue(e.target.value)}
                            placeholder="Ví dụ: 5.6 % hoặc 4.5 T/L"
                            className="h-11 rounded-xl text-sm font-semibold border-neutral-300"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-neutral-650">Ghi chú / Kết luận chuyên môn</label>
                        <textarea
                            value={inputResultNotes}
                            onChange={(e) => setInputResultNotes(e.target.value)}
                            placeholder="Nhập ghi chú hoặc kết luận..."
                            className="w-full text-xs text-neutral-800 border border-neutral-200 rounded-xl p-3 focus:border-[#8B7CF6] outline-none min-h-20 resize-none"
                        />
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-neutral-100 bg-neutral-50/50 flex gap-3 justify-end">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="rounded-xl font-bold bg-white"
                    >
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSaveResult}
                        isLoading={isSubmitting}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold px-6 shadow-sm shrink-0"
                    >
                        Trả kết quả
                    </Button>
                </div>
            </div>
        </div>
    );
}
