'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, RefreshCw, Volume2, Wifi, WifiOff } from 'lucide-react';
import { usePharmacyDisplaySocket } from '../../hooks/usePharmacyDisplaySocket';
import { useQueueSound } from '@/modules/queue/hooks/useQueueSound';
import { useDisplayScreen } from '@/modules/display/hooks/useDisplayScreen';
import { useFiveTap } from '@/modules/display/hooks/useFiveTap';
import { DisplayPinModal } from '@/modules/display/components/DisplayPinModal';
import { DisplaySiblingManager } from '@/modules/display/components/DisplaySiblingManager';
import { DisplayHeroPanel } from '@/modules/display/components/DisplayHeroPanel';
import { readBooleanSetting } from '@/modules/display/types/display-screen.types';
import type { PharmacyCallingNumber } from '../../types/pharmacy-display.types';

const EXIT_MS = 2000;

interface PharmacyWaitingScreenProps {
    screenId?: string;
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

export function PharmacyWaitingScreen({ screenId, roomId }: PharmacyWaitingScreenProps) {
    const { screen, reload } = useDisplayScreen({
        screenId,
        expectedKind: 'TV_PHARMACY',
        selectorPath: '/display/pharmacy'
    });
    const pharmacyRoomId = screen?.room_id || roomId;
    const { data, isConnected, error, refresh } = usePharmacyDisplaySocket({
        roomId: pharmacyRoomId
    });
    const { playDing, isAudioBlocked, enableAudio, soundEnabled } = useQueueSound();

    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [blinkColon, setBlinkColon] = useState(true);
    const [pinOpen, setPinOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [exitingIds, setExitingIds] = useState<string[]>([]);
    const numberCacheRef = useRef<Map<string, PharmacyCallingNumber>>(new Map());
    const seenIdsRef = useRef<Set<string>>(new Set());
    const primedRef = useRef(false);
    const handleFiveTap = useFiveTap(() => setPinOpen(true));

    const mediaEnabled = readBooleanSetting(screen?.settings ?? {}, 'media_enabled', true);
    const soundSetting = readBooleanSetting(screen?.settings ?? {}, 'sound_enabled', true);
    const counterName = screen?.name || data?.room?.room_name || 'Quầy nhà thuốc';

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setBlinkColon((prev) => !prev);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const callingForThisScreen = useMemo(() => {
        const all = data?.calling_numbers ?? [];
        for (const item of all) {
            numberCacheRef.current.set(item.prescription_id, item);
        }
        if (!screenId) return all;
        return all.filter((item) => item.display_screen_id === screenId);
    }, [data?.calling_numbers, screenId]);

    const visibleNumbers = useMemo(() => {
        const liveIds = new Set(callingForThisScreen.map((n) => n.prescription_id));
        const merged = [...callingForThisScreen];
        for (const id of exitingIds) {
            if (liveIds.has(id)) continue;
            const cached = numberCacheRef.current.get(id);
            if (cached && !merged.some((n) => n.prescription_id === id)) {
                merged.push(cached);
            }
        }
        return merged;
    }, [callingForThisScreen, exitingIds]);

    useEffect(() => {
        const ids = callingForThisScreen.map((n) => n.prescription_id);
        if (!primedRef.current) {
            seenIdsRef.current = new Set(ids);
            primedRef.current = true;
            return;
        }
        const isNew = ids.some((id) => !seenIdsRef.current.has(id));
        if (isNew && soundEnabled && soundSetting) {
            playDing();
        }
        seenIdsRef.current = new Set(ids);
    }, [callingForThisScreen, playDing, soundEnabled, soundSetting]);

    useEffect(() => {
        const removed = data?.removed_ids ?? [];
        if (removed.length === 0) return;
        setExitingIds((prev) => Array.from(new Set([...prev, ...removed])));
        const timer = window.setTimeout(() => {
            setExitingIds((prev) => prev.filter((id) => !removed.includes(id)));
        }, EXIT_MS);
        return () => window.clearTimeout(timer);
    }, [data?.removed_ids]);

    const missed = data?.missed_numbers ?? [];
    const clock = formatTime(currentTime);

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

    return (
        <div
            className="relative h-screen w-screen flex flex-col font-sans select-none overflow-hidden"
            style={{
                background: 'linear-gradient(160deg, #DFE1FF 0%, #DFE1FF 45%, #F0D2C1 100%)'
            }}
        >
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 pt-2 opacity-0 hover:opacity-100 transition-opacity duration-300">
                {isAudioBlocked && soundSetting ? (
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
                    <div
                        className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            isConnected
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
            </div>

            <button
                type="button"
                onClick={handleFiveTap}
                className="shrink-0 bg-gradient-to-r from-[#2F9E6A] via-[#3CB371] to-[#2F9E6A] text-white px-6 sm:px-8 py-3 flex items-center justify-between shadow-md text-left cursor-pointer"
                title="Chạm 5 lần để cấu hình quầy"
            >
                <div className="text-left flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight drop-shadow-sm leading-tight uppercase">
                        Mời các số sau đến quầy {counterName}
                    </h1>
                </div>
                <div className="text-right shrink-0 pl-4">
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-wider opacity-90">Đang gọi</p>
                    <p className="text-3xl sm:text-4xl font-black">{callingForThisScreen.length}</p>
                </div>
            </button>

            {!isConnected && (
                <div className="shrink-0 mx-auto my-1.5 flex items-center gap-2 text-xs font-bold text-amber-800 bg-amber-100/90 border border-amber-300 px-4 py-1.5 rounded-full shadow-sm">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {error ?? 'Đang kết nối lại máy chủ...'}
                </div>
            )}

            <div className={`flex-1 min-h-0 px-4 sm:px-6 py-4 overflow-hidden flex gap-4 ${mediaEnabled ? '' : ''}`}>
                <div className={`${mediaEnabled ? 'w-full md:w-[48%] lg:w-[42%]' : 'w-full'} min-h-0`}>
                    {visibleNumbers.length === 0 ? (
                        <div className="h-full flex items-center justify-center rounded-3xl border-2 border-dashed border-black/15 bg-white/35">
                            <p className="text-xl sm:text-2xl font-extrabold text-black/40 text-center px-6">
                                Chưa có số đang gọi tại quầy này
                            </p>
                        </div>
                    ) : (
                        <div className="h-full overflow-y-auto pr-1">
                            <div className="grid gap-3 sm:gap-4 content-start grid-cols-2">
                                {visibleNumbers.map((item) => {
                                    const exiting = exitingIds.includes(item.prescription_id);
                                    return (
                                        <div
                                            key={item.prescription_id}
                                            className={`flex items-center justify-center rounded-3xl border-2 shadow-md min-h-[5.5rem] sm:min-h-[7rem] transition-all duration-700 ${
                                                exiting
                                                    ? 'bg-slate-200/80 border-slate-300 opacity-40 grayscale'
                                                    : 'bg-white/80 border-emerald-700/20'
                                            }`}
                                        >
                                            <span className="font-mono font-black text-4xl sm:text-5xl md:text-6xl text-emerald-800 tracking-tight">
                                                {item.pickup_number}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                {mediaEnabled && (
                    <div className="hidden md:block flex-1 min-h-0 rounded-3xl overflow-hidden">
                        <DisplayHeroPanel compact />
                    </div>
                )}
            </div>

            <div className="shrink-0 bg-white/70 backdrop-blur-sm border-t border-black/10 px-6 md:px-10 py-3">
                <p className="text-sm sm:text-base font-bold text-slate-800">
                    Các số đang giữ thuốc tại quầy:{' '}
                    <span className="font-mono font-black text-emerald-800">
                        {missed.length > 0
                            ? missed.map((n) => n.pickup_number).join(', ')
                            : '—'}
                    </span>
                </p>
            </div>

            <div className="shrink-0 bg-white/30 backdrop-blur-sm border-t border-black/10 px-8 md:px-12 py-2.5 flex items-center justify-between">
                <div className="text-base sm:text-lg font-medium text-black/70">
                    {formatVietnameseDate(currentTime)}
                </div>
                <div
                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                        isConnected ? 'text-emerald-700 bg-emerald-100/60' : 'text-amber-700 bg-amber-100/60'
                    }`}
                >
                    <span
                        className={`w-2 h-2 rounded-full ${
                            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-bounce'
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

            <DisplayPinModal
                isOpen={pinOpen}
                onClose={() => setPinOpen(false)}
                onSuccess={() => {
                    setPinOpen(false);
                    setSettingsOpen(true);
                }}
            />
            {settingsOpen && (
                <DisplaySiblingManager
                    kind="TV_PHARMACY"
                    currentScreenId={screen?.display_screen_id}
                    onClose={() => {
                        setSettingsOpen(false);
                        void reload();
                    }}
                    onUpdated={() => void reload()}
                />
            )}
        </div>
    );
}
