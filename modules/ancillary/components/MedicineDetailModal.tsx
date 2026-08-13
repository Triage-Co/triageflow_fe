'use client';

import React from 'react';
import { X, Pill, Tag, Building2, Calendar, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { Medicine } from '@/shared/types/prescription.types';

interface MedicineDetailModalProps {
    isOpen: boolean;
    medicine: Medicine | null;
    onClose: () => void;
    onEdit?: (medicine: Medicine) => void;
}

export function MedicineDetailModal({
    isOpen,
    medicine,
    onClose,
    onEdit
}: MedicineDetailModalProps) {
    if (!isOpen || !medicine) return null;

    const isActive = medicine.is_active !== false;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-lg shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/80 dark:bg-neutral-900/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Pill className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono">
                                {medicine.medicine_code}
                            </span>
                            <h3 className="text-lg font-extrabold text-neutral-900 dark:text-white mt-0.5 leading-tight">
                                {medicine.medicine_name}
                            </h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    {/* Status & Price Highlight Banner */}
                    <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 flex items-center justify-between">
                        <div>
                            <span className="text-xs text-neutral-400 font-semibold block">Đơn Giá Niêm Yết</span>
                            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                {medicine.unit_price?.toLocaleString('vi-VN')} đ
                                <span className="text-xs text-neutral-500 font-normal ml-1">/ {medicine.unit}</span>
                            </span>
                        </div>
                        <div>
                            {isActive ? (
                                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Đang hoạt động
                                </span>
                            ) : (
                                <span className="px-3 py-1.5 rounded-xl bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700 text-xs font-bold flex items-center gap-1.5">
                                    <XCircle className="w-4 h-4" />
                                    Tạm ngừng
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Properties List */}
                    <div className="space-y-3 text-sm">
                        <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                            <Tag className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-xs font-semibold text-neutral-400 block">Hoạt Chất Chính</span>
                                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                                    {medicine.active_ingredient || 'Chưa cập nhật'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                            <Building2 className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-xs font-semibold text-neutral-400 block">Đường Dùng & Nhà Sản Xuất</span>
                                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                                    Đường {medicine.usage_route || 'Uống'} · {medicine.manufacturer || 'Chưa rõ nhà sản xuất'}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                            <FileText className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                            <div>
                                <span className="text-xs font-semibold text-neutral-400 block">Mô Tả / Chỉ Định</span>
                                <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed whitespace-pre-line">
                                    {medicine.description || 'Không có mô tả thêm.'}
                                </p>
                            </div>
                        </div>

                        {medicine.created_at && (
                            <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                                <Calendar className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-xs font-semibold text-neutral-400 block">Thời Gian Tạo Hệ Thống</span>
                                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                        {new Date(medicine.created_at).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                    >
                        Đóng
                    </button>
                    {onEdit && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                onEdit(medicine);
                            }}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
                        >
                            Chỉnh Sửa Dược Phẩm
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
