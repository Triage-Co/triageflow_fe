'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, Clock, ExternalLink, Loader2, Pencil, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { useRoomStore } from '../store/roomStore';
import { extractList, queueAdminService } from '../services/queueAdminService';
import { STEP_TYPE_LABELS, type RoomServiceStat } from '../types/queueRule.types';
import { getErrorMessage } from '../utils/errorMessage';

const MIN_MINUTES = 1;
const MAX_MINUTES = 120;

function clampMinutes(value: number): number {
    if (!Number.isFinite(value)) return MIN_MINUTES;
    return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(value)));
}

export function RoomStatsPanel() {
    const accessToken = useAuthStore((s) => s.accessToken);
    const { rooms, fetchRooms } = useRoomStore();

    const [stats, setStats] = useState<RoomServiceStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [roomFilter, setRoomFilter] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingMinutes, setEditingMinutes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    useEffect(() => {
        if (accessToken && rooms.length === 0) void fetchRooms(accessToken);
    }, [accessToken, rooms.length, fetchRooms]);

    const loadStats = useCallback(async () => {
        if (!accessToken) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await queueAdminService.getRoomStats(accessToken, roomFilter || undefined);
            setStats(extractList<RoomServiceStat>(res?.data));
        } catch (err) {
            setError(getErrorMessage(err, 'Không thể tải cấu hình thời gian phục vụ.'));
        } finally {
            setIsLoading(false);
        }
    }, [accessToken, roomFilter]);

    useEffect(() => {
        void loadStats();
    }, [loadStats]);

    const sortedRooms = useMemo(
        () => [...rooms].sort((a, b) => a.room_name.localeCompare(b.room_name, 'vi')),
        [rooms]
    );

    const roomNameFor = useCallback(
        (stat: RoomServiceStat) => stat.room?.room_name || rooms.find((r) => r.room_id === stat.room_id)?.room_name || '—',
        [rooms]
    );

    const startEdit = (stat: RoomServiceStat) => {
        setSaveError(null);
        setEditingId(stat.id);
        setEditingMinutes(String(Math.round(stat.default_duration_sec / 60)));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingMinutes('');
        setSaveError(null);
    };

    const handleSave = async (stat: RoomServiceStat) => {
        if (!accessToken) return;
        const minutes = clampMinutes(Number(editingMinutes));
        setIsSaving(true);
        setSaveError(null);
        try {
            await queueAdminService.updateRoomDefaultDuration(
                stat.room_id,
                { step_type: stat.step_type, default_duration_sec: minutes * 60 },
                accessToken
            );
            setEditingId(null);
            await loadStats();
        } catch (err) {
            setSaveError(getErrorMessage(err, 'Không thể cập nhật thời gian phục vụ.'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h2 className="text-[15px] font-bold text-neutral-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand-500" />
                        Thời gian phục vụ mặc định
                    </h2>
                    <p className="text-[12px] text-[#7B7B7B] font-medium mt-1">
                        Thời gian trung bình mỗi bước khám dùng để tính ETA hàng chờ (1–120 phút).
                    </p>
                </div>
                <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="text-sm font-medium border border-neutral-200 rounded-xl px-3 py-2 bg-white text-neutral-700 min-w-[200px]"
                >
                    <option value="">Tất cả phòng</option>
                    {sortedRooms.map((room) => (
                        <option key={room.room_id} value={room.room_id}>
                            {room.room_name}
                        </option>
                    ))}
                </select>
            </div>

            {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 whitespace-pre-line">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}
            {saveError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 whitespace-pre-line">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{saveError}</span>
                </div>
            )}

            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-12 flex flex-col items-center gap-2 text-neutral-500">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                        <span className="text-sm font-medium">Đang tải...</span>
                    </div>
                ) : stats.length === 0 ? (
                    <div className="p-12 text-center text-sm text-neutral-500">Chưa có dữ liệu thống kê phòng.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-neutral-50 border-b border-neutral-200 text-left text-xs font-bold text-neutral-500 uppercase tracking-wide">
                                <tr>
                                    <th className="px-4 py-3">Phòng</th>
                                    <th className="px-4 py-3">Bước khám</th>
                                    <th className="px-4 py-3 text-right">Mặc định (phút)</th>
                                    <th className="px-4 py-3 text-right">Trung bình thực tế</th>
                                    <th className="px-4 py-3 text-right">Số mẫu</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100">
                                {stats.map((stat) => {
                                    const isEditing = editingId === stat.id;
                                    return (
                                        <tr key={stat.id} className="hover:bg-neutral-50/80">
                                            <td className="px-4 py-3 font-semibold text-neutral-800">
                                                <div className="flex items-center gap-1.5">
                                                    {roomNameFor(stat)}
                                                    <Link
                                                        href={`/admin/rooms/${stat.room_id}`}
                                                        className="text-neutral-400 hover:text-brand-500"
                                                        title="Xem phòng"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-600 text-[12px]">
                                                {STEP_TYPE_LABELS[stat.step_type] || stat.step_type}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        min={MIN_MINUTES}
                                                        max={MAX_MINUTES}
                                                        autoFocus
                                                        value={editingMinutes}
                                                        onChange={(e) => setEditingMinutes(e.target.value)}
                                                        className="w-20 text-right border border-neutral-200 rounded-lg px-2 py-1 text-sm font-mono"
                                                    />
                                                ) : (
                                                    <span className="font-mono text-xs">
                                                        {Math.round(stat.default_duration_sec / 60)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs text-neutral-500">
                                                {stat.ema_duration_sec != null ? `${Math.round(stat.ema_duration_sec / 60)}p` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-xs text-neutral-500">
                                                {stat.sample_count}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end gap-1">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleSave(stat)}
                                                                disabled={isSaving}
                                                                className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 cursor-pointer disabled:opacity-50"
                                                                title="Lưu"
                                                            >
                                                                {isSaving ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    <Check className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelEdit}
                                                                disabled={isSaving}
                                                                className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-50 cursor-pointer disabled:opacity-50"
                                                                title="Hủy"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(stat)}
                                                            className={cn(
                                                                'p-2 rounded-lg text-neutral-400 hover:text-brand-500 hover:bg-neutral-50 cursor-pointer'
                                                            )}
                                                            title="Sửa thời gian"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
