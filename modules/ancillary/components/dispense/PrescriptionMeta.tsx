'use client';

import React from 'react';
import { Stethoscope, Calendar, FileText } from 'lucide-react';
import { Prescription } from '@/shared/types/prescription.types';

interface PrescriptionMetaProps {
    prescription: Prescription;
}

export function PrescriptionMeta({ prescription }: PrescriptionMetaProps) {
    return (
        <div className="space-y-3 my-4">
            {/* Meta Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <Stethoscope className="w-4 h-4 text-indigo-500" />
                        <span>Bác sĩ kê đơn:</span>
                    </div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                        {prescription.prescribed_by_name || 'Bác sĩ chuyên khoa OPD'}
                    </p>
                </div>

                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span>Thời gian kê đơn:</span>
                    </div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">
                        {prescription.created_at ? new Date(prescription.created_at).toLocaleString('vi-VN') : 'Mới khởi tạo'}
                    </p>
                </div>
            </div>

            {/* Diagnosis & Note */}
            {prescription.diagnosis_note && (
                <div className="p-3.5 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        <FileText className="w-4 h-4" />
                        <span>Lời dặn & Chẩn đoán của Bác sĩ:</span>
                    </div>
                    <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                        {prescription.diagnosis_note}
                    </p>
                </div>
            )}
        </div>
    );
}
