'use client';

import React from 'react';
import { PrescriptionDetail } from '@/shared/types/prescription.types';

interface MedicineListTableProps {
    details?: PrescriptionDetail[];
}

export function MedicineListTable({ details = [] }: MedicineListTableProps) {
    return (
        <div className="flex-1 space-y-3">
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center justify-between">
                <span>Danh Sách Thuốc Chi Tiết ({details.length})</span>
            </h4>

            <div className="space-y-3">
                {details.map((detail, idx) => (
                    <div
                        key={detail.prescription_detail_id || idx}
                        className="p-4 bg-white dark:bg-neutral-800/60 rounded-2xl border border-neutral-200 dark:border-neutral-700/80 shadow-xs"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                    {idx + 1}
                                </div>
                                <div>
                                    <h5 className="text-sm font-bold text-neutral-900 dark:text-white">
                                        {detail.medicine?.medicine_name || `Thuốc ID: ${detail.medicine_id}`}
                                    </h5>
                                    {detail.medicine?.active_ingredient && (
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                            Hoạt chất: {detail.medicine.active_ingredient}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                                <span className="text-sm font-extrabold text-neutral-900 dark:text-white">
                                    SL: {detail.quantity} {detail.medicine?.unit || 'đơn vị'}
                                </span>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                    {detail.sub_total?.toLocaleString('vi-VN')} đ
                                </p>
                            </div>
                        </div>

                        {/* Dosage instructions */}
                        <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800/80 rounded-xl border border-neutral-100 dark:border-neutral-700/50 text-xs text-neutral-700 dark:text-neutral-300">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">Cách dùng: </span>
                            {detail.dosage_instruction}
                            {detail.note && (
                                <p className="text-neutral-500 text-[11px] mt-1">
                                    Ghi chú thêm: {detail.note}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
