'use client';

import { ReactNode } from 'react';
import { EMRHeader } from './EMRHeader';
import { useAuthStore } from '@/store/authStore';

interface EMRWorkspaceLayoutProps {
    activeTabId: string;
    activeTabName?: string;
    children: ReactNode;
}

export function EMRWorkspaceLayout({ activeTabId, activeTabName, children }: EMRWorkspaceLayoutProps) {
    const user = useAuthStore((s) => s.user);
    const isLabRole =
        user?.role === 'LAB_TECHNICIAN' ||
        (user?.role === 'DOCTOR' &&
            typeof window !== 'undefined' &&
            localStorage.getItem('tfopd_active_room_type') === 'PROCEDURE_ROOM');
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
        'pharmacy_create',
        'pharmacy_medicines',
        'pharmacy_patients'
    ];

    const showHeader = !isLabRole && !isPharmacyRole && !hideHeaderIds.includes(activeTabId);

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-[#EEEDFC] via-[#F9ECF2] to-[#E6E9FC] pt-6 pb-5 relative">
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
