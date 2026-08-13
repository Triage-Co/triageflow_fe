'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AnimatedQueueNumberProps {
    queueNumber: string;
    patientName: string;
    statusLabel: string;
    status: string;
}

export function AnimatedQueueNumber({
    queueNumber,
    patientName,
    statusLabel,
    status,
}: AnimatedQueueNumberProps) {
    const [displayNumber, setDisplayNumber] = useState(queueNumber);
    const [displayName, setDisplayName] = useState(patientName);
    const [displayStatusLabel, setDisplayStatusLabel] = useState(statusLabel);
    const [isAnimating, setIsAnimating] = useState(false);
    const prevNumberRef = useRef(queueNumber);

    useEffect(() => {
        if (prevNumberRef.current !== queueNumber) {
            prevNumberRef.current = queueNumber;
            setIsAnimating(true);

            const timer = setTimeout(() => {
                setDisplayNumber(queueNumber);
                setDisplayName(patientName);
                setDisplayStatusLabel(statusLabel);
                setIsAnimating(false);
            }, 250);

            return () => clearTimeout(timer);
        } else {
            setDisplayNumber(queueNumber);
            setDisplayName(patientName);
            setDisplayStatusLabel(statusLabel);
        }
    }, [queueNumber, patientName, statusLabel]);

    const isCalling = status === 'CALLING';

    return (
        <div className="flex-1 flex flex-col items-center justify-center py-2 px-3 sm:px-6 text-center overflow-hidden h-full">
            {/* Status Pill — slightly tighter for 60% column */}
            <div className={`flex items-center justify-center gap-2 font-black text-sm sm:text-base md:text-lg tracking-[0.25em] sm:tracking-[0.35em] uppercase mb-2 px-4 sm:px-6 py-1.5 rounded-full transition-all ${
                isCalling
                    ? 'bg-purple-600/10 text-purple-700 border border-purple-300 shadow-sm'
                    : 'text-[#6B5FD6]'
            }`}>
                <span className="relative flex h-3 w-3 sm:h-3.5 sm:w-3.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isCalling ? 'bg-purple-600' : 'bg-[#6B5FD6]'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                        isCalling ? 'bg-purple-600' : 'bg-[#6B5FD6]'
                    }`} />
                </span>
                <span className="truncate max-w-full">{displayStatusLabel}</span>
                <span className="relative flex h-3 w-3 sm:h-3.5 sm:w-3.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isCalling ? 'bg-purple-600' : 'bg-[#6B5FD6]'
                    }`} />
                    <span className={`relative inline-flex rounded-full h-3 w-3 sm:h-3.5 sm:w-3.5 ${
                        isCalling ? 'bg-purple-600' : 'bg-[#6B5FD6]'
                    }`} />
                </span>
            </div>

            {/* Ticket Number — sized for ~60% viewport width */}
            <div
                className={`font-black tracking-widest leading-none drop-shadow-md transition-all duration-300 transform ${
                    isAnimating
                        ? 'opacity-0 scale-90 translate-y-4'
                        : 'opacity-100 scale-100 translate-y-0'
                } ${
                    isCalling ? 'text-[#5244C9] scale-105' : 'text-[#6B5FD6]/85'
                }`}
                style={{ fontSize: 'clamp(72px, 14vw, 200px)' }}
            >
                {displayNumber}
            </div>

            {/* Patient Name */}
            <div
                className={`font-extrabold text-[#2D1F5E] tracking-tight mt-2 px-2 max-w-full truncate transition-all duration-300 transform ${
                    isAnimating
                        ? 'opacity-0 translate-y-2'
                        : 'opacity-100 translate-y-0'
                }`}
                style={{ fontSize: 'clamp(24px, 3.5vw, 56px)' }}
            >
                {displayName}
            </div>
        </div>
    );
}
