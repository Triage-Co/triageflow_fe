'use client';

import React, { useState, useEffect } from 'react';
import type { RebalanceSuggestionData } from '../types/rebalance.types';
import { ArrowRight, Clock, Shuffle } from 'lucide-react';

interface RebalanceBannerProps {
    suggestions: RebalanceSuggestionData[];
    currentRoomId?: string;
}

export function RebalanceBanner({ suggestions, currentRoomId }: RebalanceBannerProps) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!suggestions || suggestions.length === 0 || !currentRoomId) {
        return null;
    }

    const relevant = suggestions.filter((s) => {
        const expires = new Date(s.expires_at).getTime();
        if (expires <= now) return false;
        return s.from_room_id === currentRoomId || s.to_room_id === currentRoomId;
    }).slice(0, 2);

    if (relevant.length === 0) return null;

    return (
        <div className="shrink-0 px-6 pt-3 flex flex-col gap-2 z-10 animate-in slide-in-from-top duration-500">
            {relevant.map((item) => {
                const isFromRoom = item.from_room_id === currentRoomId;
                const expiresMs = new Date(item.expires_at).getTime() - now;
                const remainingSec = Math.max(0, Math.floor(expiresMs / 1000));
                const mins = Math.floor(remainingSec / 60);
                const secs = remainingSec % 60;
                const timeFormatted = `${mins}:${String(secs).padStart(2, '0')}`;

                return (
                    <div
                        key={item.suggestion_id}
                        className="bg-amber-400/90 border-2 border-amber-300 backdrop-blur-md text-amber-950 px-6 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-4 font-bold text-sm sm:text-base md:text-lg"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/40 flex items-center justify-center text-amber-950 shrink-0">
                                <Shuffle className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                                <span className="font-extrabold uppercase tracking-wide mr-2 text-amber-950">
                                    [GỢI Ý ĐIỀU PHỐI]
                                </span>
                                {isFromRoom ? (
                                    <>
                                        BN số <span className="font-black text-amber-950 px-1.5 py-0.5 bg-white/60 rounded-md">{item.queue_number}</span> ({item.patient_name}) được đề xuất sang <span className="font-black text-amber-950">{item.to_room_name}</span>
                                    </>
                                ) : (
                                    <>
                                        BN số <span className="font-black text-amber-950 px-1.5 py-0.5 bg-white/60 rounded-md">{item.queue_number}</span> ({item.patient_name}) được đề xuất chuyển từ <span className="font-black text-amber-950">{item.from_room_name}</span> về phòng này
                                    </>
                                )}
                                {item.eta_gain_minutes > 0 && (
                                    <span className="ml-2 text-xs bg-amber-950 text-amber-200 px-2 py-0.5 rounded-full font-bold">
                                        Giảm ~{item.eta_gain_minutes} phút chờ
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono bg-amber-950/20 px-3 py-1.5 rounded-xl shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{timeFormatted}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
