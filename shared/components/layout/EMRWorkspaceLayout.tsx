'use client';

import { ReactNode } from 'react';
import { EMRHeader } from './EMRHeader';
import { useAuthStore } from '@/store/authStore';
import { PROCEDURE_ROOM_TYPES } from '@/modules/clinical/utils/staffShift';

interface EMRWorkspaceLayoutProps {
    activeTabId: string;
    activeTabName?: string;
    children: ReactNode;
}

export function EMRWorkspaceLayout({ activeTabId, activeTabName, children }: EMRWorkspaceLayoutProps) {
    const user = useAuthStore((s) => s.user);
    const storedRoomType =
        (typeof window !== 'undefined' ? localStorage.getItem('tfopd_active_room_type') : null) || '';
    const isParaclinicalShift = PROCEDURE_ROOM_TYPES.has(storedRoomType.toUpperCase());
    const isLabRole =
        user?.role === 'LAB_TECHNICIAN' ||
        ((user?.role === 'DOCTOR' || user?.role === 'NURSE') && isParaclinicalShift);
    const isPharmacyRole = user?.role === 'PHARMACIST' || user?.role === 'PHARMACY_STAFF';

    const hideHeaderIds = [
        'lab',
        'reception',
        'cashier',
        'payment',
        'notification',
        'notifications',
        'setting',
        'settings',
        'pharmacy',
        'pharmacy_checkin',
        'pharmacy_medicines'
    ];

    const showHeader = !isLabRole && !isPharmacyRole && !hideHeaderIds.includes(activeTabId);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-transparent pt-6 pb-5 relative">
            {/* Background decoration purple circle at bottom-left */}
            <div className="absolute bottom-5 left-5 w-12 h-12 rounded-full bg-[#8B7CF6]/60" />

            <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-tl-[15px] rounded-bl-[48px] shadow-[0_4px_20px_-4px_rgba(139,124,246,0.08)] relative z-10">
                {/* Top header tab bar next to sidebar (hidden for Pharmacy & Lab roles) */}
                {showHeader && <EMRHeader activeTabId={activeTabId} activeTabName={activeTabName} />}

                {/* Body content */}
                {children}
            </div>
        </div>
    );
}
