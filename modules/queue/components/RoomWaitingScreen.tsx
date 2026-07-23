'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRoomDisplay } from '../hooks/useRoomDisplay';
import { roomDisplayService } from '../services/roomDisplayService';
import { useAuthStore } from '@/modules/auth/store/authStore';
import { Maximize2, Minimize2, RefreshCw, Volume2, VolumeX, Settings, Stethoscope } from 'lucide-react';

interface RoomWaitingScreenProps {
    roomId?: string;
}

export function RoomWaitingScreen({ roomId: initialRoomId = '201' }: RoomWaitingScreenProps) {
    const accessToken = useAuthStore((s) => s.accessToken);
    const [roomId, setRoomId] = useState<string>(initialRoomId);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [showRoomModal, setShowRoomModal] = useState<boolean>(false);
    const [availableRooms, setAvailableRooms] = useState<Array<{ room_id: string; room_name: string; specialty_name?: string }>>([]);
    const [loadingRooms, setLoadingRooms] = useState<boolean>(false);
    const [, startTransition] = useTransition();

    const { data: displayData, isLoading, refresh } = useRoomDisplay({
        roomId,
        token: accessToken,
        pollIntervalMs: 5000,
    });

    // Live Clock
    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch rooms for switcher — re-run when token becomes available
    useEffect(() => {
        setLoadingRooms(true);
        roomDisplayService.getRooms(accessToken ?? undefined).then((rooms) => {
            if (rooms && rooms.length > 0) {
                setAvailableRooms(
                    rooms.map((r: { room_id: string; room_name: string; specialty?: { specialty_name?: string } }) => ({
                        room_id: r.room_id,
                        room_name: r.room_name,
                        specialty_name: r.specialty?.specialty_name,
                    })),
                );
            }
        }).finally(() => setLoadingRooms(false));
    }, [accessToken]); // re-fetch when user logs in

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
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

    const room = displayData?.room ?? {
        roomId: '201',
        roomName: 'PHÒNG 201',
        department: 'KHOA NỘI TỔNG QUÁT',
        doctorName: 'BS. Nguyễn Minh Tuấn',
        specialty: 'Nội tổng quát',
    };

    const currentPatient = displayData?.currentPatient ?? {
        id: 'p-102',
        queueNumber: 'A102',
        patientName: 'Nguyễn Văn An',
        status: 'PROCESSING',
    };

    const upcomingPatients = displayData?.upcomingPatients ?? [
        { id: 'p-103', queueNumber: 'A103', patientName: 'Trần Văn Bình', status: 'WAITING' },
        { id: 'p-104', queueNumber: 'A104', patientName: 'Lê Minh Châu', status: 'WAITING' },
        { id: 'p-105', queueNumber: 'A105', patientName: 'Phạm Quốc Dũng', status: 'WAITING' },
        { id: 'p-106', queueNumber: 'A106', patientName: 'Võ Thị Hằng', status: 'WAITING' },
        { id: 'p-107', queueNumber: 'A107', patientName: 'Đặng Thị Liên', status: 'WAITING' },
    ];

    const leftColumn = upcomingPatients.filter((_, idx) => idx % 2 === 0);
    const rightColumn = upcomingPatients.filter((_, idx) => idx % 2 === 1);

    return (
        /* h-screen + overflow-hidden = khóa chặt trong viewport, không scroll */
        <div className="relative h-screen w-screen flex flex-col font-sans select-none overflow-hidden" style={{ background: 'linear-gradient(160deg, #DFE1FF 0%, #DFE1FF 45%, #F0D2C1 100%)' }}>

            {/* ── Controls overlay (ẩn, chỉ hiện khi hover) ── */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-end gap-1 px-3 pt-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <button onClick={refresh} title="Tải lại" className="p-1.5 rounded hover:bg-black/10 text-neutral-500 transition">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setShowRoomModal(true)} title="Chọn phòng" className="p-1.5 rounded hover:bg-black/10 text-neutral-500 flex items-center gap-1 text-[11px]">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Chọn phòng</span>
                </button>
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
                    <span>ĐANG KHÁM</span>
                    <span className="relative flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#6B5FD6] opacity-60" />
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#6B5FD6]" />
                    </span>
                </div>

                {/* Ticket Number — siêu lớn phục vụ kiosk */}
                <div className="font-black text-[#6B5FD6]/70 tracking-widest leading-none drop-shadow-sm"
                    style={{ fontSize: 'clamp(100px, 24vw, 240px)' }}>
                    {currentPatient?.queueNumber ?? '---'}
                </div>

                {/* Patient Name */}
                <div className="font-extrabold text-[#2D1F5E] tracking-tight mt-1"
                    style={{ fontSize: 'clamp(32px, 5.5vw, 68px)' }}>
                    {currentPatient?.patientName ?? 'Đang chờ...'}
                </div>
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
                            <div key={p.id || p.queueNumber}
                                className={`flex items-center gap-4 py-3.5 text-xl sm:text-2xl md:text-3xl font-bold ${
                                    idx < leftColumn.length - 1 ? 'border-b border-black/10' : ''
                                }`}>
                                <span className="text-black font-black min-w-[5rem]">{p.queueNumber}</span>
                                <span className="text-black/30 font-normal shrink-0">—</span>
                                <span className="text-black font-semibold truncate">{p.patientName}</span>
                            </div>
                        ))}
                    </div>
                    {/* Right column */}
                    <div className="flex flex-col">
                        {rightColumn.map((p, idx) => (
                            <div key={p.id || p.queueNumber}
                                className={`flex items-center gap-4 py-3.5 text-xl sm:text-2xl md:text-3xl font-bold ${
                                    idx < rightColumn.length - 1 ? 'border-b border-black/10' : ''
                                }`}>
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
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wider font-mono text-black">
                    {formatTime(currentTime)}
                </div>
            </div>

            {/* ── Room Selector Modal ── */}
            {showRoomModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={(e) => e.target === e.currentTarget && setShowRoomModal(false)}
                >
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl text-neutral-800">
                        <div className="flex items-center justify-between mb-4 border-b pb-3">
                            <h3 className="text-base font-bold flex items-center gap-2 text-slate-800">
                                <Stethoscope className="w-4 h-4 text-blue-600" />
                                Chọn phòng hiển thị
                            </h3>
                            <button
                                onClick={() => setShowRoomModal(false)}
                                className="text-neutral-400 hover:text-neutral-700 text-xl font-bold leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-100"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {loadingRooms ? (
                                <div className="py-6 text-center text-sm text-neutral-400 flex flex-col items-center gap-2">
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    <span>Đang tải danh sách phòng...</span>
                                </div>
                            ) : availableRooms.length === 0 ? (
                                <div className="py-6 text-center text-sm text-neutral-400">
                                    <p className="font-semibold text-neutral-500 mb-1">Không tìm thấy phòng nào</p>
                                    <p className="text-xs">Vui lòng đăng nhập để xem danh sách phòng khám.</p>
                                </div>
                            ) : (
                                availableRooms.map((r) => (
                                    <button
                                        key={r.room_id}
                                        onClick={() => { startTransition(() => { setRoomId(r.room_id); setShowRoomModal(false); }); }}
                                        className={`w-full text-left p-3 rounded-xl font-semibold text-sm transition border ${
                                            roomId === r.room_id
                                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                                : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200'
                                        }`}
                                    >
                                        {r.room_name}
                                        {r.specialty_name && (
                                            <span className="font-normal text-neutral-500 ml-1">— {r.specialty_name}</span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setShowRoomModal(false)}
                                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 font-bold rounded-xl text-sm text-neutral-700 transition"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
