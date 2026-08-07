'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HospitalRoom } from '../types/room.types';
import type { Staff } from '../types/staff.types';
import type { BulkWeeklyAssignment, BulkWeeklyResult } from '../types/shift.types';
import { shiftService } from '../services/shiftService';
import { filterEligibleStaffForRoom, getMondayOfWeek, DAY_OF_WEEK_LABELS, BULK_WEEKLY_MAX_SLOTS } from '../utils/shiftValidation';
import { getErrorMessage } from '../utils/errorMessage';

interface BulkWeeklyShiftModalProps {
    rooms: HospitalRoom[];
    staffs: Staff[];
    accessToken: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

function todayMonday(): string {
    return getMondayOfWeek(new Date().toISOString().split('T')[0]);
}

export function BulkWeeklyShiftModal({ rooms, staffs, accessToken, onClose, onSuccess }: BulkWeeklyShiftModalProps) {
    const [weekStartInput, setWeekStartInput] = useState(todayMonday());
    const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4]);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('17:00');
    const [assignments, setAssignments] = useState<BulkWeeklyAssignment[]>([]);
    const [skipConflicts, setSkipConflicts] = useState(true);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [result, setResult] = useState<BulkWeeklyResult | null>(null);

    const weekStart = useMemo(() => getMondayOfWeek(weekStartInput) || weekStartInput, [weekStartInput]);
    const isSnappedToMonday = weekStart === weekStartInput;

    const totalSlots = assignments.length * selectedDays.length;
    const exceedsCap = totalSlots > BULK_WEEKLY_MAX_SLOTS;

    const toggleDay = (dayIdx: number) => {
        setSelectedDays((prev) =>
            prev.includes(dayIdx) ? prev.filter((d) => d !== dayIdx) : [...prev, dayIdx].sort((a, b) => a - b)
        );
    };

    const addAssignmentRow = () => {
        setAssignments((prev) => [...prev, { room_id: '', staff_id: '' }]);
    };

    const updateAssignment = (idx: number, patch: Partial<BulkWeeklyAssignment>) => {
        setAssignments((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
    };

    const removeAssignment = (idx: number) => {
        setAssignments((prev) => prev.filter((_, i) => i !== idx));
    };

    const eligibleStaffFor = (roomId: string) => {
        const room = rooms.find((r) => r.room_id === roomId);
        return filterEligibleStaffForRoom(staffs, room);
    };

    const handleSubmit = async () => {
        setFormError(null);
        setResult(null);

        if (!accessToken) return;
        if (!isMondayCheck(weekStartInput)) {
            setFormError('Ngày bắt đầu tuần phải là Thứ 2. Đã tự động chuyển về Thứ 2 gần nhất — vui lòng kiểm tra lại.');
            return;
        }
        if (selectedDays.length === 0) {
            setFormError('Vui lòng chọn ít nhất một ngày trong tuần.');
            return;
        }
        if (!startTime || !endTime || startTime >= endTime) {
            setFormError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.');
            return;
        }
        const validAssignments = assignments.filter((a) => a.room_id && a.staff_id);
        if (validAssignments.length === 0) {
            setFormError('Vui lòng thêm ít nhất một cặp phòng — nhân viên.');
            return;
        }
        if (validAssignments.length !== assignments.length) {
            setFormError('Vui lòng chọn đầy đủ phòng và nhân viên cho mỗi dòng, hoặc xóa dòng chưa hoàn tất.');
            return;
        }
        const slots = validAssignments.length * selectedDays.length;
        if (slots > BULK_WEEKLY_MAX_SLOTS) {
            setFormError(`Tổng số ca (${slots}) vượt quá giới hạn ${BULK_WEEKLY_MAX_SLOTS} ca/lần. Vui lòng giảm số phòng/ngày.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await shiftService.bulkWeekly(
                {
                    week_start: weekStart,
                    days: selectedDays,
                    start_time: startTime,
                    end_time: endTime,
                    assignments: validAssignments,
                    skip_conflicts: skipConflicts,
                },
                accessToken
            );
            setResult(res?.data || { created: 0, skipped: [], errors: [] });
            onSuccess();
        } catch (err) {
            setFormError(getErrorMessage(err, 'Không thể tạo ca trực hàng loạt.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    function isMondayCheck(dateStr: string): boolean {
        return getMondayOfWeek(dateStr) === dateStr;
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] shadow-2xl border border-neutral-100 flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 shrink-0">
                    <div>
                        <h2 className="text-[17px] font-bold text-[#2D2D2D]">Tạo ca trực theo tuần</h2>
                        <p className="text-[12px] text-[#7B7B7B] font-medium mt-0.5">
                            Phân công nhiều phòng/nhân viên cùng lúc cho một tuần làm việc
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
                                    Bỏ qua {result.skipped.length} ca do trùng lịch (conflict) — nhân viên/phòng đã có ca trong khung giờ đó.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Tuần bắt đầu (Thứ 2) *</label>
                            <input
                                type="date"
                                value={weekStartInput}
                                onChange={(e) => setWeekStartInput(e.target.value)}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                            {!isSnappedToMonday && weekStartInput && (
                                <p className="text-[11px] text-amber-600 font-semibold">
                                    Sẽ dùng Thứ 2 gần nhất: {weekStart}
                                </p>
                            )}
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Bỏ qua ca trùng lịch</label>
                            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 h-[38px]">
                                <input
                                    type="checkbox"
                                    checked={skipConflicts}
                                    onChange={(e) => setSkipConflicts(e.target.checked)}
                                    className="accent-[#8B7CF6]"
                                />
                                Bỏ qua và báo cáo thay vì hủy toàn bộ
                            </label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-neutral-500 uppercase">Ngày trong tuần *</label>
                        <div className="flex flex-wrap gap-2">
                            {DAY_OF_WEEK_LABELS.map((label, idx) => (
                                <button
                                    type="button"
                                    key={label}
                                    onClick={() => toggleDay(idx)}
                                    className={cn(
                                        'px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer',
                                        selectedDays.includes(idx)
                                            ? 'bg-[#8B7CF6] border-[#8B7CF6] text-white'
                                            : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giờ bắt đầu *</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Giờ kết thúc *</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 focus:border-[#8B7CF6] outline-none bg-white font-semibold text-[#2D2D2D]"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold text-neutral-500 uppercase">Phân công phòng — nhân viên *</label>
                            <button
                                type="button"
                                onClick={addAssignmentRow}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#8B7CF6] hover:underline cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                Thêm dòng
                            </button>
                        </div>

                        {assignments.length === 0 ? (
                            <p className="text-xs text-neutral-400 font-medium py-4 text-center border border-dashed border-neutral-200 rounded-xl">
                                Chưa có phân công nào — bấm &quot;Thêm dòng&quot; để bắt đầu.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {assignments.map((a, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <select
                                            value={a.room_id}
                                            onChange={(e) => updateAssignment(idx, { room_id: e.target.value, staff_id: '' })}
                                            className="flex-1 text-xs border border-neutral-200 rounded-xl px-3 py-2.5 bg-white font-semibold text-[#2D2D2D]"
                                        >
                                            <option value="">— Chọn phòng —</option>
                                            {rooms.map((r) => (
                                                <option key={r.room_id} value={r.room_id}>
                                                    {r.room_name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={a.staff_id}
                                            onChange={(e) => updateAssignment(idx, { staff_id: e.target.value })}
                                            disabled={!a.room_id}
                                            className="flex-1 text-xs border border-neutral-200 rounded-xl px-3 py-2.5 bg-white font-semibold text-[#2D2D2D] disabled:opacity-50"
                                        >
                                            <option value="">— Chọn nhân viên —</option>
                                            {eligibleStaffFor(a.room_id).map((st) => (
                                                <option key={st.staff_id} value={st.staff_id}>
                                                    {st.full_name}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => removeAssignment(idx)}
                                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition cursor-pointer shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div
                        className={cn(
                            'flex items-center gap-2 rounded-xl border p-3.5 text-[12px] font-bold',
                            exceedsCap ? 'bg-red-50 border-red-200 text-red-700' : 'bg-[#F5F2FF] border-[#E0DCFB] text-[#5B4ED6]'
                        )}
                    >
                        {exceedsCap && <AlertTriangle className="w-4 h-4 shrink-0" />}
                        Tổng cộng: {assignments.length} phân công × {selectedDays.length} ngày = {totalSlots} ca trực
                        {exceedsCap && ` (vượt giới hạn ${BULK_WEEKLY_MAX_SLOTS})`}
                    </div>
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
                        disabled={isSubmitting || exceedsCap}
                        className="flex-1 py-2.5 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Tạo {totalSlots > 0 ? `${totalSlots} ` : ''}ca trực
                    </button>
                </div>
            </div>
        </div>
    );
}
