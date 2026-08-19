'use client';

import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { usePharmacyDisplaySocket } from '../../hooks/usePharmacyDisplaySocket';

interface PharmacyWaitingScreenProps {
    roomId?: string;
}

function formatVietnameseDate(date: Date | null) {
    if (!date) return '';
    const days = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const dayName = days[date.getDay()];
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dayName}, ngày ${dd}/${mm}/${yyyy}`;
}

function formatTime(date: Date | null) {
    if (!date) return { hh: '00', mm: '00', ss: '00' };
    return {
        hh: String(date.getHours()).padStart(2, '0'),
        mm: String(date.getMinutes()).padStart(2, '0'),
        ss: String(date.getSeconds()).padStart(2, '0')
    };
}

export function PharmacyWaitingScreen({ roomId }: PharmacyWaitingScreenProps) {
    const { data, isConnected, error, refresh } = usePharmacyDisplaySocket({ roomId });
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [blinkColon, setBlinkColon] = useState(true);

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
            document.documentElement
                .requestFullscreen()
                .then(() => setIsFullscreen(true))
                .catch(() => undefined);
        } else {
            document
                .exitFullscreen?.()
                .then(() => setIsFullscreen(false))
                .catch(() => undefined);
        }
    };

    const clock = formatTime(currentTime);
    const numbers = data?.calling_numbers ?? [];
    const roomName = data?.room?.room_name || 'NHÀ THUỐC';

    return (
        <div
            className="relative h-screen w-screen flex flex-col font-sans select-none overflow-hidden"
            style={{
                background: 'linear-gradient(160deg, #DFE1FF 0%, #DFE1FF 45%, #F0D2C1 100%)'
            }}
        >
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-end gap-2 px-4 pt-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div
                    className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${isConnected
                            ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100/90 text-red-700 border border-red-300'
                        }`}
                >
                    {isConnected ? (
                        <>
                            <Wifi className="w-3 h-3" /> LIVE
                        </>
                    ) : (
                        <>
                            <WifiOff className="w-3 h-3" /> {error ? 'Lỗi kết nối' : 'Đang kết nối...'}
                        </>
                    )}
                </div>
                <button
                    onClick={() => void refresh()}
                    title="Tải lại"
                    className="p-2 rounded-xl bg-white/40 hover:bg-white/70 text-neutral-700 backdrop-blur-md transition shadow-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                <button
                    onClick={toggleFullscreen}
                    title="Toàn màn hình"
                    className="p-2 rounded-xl bg-white/40 hover:bg-white/70 text-neutral-700 backdrop-blur-md transition shadow-sm"
                >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
            </div>

            <div className="shrink-0 bg-gradient-to-r from-[#2F9E6A] via-[#3CB371] to-[#2F9E6A] text-white px-6 sm:px-8 py-3 flex items-center justify-between shadow-md">
                <div className="text-left flex-1 min-w-0">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight drop-shadow-sm leading-none uppercase">
                        Mời nhận thuốc
                    </h1>
                </div>
                <div className="text-right shrink-0 pl-4">
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wider opacity-90">Đang gọi</p>
                    <p className="text-3xl sm:text-4xl font-black">{numbers.length}</p>
                </div>
            </div>

            {!isConnected && (
                <div className="shrink-0 mx-auto my-1.5 flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-4 py-1.5 rounded-full shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {error ?? 'Đang kết nối lại máy chủ...'}
                </div>
            )}

            <div className="flex-1 min-h-0 px-4 sm:px-8 py-4 overflow-hidden">
                {numbers.length === 0 ? (
                    <div className="h-full flex items-center justify-center rounded-3xl border-2 border-dashed border-black/15 bg-white/35">
                        <p className="text-xl sm:text-2xl md:text-3xl font-extrabold text-black/40 text-center px-6">
                            Chưa có số đang gọi
                        </p>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto pr-1">
                        <div className="grid gap-3 sm:gap-4 content-start grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                            {numbers.map((item) => (
                                <div
                                    key={item.prescription_id}
                                    className="flex items-center justify-center rounded-3xl bg-white/80 border-2 border-emerald-700/20 shadow-md min-h-[5.5rem] sm:min-h-[7rem]"
                                >
                                    <span className="font-mono font-black text-4xl sm:text-5xl md:text-6xl text-emerald-800 tracking-tight">
                                        {item.pickup_number}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="shrink-0 bg-white/30 backdrop-blur-sm border-t border-black/10 px-8 md:px-12 py-2.5 flex items-center justify-between">
                <div className="text-base sm:text-lg font-medium text-black/70">
                    {formatVietnameseDate(currentTime)}
                </div>
                <div
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${isConnected ? 'text-emerald-700 bg-emerald-100/60' : 'text-amber-700 bg-amber-100/60'
                        }`}
                >
                    <span
                        className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-bounce'
                            }`}
                    />
                    {isConnected ? 'LIVE' : 'Đang kết nối lại...'}
                </div>
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
