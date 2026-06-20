'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    UserPlus,
    Printer,
    CreditCard,
    Search,
    Bell,
    BarChart2,
    Settings,
    ChevronLeft,
    ChevronRight,
    Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: number;
}

const navItems: NavItem[] = [
    { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Đăng ký bệnh nhân', href: '/register', icon: UserPlus },
    { label: 'In xé khám', href: '/print', icon: Printer },
    { label: 'Hỗ trợ thanh toán', href: '/payment', icon: CreditCard },
    { label: 'Tra cứu bệnh nhân', href: '/search', icon: Search },
    { label: 'Thông báo', href: '/notifications', icon: Bell, badge: 3 },
    { label: 'Thống kê', href: '/statistics', icon: BarChart2 },
    { label: 'Cài đặt', href: '/settings', icon: Settings },
];

export interface SidebarUser {
    name: string;
    role: string;
}

interface SidebarProps {
    user?: SidebarUser;
}

export function Sidebar({ user }: SidebarProps) {
    const [collapsed, setCollapsed] = useState(false);
    const pathname = usePathname();

    const displayName = user?.name ?? 'Nguyen Van A';
    const displayRole = user?.role ?? 'Bác sĩ';
    const initials = displayName
        .split(' ')
        .slice(-2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    return (
        <aside
            className={cn(
                'relative flex flex-col h-screen bg-white border-r border-neutral-200 transition-[width] duration-300 ease-in-out select-none',
                collapsed ? 'w-18' : 'w-60'
            )}
        >
            {/* Logo */}
            <div
                className={cn(
                    'flex items-center gap-3 h-16 border-b border-neutral-100 shrink-0',
                    collapsed ? 'justify-center px-0' : 'px-4'
                )}
            >
                <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center shrink-0 shadow-sm">
                    <Activity className="w-4.5 h-4.5 text-white" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold text-neutral-900 leading-tight truncate">
                            TriageFlow
                        </p>
                        <p className="text-[11px] text-neutral-400 leading-tight">
                            Design System
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
                <ul className="space-y-0.5">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            pathname === item.href ||
                            pathname.startsWith(item.href + '/');

                        const linkContent = (
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-150 h-10',
                                    collapsed ? 'justify-center w-full px-0' : 'px-3',
                                    isActive
                                        ? 'bg-brand-500 text-white shadow-sm'
                                        : 'text-neutral-500 hover:bg-brand-50 hover:text-brand-500'
                                )}
                            >
                                {/* Icon with badge dot */}
                                <span className="relative shrink-0">
                                    <Icon className="w-4.5 h-4.5" />
                                    {item.badge !== undefined && collapsed && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                                    )}
                                </span>

                                {/* Label + badge count */}
                                {!collapsed && (
                                    <>
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {item.badge !== undefined && (
                                            <Badge
                                                variant="destructive"
                                                className={cn(
                                                    'min-w-5 h-5 px-1.5 text-[11px]',
                                                    isActive && 'bg-white/25 text-white border-transparent'
                                                )}
                                            >
                                                {item.badge}
                                            </Badge>
                                        )}
                                    </>
                                )}
                            </Link>
                        );

                        return (
                            <li key={item.href}>
                                {collapsed ? (
                                    <Tooltip>
                                        <TooltipTrigger render={<div className="w-full" />}>
                                            {linkContent}
                                        </TooltipTrigger>
                                        <TooltipContent side="right" sideOffset={8}>
                                            {item.label}
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    linkContent
                                )}
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <Separator className="bg-neutral-100" />

            {/* User profile */}
            <div
                className={cn(
                    'shrink-0',
                    collapsed ? 'py-3 flex justify-center' : 'px-3 py-3'
                )}
            >
                <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
                    <Avatar className="bg-brand-100 border-2 border-brand-200 text-brand-600 font-semibold">
                        <AvatarFallback className="bg-brand-100 text-brand-600 text-xs font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-900 truncate">
                                {displayName}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">{displayRole}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapse toggle button */}
            <Button
                variant="outline"
                aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
                onClick={() => setCollapsed((prev) => !prev)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 size-6 rounded-full p-0 text-neutral-500 hover:text-brand-500 hover:border-brand-300 shadow-sm"
            >
                {collapsed ? (
                    <ChevronRight className="size-3" />
                ) : (
                    <ChevronLeft className="size-3" />
                )}
            </Button>
        </aside>
    );
}
