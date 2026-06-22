'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    CalendarDays,
    BarChart2,
    Settings,
    Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Appointments', href: '/appointments', icon: CalendarDays },
    { label: 'Reports', href: '/reports', icon: BarChart2 },
    { label: 'Settings', href: '/settings', icon: Settings },
];

export interface SidebarUser {
    name: string;
    role: string;
}

interface SidebarProps {
    user?: SidebarUser;
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside className="relative z-20 flex flex-col items-center w-[72px] h-screen bg-white border-r border-neutral-100 select-none shrink-0">
            {/* Logo */}
            <div className="flex items-center justify-center h-16 w-full shrink-0">
                <div className="w-9 h-9 rounded-[24px] bg-brand-500 flex items-center justify-center shadow-md shadow-brand-500/20">
                    <Activity className="w-5 h-5 text-white" />
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col items-center py-4 gap-1 w-full px-3">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                        pathname === item.href ||
                        pathname.startsWith(item.href + '/');

                    return (
                        <Tooltip key={item.href}>
                            <TooltipTrigger render={<div className="w-full" />}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        'flex items-center justify-center w-full h-11 rounded-[24px] transition-all duration-200',
                                        isActive
                                            ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25'
                                            : 'text-neutral-400 hover:text-brand-500 hover:bg-brand-50/60'
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={12}>
                                {item.label}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}
            </nav>

            {/* Bottom avatar */}
            <div className="pb-5 flex flex-col items-center">
                <div className="w-9 h-9 rounded-[24px] bg-brand-100 flex items-center justify-center text-brand-600 font-semibold text-xs border-2 border-brand-200">
                    {user?.name?.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() || 'VA'}
                </div>
            </div>
        </aside>
    );
}
