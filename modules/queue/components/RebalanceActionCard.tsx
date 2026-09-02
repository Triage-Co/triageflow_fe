'use client';

import { useState, useEffect } from 'react';
import { Check, Clock, Shuffle, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/lib/utils';
import type { RebalanceSuggestionData } from '../types/rebalance.types';

interface RebalanceActionCardProps {
    suggestions: RebalanceSuggestionData[];
    currentRoomId?: string;
    actingId?: string | null;
    error?: string | null;
    onConfirm: (suggestionId: string) => void | Promise<void>;
    onReject: (suggestionId: string) => void | Promise<void>;
    className?: string;
}

function formatTtl(expiresAt: string, nowMs: number): string {
    const remainingSec = Math.max(0, Math.floor((new Date(expiresAt).getTime() - nowMs) / 1000));
    const mins = Math.floor(remainingSec / 60);
    const secs = remainingSec % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function RebalanceActionCard({
    suggestions,
    currentRoomId,
    actingId = null,
    error,
    onConfirm,
    onReject,
    className,
}: RebalanceActionCardProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!suggestions.length || !currentRoomId) return null;

    const relevant = suggestions.filter((s) => {
        if (new Date(s.expires_at).getTime() <= now) return false;
        return s.from_room_id === currentRoomId || s.to_room_id === currentRoomId;
    });

    if (relevant.length === 0) return null;

    return (
        <div className={cn('flex flex-col gap-2.5', className)}>
            {relevant.map((item) => {
                const isFromRoom = item.from_room_id === currentRoomId;
                const busy = actingId === item.suggestion_id;
                return (
                    <div
                        key={item.suggestion_id}
                        className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3.5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-9 h-9 rounded-xl bg-[#8B7CF6]/15 text-[#8B7CF6] flex items-center justify-center shrink-0">
                                <Shuffle className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-black uppercase tracking-wide text-[#8B7CF6] mb-0.5">
                                    Đề xuất điều phối
                                </p>
                                <p className="text-[13px] font-semibold text-neutral-800 leading-snug">
                                    {isFromRoom ? (
                                        <>
                                            BN số{' '}
                                            <span className="font-black text-[#8B7CF6]">{item.queue_number}</span>{' '}
                                            ({item.patient_name}) đề xuất sang{' '}
                                            <span className="font-bold">{item.to_room_name}</span>
                                        </>
                                    ) : (
                                        <>
                                            BN số{' '}
                                            <span className="font-black text-[#8B7CF6]">{item.queue_number}</span>{' '}
                                            ({item.patient_name}) đề xuất chuyển từ{' '}
                                            <span className="font-bold">{item.from_room_name}</span> về phòng này
                                        </>
                                    )}
                                </p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    {item.eta_gain_minutes > 0 && (
                                        <span className="text-[10px] font-bold bg-[#8B7CF6] text-white px-2 py-0.5 rounded-full">
                                            Giảm ~{item.eta_gain_minutes} phút chờ
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                        <Clock className="w-3 h-3" />
                                        {formatTtl(item.expires_at, now)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 sm:pl-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={busy || actingId !== null}
                                onClick={() => void onReject(item.suggestion_id)}
                                startIcon={<X className="w-3.5 h-3.5" />}
                                className="h-8 rounded-xl border-rose-200 bg-white px-3 text-[11.5px] font-extrabold text-rose-700 hover:bg-rose-50"
                            >
                                Từ chối
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                disabled={busy || actingId !== null}
                                isLoading={busy}
                                onClick={() => void onConfirm(item.suggestion_id)}
                                startIcon={busy ? undefined : <Check className="w-3.5 h-3.5" />}
                                className="h-8 rounded-xl bg-[#8B7CF6] hover:bg-[#7C6CF5] px-3 text-[11.5px] font-extrabold text-white border-0 shadow-sm"
                            >
                                Xác nhận
                            </Button>
                        </div>
                    </div>
                );
            })}
            {error && (
                <p className="text-[11px] font-semibold text-rose-600 px-1">{error}</p>
            )}
        </div>
    );
}
