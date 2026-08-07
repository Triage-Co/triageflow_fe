'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook providing synthesized 2-note hospital chime bell via Web Audio API.
 * No external mp3 file required!
 */
export function useQueueSound() {
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [isAudioBlocked, setIsAudioBlocked] = useState<boolean>(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                audioCtxRef.current = new AudioCtx();
            }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => setIsAudioBlocked(true));
        }
        return audioCtxRef.current;
    }, []);

    const playTone = useCallback((ctx: AudioContext, freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        // Soft bell envelope: fast attack, exponential decay
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.3, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration);
    }, []);

    const playDing = useCallback(() => {
        if (!soundEnabled) return;

        try {
            const ctx = getAudioContext();
            if (!ctx) return;

            if (ctx.state === 'suspended') {
                ctx.resume().then(() => {
                    setIsAudioBlocked(false);
                    const now = ctx.currentTime;
                    // Play 2-note chime: E5 (659Hz) -> B5 (987Hz)
                    playTone(ctx, 659.25, now, 0.8);
                    playTone(ctx, 987.77, now + 0.25, 1.2);
                }).catch(() => {
                    setIsAudioBlocked(true);
                });
                return;
            }

            const now = ctx.currentTime;
            // Play 2-note chime: E5 (659Hz) -> B5 (987Hz)
            playTone(ctx, 659.25, now, 0.8);
            playTone(ctx, 987.77, now + 0.25, 1.2);
            setIsAudioBlocked(false);
        } catch {
            setIsAudioBlocked(true);
        }
    }, [soundEnabled, getAudioContext, playTone]);

    const enableAudio = useCallback(() => {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().then(() => {
                setIsAudioBlocked(false);
                playDing();
            });
        } else {
            setIsAudioBlocked(false);
            playDing();
        }
    }, [getAudioContext, playDing]);

    useEffect(() => {
        return () => {
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => null);
            }
        };
    }, []);

    return {
        soundEnabled,
        setSoundEnabled,
        playDing,
        isAudioBlocked,
        enableAudio,
    };
}
