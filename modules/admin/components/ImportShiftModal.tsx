'use client';

import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HospitalRoom, Specialty } from '../types/room.types';
import type { Staff } from '../types/staff.types';
import type { BulkWeeklyResult, Shift } from '../types/shift.types';
import { shiftService } from '../services/shiftService';
import { getErrorMessage } from '../utils/errorMessage';
import { loadShiftsForDateRange, shiftDateKey } from '../utils/shiftValidation';
import {
    downloadShiftImportTemplate,
    parseShiftImportFile,
    resolveShiftImportRows,
    type ResolvedShiftImportRow,
} from '../utils/parseShiftImportFile';

interface ImportShiftModalProps {
    rooms: HospitalRoom[];
    staffs: Staff[];
    specialties: Specialty[];
    shifts: Shift[];
    accessToken: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function ImportShiftModal({
    rooms,
    staffs,
    specialties,
    shifts,
    accessToken,
    onClose,
    onSuccess,
}: ImportShiftModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [rows, setRows] = useState<ResolvedShiftImportRow[]>([]);
    const [formError, setFormError] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<BulkWeeklyResult | null>(null);
    const [skipConflicts, setSkipConflicts] = useState(true);

    const validRows = rows.filter((r) => !r.error && r.staff_id && r.room_id);
    const errorRows = rows.filter((r) => r.error);

    const resetPreview = () => {
        setRows([]);
        setResult(null);
        setFormError(null);
    };

    const handleFile = async (file: File | undefined) => {
        if (!file) return;
        setFileName(file.name);
        resetPreview();
        setIsParsing(true);
        try {
            const parsed = await parseShiftImportFile(file);
            const dates = parsed
                .map((row) => shiftDateKey(row.date))
                .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
                .sort();
            let existing = shifts;
            if (accessToken && dates.length > 0) {
                existing = await loadShiftsForDateRange(accessToken, dates[0], dates[dates.length - 1]);
            }
            setRows(resolveShiftImportRows(parsed, staffs, rooms, specialties, existing));
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Không đọc được file.');
        } finally {
            setIsParsing(false);
        }
    };

    const handleSubmit = async () => {
        setFormError(null);
        setResult(null);
        if (!accessToken) return;
        if (validRows.length === 0) {
            setFormError('Không có dòng hợp lệ để tạo ca trực.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await shiftService.bulkImport(
                {
                    items: validRows.map((row) => ({
                        staff_id: row.staff_id!,
                        room_id: row.room_id!,
                        date: row.date,
                        start_time: row.start_time,
                        end_time: row.end_time,
                    })),
                    skip_conflicts: skipConflicts,
                },
                accessToken
            );
            setResult(res?.data || { created: 0, skipped: [], errors: [] });
            onSuccess();
        } catch (err) {
            setFormError(getErrorMessage(err, 'Không thể import ca trực.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[92vh] shadow-2xl border border-neutral-100 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
                    <div>
                        <h2 className="text-[17px] font-bold text-[#2D2D2D]">Import ca trực từ file</h2>
                        <p className="text-[12px] text-[#7B7B7B] font-medium mt-0.5">
                            Tải CSV hoặc Excel, xem trước rồi xác nhận để tạo hàng loạt
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {formError && (
                        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 whitespace-pre-line">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-red-700 font-semibold">{formError}</span>
                        </div>
                    )}

                    {result && (
                        <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                Đã tạo {result.created} ca trực thành công.
                            </div>
                            {result.skipped.length > 0 && (
                                <div className="text-[12px] text-amber-700 font-semibold">
                                    Bỏ qua {result.skipped.length} ca do trùng lịch hoặc lỗi — nhân viên/phòng đã có ca trong khung giờ đó.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button
                            type="button"
                            onClick={downloadShiftImportTemplate}
                            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#8B7CF6] hover:underline cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Tải file mẫu (.csv)
                        </button>
                        <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                            <input
                                type="checkbox"
                                checked={skipConflicts}
                                onChange={(e) => setSkipConflicts(e.target.checked)}
                                className="accent-[#8B7CF6]"
                            />
                            Bỏ qua ca trùng lịch
                        </label>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        className="hidden"
                        onChange={(e) => {
                            void handleFile(e.target.files?.[0]);
                            e.target.value = '';
                        }}
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isParsing}
                        className="w-full rounded-2xl border border-dashed border-[#8B7CF6]/40 bg-[#F5F2FF]/50 hover:bg-[#F5F2FF] px-4 py-8 flex flex-col items-center gap-2 cursor-pointer transition disabled:opacity-60"
                    >
                        {isParsing ? (
                            <Loader2 className="w-6 h-6 animate-spin text-[#8B7CF6]" />
                        ) : (
                            <Upload className="w-6 h-6 text-[#8B7CF6]" />
                        )}
                        <span className="text-[13px] font-bold text-[#2D2D2D]">
                            {fileName || 'Chọn file CSV hoặc Excel'}
                        </span>
                        <span className="text-[11px] text-[#7B7B7B] font-medium">
                            Cột: email, room_name, date, start_time, end_time
                        </span>
                    </button>

                    {rows.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[12px] font-bold text-[#2D2D2D]">
                                    <FileSpreadsheet className="w-4 h-4 text-[#8B7CF6]" />
                                    Xem trước {rows.length} dòng
                                </div>
                                <p className="text-[11px] font-semibold text-[#7B7B7B]">
                                    {validRows.length} hợp lệ · {errorRows.length} lỗi
                                </p>
                            </div>

                            <div className="max-h-[320px] overflow-auto rounded-xl border border-[#EBEBEB]">
                                <table className="w-full text-left text-[11px]">
                                    <thead className="sticky top-0 bg-neutral-50 border-b border-[#EBEBEB]">
                                        <tr>
                                            <th className="px-3 py-2 font-bold text-[#7B7B7B]">Dòng</th>
                                            <th className="px-3 py-2 font-bold text-[#7B7B7B]">Email</th>
                                            <th className="px-3 py-2 font-bold text-[#7B7B7B]">Phòng</th>
                                            <th className="px-3 py-2 font-bold text-[#7B7B7B]">Ngày</th>
                                            <th className="px-3 py-2 font-bold text-[#7B7B7B]">Giờ</th>
                                            <th className="px-3 py-2 font-bold text-[#7B7B7B]">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100">
                                        {rows.map((row) => (
                                            <tr key={row.rowNumber} className={cn(row.error ? 'bg-red-50/40' : 'bg-white')}>
                                                <td className="px-3 py-2 font-semibold text-[#7B7B7B]">{row.rowNumber}</td>
                                                <td className="px-3 py-2 font-semibold text-[#2D2D2D]">
                                                    {row.staff_name ? `${row.staff_name} · ${row.email}` : row.email}
                                                </td>
                                                <td className="px-3 py-2 font-semibold text-[#2D2D2D]">{row.room_name}</td>
                                                <td className="px-3 py-2 font-semibold text-[#2D2D2D]">{row.date}</td>
                                                <td className="px-3 py-2 font-semibold text-[#2D2D2D]">
                                                    {row.start_time} – {row.end_time}
                                                </td>
                                                <td className="px-3 py-2">
                                                    {row.error ? (
                                                        <span className="text-red-600 font-semibold">{row.error}</span>
                                                    ) : (
                                                        <span className="text-emerald-600 font-semibold">Hợp lệ</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-neutral-100 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-500 transition cursor-pointer"
                    >
                        Đóng
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={isSubmitting || isParsing || validRows.length === 0 || !!result}
                        className="flex-1 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Xác nhận tạo {validRows.length > 0 ? `${validRows.length} ` : ''}ca
                    </button>
                </div>
            </div>
        </div>
    );
}
