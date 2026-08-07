'use client';

import { AlertTriangle, Loader2, X } from 'lucide-react';

export interface SoftDisableConfirmDialogProps {
    /** Entity display name, e.g. service_name / specialty_name */
    entityName: string;
    /** Current is_active state of the entity BEFORE the action */
    isActive: boolean;
    isSubmitting?: boolean;
    /** message (+ optional detail) resolved from a 409 ApiError */
    error?: string | null;
    onConfirm: () => void;
    onCancel: () => void;
    /** Optional override copy */
    title?: string;
    description?: string;
}

/**
 * Shared confirm dialog for the soft-disable UX convention used across admin screens:
 * primary action is "Vô hiệu hóa" / "Kích hoạt" (never hard delete), and any 409 from
 * the API is surfaced with its message + detail.
 */
export function SoftDisableConfirmDialog({
    entityName,
    isActive,
    isSubmitting,
    error,
    onConfirm,
    onCancel,
    title,
    description,
}: SoftDisableConfirmDialogProps) {
    const actionLabel = isActive ? 'Vô hiệu hóa' : 'Kích hoạt';
    const resolvedTitle = title || `Xác nhận ${actionLabel.toLowerCase()}`;
    const resolvedDescription =
        description ||
        (isActive
            ? `"${entityName}" sẽ bị vô hiệu hóa và ẩn khỏi các danh sách chọn mới. Có thể kích hoạt lại bất cứ lúc nào.`
            : `"${entityName}" sẽ được kích hoạt trở lại và xuất hiện trong các danh sách chọn.`);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-neutral-100 p-6 flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <div
                        className={
                            isActive
                                ? 'w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0'
                                : 'w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0'
                        }
                    >
                        <AlertTriangle className={isActive ? 'w-5 h-5 text-red-500' : 'w-5 h-5 text-emerald-600'} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-neutral-900 text-[16px]">{resolvedTitle}</h3>
                        <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">{resolvedDescription}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 shrink-0 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <span className="text-[12px] text-red-700 font-semibold whitespace-pre-line">{error}</span>
                    </div>
                )}

                <div className="flex gap-3 pt-1">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className={
                            isActive
                                ? 'flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50'
                                : 'flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50'
                        }
                    >
                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
