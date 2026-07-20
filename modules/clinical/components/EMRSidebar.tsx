'use client';

import { LayoutDashboard, Users, CalendarDays, Bell, Settings, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EMRSidebarProps {
    activeItem?: string;
}

const NAV_ITEMS = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'patients', icon: Users, label: 'Bệnh nhân' },
    { id: 'calendar', icon: CalendarDays, label: 'Lịch hẹn' },
    { id: 'notifications', icon: Bell, label: 'Thông báo' },
    { id: 'settings', icon: Settings, label: 'Cài đặt' },
];

export function EMRSidebar({ activeItem = 'patients' }: EMRSidebarProps) {
    return (
        <aside className="flex flex-col items-center w-16 h-full bg-[#F5F2FF] py-4 gap-2 shrink-0">
            {/* Logo */}
            <div className="w-9 h-9 rounded-xl bg-[#8B7CF6] flex items-center justify-center mb-4 shadow-md shadow-[#8B7CF6]/30 shrink-0">
                <Activity className="w-4.5 h-4.5 text-white" />
            </div>

            {/* Nav Items */}
            <nav className="flex flex-col items-center gap-1.5 flex-1">
                {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
                    const isActive = activeItem === id;
                    return (
                        <button
                            key={id}
                            title={label}
                            className={cn(
                                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                                isActive
                                    ? 'bg-[#8B7CF6] text-white shadow-sm shadow-[#8B7CF6]/30'
                                    : 'text-[#7B7B7B] hover:bg-[#8B7CF6]/10 hover:text-[#8B7CF6]'
                            )}
                        >
                            <Icon className="w-4.5 h-4.5" />
                        </button>
                    );
                })}
            </nav>

            {/* Bottom doctor avatar */}
            <div
                title="Bác sĩ"
                className="w-9 h-9 rounded-xl bg-[#8B7CF6] flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0 mt-auto"
            >
                BS
            </div>
        </aside>
    );
}
