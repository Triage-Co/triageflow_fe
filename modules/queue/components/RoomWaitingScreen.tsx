'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRoomDisplaySocket } from '../hooks/useRoomDisplaySocket';
import { useQueueSound } from '../hooks/useQueueSound';
import { AnimatedQueueNumber } from './AnimatedQueueNumber';
import { RebalanceBanner } from './RebalanceBanner';
import { useAuthStore } from '@/modules/auth/store/authStore';
import {
    Maximize2, Minimize2, RefreshCw, Volume2, VolumeX,
    Wifi, WifiOff, Stethoscope, Clock, Calendar, Shuffle
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

    const [roomId] = useState<string | undefined>(initialRoomId);
    const [staffId] = useState<string | undefined>(initialStaffId ?? authUser?.id);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [blinkColon, setBlinkColon] = useState<boolean>(true);

    // ── Sound & Audio Chime Hook ──────────────────────────────────────────────
    const { soundEnabled, setSoundEnabled, playDing, isAudioBlocked, enableAudio } = useQueueSound();

    // ── Socket.IO real-time connection ────────────────────────────────────────
    const { data: socketData, rebalanceSuggestions, isConnected, error: socketError } = useRoomDisplaySocket({
        roomId,
        staffId: staffId ?? authUser?.id,
    });

    // Track queue number changes to trigger chime bell sound
    const prevQueueNumberRef = useRef<string | null>(null);

    useEffect(() => {
        const currentNum = socketData?.current_patient?.queue_number
            ? String(socketData.current_patient.queue_number).trim()
            : null;

        if (prevQueueNumberRef.current !== null && currentNum !== null && currentNum !== prevQueueNumberRef.current) {
            playDing();
        }
        if (currentNum !== null) {
            prevQueueNumberRef.current = currentNum;
        }
    }, [socketData?.current_patient?.queue_number, playDing]);

    // ── Live Clock ────────────────────────────────────────────────────────────
    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setBlinkColon((prev) => !prev);
        }, 1000);
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
        if (!date) return { hh: '00', mm: '00', ss: '00' };
        return {
            hh: String(date.getHours()).padStart(2, '0'),
            mm: String(date.getMinutes()).padStart(2, '0'),
            ss: String(date.getSeconds()).padStart(2, '0'),
        };
    };

    // ── Map socket data to display data ───────────────────────────────────────
    const activeData = socketData ?? {
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

    const displayUpcoming = (activeData.upcoming_patients ?? []).map((p, idx) => ({
        id: p.queue_id ? String(p.queue_id) : `socket-${idx}`,
        queueNumber: String(p.queue_number),
        patientName: p.patient_name,
        etaMinutes: p.eta_minutes,
        queueType: p.queue_type,
        position: idx + 1,
    }));

    /** CALLING = vừa gọi vào phòng; IN_PROGRESS = đang khám */
    const currentStatusLabel = !currentPatient
        ? 'SẮN SÀNG ĐÓN BỆNH NHÂN'
        : currentPatient.status === 'CALLING'
        ? 'ĐANG GỌI BỆNH NHÂN'
        : 'ĐANG KHÁM BỆNH';

    const leftColumn = displayUpcoming.filter((_, idx) => idx % 2 === 0);
    const rightColumn = displayUpcoming.filter((_, idx) => idx % 2 === 1);
    const clock = formatTime(currentTime);

    return (
        /* h-screen + overflow-hidden = khóa chặt trong viewport, không scroll */
        <div className="relative h-screen w-screen flex flex-col font-sans select-none overflow-hidden" style={{ background: 'linear-gradient(160deg, #DFE1FF 0%, #DFE1FF 45%, #F0D2C1 100%)' }}>

            {/* ── Controls overlay (hidden by default, revealed on hover) ── */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                {/* Audio Unblock Prompt */}
                {isAudioBlocked ? (
                    <button
                        onClick={enableAudio}
                        className="flex items-center gap-2 text-xs font-extrabold px-3 py-1.5 rounded-full bg-amber-500 text-amber-950 shadow-md animate-bounce"
                    >
                        <Volume2 className="w-4 h-4" /> Bấm để bật chuông gọi số
                    </button>
                ) : (
                    <div />
                )}

                <div className="flex items-center gap-2">
                    {/* Socket status indicator */}
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${isConnected ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300' : 'bg-red-100/90 text-red-700 border border-red-300'}`}>
                        {isConnected
                            ? <><Wifi className="w-3 h-3" /> LIVE</>
                            : <><WifiOff className="w-3 h-3" /> {socketError ? 'Lỗi kết nối' : 'Đang kết nối...'}</>
                        }
                    </div>
                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        title="Âm thanh"
                        className="p-2 rounded-xl bg-white/40 hover:bg-white/70 text-neutral-700 backdrop-blur-md transition shadow-sm"
                    >
                        {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-red-500" />}
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        title="Toàn màn hình"
                        className="p-2 rounded-xl bg-white/40 hover:bg-white/70 text-neutral-700 backdrop-blur-md transition shadow-sm"
                    >
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* ── 1. HEADER BANNER ── */}
            <div className="shrink-0 bg-gradient-to-r from-[#6997E5] via-[#7AA6F0] to-[#6997E5] text-white px-8 py-5 flex items-center justify-between shadow-md">
                {/* Tên khoa float trái */}
                <div className="text-left flex-1">
                    <span className="text-base sm:text-xl md:text-2xl tracking-[0.15em] font-black text-white/90 uppercase block leading-tight">
                        {room.department}
                    </span>
                </div>

                {/* Bác sĩ ở giữa */}
                <div className="text-center flex-1 px-4 flex items-center justify-center gap-2">
                    <Stethoscope className="w-7 h-7 text-white/80 shrink-0" />
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide text-white drop-shadow-sm truncate">
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

            {/* ── 1.5 REBALANCE BANNER (Phase 4) ── */}
            <RebalanceBanner suggestions={rebalanceSuggestions} currentRoomId={roomId} />

            {/* ── 2. CURRENT PATIENT (Phase 3 Animated Component) ── */}
            <AnimatedQueueNumber
                queueNumber={currentPatient?.queueNumber ?? '---'}
                patientName={currentPatient?.patientName ?? 'Chưa có bệnh nhân'}
                statusLabel={currentStatusLabel}
                status={currentPatient?.status ?? ''}
            />

            {/* Socket disconnected warning overlay */}
            {!isConnected && (
                <div className="shrink-0 mx-auto mb-2 flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-4 py-1.5 rounded-full shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {socketError ?? 'Đang kết nối lại máy chủ real-time...'}
                </div>
            )}

            {/* ── 3. UPCOMING QUEUE (Phase 4 ETA & Badges) ── */}
            <div className="shrink-0 bg-white/40 backdrop-blur-sm border-t border-black/10 px-8 md:px-16 py-4">
                <div className="flex items-center justify-between mb-2 pb-2 border-b-2 border-black/20">
                    <span className="text-base sm:text-lg md:text-xl font-black tracking-[0.25em] text-black uppercase">
                        SẮP TỚI LƯỢT
                    </span>
                    <span className="text-xs font-extrabold text-black/50 uppercase tracking-wider">
                        Tối đa 5 lượt tiếp theo
                    </span>
                </div>

                {displayUpcoming.length === 0 ? (
                    <div className="text-center py-4 text-black/40 font-bold text-lg">
                        Không có bệnh nhân đang chờ
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-x-12 md:gap-x-24">
                        {/* Left column */}
                        <div className="flex flex-col">
                            {leftColumn.map((p, idx) => (
                                <div
                                    key={p.id}
                                    className={`flex items-center justify-between py-2.5 text-xl sm:text-2xl md:text-3xl font-bold ${
                                        idx < leftColumn.length - 1 ? 'border-b border-black/10' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        <span className="text-xs font-black bg-indigo-950 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                                            {p.position}
                                        </span>
                                        <span className="text-black font-black font-mono min-w-[5rem] shrink-0">
                                            {p.queueNumber}
                                        </span>
                                        <span className="text-black/30 font-normal shrink-0">—</span>
                                        <span className="text-black font-semibold truncate">
                                            {p.patientName}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        {/* Queue type badge */}
                                        {p.queueType === 'APPOINTMENT' && (
                                            <span className="text-xs font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> HẸN
                                            </span>
                                        )}
                                        {p.queueType === 'TRANSFER' && (
                                            <span className="text-xs font-extrabold bg-orange-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <Shuffle className="w-3 h-3" /> CHUYỂN
                                            </span>
                                        )}
                                        {/* ETA minutes display */}
                                        {typeof p.etaMinutes === 'number' && p.etaMinutes > 0 && (
                                            <span className="text-xs font-extrabold bg-black/10 text-black/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> ~{p.etaMinutes}p
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right column */}
                        <div className="flex flex-col">
                            {rightColumn.map((p, idx) => (
                                <div
                                    key={p.id}
                                    className={`flex items-center justify-between py-2.5 text-xl sm:text-2xl md:text-3xl font-bold ${
                                        idx < rightColumn.length - 1 ? 'border-b border-black/10' : ''
                                    }`}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        <span className="text-xs font-black bg-indigo-950 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                                            {p.position}
                                        </span>
                                        <span className="text-black font-black font-mono min-w-[5rem] shrink-0">
                                            {p.queueNumber}
                                        </span>
                                        <span className="text-black/30 font-normal shrink-0">—</span>
                                        <span className="text-black font-semibold truncate">
                                            {p.patientName}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        {/* Queue type badge */}
                                        {p.queueType === 'APPOINTMENT' && (
                                            <span className="text-xs font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <Calendar className="w-3 h-3" /> HẸN
                                            </span>
                                        )}
                                        {p.queueType === 'TRANSFER' && (
                                            <span className="text-xs font-extrabold bg-orange-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <Shuffle className="w-3 h-3" /> CHUYỂN
                                            </span>
                                        )}
                                        {/* ETA minutes display */}
                                        {typeof p.etaMinutes === 'number' && p.etaMinutes > 0 && (
                                            <span className="text-xs font-extrabold bg-black/10 text-black/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> ~{p.etaMinutes}p
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── 4. FOOTER ── */}
            <div className="shrink-0 bg-white/30 backdrop-blur-sm border-t border-black/10 px-8 md:px-12 py-2.5 flex items-center justify-between">
                <div className="text-base sm:text-lg font-medium text-black/70">
                    {formatVietnameseDate(currentTime)}
                </div>

                {/* Socket live indicator in footer */}
                <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-colors ${isConnected ? 'text-emerald-700 bg-emerald-100/60' : 'text-amber-700 bg-amber-100/60'}`}>
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-bounce'}`} />
                    {isConnected ? 'LIVE SOCKET' : 'Reconnecting...'}
                </div>

                {/* Digital Clock with Blinking Colon */}
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wider font-mono text-black">
                    <span>{clock.hh}</span>
                    <span className={blinkColon ? 'opacity-100' : 'opacity-20'}>:</span>
                    <span>{clock.mm}</span>
                    <span className={blinkColon ? 'opacity-100' : 'opacity-20'}>:</span>
                    <span>{clock.ss}</span>
                </div>
            </div>
        </div>
    );
}
