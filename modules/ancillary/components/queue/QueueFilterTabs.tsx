'use client';

import React, { useRef, useState, useCallback } from 'react';
import { PrescriptionStatusEnum } from '@/shared/types/prescription.types';
import { cn } from '@/lib/utils';

interface QueueFilterTabsProps {
    activeStatus: PrescriptionStatusEnum | 'ALL';
    onStatusChange: (status: PrescriptionStatusEnum | 'ALL') => void;
    counts: {
        ALL: number;
        PENDING: number;
        PROCESSING: number;
        PREPARED: number;
        DISPENSED: number;
    };
}

export function QueueFilterTabs({
    activeStatus,
    onStatusChange,
    counts
}: QueueFilterTabsProps) {
    const tabs: { id: PrescriptionStatusEnum | 'ALL'; label: string; count: number }[] = [
        { id: 'ALL', label: 'Tất cả', count: counts.ALL },
        { id: 'PENDING', label: 'Chờ thanh toán', count: counts.PENDING },
        { id: 'PROCESSING', label: 'Đang soạn', count: counts.PROCESSING },
        { id: 'PREPARED', label: 'Đã soạn', count: counts.PREPARED },
        { id: 'DISPENSED', label: 'Đã giao', count: counts.DISPENSED }
    ];

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const scrollLeftRef = useRef(0);
    const [hasDragged, setHasDragged] = useState(false);

    // Chuyển đổi con lăn chuột (Wheel Y -> Scroll X)
    const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        if (!scrollContainerRef.current) return;
        if (e.deltaY !== 0) {
            scrollContainerRef.current.scrollLeft += e.deltaY;
        }
    }, []);

    // Bắt đầu kéo chuột
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!scrollContainerRef.current) return;
        isDraggingRef.current = true;
        startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
        scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
        setHasDragged(false);
    };

    // Rê chuột
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDraggingRef.current || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startXRef.current) * 1.5;
        if (Math.abs(walk) > 4) {
            setHasDragged(true);
        }
        scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
    };

    // Dừng kéo chuột
    const handleMouseUpOrLeave = () => {
        isDraggingRef.current = false;
    };

    return (
        <div
            ref={scrollContainerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            className={cn(
                "flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar select-none cursor-grab active:cursor-grabbing scroll-smooth touch-pan-x",
            )}
        >
            {tabs.map((tab) => {
                const isActive = activeStatus === tab.id;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                            if (!hasDragged) {
                                onStatusChange(tab.id);
                            }
                        }}
                        className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer select-none",
                            isActive
                                ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs"
                                : "bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/80 hover:text-neutral-900"
                        )}
                    >
                        <span>{tab.label}</span>
                        <span
                            className={cn(
                                "px-1.5 py-0.5 rounded-md text-[10px] font-extrabold",
                                isActive
                                    ? "bg-white/20 text-white dark:bg-black/10 dark:text-neutral-900"
                                    : "bg-neutral-200/80 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                            )}
                        >
                            {tab.count}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}
