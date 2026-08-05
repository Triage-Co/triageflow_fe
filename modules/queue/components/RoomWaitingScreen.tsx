'use client';

import React, { useState, useEffect } from 'react';
import { useRoomDisplaySocket } from '../hooks/useRoomDisplaySocket';
import type { CallNextResponse } from '../types/queue.types';
import { useAuthStore } from '@/modules/auth/store/authStore';
import {
    Maximize2, Minimize2, RefreshCw, Volume2, VolumeX,
    Wifi, WifiOff,
} from 'lucide-react';

interface RoomWaitingScreenProps {
    roomId?: string;
    /** staff_id of the doctor assigned to this room — required for socket room join */
    staffId?: string;
}

export function RoomWaitingScreen({
    roomId: initialRoomId,
    staffId: initialStaffId,
}: RoomWaitingScreenProps) {
    const authUser = useAuthStore((s) => s.user);
    const accessToken = useAuthStore((s) => s.accessToken);

    const [roomId] = useState<string | undefined>(initialRoomId);
    const [staffId] = useState<string | undefined>(initialStaffId ?? authUser?.id);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [initialData, setInitialData] = useState<CallNextResponse | null>(null);

    // ── Socket.IO real-time connection ────────────────────────────────────────
    const { data: socketData, isConnected, error: socketError } = useRoomDisplaySocket({
        roomId,
        staffId: staffId ?? authUser?.id,
    });

    // ── Initial Fetch if Doctor is logged in ──────────────────────────────────
    useEffect(() => {
        if (!accessToken) return;
        const todayStr = new Date().toISOString().slice(0, 10);

        import('@/shared/services/apiClient').then(({ apiClient }) => {
            apiClient
                .get<any[]>(`/api/doctor/patients?date=${todayStr}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                    suppressLogError: true,
                })
                .then((res) => {
                    const list = Array.isArray(res?.data) ? res.data : [];
                    if (list.length === 0) return;

                    const first = list[0];
                    const roomName = first?.step?.room?.room_name || (roomId ? `PHÒNG ${roomId.toUpperCase()}` : 'PHÒNG 101');
                    const specialtyName = first?.step?.room?.specialty?.specialty_name || 'KHOA KHÁM BỆNH';
                    const current = list.find(
                        (p) => p.status === 'CALLING' || p.status === 'IN_PROGRESS' || p.status === 'PROCESSING'
                    );
                    const upcoming = list.filter(
                        (p) => p.status === 'PENDING' || p.status === 'WAITING'
                    );

                    setInitialData({
                        room_info: {
                            room_name: roomName,
                            specialty_name: specialtyName,
                            doctor_name: authUser?.fullName || (authUser as any)?.full_name || 'BS. Lê Văn An',
                        },
                        current_patient: current
                            ? {
                                  queue_id: current.queue_id,
                                  queue_number: current.queue_number,
                                  patient_name: current.step?.flow?.booking?.patient?.account?.full_name || 'Bệnh nhân',
                                  status: current.status,
                              }
                            : null,
                        upcoming_patients: upcoming.map((p) => ({
                            queue_id: p.queue_id,
                            queue_number: p.queue_number,
                            patient_name: p.step?.flow?.booking?.patient?.account?.full_name || 'Bệnh nhân',
                            status: p.status,
                        })),
                    });
                })
                .catch(() => null);
        });
    }, [accessToken, authUser, roomId]);

    // ── Live Clock ────────────────────────────────────────────────────────────
    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => { });
        } else {
            document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => { });
        }
    };

    const formatVietnameseDate = (date: Date | null) => {
        if (!date) return '';
        const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
        const dayName = days[date.getDay()];
        const dd = String(date.getDate()).padStart(2, '0');
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${dayName}, ngày ${dd}/${mm}/${yyyy}`;
    };

    const formatTime = (date: Date | null) => {
        if (!date) return '';
        return [
            String(date.getHours()).padStart(2, '0'),
            String(date.getMinutes()).padStart(2, '0'),
            String(date.getSeconds()).padStart(2, '0'),
        ].join(':');
    };

    // ── Map socket data to display data (with fallback when waiting for socket) ─
    const activeData = socketData ?? initialData ?? {
        room_info: {
            room_name: roomId ? `PHÒNG ${String(roomId).toUpperCase()}` : 'PHÒNG KHÁM',
            specialty_name: 'KHOA KHÁM BỆNH',
            doctor_name: authUser?.fullName || (authUser as any)?.full_name || 'BS. Đang trực',
        },
        current_patient: null,
        upcoming_patients: [],
    };

    const room = {
        roomName: activeData.room_info?.room_name?.toUpperCase() ?? 'PHÒNG KHÁM',
        department: activeData.room_info?.specialty_name?.toUpperCase() ?? 'KHOA KHÁM BỆNH',
        doctorName: activeData.room_info?.doctor_name || authUser?.fullName || (authUser as any)?.full_name || 'BS. Đang trực',
    };

    const currentPatient = activeData.current_patient
        ? {
            queueNumber: String(activeData.current_patient.queue_number),
            patientName: activeData.current_patient.patient_name,
            status: String(activeData.current_patient.status ?? '').toUpperCase(),
        }
        : null;

    // current_patient and any past patients (queue_number <= current) must never appear in upcoming
    const currentQueueNumberStr = currentPatient?.queueNumber ? String(currentPatient.queueNumber).replace(/^0+/, '') : '';
    const currentNumVal = parseInt(currentQueueNumberStr, 10);

    const upcomingPatients = (activeData.upcoming_patients ?? [])
        .filter((p) => {
            if (!p) return false;
            const pNumStr = String(p.queue_number).replace(/^0+/, '') || '0';
            const pNumVal = parseInt(pNumStr, 10);
            const pStatus = String(p.status ?? '').toUpperCase();

            if (currentQueueNumberStr && pNumStr === currentQueueNumberStr) return false;
            if (pStatus === 'COMPLETED' || pStatus === 'DONE' || pStatus === 'IN_PROGRESS' || pStatus === 'CALLING') return false;

            if (!isNaN(currentNumVal) && currentNumVal > 0 && !isNaN(pNumVal) && pNumVal <= currentNumVal) {
                return false;
            }

            return true;
        })
        .map((p, idx) => ({
            id: p.queue_id ? String(p.queue_id) : `socket-${idx}`,
            queueNumber: String(p.queue_number),
            patientName: p.patient_name,
        }));

    const displayUpcoming = upcomingPatients;
    /** CALLING = vừa gọi vào phòng; IN_PROGRESS = đang khám */
    const currentStatusLabel = !currentPatient
        ? 'SẮN SÀNG ĐÓN BỆNH NHÂN'
        : currentPatient.status === 'CALLING'
        ? 'ĐANG GỌI BỆNH NHÂN'
        : 'ĐANG KHÁM BỆNH';

    const leftColumn = displayUpcoming.filter((_, idx) => idx % 2 === 0);
    const rightColumn = displayUpcoming.filter((_, idx) => idx % 2 === 1);

    return (
        /* h-screen + overflow-hidden = khóa chặt trong viewport, không scroll */
        <div className="relative h-screen w-screen flex flex-col font-sans select-none overflow-hidden" style={{ background: 'linear-gradient(160deg, #DFE1FF 0%, #DFE1FF 45%, #F0D2C1 100%)' }}>

            {/* ── Controls overlay (ẩn, chỉ hiện khi hover) ── */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-end gap-1 px-3 pt-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                {/* Socket status indicator */}
                <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full mr-2 ${isConnected ? 'bg-emerald-100/80 text-emerald-700' : 'bg-red-100/80 text-red-600'}`}>
                    {isConnected
                        ? <><Wifi className="w-3 h-3" /> LIVE</>
                        : <><WifiOff className="w-3 h-3" /> {socketError ? 'Lỗi kết nối' : 'Đang kết nối...'}</>
                    }
                </div>
                <button onClick={() => setSoundEnabled(!soundEnabled)} title="Âm thanh" className="p-1.5 rounded hover:bg-black/10 text-neutral-500 transition">
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button onClick={toggleFullscreen} title="Toàn màn hình" className="p-1.5 rounded hover:bg-black/10 text-neutral-500 transition">
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
            </div>

            {/* ── 1. HEADER BANNER ── */}
            <div className="shrink-0 bg-gradient-to-r from-[#709CE4] via-[#7DA7EC] to-[#709CE4] text-white px-8 py-6 flex items-center justify-between shadow-md">
                {/* Tên khoa float trái */}
                <div className="text-left flex-1">
                    <span className="text-base sm:text-xl md:text-2xl tracking-[0.15em] font-black text-white/90 uppercase block leading-tight">
                        {room.department}
                    </span>
                </div>

                {/* Bác sĩ ở giữa */}
                <div className="text-center flex-1 px-4">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide text-white drop-shadow-sm">
                        {room.doctorName}
                    </h2>
                </div>

                {/* Tên phòng float phải */}
                <div className="text-right flex-1">
                    <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight drop-shadow-sm leading-none uppercase">
                        {room.roomName}
                    </h1>
                </div>
            </div>

            {/* ── 2. CURRENT PATIENT — flex-1 = chiếm hết không gian còn lại ── */}
            <div className="flex-1 flex flex-col items-center justify-center py-2 px-4 text-center overflow-hidden">
                {/* Status pill */}
                <div className="flex items-center justify-center gap-2 text-[#6B5FD6] font-black text-lg tracking-[0.35em] uppercase mb-1">
                    <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6B5FD6] opacity-60" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#6B5FD6]" />
                    </span>
                    <span>{currentStatusLabel}</span>
                    <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6B5FD6] opacity-60" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#6B5FD6]" />
                    </span>
                </div>

                {/* Ticket Number — siêu lớn phục vụ kiosk */}
                <div
                    className="font-black text-[#6B5FD6]/70 tracking-widest leading-none drop-shadow-sm"
                    style={{ fontSize: 'clamp(100px, 24vw, 240px)' }}
                >
                    {currentPatient?.queueNumber ?? '---'}
                </div>

                {/* Patient Name */}
                <div
                    className="font-extrabold text-[#2D1F5E] tracking-tight mt-1"
                    style={{ fontSize: 'clamp(32px, 5.5vw, 68px)' }}
                >
                    {currentPatient?.patientName ?? 'Chưa có bệnh nhân'}
                </div>

                {/* Socket connection badge — shown when not connected */}
                {!isConnected && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50/80 border border-amber-200 px-4 py-2 rounded-full">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {socketError ?? 'Đang kết nối tới máy chủ real-time...'}
                    </div>
                )}
            </div>

            {/* ── 3. UPCOMING QUEUE ── */}
            <div className="shrink-0 bg-white/40 backdrop-blur-sm border-t border-black/10 px-8 md:px-16 py-5">
                <div className="text-base sm:text-lg md:text-xl font-black tracking-[0.25em] text-black uppercase mb-3 pb-2.5 border-b-2 border-black/20">
                    SẮP TỚI LƯỢT
                </div>
                <div className="grid grid-cols-2 gap-x-12 md:gap-x-24">
                    {/* Left column */}
                    <div className="flex flex-col">
                        {leftColumn.map((p, idx) => (
                            <div
                                key={p.id}
                                className={`flex items-center gap-4 py-3.5 text-xl sm:text-2xl md:text-3xl font-bold ${idx < leftColumn.length - 1 ? 'border-b border-black/10' : ''}`}
                            >
                                <span className="text-black font-black min-w-[5rem]">{p.queueNumber}</span>
                                <span className="text-black/30 font-normal shrink-0">—</span>
                                <span className="text-black font-semibold truncate">{p.patientName}</span>
                            </div>
                        ))}
                    </div>
                    {/* Right column */}
                    <div className="flex flex-col">
                        {rightColumn.map((p, idx) => (
                            <div
                                key={p.id}
                                className={`flex items-center gap-4 py-3.5 text-xl sm:text-2xl md:text-3xl font-bold ${idx < rightColumn.length - 1 ? 'border-b border-black/10' : ''}`}
                            >
                                <span className="text-black font-black min-w-[5rem]">{p.queueNumber}</span>
                                <span className="text-black/30 font-normal shrink-0">—</span>
                                <span className="text-black font-semibold truncate">{p.patientName}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── 4. FOOTER ── */}
            <div className="shrink-0 bg-white/30 backdrop-blur-sm border-t border-black/10 px-8 md:px-12 py-3 flex items-center justify-between">
                <div className="text-base sm:text-lg font-medium text-black/70">
                    {formatVietnameseDate(currentTime)}
                </div>
                {/* Socket live indicator in footer */}
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-colors ${isConnected ? 'text-emerald-600' : 'text-amber-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-bounce'}`} />
                    {isConnected ? 'LIVE' : 'Reconnecting...'}
                </div>
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wider font-mono text-black">
                    {formatTime(currentTime)}
                </div>
            </div>
        </div>
    );
}
