'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
    ArrowLeft,
    Home,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useAuthStore } from '@/modules/auth/store/authStore';
import type { HospitalRoom, Specialty } from '../types/room.types';
import { roomService } from '../services/roomService';

/* ─── Specialty Helpers ─────────────────────────────────────────────────────── */

const getSpecialtyName = (room: HospitalRoom, specialties: Specialty[]): string => {
    if (room.specialty?.specialty_name) return room.specialty.specialty_name;
    const found = specialties.find((s) => s.specialty_id === room.specialty_id);
    if (found?.specialty_name) return found.specialty_name;
    if (room.specialty?.specialty_code) return room.specialty.specialty_code;
    if (found?.specialty_code) return found.specialty_code;
    return `ID: ${room.specialty_id.slice(0, 8)}…`;
};

/* ─── Component ──────────────────────────────────────────────────────────── */

export function AdminRoomDetailPage() {
    const router = useRouter();
    const params = useParams();
    const rawId = params.id;
    const roomId = Array.isArray(rawId) ? rawId[0] : rawId;

    const accessToken = useAuthStore((s) => s.accessToken);
    const { rooms, specialties, fetchRooms, fetchSpecialties } = useRoomStore();

    const [room, setRoom] = useState<HospitalRoom | null>(null);
    const [isFetchingDetail, setIsFetchingDetail] = useState(false);

    useEffect(() => {
        if (accessToken) {
            if (rooms.length === 0) {
                fetchRooms(accessToken);
            }
            if (specialties.length === 0) {
                fetchSpecialties(accessToken);
            }
        }
    }, [accessToken, rooms.length, specialties.length, fetchRooms, fetchSpecialties]);

    useEffect(() => {
        if (!accessToken || !roomId) {
            return;
        }

        const fromList = rooms.find((r) => r.room_id === roomId);

        const fetchDetail = async () => {
            try {
                setIsFetchingDetail(true);
                const res = await roomService.getRoomById(roomId, accessToken);
                if (res?.data) {
                    setRoom(res.data);
                }
            } catch {
                // Fallback UI below will handle not-found/error state.
                setRoom(fromList ?? null);
            } finally {
                setIsFetchingDetail(false);
            }
        };

        fetchDetail();
    }, [accessToken, roomId, rooms]);

    if (isFetchingDetail) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC]">
                <Loader2 className="w-8 h-8 animate-spin text-[#8B7CF6]" />
            </div>
        );
    }

    if (!room) {
        return (
            <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="flex items-center gap-3 mb-8">
                                <button
                                    onClick={() => router.push('/admin/rooms')}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer animate-fade-in"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                    Chi tiết phòng khám
                                </h1>
                            </div>
                            <div className="flex flex-col items-center justify-center py-16 gap-3">
                                <AlertCircle className="w-8 h-8 text-neutral-400" />
                                <p className="text-[14px] text-[#ADADAD] font-semibold">Không tìm thấy thông tin phòng khám.</p>
                                <button
                                    onClick={() => router.push('/admin/rooms')}
                                    className="px-4 py-2 bg-[#8B7CF6] text-white rounded-xl text-xs font-bold hover:bg-[#7a6ae5] transition cursor-pointer"
                                >
                                    Quay lại danh sách
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const specName = room.specialty?.specialty_name || specialties.find((s) => s.specialty_id === room.specialty_id)?.specialty_name || 'N/A';
    const specCode = room.specialty?.specialty_code || specialties.find((s) => s.specialty_id === room.specialty_id)?.specialty_code || 'N/A';

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6">
                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[16px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)]">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* ── Back + Title ── */}
                        <div className="flex items-center gap-3 mb-8">
                            <button
                                onClick={() => router.push('/admin/rooms')}
                                className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#EBEBEB] bg-white hover:bg-neutral-50 text-[#7B7B7B] hover:text-[#8B7CF6] transition cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <h1 className="text-[22px] font-bold text-[#2D2D2D] tracking-tight">
                                Chi tiết phòng khám
                            </h1>
                        </div>

                        {/* ── Detail Card ── */}
                        <div className="max-w-[540px] mx-auto bg-white rounded-3xl border border-[#EBEBEB] shadow-sm p-8">
                            {/* Room Header Icon */}
                            <div className="flex flex-col items-center justify-center gap-2 mb-8">
                                <div className="w-20 h-20 rounded-3xl bg-[#F5F2FF] border-2 border-white flex items-center justify-center shadow-sm select-none">
                                    <Home className="w-9 h-9 text-[#8B7CF6]" />
                                </div>
                                <h2 className="text-[18px] font-bold text-[#2D2D2D] mt-2">{room.room_name}</h2>
                                <span className="inline-flex items-center text-[10px] font-bold px-3 py-1 rounded-full border bg-[#F5F2FF] text-[#8B7CF6] border-[#E0DCFB]">
                                    {getSpecialtyName(room, specialties)}
                                </span>
                            </div>

                            {/* Info Fields */}
                            <div className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Tên phòng khám</label>
                                    <input
                                        type="text"
                                        value={room.room_name}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-[#2D2D2D] bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Tên chuyên khoa</label>
                                    <input
                                        type="text"
                                        value={specName}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Mã chuyên khoa</label>
                                    <input
                                        type="text"
                                        value={specCode}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-mono text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Mã Room ID (Hệ thống)</label>
                                    <input
                                        type="text"
                                        value={room.room_id}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-mono text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Mã liên kết bản đồ (Physical Room ID)</label>
                                    <input
                                        type="text"
                                        value={room.physical_room_id || 'Chưa liên kết bản đồ'}
                                        readOnly
                                        className="w-full text-xs border border-neutral-100 rounded-xl px-3.5 py-2.5 outline-none font-semibold text-neutral-500 bg-[#F8F9FA] cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            {/* Footer Action */}
                            <div className="mt-8 pt-6 border-t border-neutral-100">
                                <button
                                    onClick={() => router.push('/admin/rooms')}
                                    className="w-full py-3 bg-[#8B7CF6] hover:bg-[#7a6ae5] text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer text-center"
                                >
                                    Quay lại danh sách
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
